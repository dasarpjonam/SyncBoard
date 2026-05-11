import { ToolDefinition, ToolHandler } from '../../types/chat';
import { PersonalTodo } from '../../types';
import { createTodo } from '../personal-store';

// ─── list_todos ────────────────────────────────────────────────────

export const listTodosToolDefinition: ToolDefinition = {
  name: 'list_todos',
  description: 'List personal todos, optionally filtered by completion status, due date, or overdue status.',
  slashCommand: 'todos',
  parameters: {
    type: 'object',
    properties: {
      done: { type: 'boolean', description: 'Filter by completion status (true=done, false=not done)' },
      overdue: { type: 'boolean', description: 'Show only overdue todos (not done + past targetDate)' },
      dueBefore: { type: 'string', description: 'Show todos due before this date (YYYY-MM-DD)' },
      dueAfter: { type: 'string', description: 'Show todos due after this date (YYYY-MM-DD)' },
    },
  },
};

export const listTodosToolHandler: ToolHandler = async (args, context) => {
  const { done, overdue, dueBefore, dueAfter } = args;
  const { todos } = context;

  if (!context.currentUser) {
    return {
      summary: 'No user selected. Select a user in Settings to manage personal todos.',
      richContent: [
        { type: 'markdown', content: '⚠️ No user selected. Select a user in Settings to manage personal todos.' },
      ],
    };
  }

  let results: PersonalTodo[] = [...todos];

  // Filter by done status
  if (typeof done === 'boolean') {
    results = results.filter(t => t.done === done);
  }

  // Filter by overdue
  if (overdue) {
    const now = new Date().toISOString().split('T')[0];
    results = results.filter(t => !t.done && t.targetDate && t.targetDate < now);
  }

  // Filter by due date range
  if (dueBefore) {
    results = results.filter(t => t.targetDate && t.targetDate <= dueBefore);
  }
  if (dueAfter) {
    results = results.filter(t => t.targetDate && t.targetDate >= dueAfter);
  }

  // Sort: overdue first, then by target date, then by created date descending
  results.sort((a, b) => {
    const now = Date.now();
    const aDate = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
    const bDate = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
    const aOverdue = !a.done && aDate < now ? 1 : 0;
    const bOverdue = !b.done && bDate < now ? 1 : 0;
    
    if (bOverdue !== aOverdue) return bOverdue - aOverdue;
    if (aDate !== bDate) return aDate - bDate;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (results.length === 0) {
    return {
      summary: 'No todos found matching the filters.',
      richContent: [
        { type: 'markdown', content: '✓ No todos found.' },
      ],
    };
  }

  const summary = results.map(t => {
    let line = `${t.done ? '✓' : '○'} ${t.text}`;
    if (t.targetDate) {
      const date = new Date(t.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = date.getTime() - today.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days === 0) line += ' [Today]';
      else if (days < 0) line += ` [${Math.abs(days)}d overdue]`;
      else if (days <= 7) line += ` [in ${days}d]`;
      else line += ` [${t.targetDate}]`;
      
      if (t.recurrence) line += ` (${t.recurrence})`;
    }
    return line;
  }).join('\n');

  const overdueCount = results.filter(t => {
    const now = new Date().toISOString().split('T')[0];
    return !t.done && t.targetDate && t.targetDate < now;
  }).length;

  return {
    summary: `Found ${results.length} todo${results.length !== 1 ? 's' : ''}${overdueCount > 0 ? ` (${overdueCount} overdue)` : ''}:\n${summary}`,
    richContent: [
      { type: 'markdown', content: `**Todos (${results.length})**${overdueCount > 0 ? ` — ${overdueCount} overdue` : ''}\n\n${summary}` },
    ],
    data: results,
  };
};

// ─── create_todo ───────────────────────────────────────────────────

export const createTodoToolDefinition: ToolDefinition = {
  name: 'create_todo',
  description: 'Create a new personal todo item.',
  slashCommand: 'newtodo',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The todo text' },
      targetDate: { type: 'string', description: 'Optional due date (YYYY-MM-DD)' },
      recurrence: { type: 'string', enum: ['weekly', 'monthly'], description: 'Optional recurrence pattern' },
    },
    required: ['text'],
  },
};

