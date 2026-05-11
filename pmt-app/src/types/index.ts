export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  mentions: string[]; // List of @mentioned usernames
}

export interface WorkItem {
  id: string;
  title: string;
  type: string;
  status: string;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  content: string; // The markdown content body
  fileName: string;
  parentId?: string; // ID of parent item for hierarchy
  level?: number; // 0=Epic, 1=Feature, 2=Task/Bug (computed)
  children?: WorkItem[]; // Computed child items for tree structure
  comments?: Comment[]; // Comments on this work item
  attachments?: string[]; // Paths or filenames of attached files
}

export interface WorkspaceConfig {
  types: string[];
  statuses: string[];
  users: string[];
  auth?: WorkspaceAuth; // Optional authentication settings
}

export interface WorkspaceAuth {
  enabled: boolean;
  requirePassword: boolean;
  lockAfterMinutes?: number;
}

export interface User {
  id: string;
  displayName: string;
  email?: string;
  githubHandle?: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  user: User | null;
  workspacePath: string | null;
  lockedAt?: string;
}

export interface Notification {
  id: string;
  type: 'mention' | 'assignment' | 'status_change' | 'system';
  title: string;
  message: string;
  targetId?: string; // e.g. WorkItem ID
  actor?: string; // The user who triggered it
  recipient: string; // The user who should see this
  timestamp: string;
  read: boolean;
}

// ─── Workspace Registry ────────────────────────────────────────────

export interface WorkspaceEntry {
  path: string;
  name: string;           // basename of path
  lastOpenedAt: string;   // ISO timestamp
  lastUser?: string;      // remembered currentUser for this workspace
  stats?: { itemCount: number; inProgressCount: number };
}

// ─── Personal Todos ────────────────────────────────────────────────

export interface PersonalTodo {
  id: string;
  text: string;
  done: boolean;
  targetDate?: string;               // YYYY-MM-DD
  recurrence?: 'weekly' | 'monthly';
  createdAt: string;
  updatedAt: string;
  doneAt?: string;
}
