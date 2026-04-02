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
}

export interface WorkspaceConfig {
  types: string[];
  statuses: string[];
  users: string[];
}
