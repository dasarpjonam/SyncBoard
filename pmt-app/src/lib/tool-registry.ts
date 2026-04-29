import { ToolDefinition, ToolHandler, ToolResult, ToolContext, SlashCommandInfo } from '../types/chat';
import { WorkspaceConfig } from '../types';

/**
 * Fuzzy-match a user-provided value against a list of valid options.
 * Used to auto-correct status, type, and assignee values from LLM tool calls.
 */
export function findBestMatch(input: string, options: string[]): string | null {
  if (!input || options.length === 0) return null;

  const lower = input.toLowerCase().trim();

  // Exact match (case-insensitive)
  const exact = options.find(opt => opt.toLowerCase() === lower);
  if (exact) return exact;

  // Contains match
  const contains = options.find(
    opt => opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase())
  );
  if (contains) return contains;

  // Remove spaces/dashes and try again
  const normalized = lower.replace(/[\s-]/g, '');
  const normalizedMatch = options.find(
    opt => opt.toLowerCase().replace(/[\s-]/g, '') === normalized
  );
  if (normalizedMatch) return normalizedMatch;

  return null;
}

/**
 * Normalize tool arguments to match workspace configuration values.
 * Auto-corrects status, type, and assignee fields.
 */
export function normalizeToolArgs(
  args: Record<string, any>,
  config: WorkspaceConfig
): Record<string, any> {
  const normalized = { ...args };

  if (args.status) {
    const match = findBestMatch(args.status, config.statuses);
    if (match) {
      normalized.status = match;
      if (match !== args.status) {
        console.log(`[Auto-correction] status: "${args.status}" → "${match}"`);
      }
    }
  }

  if (args.type) {
    const match = findBestMatch(args.type, config.types);
    if (match) {
      normalized.type = match;
      if (match !== args.type) {
        console.log(`[Auto-correction] type: "${args.type}" → "${match}"`);
      }
    }
  }

  if (args.assignee && config.users.length > 0) {
    const match = findBestMatch(args.assignee, config.users);
    if (match) {
      normalized.assignee = match;
      if (match !== args.assignee) {
        console.log(`[Auto-correction] assignee: "${args.assignee}" → "${match}"`);
      }
    }
  }

  return normalized;
}

/**
 * Registry for all available tools.
 * Manages tool definitions (JSON schemas for LLM), handlers (execution logic),
 * and slash command mappings.
 */
export class ToolRegistry {
  private tools = new Map<string, { definition: ToolDefinition; handler: ToolHandler }>();

  /**
   * Register a tool with its definition and handler.
   */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }

  /**
   * Get tool definitions in the format expected by callLLM().
   * Returns Gemini-style functionDeclarations (llm-providers.ts converts per-provider).
   */
  getDefinitions(): { functionDeclarations: any[] } {
    return {
      functionDeclarations: Array.from(this.tools.values()).map(t => ({
        name: t.definition.name,
        description: t.definition.description,
        parameters: t.definition.parameters,
      })),
    };
  }

  /**
   * Execute a tool by name with the given arguments.
   * Auto-corrects arguments against workspace config before execution.
   */
  async execute(
    name: string,
    args: Record<string, any>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { summary: `Unknown tool: ${name}` };
    }

    // Auto-correct args against workspace config
    const normalizedArgs = normalizeToolArgs(args, context.config);
    return tool.handler(normalizedArgs, context);
  }

  /**
   * Get the tool associated with a slash command name.
   */
  getToolBySlashCommand(command: string): { definition: ToolDefinition; handler: ToolHandler } | undefined {
    for (const [, tool] of this.tools) {
      if (tool.definition.slashCommand === command) {
        return tool;
      }
    }
    return undefined;
  }

  /**
   * Get all available slash commands with descriptions.
   */
  getSlashCommands(): SlashCommandInfo[] {
    const commands: SlashCommandInfo[] = [];
    for (const [, tool] of this.tools) {
      if (tool.definition.slashCommand) {
        commands.push({
          name: tool.definition.slashCommand,
          description: tool.definition.description,
          toolName: tool.definition.name,
        });
      }
    }
    return commands;
  }

  /**
   * Check if a tool exists.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }
}
