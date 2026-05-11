import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../store/WorkspaceContext';
import { ChatMessage, ChatContentBlock, ToolContext, SlashCommandInfo } from '../types/chat';
import { WorkItem } from '../types';
import { createToolRegistry } from '../lib/tools';
import { runAgentLoop } from '../lib/agent-loop';
import { parseSlashCommand, parseSlashArgs, getAvailableCommands } from '../lib/slash-commands';
import { buildLLMContext } from '../lib/context-builder';
import { MessageRenderer } from './chat/MessageRenderer';
import { SlashCommandMenu } from './chat/SlashCommandMenu';

let messageIdCounter = 0;
function nextMessageId(): string {
  return `msg-${Date.now()}-${messageIdCounter++}`;
}

/**
 * Generate contextual follow-up suggestions based on the last tool that ran.
 * Returns natural language prompts rather than raw slash commands.
 */
function getFollowUps(lastToolName?: string, lastToolResult?: any): string[] {
  switch (lastToolName) {
    case 'search_items':
      return ['Show me the details of the first result', 'Update the status of these items', 'Who is assigned to these?'];
    case 'get_project_summary':
      return ['Which items are blocked?', 'Show me everything In Progress', 'Who has the most work assigned?'];
    case 'create_work_item':
      return ['Add a comment to this item', 'Assign it to someone', 'Create a related task'];
    case 'update_work_item':
      return ['Show me the updated item', 'Move it to the next status', 'Add a comment with the reason for this change'];
    case 'list_items':
      return ['Show me the details of one of these', 'Which of these are blocked?', 'Summarize the status of this work'];
    case 'get_item_detail':
      return ['Update the status of this item', 'Show all child tasks', 'Add a comment to this item'];
    case 'create_personal_note':
      return ['Process this note for tasks', 'Add more context to the note', 'Promote it to the board'];
    case 'update_personal_note':
      return ['Extract tasks from this note', 'What are the key decisions here?'];
    default:
      return [
        'What is the status of the project?',
        'Show me all In Progress items',
        'Which tasks are assigned to me?',
      ];
  }
}

interface ChatInterfaceProps {
  currentWorkItem?: WorkItem;
}

