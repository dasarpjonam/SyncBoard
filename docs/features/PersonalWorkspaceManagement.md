# SyncBoard: Workspace Switcher, Personal Space & Chat-Driven AI
## Final Implementation Plan

---

## Decisions & Improvements Incorporated

| Topic | Decision |
|---|---|
| Workspace count | Dozens to hundreds — searchable popover with keyboard nav |
| Workspace aliases | Folder name only |
| Per-workspace user | Yes — remember `currentUser` per workspace |
| Switch mid-edit | Confirmation dialog + autosave flush |
| Notes/Todos storage | **Global** — `~/.syncboard/users/{user}/` via new `getHomePath` IPC |
| Registry storage | **Electron `userData`** (not localStorage) — survives cache clears |
| Migration | One-time migration banner on first launch (old → new path) |
| Import | Notes from folder, Todos from JSON file |
| Recurrence | Weekly / Monthly only |
| Date picker | **Native `<input type="date">`** — no custom calendar component |
| Priorities | None |
| AI Assist | **Removed** — consolidated into Chat |
| Chat task extraction | **Inline proposal block** with Create buttons — no second LLM turn |
| `currentWorkItem` in tools | Added to `ToolContext` |
| Chat todos | Full read/write (4 new tools) |
| Workspace stats | Cached item count + in-progress count in registry entries |
| Quick-create on cards | Yes — wire existing `button` block type in `MessageRenderer` |

---

## Infrastructure Prerequisites (Do These First)

### New Electron IPC Calls

Two new IPC calls are required before any other phase can proceed.

**`preload.cjs` additions:**
```javascript
getHomePath: () => ipcRenderer.invoke('app:getHomePath'),
readUserData: (filename) => ipcRenderer.invoke('app:readUserData', filename),
writeUserData: (filename, content) => ipcRenderer.invoke('app:writeUserData', filename, content),
```

**Main process (`electron.cjs` or equivalent) additions:**
```javascript
ipcMain.handle('app:getHomePath', () => app.getPath('home'));
ipcMain.handle('app:readUserData', (_, filename) => {
  const filePath = path.join(app.getPath('userData'), filename);
  return fs.readFile(filePath, 'utf-8').catch(() => null);
});
ipcMain.handle('app:writeUserData', (_, filename, content) => {
  const filePath = path.join(app.getPath('userData'), filename);
  return fs.writeFile(filePath, content, 'utf-8').then(() => true).catch(() => false);
});
```

**`electron-mock.ts` additions:**
```typescript
getHomePath: async () => '/mock/home',
readUserData: async (filename) => localStorage.getItem(`userData_${filename}`) || null,
writeUserData: async (filename, content) => { localStorage.setItem(`userData_${filename}`, content); return true; },
```

`readUserData`/`writeUserData` will also serve the workspace registry (stored as `workspace-registry.json` in `userData`).

---

## Feature 1 — Multi-Workspace Registry

### Problem
Only one workspace path is stored. A PM needs a persistent, searchable list of all their project workspaces — active, reference, and archived.

### Registry Storage

Stored via `electronAPI.readUserData('workspace-registry.json')` / `writeUserData(...)` — not `localStorage`. This survives Chromium cache clears and is isolated to the app's user data.

```typescript
// src/lib/workspace-registry.ts
export interface WorkspaceEntry {
  path: string;
  name: string;           // basename of path
  lastOpenedAt: string;   // ISO timestamp
  lastUser?: string;      // remembered currentUser
  stats?: {               // cached, updated on workspace load
    itemCount: number;
    inProgressCount: number;
  };
}

export async function loadRegistry(electronAPI): Promise<WorkspaceEntry[]>
export async function saveRegistry(entries, electronAPI): Promise<void>
export function addEntry(entries, path, name): WorkspaceEntry[]  // max 200, prune oldest
export function removeEntry(entries, path): WorkspaceEntry[]
export function searchEntries(entries, query): WorkspaceEntry[]  // filter by name or path
```

### Sidebar: WorkspaceSwitcher Component

