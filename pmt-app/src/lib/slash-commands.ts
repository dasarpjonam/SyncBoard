import { SlashCommand, SlashCommandInfo } from '../types/chat';
import { ToolRegistry } from './tool-registry';

/**
 * Parse user input to detect a slash command.
 * Returns null if the input doesn't start with `/`.
 *
 * Examples:
 *   "/search auth login" → { command: "search", rawArgs: "auth login" }
 *   "/summary" → { command: "summary", rawArgs: "" }
 *   "/list status:In Progress" → { command: "list", rawArgs: "status:In Progress" }
 *   "create a bug" → null (no slash)
 */
export function parseSlashCommand(input: string): SlashCommand | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^\/(\w+)\s*(.*)/s);
  if (!match) return null;
  return { command: match[1].toLowerCase(), rawArgs: match[2].trim() };
}

/**
 * Parse raw slash command arguments into structured tool args.
 *
 * Supports two patterns:
 *   1. Key:value pairs: "status:In Progress assignee:Alice"
 *   2. Positional query: "auth login" (becomes {query: "auth login"})
 *
 * Key:value pairs are extracted first; remaining text becomes the "query" arg.
 *
 * Example:
 *   "auth status:In Progress assignee:Alice"
 *   → { query: "auth", status: "In Progress", assignee: "Alice" }
 */
export function parseSlashArgs(rawArgs: string): Record<string, any> {
  if (!rawArgs) return {};

  const args: Record<string, any> = {};
  let remaining = rawArgs;

  // Extract key:value pairs (key is a word, value goes until next key: or end)
  const kvRegex = /(\w+):([^:]+?)(?=\s+\w+:|$)/g;
  let match: RegExpExecArray | null;
  const kvSpans: [number, number][] = [];

  while ((match = kvRegex.exec(rawArgs)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    args[key] = value;
    kvSpans.push([match.index, match.index + match[0].length]);
  }

  // Remove matched key:value spans to get the remaining positional text
  if (kvSpans.length > 0) {
    let positional = rawArgs;
    // Remove spans in reverse order to preserve indices
    for (let i = kvSpans.length - 1; i >= 0; i--) {
      positional =
        positional.substring(0, kvSpans[i][0]) +
        positional.substring(kvSpans[i][1]);
    }
    remaining = positional.trim();
  }

  // If there's remaining text, treat it as the "query" argument
  if (remaining) {
    args.query = remaining;
  }

  return args;
}

/**
 * Get all available slash commands from the registry.
 */
export function getAvailableCommands(registry: ToolRegistry): SlashCommandInfo[] {
  return registry.getSlashCommands();
}