export function ChatInterface({ currentWorkItem }: ChatInterfaceProps = {}) {
  const {
    items, personalNotes, config, workspacePath, currentUser,
    apiKey, llmProvider, llmApiKeys, llmModel,
    addItem, updateItem, deleteItem,
    addPersonalNote, updatePersonalNote, deletePersonalNote,
    todos, addTodo, updateTodo, deleteTodo, toggleTodoDone,
    setCurrentUser, setLLMProvider, setLLMModel, setLLMApiKey,
  } = useWorkspace();

  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');

  // Create tool registry once
  const toolRegistry = useMemo(() => createToolRegistry(), []);
  const slashCommands = useMemo(() => getAvailableCommands(toolRegistry), [toolRegistry]);

  // Get available users (from config.users or as empty array)
  const availableUsers = useMemo(() => {
    const users = config.users || [];
    return users.length > 0 ? users : currentUser ? [currentUser] : [];
  }, [config.users, currentUser]);

  // Build tool context from current workspace state
  const buildToolContext = useCallback((): ToolContext => ({
    items,
    personalNotes,
    config,
    workspacePath: workspacePath || '',
    currentUser,
    currentWorkItem,
    // Settings
    llmProvider,
    llmModel,
    llmApiKeys,
    availableUsers,
    setCurrentUser,
    setLLMProvider,
    setLLMModel,
    setApiKey: setLLMApiKey,
    // Work items
    addItem,
    updateItem,
    deleteItem,
    // Personal notes
    addPersonalNote,
    updatePersonalNote,
    deletePersonalNote,
    // Personal todos
    todos,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodoDone,
    // Electron API
    electronAPI: window.electronAPI,
  }), [items, personalNotes, config, workspacePath, currentUser, currentWorkItem, llmProvider, llmModel, llmApiKeys, availableUsers, setCurrentUser, setLLMProvider, setLLMModel, setLLMApiKey, addItem, updateItem, deleteItem, addPersonalNote, updatePersonalNote, deletePersonalNote, todos, addTodo, updateTodo, deleteTodo, toggleTodoDone]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle input changes — detect slash command menu trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    if (value.startsWith('/')) {
      const afterSlash = value.slice(1);
      // Only show menu if we haven't added a space after a valid command
      if (!afterSlash.includes(' ')) {
        setShowSlashMenu(true);
        setSlashFilter(afterSlash);
      } else {
        setShowSlashMenu(false);
      }
    } else {
      setShowSlashMenu(false);
    }
  };

  // Handle slash command selection from the menu
  const handleSlashSelect = (cmd: SlashCommandInfo) => {
    setInput(`/${cmd.name} `);
    setShowSlashMenu(false);
    inputRef.current?.focus();
  };

  // Navigate to a work item when an ItemCard is clicked
  const handleNavigateToItem = (item: WorkItem) => {
    navigate(`/workspace/item/${item.id}`);
  };

  // Insert a follow-up suggestion or send it directly
  const handleSendMessage = useCallback((text: string) => {
    setInput(text);
    // Auto-submit if it starts with /
    if (text.startsWith('/')) {
      setTimeout(() => {
        const form = document.getElementById('chat-form');
        form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }, 50);
    } else {
      inputRef.current?.focus();
    }
  }, []);

  // ─── Core Submit Handler ────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userInput = input.trim();
    if (!userInput || isLoading) return;

    setInput('');
    setShowSlashMenu(false);
    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: nextMessageId(),
      role: 'user',
      blocks: [{ type: 'markdown', content: userInput }],
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Create a mutable assistant message we'll build up
    const assistantId = nextMessageId();
    const assistantBlocks: ChatContentBlock[] = [];

    const pushBlock = (block: ChatContentBlock) => {
      assistantBlocks.push(block);
      setMessages(prev => {
        const existing = prev.find(m => m.id === assistantId);
        if (existing) {
          return prev.map(m =>
            m.id === assistantId ? { ...m, blocks: [...assistantBlocks] } : m
          );
        }
        return [
          ...prev,
          {
            id: assistantId,
            role: 'assistant' as const,
            blocks: [...assistantBlocks],
            timestamp: new Date().toISOString(),
          },
        ];
      });
    };

    const toolContext = buildToolContext();
    let lastToolName: string | undefined;

    try {
      // ── Check for slash command ──────────────────────────────
      const slash = parseSlashCommand(userInput);

      if (slash) {
        const tool = toolRegistry.getToolBySlashCommand(slash.command);

        if (tool) {
          // Direct tool execution — no LLM needed
          pushBlock({ type: 'tool-status', toolName: tool.definition.name, status: 'running' });

          const args = parseSlashArgs(slash.rawArgs);
          const result = await toolRegistry.execute(tool.definition.name, args, toolContext);
          lastToolName = tool.definition.name;

          // Replace the running status with done
          assistantBlocks[assistantBlocks.length - 1] = {
            type: 'tool-status',
            toolName: tool.definition.name,
            status: 'done',
            result: result.data
              ? `${Array.isArray(result.data) ? result.data.length + ' items' : '1 item'}`
              : undefined,
          };

          // Add rich content from tool
          if (result.richContent) {
            result.richContent.forEach(block => assistantBlocks.push(block));
          } else {
            assistantBlocks.push({ type: 'markdown', content: result.summary });
          }

          // Add follow-ups
          assistantBlocks.push({ type: 'follow-ups', suggestions: getFollowUps(lastToolName) });

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, blocks: [...assistantBlocks] } : m
            )
          );
        } else {
          // Unknown slash command — tell user
          pushBlock({
            type: 'error',
            message: `Unknown command "/${slash.command}". Available: ${slashCommands.map(c => `/${c.name}`).join(', ')}`,
          });
        }
      } else {
        // ── Free-form query → agent loop ──────────────────────
        const currentApiKey = llmApiKeys[llmProvider];
        if (!currentApiKey) {
          const providerName =
            llmProvider === 'claude'
              ? 'Claude (Anthropic)'
              : llmProvider === 'chatgpt'
                ? 'ChatGPT (OpenAI)'
                : 'Gemini (Google)';
          pushBlock({
            type: 'error',
            message: `Please set your ${providerName} API key in Settings first.`,
          });
          setIsLoading(false);
          return;
        }

        // Build system prompt (lean — agent uses tools for data)
        let liveContext = '';
        try {
          liveContext = (await window.electronAPI.readFile(`${workspacePath}/project_context.md`)) || '';
        } catch (_) {}

        let currentItemContext = '';
        if (currentWorkItem) {
          currentItemContext = `
CURRENTLY VIEWING WORK ITEM:
- ID: ${currentWorkItem.id}
- Title: ${currentWorkItem.title}
- Type: ${currentWorkItem.type}
- Status: ${currentWorkItem.status}
- Assignee: ${currentWorkItem.assignee || 'Unassigned'}
- Content Preview: ${currentWorkItem.content.slice(0, 500)}${currentWorkItem.content.length > 500 ? '...' : ''}
${currentWorkItem.parentId ? `- Parent ID: ${currentWorkItem.parentId}` : ''}

When the user asks about "this item" or "the current item", they're referring to the work item above.
`;
        }

        // Build a brief context summary (not the full item dump)
        const workspaceContext = buildLLMContext(items, config, userInput, 2000);

        const systemPrompt = `You are an AI Program Management assistant with access to tools to search, create, update, and analyze work items.

${liveContext}

${currentItemContext}

${workspaceContext}

AVAILABLE ACTIONS:
- Statuses: ${config.statuses.join(', ')}
- Types: ${config.types.join(', ')}
- Team Members: ${config.users.length > 0 ? config.users.join(', ') : 'None configured'}

TOOL USAGE GUIDELINES:
- Use search_items to find items by keyword, ID, or description before creating or updating.
- Use get_item_detail to get full details of a specific item.
- Use get_project_summary for overview/dashboard questions.
- Use list_items to filter items by status, type, or assignee.
- Use create_work_item ONLY when the user explicitly asks to CREATE or ADD a new item.
- Use update_work_item when the user wants to EDIT, UPDATE, MODIFY, CHANGE, or REASSIGN an existing item.
- Use create_personal_note and update_personal_note when the user explicitly asks to create or update their Personal Notes in "My Space".
- When referencing items by partial ID (e.g., "ending 42" or "42"), search for them first.
- The search_items and get_item_detail tools ALSO search through the user's personal notes.
- Auto-correct status, type, and assignee to match the available values above.
- Only change the fields the user explicitly mentions when updating.

Always be concise and helpful. Reference item IDs in your responses.`;

        // Build conversation from message history
        const llmMessages = messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .flatMap(m => {
            const textContent = m.blocks
              .filter(b => b.type === 'markdown')
              .map(b => (b as { type: 'markdown'; content: string }).content)
              .join('\n');
            if (!textContent) return [];
            return [{ role: m.role as 'user' | 'assistant', content: textContent }];
          });

        // Add the current user message
        llmMessages.push({ role: 'user', content: userInput });

        const llmConfig = {
          provider: llmProvider,
          apiKey: currentApiKey,
          model: llmModel || undefined,
        };

        // Run the agent loop
        const steps = runAgentLoop(
          llmConfig,
          llmMessages,
          systemPrompt,
          toolRegistry,
          toolContext,
          5
        );

        for await (const step of steps) {
          switch (step.type) {
            case 'progress':
              pushBlock({ type: 'progress', message: step.message });
              break;

            case 'tool_call':
              pushBlock({ type: 'tool-status', toolName: step.toolName, status: 'running' });
              break;

            case 'tool_result': {
              lastToolName = step.toolName;
              // Update the last tool-status block from running → done
              const lastIdx = assistantBlocks.findLastIndex(
                b => b.type === 'tool-status' && (b as any).toolName === step.toolName && (b as any).status === 'running'
              );
              if (lastIdx >= 0) {
                assistantBlocks[lastIdx] = {
                  type: 'tool-status',
                  toolName: step.toolName,
                  status: 'done',
                  result: step.summary.split('\n')[0].slice(0, 60),
                };
              }
              // Add rich content from tool result
              if (step.richContent) {
                step.richContent.forEach(block => assistantBlocks.push(block));
              }
              // Update messages
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, blocks: [...assistantBlocks] } : m
                )
              );
              break;
            }

            case 'text':
              // Remove any lingering progress blocks
              const progressIndices: number[] = [];
              assistantBlocks.forEach((b, i) => {
                if (b.type === 'progress') progressIndices.push(i);
              });
              for (let i = progressIndices.length - 1; i >= 0; i--) {
                assistantBlocks.splice(progressIndices[i], 1);
              }
              pushBlock({ type: 'markdown', content: step.content });
              break;

            case 'error':
              pushBlock({ type: 'error', message: step.message });
              break;
          }
        }

        // Add follow-up suggestions at the end
        pushBlock({ type: 'follow-ups', suggestions: getFollowUps(lastToolName) });
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      pushBlock({ type: 'error', message: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────

  const hasApiKey = !!llmApiKeys[llmProvider];

  return (
    <div className="w-80 border-l bg-white flex flex-col h-full">
      <div className="p-4 border-b font-semibold bg-gray-50 flex items-center justify-between">
        <span>PM Assistant</span>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-gray-400 hover:text-gray-600"
            title="Clear chat"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto p-3 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-gray-400 text-sm text-center mt-8 space-y-4 px-2">
            <p className="text-xs text-gray-400 leading-relaxed">
              Ask about your workspace, manage tasks, or work with your personal notes.
            </p>
            <div className="text-left space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1">Try asking</p>
              {[
                'What is the overall status of the project?',
                'Show me everything assigned to me',
                'Which items are In Progress?',
                'Create a personal note about today\'s standup',
                'Who has the most tasks assigned?',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full text-left text-xs px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors leading-relaxed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          <MessageRenderer
            key={m.id}
            message={m}
            onNavigateToItem={handleNavigateToItem}
            onSendMessage={handleSendMessage}
          />
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-2 text-xs text-gray-400 italic">
            <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Thinking...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form id="chat-form" onSubmit={handleSubmit} className="p-3 border-t bg-gray-50 relative">
        <SlashCommandMenu
          commands={slashCommands}
          filter={slashFilter}
          onSelect={handleSlashSelect}
          visible={showSlashMenu}
        />
        <input
          ref={inputRef}
          className="w-full p-2 border rounded text-sm outline-none focus:border-blue-500"
          value={input}
          placeholder={hasApiKey ? 'Ask a question or type / for commands...' : 'Set API key in Settings...'}
          onChange={handleInputChange}
          disabled={!workspacePath}
        />
        {!hasApiKey && workspacePath && (
          <div className="text-xs text-red-500 mt-1">API Key missing. Add in Settings.</div>
        )}
      </form>
    </div>
  );
}
