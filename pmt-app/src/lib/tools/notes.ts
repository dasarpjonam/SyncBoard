import { ToolDefinition, ToolHandler } from '../../types/chat';
import { generateWorkItemId } from '../id-generator';
import { serializeMarkdownItem } from '../markdown';
import { WorkItem } from '../../types';

export const createPersonalNoteToolDefinition: ToolDefinition = {
  name: 'create_personal_note',
  description:
    'Create a NEW personal note in the user\'s "My Space". Use this when the user explicitly asks to create a note, draft, or meeting note.',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'The title of the personal note' },
      content: { type: 'string', description: 'The detailed content of the note in markdown format' },
    },
    required: ['title'],
  },
};

export const createPersonalNoteToolHandler: ToolHandler = async (args, context) => {
  if (!context.currentUser) {
    return { summary: 'Failed to create personal note: No user selected.' };
  }

  const id = generateWorkItemId(context.personalNotes);

  const newNote: WorkItem = {
    id,
    title: args.title,
    type: 'Note',
    status: 'Draft',
    assignee: context.currentUser,
    content: args.content || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileName: `${id}.md`,
  };

  const fileContent = serializeMarkdownItem(newNote);
  const dirPath = `${context.workspacePath}/.syncboard/users/${context.currentUser}/notes`;
  
  await context.electronAPI.ensureDir(dirPath);
  await context.electronAPI.writeFile(`${dirPath}/${newNote.fileName}`, fileContent);

  context.addPersonalNote(newNote);

  const summary = `Created personal note [${newNote.id}] "${newNote.title}".`;

  return {
    summary,
    richContent: [
      { type: 'markdown', content: `✅ ${summary}` },
      { type: 'item-card', item: newNote },
    ],
    data: newNote,
  };
};

export const updatePersonalNoteToolDefinition: ToolDefinition = {
  name: 'update_personal_note',
  description:
    'Update an existing personal note. Use this when the user asks to edit or append to a personal note.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The ID of the personal note to update' },
      title: { type: 'string', description: 'New title for the note (if changing)' },
      content: { type: 'string', description: 'New full content for the note (if changing)' },
      appendContent: { type: 'string', description: 'Content to append to the end of the note' },
    },
    required: ['id'],
  },
};

export const updatePersonalNoteToolHandler: ToolHandler = async (args, context) => {
  if (!context.currentUser) {
    return { summary: 'Failed to update personal note: No user selected.' };
  }

  const note = context.personalNotes.find((n) => n.id === args.id);
  if (!note) {
    return { summary: `Could not find personal note with ID ${args.id}.` };
  }

  let newContent = note.content;
  if (args.content !== undefined) {
    newContent = args.content;
  }
  if (args.appendContent) {
    newContent = newContent + (newContent ? '\n\n' : '') + args.appendContent;
  }

  const updatedNote: WorkItem = {
    ...note,
    title: args.title !== undefined ? args.title : note.title,
    content: newContent,
    updatedAt: new Date().toISOString(),
  };

  const fileContent = serializeMarkdownItem(updatedNote);
  const dirPath = `${context.workspacePath}/.syncboard/users/${context.currentUser}/notes`;
  
  await context.electronAPI.ensureDir(dirPath);
  await context.electronAPI.writeFile(`${dirPath}/${updatedNote.fileName}`, fileContent);

  context.updatePersonalNote(updatedNote);

  const summary = `Updated personal note [${updatedNote.id}] "${updatedNote.title}".`;

  return {
    summary,
    richContent: [
      { type: 'markdown', content: `✅ ${summary}` },
      { type: 'item-card', item: updatedNote },
    ],
    data: updatedNote,
  };
};