The Sidebar's bottom "Open/New Workspace" section is replaced by a `<WorkspaceSwitcher>` at the **top of the sidebar**, above the nav links.

**Expanded sidebar state:**
```
[ ▼ Q2-Launch-Project              ]   ← current workspace name + chevron
  ↓ (popover opens below)
  [🔍 Search workspaces...          ]
  [✓] Q2-Launch-Project  · 2 min ago  · 42 items · 3 in progress
  [ ] Client-Alpha       · yesterday  · 18 items · 1 in progress
  [ ] Archived-2024      · 3 mo ago   · 204 items
  [ ] ⚠ Missing-Project  · 1 yr ago   ← greyed, missing badge
  ─────────────────────────────────
  [📂 Open folder…]
```

**Collapsed sidebar state:** A folder icon — clicking opens a full-width centered popover with the same content.

**Keyboard navigation (required):**
- Opening the popover immediately focuses the search input
- `↑`/`↓` navigate entries
- `Enter` selects / switches
- `Escape` closes
- Typing anywhere in the popover filters (search is always active)

**Stats badge:** `itemCount` and `inProgressCount` are cached in the registry entry on each successful `loadWorkspace`. They are read from the cached value in the switcher (no disk read on popover open).

**Per-workspace user memory:** On `loadWorkspace(path)`, after items load, read `entry.lastUser` from the registry. If it matches a user in `config.users`, call `setCurrentUser(entry.lastUser)`. On `setCurrentUser` call, update the registry entry for the current path.

**Mid-edit confirmation:** A `isDirty` ref is maintained in `WorkspaceContext` (set to `true` when autosave debounce is pending, `false` after write completes). Before switching, check `isDirty`. If true, show a `confirm()` dialog. On confirm, flush the autosave immediately (`saveNow()`), then switch.

### Files

| File | Change |
|---|---|
| [NEW] `src/lib/workspace-registry.ts` | Registry helpers + `WorkspaceEntry` type |
| [NEW] `src/components/WorkspaceSwitcher.tsx` | Popover component (search, list, keyboard nav, stats) |
| [MODIFY] `src/store/WorkspaceContext.tsx` | Add `recentWorkspaces`, `addToRecentWorkspaces`, `removeFromRecentWorkspaces`, `isDirty` ref, per-workspace user restore |
| [MODIFY] `src/components/Sidebar.tsx` | Replace bottom workspace buttons with `<WorkspaceSwitcher>` at top |
| [MODIFY] `src/types/index.ts` | Add `WorkspaceEntry` |
| [MODIFY] `preload.cjs` | Add `getHomePath`, `readUserData`, `writeUserData` |
| [MODIFY] Main Electron process | Register 3 new IPC handlers |
| [MODIFY] `src/types/electron-mock.ts` | Mock 3 new IPC calls |

### Interaction Audit

| Interaction | Behavior |
|---|---|
| Click workspace name / chevron | Opens popover, focuses search box |
| Type in search box | Live filter by name or path substring |
| `↑`/`↓` arrows | Navigate list |
| `Enter` on entry (clean) | Load workspace, close popover |
| `Enter` on entry (dirty) | `confirm()` dialog → flush save → load |
| Hover entry | Show ✕ remove button |
| Click ✕ | Remove from registry (no file deletion) |
| Click "Open folder…" | Electron dir picker → add to registry → load |
| Greyed "Missing" entry | Click shows error toast, entry stays in list |
| `Escape` | Close popover |
| Click outside | Close popover |

---

## Feature 2 — Personal Space Redesign

### Global Storage Path

```
~/.syncboard/users/{currentUser}/
  notes/          ← .md files (existing format, moved here)
  todos.json      ← new
```

All note and todo file operations use `getHomePath()` as the base, **not** `workspacePath`.

### First-Launch Migration (Critical)

On app startup, after `currentUser` and `getHomePath()` are available, run a one-time migration check:

```
old path: {workspacePath}/.syncboard/users/{currentUser}/notes/
new path: {homePath}/.syncboard/users/{currentUser}/notes/
```

