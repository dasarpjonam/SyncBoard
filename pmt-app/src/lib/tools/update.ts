import { ToolDefinition, ToolHandler } from '../../types/chat';
import { serializeMarkdownItem } from '../markdown';
import { ITEMS_FOLDER } from '../constants';

export const updateToolDefinition: ToolDefinition = {
  name: 'update_work_item',
  description:
    'Update or edit an EXISTING work item. Use this when the user wants to modify, change, update, edit, or reassign an existing item. Only change the fields the user mentions — leave other fields unchanged.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The full ID of the work item to update (e.g. ITEM-0001)',
      },
      title: { type: 'string', description: 'New title for the item' },
      type: {
        type: 'string',
        description: 'New type for the item. Must match one of the configured types.',
      },
      status: {
        type: 'string',
        description: 'New status for the item. Must match one of the configured statuses.',
      },
      assignee: {
        type: 'string',
        description: 'New assignee for the item. Must match a configured team member.',
      },
      content: { type: 'string', description: 'New detailed description' },
    },
    required: ['id'],
  },
};

export const updateToolHandler: ToolHandler = async (args, context) => {
  const existingItem = context.items.find(i => i.id === args.id);

  if (!existingItem) {
    return {
      summary: `Work item "${args.id}" not found.`,
      richContent: [{ type: 'error', message: `Item "${args.id}" not found.` }],
    };
  }

  // Merge only the provided fields
  const updatedItem = {
    ...existingItem,
    ...(args.title !== undefined && { title: args.title }),
    ...(args.type !== undefined && { type: args.type }),
    ...(args.status !== undefined && { status: args.status }),
    ...(args.assignee !== undefined && { assignee: args.assignee }),
    ...(args.content !== undefined && { content: args.content }),
    updatedAt: new Date().toISOString(),
  };

  // Serialize and write to disk
  const fileContent = serializeMarkdownItem(updatedItem);
  await context.electronAPI.writeFile(
    `${context.workspacePath}/${ITEMS_FOLDER}/${updatedItem.fileName}`,
    fileContent
  );

  // Update in-memory state
  context.updateItem(updatedItem);

  // Build change description
  const changes: string[] = [];
  if (args.title) changes.push(`title → "${args.title}"`);
  if (args.type) changes.push(`type → ${args.type}`);
  if (args.status) changes.push(`status → ${args.status}`);
  if (args.assignee) changes.push(`assignee → @${args.assignee}`);
  if (args.content) changes.push(`content updated`);

  const summary = `Updated [${updatedItem.id}] "${updatedItem.title}": ${changes.join(', ')}.`;

  return {
    summary,
    richContent: [
      { type: 'markdown', content: `✅ ${summary}` },
      { type: 'item-card', item: updatedItem },
    ],
    data: updatedItem,
  };
};