export const createTodoToolHandler: ToolHandler = async (args, context) => {
  const { text, targetDate, recurrence } = args;

  if (!context.currentUser) {
    return {
      summary: 'No user selected.',
      richContent: [{ type: 'markdown', content: '⚠️ No user selected.' }],
    };
  }

  const todo = createTodo(text, targetDate, recurrence);
  await context.addTodo(todo);

  return {
    summary: `Created todo: ${text}`,
    richContent: [
      { type: 'markdown', content: `✓ Created todo:\n\n**${text}**${targetDate ? `\nDue: ${targetDate}` : ''}${recurrence ? `\nRecurrence: ${recurrence}` : ''}` },
    ],
  };
};

// ─── update_todo ───────────────────────────────────────────────────

export const updateTodoToolDefinition: ToolDefinition = {
  name: 'update_todo',
  description: 'Update an existing personal todo (text, date, recurrence, or done status).',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The todo ID' },
      text: { type: 'string', description: 'New text' },
      targetDate: { type: 'string', description: 'New due date (YYYY-MM-DD)' },
      recurrence: { type: 'string', enum: ['weekly', 'monthly'], description: 'Recurrence pattern (weekly or monthly)' },
      done: { type: 'boolean', description: 'Mark as done or undone' },
    },
    required: ['id'],
  },
};

export const updateTodoToolHandler: ToolHandler = async (args, context) => {
  const { id, text, targetDate, recurrence, done } = args;

  if (!context.currentUser) {
    return {
      summary: 'No user selected.',
      richContent: [{ type: 'markdown', content: '⚠️ No user selected.' }],
    };
  }

  const todo = context.todos.find(t => t.id === id);
  if (!todo) {
    return {
      summary: `Todo not found: ${id}`,
      richContent: [{ type: 'markdown', content: `❌ Todo not found: ${id}` }],
    };
  }

  const updates: Partial<PersonalTodo> = { updatedAt: new Date().toISOString() };
  if (text !== undefined) updates.text = text;
  if (targetDate !== undefined) updates.targetDate = targetDate || undefined;
  if (recurrence !== undefined) updates.recurrence = recurrence ? (recurrence as 'weekly' | 'monthly') : undefined;
  if (done !== undefined) {
    updates.done = done;
    if (done) updates.doneAt = new Date().toISOString();
    else updates.doneAt = undefined;
  }

  const updated = { ...todo, ...updates };
  await context.updateTodo(updated);

  return {
    summary: `Updated todo: ${updated.text}`,
    richContent: [
      { type: 'markdown', content: `✓ Updated todo:\n\n**${updated.text}**${updated.targetDate ? `\nDue: ${updated.targetDate}` : ''}${updated.recurrence ? `\nRecurrence: ${updated.recurrence}` : ''}${updated.done ? '\n✓ Done' : ''}` },
    ],
  };
};

// ─── delete_todo ───────────────────────────────────────────────────

export const deleteTodoToolDefinition: ToolDefinition = {
  name: 'delete_todo',
  description: 'Delete a personal todo by ID.',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'The todo ID to delete' },
    },
    required: ['id'],
  },
};

export const deleteTodoToolHandler: ToolHandler = async (args, context) => {
  const { id } = args;

  if (!context.currentUser) {
    return {
      summary: 'No user selected.',
      richContent: [{ type: 'markdown', content: '⚠️ No user selected.' }],
    };
  }

  const todo = context.todos.find(t => t.id === id);
  if (!todo) {
    return {
      summary: `Todo not found: ${id}`,
      richContent: [{ type: 'markdown', content: `❌ Todo not found: ${id}` }],
    };
  }

  await context.deleteTodo(id);

  return {
    summary: `Deleted todo: ${todo.text}`,
    richContent: [
      { type: 'markdown', content: `✓ Deleted todo: **${todo.text}**` },
    ],
  };
};