1. Check if old path has `.md` files AND new path does not yet exist (first migration only — flag stored in `localStorage('notesMigrated_v1')`)
2. If migration needed: show a non-blocking banner at top of Personal Space: *"N notes found in your old workspace location. Move them to your global Personal Space? [Move] [Keep Both] [Skip]"*
3. **Move**: copy files to new path, delete originals. Update any `attachments` references in workspace items that point to the old path.
4. **Keep Both**: copy but do not delete originals.
5. **Skip**: set migration flag, never ask again.

> [!WARNING]
> If the user has notes in multiple workspaces (different `workspacePath` values), migration only handles the *current* workspace's notes at the time of prompt. Notes from other workspaces are migrated the next time those workspaces are opened.

### New Layout: Three-Tab Personal Space

```
[ My Space — {currentUser} ]
[ Tabs: Notes | Todos | My Tasks ]

Notes:    [Left: note list + "+ New" + "Import…"] [Right: RichEditor, autosave only]
Todos:    [Full-width todo list with add row + "Import…"]
My Tasks: [Current workspace-scoped tasks assigned to current user — unchanged]
```

Active tab persisted in `localStorage('personalSpaceTab')`.

---

### Todos Data Model

```typescript
// src/types/index.ts
export interface PersonalTodo {
  id: string;
  text: string;
  done: boolean;
  targetDate?: string;           // YYYY-MM-DD
  recurrence?: 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
  doneAt?: string;
}
```

**Recurrence:** When a recurring todo is marked done, immediately create a clone with `done: false` and `targetDate` advanced (+7 days for weekly, +1 month for monthly). The completed original remains in the done list.

### Target Date UX — Native Input

Use `<input type="date" />` styled to blend with the app design. No custom calendar component.

**Add row:**
```
[○] [_______text input_______] [📅 date input — hidden until clicked] [+]
```
The date input renders as a small ghost button `"Add date"` until a date is picked. After picking:
```
[○] [_______text input_______] [May 15 ×] [+]
```
The `×` clears the date. Recurrence is set via a small adjacent selector: `○ None  ○ Weekly  ○ Monthly` — visible only when a date is set.

**Display on todo row:**
```
[○] Buy flight tickets                              [May 15]
[○] Write Q3 report                                 [Overdue]    ← red text
[○] Review standup notes                    [Weekly · May 20]
[○] Archive old projects                            (no badge)
```

Date chip color:
- No date → no chip (clean)
- Future → grey `May 15`
- Today → amber `Today`
- Overdue, not done → red `Overdue` or `3d overdue`

### Import

**Notes "Import…" button:** Opens Electron directory picker → reads all `.md` files → copies to `~/.syncboard/users/{user}/notes/` → deduplicates by filename (adds `-imported-N` suffix on conflict) → toast: *"Imported 12 notes (2 skipped as duplicates)"*.

**Todos "Import…" button:** Opens Electron file picker (`.json`) → validates array of `PersonalTodo` shape → merges by `id` (skips existing IDs) → saves → toast: *"Imported 8 todos (3 already existed)"*. Shows a clear validation error toast if the file isn't a valid `PersonalTodo[]`.

### Todo Interaction Audit

| Interaction | Behavior |
|---|---|
| Type text + Enter in add row | Create todo, clear text input, keep focus |
| Click "Add date" ghost | Activates native date input |
| Pick date | Date chip appears; recurrence selector appears |
| Click recurrence option | Sets recurrence on the todo |
| Click `×` on date chip | Clears date and recurrence |
| Click ○ on todo | Mark done; animate out; move to Completed group |
| Click ● on done todo | Mark undone; move back to active list |
| Recurring todo marked done | Clone created with next date; completion stays |
| Click todo text | In-place edit; Escape = cancel, Enter = commit |
| Hover todo row | Trash icon appears on right |
| Click trash | Delete; toast with "Undo" (5s) |
| Click "Undo" in toast | Restore deleted todo |
| Click "Show Completed (N)" | Expand/collapse done group |
| Click "Import…" | File/folder picker for respective import |
| No user selected | Gate: "Select a user in Settings" |
| Workspace switch | Todos do NOT reload (global, user-scoped only) |

