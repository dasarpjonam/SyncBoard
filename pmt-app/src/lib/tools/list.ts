import { ToolDefinition, ToolHandler } from '../../types/chat';
import { WorkItem } from '../../types';

export const listToolDefinition: ToolDefinition = {
  name: 'list_items',
  description:
    'List work items filtered by status, type, or assignee. Unlike search, this does exact filtering rather than keyword matching.',
  slashCommand: 'list',
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string', description: 'Filter by status (e.g. "In Progress", "To Do")' },
      type: { type: 'string', description: 'Filter by type (e.g. "Bug", "Task")' },
      assignee: { type: 'string', description: 'Filter by assignee name' },
      parentId: {
        type: 'string',
        description: 'Only show children of this parent item',
      },
      limit: { type: 'number', description: 'Max results (default 20)' },
    },
  },
};

export const listToolHandler: ToolHandler = async (args, context) => {
  const { status, type, assignee, parentId, limit = 20 } = args;

  let results: WorkItem[] = [...context.items];

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
  if (parentId) {
    results = results.filter(item => item.parentId === parentId);
  }

  // Sort by most recently updated
  results.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  results = results.slice(0, limit);

  // Build filter description
  const filters: string[] = [];
  if (status) filters.push(`status="${status}"`);
  if (type) filters.push(`type="${type}"`);
  if (assignee) filters.push(`assignee="${assignee}"`);
  if (parentId) filters.push(`parent="${parentId}"`);
  const filterDesc = filters.length > 0 ? filters.join(', ') : 'all items';

  if (results.length === 0) {
    return {
      summary: `No items found matching filters: ${filterDesc}.`,
      richContent: [
        { type: 'markdown', content: `No items found for ${filterDesc}.` },
      ],
    };
  }

  const summary = results
    .map(
      item =>
        `[${item.id}] ${item.title} — ${item.type} | ${item.status}${item.assignee ? ` | @${item.assignee}` : ''}`
    )
    .join('\n');

  return {
    summary: `Found ${results.length} item(s) (${filterDesc}):\n${summary}`,
    richContent: [
      { type: 'item-list', items: results, title: `List: ${filterDesc}` },
    ],
    data: results,
  };
};
