import { WorkspaceEntry } from '../types';

const REGISTRY_FILE = 'workspace-registry.json';
const MAX_ENTRIES = 200;

export async function loadRegistry(): Promise<WorkspaceEntry[]> {
  try {
    const raw = await window.electronAPI.readUserData(REGISTRY_FILE);
    if (!raw) return [];
    const entries = JSON.parse(raw) as WorkspaceEntry[];
    // Sort by lastOpenedAt descending (most recent first)
    return entries.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  } catch {
    return [];
  }
}

export async function saveRegistry(entries: WorkspaceEntry[]): Promise<void> {
  await window.electronAPI.writeUserData(REGISTRY_FILE, JSON.stringify(entries, null, 2));
}

export function addEntry(entries: WorkspaceEntry[], path: string, name: string): WorkspaceEntry[] {
  const now = new Date().toISOString();
  const existing = entries.find(e => e.path === path);
  if (existing) {
    const updated = entries.map(e =>
      e.path === path ? { ...e, name, lastOpenedAt: now } : e
    );
    return updated.sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  }
  const newEntry: WorkspaceEntry = { path, name, lastOpenedAt: now };
  const updated = [newEntry, ...entries];
  // Prune oldest if over limit
  return updated.slice(0, MAX_ENTRIES);
}

export function removeEntry(entries: WorkspaceEntry[], path: string): WorkspaceEntry[] {
  return entries.filter(e => e.path !== path);
}

export function updateEntryUser(entries: WorkspaceEntry[], path: string, user: string): WorkspaceEntry[] {
  return entries.map(e => e.path === path ? { ...e, lastUser: user } : e);
}

export function updateEntryStats(
  entries: WorkspaceEntry[],
  path: string,
  stats: { itemCount: number; inProgressCount: number }
): WorkspaceEntry[] {
  return entries.map(e => e.path === path ? { ...e, stats } : e);
}

export function searchEntries(entries: WorkspaceEntry[], query: string): WorkspaceEntry[] {
  if (!query.trim()) return entries;
  const q = query.toLowerCase();
  return entries.filter(e =>
    e.name.toLowerCase().includes(q) || e.path.toLowerCase().includes(q)
  );
}

export function getBasename(path: string): string {
  // Works for both / and \ separators
  return path.split(/[/\\]/).filter(Boolean).pop() || path;
}