### Files

| File | Change |
|---|---|
| [NEW] `src/lib/personal-store.ts` | `loadNotes`, `saveNote`, `loadTodos`, `saveTodos`, `importNotes`, `importTodos`, `migrateNotesIfNeeded` |
| [NEW] `src/components/PersonalTodoList.tsx` | Full Todos tab UI |
| [MODIFY] `src/views/PersonalView.tsx` | Add tab bar; remove ALL AI Assist code; update paths to home dir; add migration check on mount |
| [MODIFY] `src/store/WorkspaceContext.tsx` | Add `todos`, `addTodo`, `updateTodo`, `deleteTodo`, `toggleTodoDone`, `setTodos`; load todos on `currentUser` change (not workspace change) |
| [MODIFY] `src/App.tsx` | Update `loadPersonalNotes` to use home path; add `loadPersonalTodos` |
| [MODIFY] `src/types/index.ts` | Add `PersonalTodo` |
| [MODIFY] `src/lib/tools/notes.ts` | Update note file paths to use home dir |

---

## Feature 3 — Remove AI Assist, Consolidate into Chat

### What Gets Deleted

| Location | Code Removed |
|---|---|
| `PersonalView.tsx` | `showAIBar`, `processInstruction`, `proposedActions`, `showProcessModal`, `isProcessing`, `handleProcessNote`, `executeAIActions` — all state, handlers, and JSX |
| `PersonalView.tsx` | "AI Assist" button in note header toolbar |
| `WorkItemEditView.tsx` | `isExtracting`, `extractedTasks`, `handleExtractTasks`, `handleCreateExtractedTasks` — all state, handlers, and JSX |
| `WorkItemEditView.tsx` | "Extract Tasks" button; Extraction Preview Modal |

### Note Header After Removal

```
[Created Apr 12]                   [Promote to Board]  [AutoSave •]
[Note Title______________________________________]
─────────────────────────────── RichEditor ──────
```

No AI surface. The Chat panel handles everything.

### Chat: New `proposal-list` Block Type

Rather than a two-turn "AI proposes → user types confirm" exchange, add a dedicated rich content block that renders proposals with inline action buttons:

```typescript
// Add to ChatContentBlock union in src/types/chat.ts
| {
    type: 'proposal-list';
    title: string;            // e.g. "Extracted 4 action items"
    proposals: Array<{
      id: string;
      text: string;
      assignee?: string;
      selected: boolean;
    }>;
    action: 'create_tasks' | 'create_todos';
  }
```

When the `extract_tasks_from_note` tool runs, it returns a `proposal-list` block. The `MessageRenderer` renders each proposal as a checkbox row. A "Create Selected" button at the bottom fires the creation directly — **no second LLM turn needed**, no modal, no leaving the chat panel.

### Context-Aware Chat Starter Prompts

In `ChatInterface.tsx`, the empty-state starter prompts are conditionally modified based on `currentWorkItem`:

```typescript
const starterPrompts = currentWorkItem?.type === 'Meeting Note'
  ? [
      'Extract action items from this note',
      'Summarize this meeting note',
      'Create todos from the action items here',
      'What decisions were made in this note?',
      'Show me my todos due this week',
    ]
  : [
      'What is the overall status of the project?',
      'Show me everything assigned to me',
      'Which items are In Progress?',
      'What are my todos due this week?',
      'Create a personal note about today\'s standup',
    ];
```

### New Tool: `extract_tasks_from_note`

```typescript
// src/lib/tools/extract.ts
// Definition:
{
  name: 'extract_tasks_from_note',
  description: 'Extract actionable tasks or todos from the currently open note or meeting note. Returns a proposal list for the user to review and create.',
  parameters: {
    target: { type: 'string', enum: ['workspace_tasks', 'personal_todos'], description: 'Where to create the items' }
  }
}
// Handler:
// 1. Read content from context.currentWorkItem (if available) or context.personalNotes
// 2. Call LLM with extraction prompt
// 3. Return proposal-list richContent block
```

### Quick-Create Buttons on Item-Cards

