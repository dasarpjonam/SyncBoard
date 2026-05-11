import { WorkItem, WorkspaceConfig } from '../types';

export class LiveContextManager {
  private workspacePath: string;
  private electronAPI: any;

  constructor(workspacePath: string, electronAPI: any) {
    this.workspacePath = workspacePath;
    this.electronAPI = electronAPI;
  }

  /**
   * Generates and saves a project_context.md file in the root of the workspace.
   * This file acts as an AGENTS.md for the LLM to read.
   */
  async updateLiveContext(items: WorkItem[], config: WorkspaceConfig, personalNotes: WorkItem[] = []) {
    if (!this.workspacePath) return;

    try {
      const activeItems = items.filter(i => i.status !== 'Done');
      const recentlyUpdated = [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
      const recentNotes = [...personalNotes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);

      const content = `
# Project Context (Auto-generated)

This file contains the live state of the Syncboard workspace. It is intended to provide AI assistants with up-to-date context about the project.

## Project Summary
- Total Items: ${items.length}
- Active Items: ${activeItems.length}
- Completed Items: ${items.length - activeItems.length}
- Team Members: ${config.users.join(', ') || 'None'}
- Personal Notes: ${personalNotes.length}

## Recent Activity
${recentlyUpdated.map(i => `- [${i.id}] ${i.title} (${i.status}) - Last updated: ${new Date(i.updatedAt).toLocaleString()}`).join('\n')}

## Recent Personal Notes
${recentNotes.map(n => `- [${n.id}] ${n.title} (${n.type}) - ${n.content.slice(0, 100).replace(/\n/g, ' ')}...`).join('\n') || 'No recent notes.'}

## Workflow Configuration
- Types: ${config.types.join(', ')}
- Statuses: ${config.statuses.join(', ')}

## General Guidelines
- When creating new items, use the defined Types and Statuses.
- Assign tasks to available Team Members if known.
- Reference existing items by their ID (e.g. ITEM-12345).
`;

      await this.electronAPI.writeFile(`${this.workspacePath}/project_context.md`, content);
    } catch (e) {
      console.error('Failed to update live context', e);
    }
  }
}
