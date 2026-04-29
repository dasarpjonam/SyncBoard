import { ToolDefinition, ToolHandler } from '../../types/chat';
import { generateWorkItemId } from '../id-generator';
import { serializeMarkdownItem } from '../markdown';
import { ITEMS_FOLDER } from '../constants';
import { WorkItem } from '../../types';

export const createToolDefinition: ToolDefinition = {
  name: 'create_work_item',
  description:
    'Create a NEW work item (task, bug, feature, etc.) in the workspace. ONLY use this when the user explicitly asks to CREATE a new item. Auto-correct status, type, and assignee to match configured values.',
  slashCommand: 'create',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The title of the work item' },
      type: {
        type: 'string',
        description:
          'The type of the item (e.g. Task, Bug). Must match one of the configured types.',
      },
      status: {
        type: 'string',
        description:
          'The status of the item (e.g. To Do, In Progress). Must match one of the configured statuses.',
      },
      assignee: {
        type: 'string',
        description: 'The person assigned to the item. Must match a configured team member.',
      },
      content: {
        type: 'string',
        description: 'The detailed description in markdown format',
      },
      parentId: {
        type: 'string',
        description: 'Parent item ID if this is a child item',
      },
    },
    required: ['title', 'type', 'status'],
  },
};

export const createToolHandler: ToolHandler = async (args, context) => {
  const id = generateWorkItemId(context.items);

  const newItem: WorkItem = {
    id,
    title: args.title,
    type: args.type || context.config.types[0],
    status: args.status || context.config.statuses[0],
    assignee: args.assignee,
    content: args.content || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileName: `${id}.md`,
    parentId: args.parentId,
  };

  // Serialize and write to disk
  const fileContent = serializeMarkdownItem(newItem);
  await context.electronAPI.ensureDir(`${context.workspacePath}/${ITEMS_FOLDER}`);
  await context.electronAPI.writeFile(
    `${context.workspacePath}/${ITEMS_FOLDER}/${newItem.fileName}`,
    fileContent
  );

  // Update in-memory state
  context.addItem(newItem);

  const summary = `Created ${newItem.type} [${newItem.id}] "${newItem.title}"${newItem.assignee ? ` assigned to @${newItem.assignee}` : ''} with status "${newItem.status}".`;

  return {
    summary,
    richContent: [
      { type: 'markdown', content: `✅ ${summary}` },
      { type: 'item-card', item: newItem },
    ],
    data: newItem,
  };
};