The existing `{ type: 'button' }` block type in `ChatContentBlock` is already defined but not rendered in `MessageRenderer`. Wire it up:

```typescript
// In MessageRenderer — handle 'button' block:
// Render as a small action button that calls onSendMessage(block.action)
// or directly invokes a tool action via a new onAction prop

// Use case: after search results, each item-card shows:
// [Open] [Update Status] [Add Comment]
```

This eliminates the need for the user to type "update ITEM-0042's status" — they click directly on the result.

### Files

| File | Change |
|---|---|
| [MODIFY] `src/views/PersonalView.tsx` | Remove all AI Assist state/JSX |
| [MODIFY] `src/views/WorkItemEditView.tsx` | Remove Extract Tasks button, modal, handlers |
| [NEW] `src/lib/tools/extract.ts` | `extract_tasks_from_note` tool definition + handler |
| [MODIFY] `src/lib/tools/index.ts` | Register `extract_tasks_from_note` |
| [MODIFY] `src/types/chat.ts` | Add `proposal-list` to `ChatContentBlock`; add `currentWorkItem` to `ToolContext` |
| [MODIFY] `src/components/ChatInterface.tsx` | Context-aware starter prompts; wire `currentWorkItem` into `buildToolContext` |
| [MODIFY] `src/components/chat/MessageRenderer.tsx` | Render `proposal-list` block; wire `button` block type |

---

## Feature 4 — Chat: Full Todo Read/Write

### `ToolContext` Extension

```typescript
// src/types/chat.ts — additions to ToolContext
currentWorkItem?: WorkItem;         // ← was missing, now added
todos: PersonalTodo[];
addTodo: (todo: PersonalTodo) => void;
updateTodo: (todo: PersonalTodo) => void;
deleteTodo: (id: string) => void;
toggleTodoDone: (id: string) => void;
homePath: string;                   // for tools that write todo files
```

### New Todo Tools

| Tool | Description | Key Args |
|---|---|---|
| `list_todos` | Return todos, optionally filtered | `done?`, `overdue?`, `dueBefore?`, `dueAfter?` |
| `create_todo` | Create a personal todo | `text`, `targetDate?`, `recurrence?` |
| `update_todo` | Update text, date, recurrence, or done status | `id`, `text?`, `targetDate?`, `recurrence?`, `done?` |
| `delete_todo` | Delete a todo by ID | `id` |

### System Prompt Addition

```
PERSONAL TODOS:
The user has {todos.length} personal todos ({overdue} overdue, {dueToday} due today).
Use list_todos to retrieve them. Use create_todo / update_todo / delete_todo to manage them.
Always confirm what you changed after a write operation.
```

### Follow-Up Suggestions for Todo Tools

```typescript
case 'list_todos':
  return ['Mark the overdue ones done', 'Create a todo for next week', 'Which ones are due today?'];
case 'create_todo':
  return ['Add another todo', 'Set a due date for this', 'Show all my todos'];
case 'update_todo':
  return ['Show my updated todo list', 'Mark it done', 'Change the due date'];
```

### Files

| File | Change |
|---|---|
| [NEW] `src/lib/tools/todos-tool.ts` | All 4 todo tool definitions + handlers |
| [MODIFY] `src/lib/tools/index.ts` | Register 4 todo tools |
| [MODIFY] `src/types/chat.ts` | Add `currentWorkItem`, `todos`, todo CRUD + `homePath` to `ToolContext` |
| [MODIFY] `src/components/ChatInterface.tsx` | Wire todos + homePath + currentWorkItem into `buildToolContext`; add todo follow-up suggestions to `getFollowUps` |

---

## Complete Type Additions (`src/types/index.ts`)

```typescript
export interface WorkspaceEntry {
  path: string;
  name: string;
  lastOpenedAt: string;
  lastUser?: string;
  stats?: { itemCount: number; inProgressCount: number };
}

export interface PersonalTodo {
  id: string;
  text: string;
  done: boolean;
  targetDate?: string;         // YYYY-MM-DD
  recurrence?: 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
  doneAt?: string;
}
```

---

## Error Cases

