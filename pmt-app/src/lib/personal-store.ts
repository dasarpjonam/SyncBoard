/**
 * personal-store.ts
 * All I/O for global personal notes and todos stored in ~/.syncboard/users/{user}/
 * Uses home-path IPC calls (app:readHomePath, app:writeHomePath, etc.)
 */

import { WorkItem, PersonalTodo } from '../types';
import { parseMarkdownItem, serializeMarkdownItem } from './markdown';

// ─── Path Helpers ──────────────────────────────────────────────────

export function notesDir(user: string): string {
  return `users/${user}/notes`;
}

export function todosPath(user: string): string {
  return `users/${user}/todos.json`;
}

// ─── Notes ────────────────────────────────────────────────────────

export async function loadNotes(user: string): Promise<WorkItem[]> {
  try {
    await window.electronAPI.ensureHomePath(notesDir(user));
    const files = await window.electronAPI.readHomeDir(notesDir(user));
    const notes: WorkItem[] = [];
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      const content = await window.electronAPI.readHomePath(`${notesDir(user)}/${file}`);
      if (content) {
        const note = parseMarkdownItem(file, content);
        if (note) notes.push(note);
      }
    }
    return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (e) {
    console.error('[personal-store] loadNotes error:', e);
    return [];
  }
}

export async function saveNote(user: string, note: WorkItem): Promise<boolean> {
  try {
    await window.electronAPI.ensureHomePath(notesDir(user));
    const content = serializeMarkdownItem(note);
    return await window.electronAPI.writeHomePath(`${notesDir(user)}/${note.fileName}`, content);
  } catch (e) {
    console.error('[personal-store] saveNote error:', e);
    return false;
  }
}

export async function deleteNoteFile(user: string, fileName: string): Promise<boolean> {
  try {
    return await window.electronAPI.deleteHomePath(`${notesDir(user)}/${fileName}`);
  } catch {
    return false;
  }
}

/** Import .md files from a folder into the global notes dir. Returns {imported, skipped}. */
export async function importNotesFromFolder(
  user: string,
  folderPath: string,
  existingNotes: WorkItem[]
): Promise<{ imported: number; skipped: number }> {
  let imported = 0;
  let skipped = 0;
  try {
    const files = await window.electronAPI.readDir(folderPath);
    const existingFileNames = new Set(existingNotes.map(n => n.fileName));

    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      let targetFileName = file;

      if (existingFileNames.has(targetFileName)) {
        // Generate a unique name
        const base = file.replace(/\.md$/, '');
        let counter = 1;
        while (existingFileNames.has(`${base}-imported-${counter}.md`)) counter++;
        targetFileName = `${base}-imported-${counter}.md`;
      }

      const content = await window.electronAPI.readFile(`${folderPath}/${file}`);
      if (content) {
        await window.electronAPI.writeHomePath(`${notesDir(user)}/${targetFileName}`, content);
        existingFileNames.add(targetFileName);
        imported++;
      }
    }
  } catch (e) {
    console.error('[personal-store] importNotes error:', e);
  }
  return { imported, skipped };
}

// ─── Todos ────────────────────────────────────────────────────────

export async function loadTodos(user: string): Promise<PersonalTodo[]> {
  try {
    const raw = await window.electronAPI.readHomePath(todosPath(user));
    if (!raw) return [];
    return JSON.parse(raw) as PersonalTodo[];
  } catch (e) {
    console.error('[personal-store] loadTodos error (treating as empty):', e);
    return [];
  }
}

export async function saveTodos(user: string, todos: PersonalTodo[]): Promise<boolean> {
  try {
    await window.electronAPI.ensureHomePath(`users/${user}`);
    return await window.electronAPI.writeHomePath(todosPath(user), JSON.stringify(todos, null, 2));
  } catch (e) {
    console.error('[personal-store] saveTodos error:', e);
    return false;
  }
}

export function createTodo(text: string, targetDate?: string, recurrence?: 'weekly' | 'monthly'): PersonalTodo {
  const now = new Date().toISOString();
  return {
    id: `TODO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    done: false,
    targetDate,
    recurrence,
    createdAt: now,
    updatedAt: now,
  };
}

/** Advance a date by one recurrence period. Returns YYYY-MM-DD string. */
export function advanceRecurrenceDate(dateStr: string, recurrence: 'weekly' | 'monthly'): string {
  const date = new Date(dateStr + 'T00:00:00');
  if (recurrence === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date.toISOString().slice(0, 10);
}

/** When a recurring todo is completed, generate the next instance. */
export function generateRecurrenceClone(todo: PersonalTodo): PersonalTodo | null {
  if (!todo.recurrence || !todo.done) return null;
  const now = new Date().toISOString();
  const nextDate = todo.targetDate
    ? advanceRecurrenceDate(todo.targetDate, todo.recurrence)
    : undefined;
  return {
    ...createTodo(todo.text, nextDate, todo.recurrence),
    id: `TODO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
}

/** Import todos from a JSON string. Returns {imported, skipped}. */
export function importTodosFromJson(
  jsonString: string,
  existing: PersonalTodo[]
): { todos: PersonalTodo[]; imported: number; skipped: number } {
  let parsed: any[];
  try {
    parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) throw new Error('Not an array');
  } catch {
    throw new Error('Invalid JSON format. Expected an array of todos.');
  }

  const existingIds = new Set(existing.map(t => t.id));
  let imported = 0;
  let skipped = 0;
  const newTodos: PersonalTodo[] = [...existing];

  for (const item of parsed) {
    if (!item.id || !item.text || typeof item.done !== 'boolean') {
      skipped++;
      continue;
    }
    if (existingIds.has(item.id)) {
      skipped++;
      continue;
    }
    newTodos.push({
      id: item.id,
      text: item.text,
      done: item.done,
      targetDate: item.targetDate,
      recurrence: item.recurrence,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      doneAt: item.doneAt,
    });
    existingIds.add(item.id);
    imported++;
  }

  return { todos: newTodos, imported, skipped };
}

// ─── Migration ─────────────────────────────────────────────────────

const MIGRATION_KEY = 'notesMigrated_v1';

/** Returns true if migration has not yet been run for this user. */
export function isMigrationNeeded(user: string): boolean {
  return !localStorage.getItem(`${MIGRATION_KEY}_${user}`);
}

export function markMigrationDone(user: string): void {
  localStorage.setItem(`${MIGRATION_KEY}_${user}`, '1');
}
