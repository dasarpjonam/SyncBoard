import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useWorkspace } from '../store/WorkspaceContext';
import { callLLM } from '../lib/llm-providers';
import { generateWorkItemId } from '../lib/id-generator';
import { ITEMS_FOLDER } from '../lib/constants';

export function ChatInterface() {
  const { 
    items, config, workspacePath,
    apiKey, llmProvider, llmApiKeys, llmModel,
    addItem, updateItem 
  } = useWorkspace();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // In a real desktop app with @ai-sdk/react using API keys securely, we would typically handle the LLM call in the main process
  // or a local node server. But since this is a frontend-only desktop app without a separate backend,
  // we can use standard fetch to the LLM API directly using our multi-provider abstraction.

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat', // UseChat expects api even if we override fetch
    onError: (error) => {
      console.error('Chat error:', error);
      setError(error.message || 'Failed to communicate with LLM API');
    },
    fetch: async (url: RequestInfo | URL, options: any) => {
      setError(null);
      
      const currentApiKey = llmApiKeys[llmProvider];
      if (!currentApiKey) {
        const providerName = llmProvider === 'claude' ? 'Claude (Anthropic)' : 
                           llmProvider === 'chatgpt' ? 'ChatGPT (OpenAI)' : 
                           'Gemini (Google)';
        const errorMsg = `Please set your ${providerName} API key in Settings first.`;
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      try {
        // Parse the incoming request
        const body = JSON.parse(options?.body as string);

        const { defineTools } = await import('../lib/llm-tools');
        const { buildLLMContext } = await import('../lib/context-builder');

        // Get last user message for context building
        const lastUserMessage = body.messages.filter((m: any) => m.role === 'user').pop();
        const query = lastUserMessage?.content || '';

        // Build optimized context (token-efficient)
        const workspaceContext = buildLLMContext(items, config, query, 3000);

        let liveContext = '';
        try {
          liveContext = await window.electronAPI.readFile(`${workspacePath}/project_context.md`) || '';
        } catch(e) {}


        // Build system instruction
        const systemPrompt = `You are an AI Program Management assistant.

${liveContext}


${workspaceContext}

AVAILABLE ACTIONS:
- Statuses: ${config.statuses.join(', ')}
- Types: ${config.types.join(', ')}

IMPORTANT RULES:
1. Use create_work_item ONLY when the user explicitly asks to CREATE or ADD a new item
2. Use update_work_item when the user wants to EDIT, UPDATE, MODIFY, CHANGE, or REASSIGN an existing item
3. When the user references an item by ID (full or partial like "ending 2894"), look for it in REFERENCED ITEMS above
4. Always use the FULL ID from REFERENCED ITEMS when calling update_work_item
5. If updating an item, only change the fields the user mentions - leave other fields unchanged

Use the provided tools to create or update work items.`;

        // Convert messages to our standard format
        const llmMessages = body.messages.map((m: any) => ({
          role: m.role,
          content: m.content
        }));

        // Call the unified LLM provider
        const llmConfig = {
          provider: llmProvider,
          apiKey: currentApiKey,
          model: llmModel || undefined
        };

        const llmResponse = await callLLM(
          llmConfig,
          llmMessages,
          systemPrompt,
          defineTools()
        );

        let finalContent = llmResponse.content;

        // Process tool calls
        if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
          const { serializeMarkdownItem } = await import('../lib/markdown');

          const results = await Promise.all(llmResponse.toolCalls.map(async (toolCall, index) => {
            const funcName = toolCall.name;
            const args = toolCall.args;

            if (funcName === 'create_work_item') {
              const id = generateWorkItemId(items);
              const newItem = {
                id,
                title: args.title,
                type: args.type || config.types[0],
                status: args.status || config.statuses[0],
                assignee: args.assignee,
                content: args.content || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                fileName: `${id}.md`,
              };

              const content = serializeMarkdownItem(newItem);
              await window.electronAPI.ensureDir(`${workspacePath}/${ITEMS_FOLDER}`);
              await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${newItem.fileName}`, content);
              addItem(newItem);

              return `I created a new ${newItem.type}: ${newItem.title} (ID: ${newItem.id})`;
            } else if (funcName === 'update_work_item') {
              const existingItem = items.find(i => i.id === args.id);
              if (existingItem) {
                const updatedItem = {
                  ...existingItem,
                  ...args,
                  updatedAt: new Date().toISOString()
                };
                const content = serializeMarkdownItem(updatedItem);
                await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${updatedItem.fileName}`, content);
                updateItem(updatedItem);
                return `I updated item ${args.id} successfully.`;
              } else {
                return `I could not find item with ID ${args.id}.`;
              }
            }
            return null;
          }));

          const toolResults = results.filter(Boolean).join(' ');
          if (toolResults) {
            finalContent = finalContent 
              ? `${finalContent}\n\n${toolResults}` 
              : toolResults;
          }
        }

        // Clean up content and ensure it's valid
        finalContent = (finalContent || 'Action completed.').trim();

        // Convert the static response into a format useChat can consume as a stream
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(finalContent));
            controller.close();
          }
        });

        return new Response(stream, { 
          headers: { 'Content-Type': 'text/plain' },
          status: 200
        });
      } catch (err: any) {
        console.error('Chat error:', err);
        setError(err.message || 'Failed to communicate with LLM API');
        throw err;
      }
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      <div className="p-4 border-b font-semibold bg-gray-50">PM Assistant</div>

      <div className="flex-grow overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-gray-400 text-sm text-center mt-10">
            Ask me anything about your project!
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-2 rounded-lg text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-gray-400 text-xs italic">Thinking...</div>}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
            <strong>Error:</strong> {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t bg-gray-50">
        <input
          className="w-full p-2 border rounded text-sm outline-none focus:border-blue-500"
          value={input}
          placeholder="Ask a question or give a command..."
          onChange={handleInputChange}
          disabled={!apiKey || !workspacePath}
        />
        {!apiKey && <div className="text-xs text-red-500 mt-1">API Key missing. Add in settings.</div>}
      </form>
    </div>
  );
}
