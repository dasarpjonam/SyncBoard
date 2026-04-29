import { ToolDefinition, ToolHandler } from '../../types/chat';

export const detailToolDefinition: ToolDefinition = {
  name: 'get_item_detail',
  description:
    'Get full details of a specific work item by its ID, including title, type, status, assignee, content, comments, and parent/child relationships.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The full ID of the work item (e.g. ITEM-0001)',
      },
    },
    required: ['id'],
  },
};

export const detailToolHandler: ToolHandler = async (args, context) => {
  const { id } = args;

  // Try exact match first, then partial match
  let item = context.items.find(i => i.id === id);
  if (!item) {
    // Try partial match (e.g., "0001" matches "ITEM-0001")
    const digits = id.replace(/\D/g, '');
    if (digits) {
      item = context.items.find(i => i.id.endsWith(digits) || i.id.includes(digits));
    }
  }

  if (!item) {
    return {
      summary: `Work item "${id}" not found.`,
      richContent: [{ type: 'error', message: `Item "${id}" not found.` }],
    };
  }

  // Find children
  const children = context.items.filter(i => i.parentId === item!.id);
  // Find parent
  const parent = item.parentId
    ? context.items.find(i => i.id === item!.parentId)
    : null;

  const lines: string[] = [
    `[${item.id}] ${item.title}`,
    `Type: ${item.type} | Status: ${item.status}${item.assignee ? ` | Assigned: @${item.assignee}` : ''}`,
  ];

  if (parent) {
    lines.push(`Parent: [${parent.id}] ${parent.title}`);
  }
  if (children.length > 0) {
    lines.push(
      `Children (${children.length}): ${children.map(c => `[${c.id}] ${c.title} (${c.status})`).join(', ')}`
    );
  }
  if (item.comments && item.comments.length > 0) {
    lines.push(`Comments: ${item.comments.length}`);
  }

  lines.push('');
  lines.push(`Content:\n${item.content}`);

  return {
    summary: lines.join('\n'),
    richContent: [{ type: 'item-card', item }],
    data: item,
  };
};
