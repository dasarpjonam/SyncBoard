import React, { useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { useWorkspace } from '../store/WorkspaceContext';

export function ChatInterface() {
  const { items, config, apiKey, addItem, updateItem, workspacePath } = useWorkspace();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // In a real desktop app with @ai-sdk/react using API keys securely, we would typically handle the LLM call in the main process
  // or a local node server. But since this is a frontend-only desktop app without a separate backend,
  // we can use standard fetch to the OpenAI/Anthropic API directly, or create a simple custom fetch for useChat.
  // We'll implement a custom fetch handler for useChat that uses the API key.

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat', // UseChat expects api even if we override fetch
    fetch: async (url: RequestInfo | URL, options: any) => {
      if (!apiKey) {
        alert("Please set your OpenAI API key in Settings first.");
        throw new Error("No API key");
      }

      // Implement direct call to OpenAI API for demonstration since we don't have a backend route
      // We will actually implement a simple generic fetcher here to talk directly to OpenAI
      const body = JSON.parse(options?.body as string);

      const { defineTools } = await import('../lib/llm-tools');

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an AI Program Management assistant.
Workspace Context:
- Available Statuses: ${config.statuses.join(', ')}
- Available Types: ${config.types.join(', ')}
- Current Work Items: ${JSON.stringify(items.map(i => ({ id: i.id, title: i.title, status: i.status })))}

You can help the user organize tasks, create new items, or update existing ones. Use the provided tools to create or update work items.`
            },
            ...body.messages
          ],
          tools: defineTools(),
          tool_choice: "auto",
          // We can't easily stream function calls directly into standard useChat without a backend setup doing the AI SDK stream wrapper,
          // so for this pure-frontend client, we'll do standard streaming but also intercept tool calls if any.
          // Since standard AI SDK expects a specific stream format to handle tools cleanly, we will NOT stream if there's a chance of tool call
          // or we handle the custom streaming. For simplicity in this demo, let's turn off stream and return a mock stream that AI sdk can read.
          // Wait, useChat expects a stream. If we set stream: false, we have to manually create a ReadableStream.
          stream: false,
        })
      });

      const data = await response.json();
      const message = data.choices[0].message;

      // Handle tool calls locally
      if (message.tool_calls) {
        const { serializeMarkdownItem } = await import('../lib/markdown');

        const results = await Promise.all(message.tool_calls.map(async (toolCall, index) => {
          if (toolCall.function.name === 'create_work_item') {
            const args = JSON.parse(toolCall.function.arguments);
            const id = `ITEM-${Date.now()}-${index}`;
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
            await window.electronAPI.writeFile(`${workspacePath}/${newItem.fileName}`, content);
            addItem(newItem);

            return `I created a new ${newItem.type}: **${newItem.title}** (ID: ${newItem.id})`;
          } else if (toolCall.function.name === 'update_work_item') {
            const args = JSON.parse(toolCall.function.arguments);
            const existingItem = items.find(i => i.id === args.id);
            if (existingItem) {
              const updatedItem = {
                ...existingItem,
                ...args,
                updatedAt: new Date().toISOString()
              };
              const content = serializeMarkdownItem(updatedItem);
              await window.electronAPI.writeFile(`${workspacePath}/${updatedItem.fileName}`, content);
              updateItem(updatedItem);
              return `I updated item **${args.id}** successfully.`;
            } else {
              return `I couldn't find item with ID ${args.id}.`;
            }
          }
          return null;
        }));

        const toolResponses = results.filter(Boolean).join('\n');
        if (toolResponses) {
          message.content = toolResponses;
        }
      }

      // Convert the static response into a format useChat can consume as a stream to avoid breaking it.
      // useChat expects text/plain or specific text stream.
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(message.content || 'Action completed.'));
          controller.close();
        }
      });

      return new Response(stream, { headers: { 'Content-Type': 'text/plain' } });
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
