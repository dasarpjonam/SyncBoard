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
}
