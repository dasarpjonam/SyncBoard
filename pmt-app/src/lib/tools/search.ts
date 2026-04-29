import { ToolDefinition, ToolHandler, ToolResult } from '../../types/chat';
import { searchItems } from '../context-builder';

export const searchToolDefinition: ToolDefinition = {
  name: 'search_items',
  description:
    'Search work items by keyword, ID, status, type, or assignee name. Returns matching items with their details.',
  slashCommand: 'search',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query — keywords, item IDs, assignee names, or descriptions',
      },
      status: { type: 'string', description: 'Filter by status (e.g. "In Progress")' },
      type: { type: 'string', description: 'Filter by type (e.g. "Bug")' },
      assignee: { type: 'string', description: 'Filter by assignee name' },
      limit: { type: 'number', description: 'Max results to return (default 10)' },
    },
    required: ['query'],
  },
};

export const searchToolHandler: ToolHandler = async (args, context) => {
  const { query, status, type, assignee, limit = 10 } = args;

  // Use the existing searchItems function for keyword matching
  let results = searchItems(context.items, query);

  // Apply optional filters
  if (status) {
    results = results.filter(
      item => item.status.toLowerCase() === status.toLowerCase()
    );
  }
  if (type) {
    results = results.filter(
      item => item.type.toLowerCase() === type.toLowerCase()
    );
  }
  if (assignee) {
    results = results.filter(
      item => item.assignee?.toLowerCase() === assignee.toLowerCase()
    );
  }

  // Limit results
  results = results.slice(0, limit);

  if (results.length === 0) {
    return {
      summary: `No work items found matching "${query}".`,
      richContent: [
        { type: 'markdown', content: `No results found for **"${query}"**.` },
      ],
    };
  }

  // Text summary for LLM
  const summary = results
    .map(
      item =>
        `[${item.id}] ${item.title} — ${item.type} | ${item.status}${item.assignee ? ` | @${item.assignee}` : ''}`
    )
    .join('\n');

  return {
    summary: `Found ${results.length} item(s):\n${summary}`,
    richContent: [
      { type: 'item-list', items: results, title: `Search: "${query}"` },
    ],
    data: results,
  };
};
