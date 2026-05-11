import { WorkItem, WorkspaceConfig, PersonalTodo } from './index';
import { WorkspaceSummary } from '../lib/context-builder';

// Re-export for convenience
export type WorkspaceSummaryData = WorkspaceSummary;

// ─── Rich Content Blocks ───────────────────────────────────────────

export type ChatContentBlock =
  | { type: 'markdown'; content: string }
  | { type: 'progress'; message: string }
  | { type: 'item-card'; item: WorkItem }
  | { type: 'item-list'; items: WorkItem[]; title?: string }
  | { type: 'summary'; data: WorkspaceSummaryData }
  | { type: 'button'; label: string; action: string; args?: Record<string, any> }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'tool-status'; toolName: string; status: 'running' | 'done'; result?: string }
  | { type: 'follow-ups'; suggestions: string[] }
  | { type: 'error'; message: string };

// ─── Chat Messages ─────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  blocks: ChatContentBlock[];
  timestamp: string;
}

// ─── Tool System ───────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema
  slashCommand?: string; // e.g., "search" → user types /search
}

export interface ToolResult {
  /** Text summary for the LLM to consume in the conversation */
  summary: string;
  /** Structured content blocks for the UI to render */
  richContent?: ChatContentBlock[];
  /** Raw data for follow-up tool calls or further processing */
  data?: any;
}

export interface ToolContext {
  items: WorkItem[];
  personalNotes: WorkItem[];
  config: WorkspaceConfig;
  workspacePath: string;
  currentUser?: string;
  currentWorkItem?: WorkItem; // Added: currently open work item for context-aware tools
  // Settings
  llmProvider?: string;
  llmModel?: string | null;
  llmApiKeys?: Record<string, string>;
  availableUsers?: string[];
  setCurrentUser?: (user: string) => Promise<void>;
  setLLMProvider?: (provider: string) => void;
  setLLMModel?: (model: string) => void;
  setApiKey?: (provider: string, apiKey: string) => void;
  // Work items
  addItem: (item: WorkItem) => void;
  updateItem: (item: WorkItem) => void;
  deleteItem: (id: string) => Promise<boolean>;
  // Personal notes
  addPersonalNote: (item: WorkItem) => void;
  updatePersonalNote: (item: WorkItem) => void;
  deletePersonalNote: (id: string) => Promise<boolean>;
  // Personal todos
  todos: PersonalTodo[];
  addTodo: (todo: PersonalTodo) => Promise<void>;
  updateTodo: (todo: PersonalTodo) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleTodoDone: (id: string) => Promise<void>;
  // Electron API
  electronAPI: typeof window.electronAPI;
}

export type ToolHandler = (
  args: Record<string, any>,
  context: ToolContext
) => Promise<ToolResult>;

// ─── Agent Loop ────────────────────────────────────────────────────

export type AgentStep =
  | { type: 'progress'; message: string }
  | { type: 'tool_call'; toolName: string; args: Record<string, any> }
  | { type: 'tool_result'; toolName: string; summary: string; richContent?: ChatContentBlock[] }
  | { type: 'text'; content: string }
  | { type: 'error'; message: string };

// ─── Slash Commands ────────────────────────────────────────────────

export interface SlashCommand {
  command: string;
  rawArgs: string;
}

export interface SlashCommandInfo {
  name: string;
  description: string;
  toolName: string;
}