| Scenario | Handling |
|---|---|
| `getHomePath` IPC missing/fails | Fall back to workspace-relative path; warn toast "Personal storage unavailable, using workspace path" |
| `todos.json` missing | Treat as empty (first run), create on first save |
| `todos.json` malformed | Load empty list; warn toast "Could not read todos, starting fresh" |
| Notes migration — file copy fails | Show error per-file in migration report; skip failed files |
| Notes migration — old and new paths identical | Skip migration silently |
| Import notes — duplicate filenames | Append `-imported-N`; toast shows count |
| Import todos — invalid JSON shape | Toast: "File is not a valid todo list format" |
| Import todos — duplicate IDs | Skip, count shown in toast |
| Recurring todo clone creation fails | Show toast; mark original done (don't block completion) |
| Workspace registry write fails | Warn toast; changes still in memory for the session |
| Workspace switcher — missing path | Greyed entry + ⚠ badge; error toast on click |
| `isDirty` true on workspace switch | `confirm()` dialog → flush → switch on confirm |
| `extract_tasks_from_note` — no API key | Error block in chat: "Set your AI provider key in Settings" |
| `extract_tasks_from_note` — no current item | Error block: "No note is currently open. Navigate to a note first." |
| Todo text empty + Enter | No-op; shake animation on input |
| Overdue + recurring todo | Show Overdue badge; still generates next instance on completion |
| No `currentUser` set | Gate on Personal Space: "Select a user in Settings" |

---

## Verification Plan

### Automated
- Unit: `workspace-registry.ts` — add/remove/search/max-200-prune/stats caching
- Unit: `personal-store.ts` — load/save todos, recurrence clone, migration detection
- Unit: `extract.ts` tool — mock LLM response, verify `proposal-list` block output
- TypeScript: `tsc --noEmit` must pass after all type changes

### Manual
1. **IPC**: `getHomePath` returns correct home dir in Electron; mock returns `/mock/home` in browser
2. **Workspace Switcher**: Open 5+ folders → search filters → `↑↓Enter` keyboard nav → switch restores user → confirmation on mid-edit switch → stats badge updates
3. **Migration**: Create notes in workspace, switch to new build, confirm migration banner appears, verify notes appear at new path
4. **Todos global**: Create todos in workspace A context → switch to workspace B → todos still visible
5. **Todos UX**: Create 6 todos (with/without dates, one overdue, one weekly) → verify chip colors → mark weekly done → verify clone → delete + undo
6. **Import**: Import `.md` folder into Notes; import `todos.json` into Todos; test dedup behavior
7. **Chat Todos**: *"what are my todos?"* → *"create a todo: call dentist by Friday"* → verify Todos tab updates → *"mark the dentist todo done"*
8. **Chat extraction**: Open Meeting Note → *"extract action items"* → `proposal-list` block renders with checkboxes → click "Create Selected" → verify items in workspace board
9. **No AI Assist**: Confirm zero AI Assist/Extract buttons in `PersonalView` and `WorkItemEditView`
10. **Quick-create buttons**: Chat search result shows action buttons → click "Update Status" → verify no retyping needed

---

## Phased Delivery

| Phase | Scope | Dependency |
|---|---|---|
| 1 | Electron IPC: `getHomePath`, `readUserData`, `writeUserData` + mocks | None — blocks everything |
| 2 | Workspace registry lib + `WorkspaceSwitcher` component + Sidebar update | Phase 1 |
| 3 | `PersonalTodo` type + `personal-store.ts` + context wiring | Phase 1 |
| 4 | `PersonalTodoList` component + Todos tab + migration banner | Phase 3 |
| 5 | Import notes/todos from folder/file | Phase 4 |
| 6 | Remove AI Assist from `PersonalView` + `WorkItemEditView` | None — safe subtraction |
| 7 | `proposal-list` block type + `extract_tasks_from_note` tool + `MessageRenderer` wiring | Phase 6 |
| 8 | Todo tools (list/create/update/delete) + `ToolContext` extension + system prompt | Phase 3 |

Phases 6 and 8 can run in parallel. Phase 1 is the only hard blocker for everything else.
