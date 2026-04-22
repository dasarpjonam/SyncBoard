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
  role: 'admin' | 'contributor' | 'viewer';
}

export type UserRole = 'admin' | 'contributor' | 'viewer';

export interface WorkspacePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageAuth: boolean;
}

export interface AuthSession {
  isAuthenticated: boolean;
  user: User | null;
  permissions: WorkspacePermissions;
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
