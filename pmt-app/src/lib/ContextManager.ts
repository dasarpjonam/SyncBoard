import { WorkspaceIndex, WorkspaceSummary } from './WorkspaceIndex';
import { WorkItem } from '../types';
import fs from 'fs';
import path from 'path';

interface CompactItem {
  id: string;
  title: string;
  type: string;
  status: string;
  assignee?: string;
  parentId?: string;
  childCount: number;
  preview: string;
  wordCount: number;
}

interface TreeNode {
  id: string;
  title: string;
  status: string;
  owner?: string;
  children: number;
  progress?: string;
  branches?: Array<{
    id: string;
    title: string;
    children: number;
    status: string;
  }>;
}

interface RecentChange {
  date: string;
  changes: Array<{
    id: string;
    action: 'created' | 'updated' | 'deleted';
    field?: string;
    from?: string;
    to?: string;
    by?: string;
  }>;
}

export interface WorkspaceContext {
  summary: WorkspaceSummary;
  tree: TreeNode[];
  recentChanges: RecentChange[];
  metadata: Record<string, CompactItem>;
}

export class ContextManager {
  private workspacePath: string;
  private index: WorkspaceIndex;
  private contextCache: WorkspaceContext | null = null;
  private cacheDir: string;
  
  constructor(workspacePath: string, index: WorkspaceIndex) {
    this.workspacePath = workspacePath;
    this.index = index;
    this.cacheDir = path.join(workspacePath, '.syncboard', 'context');
    this.ensureCacheDir();
  }
  
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }
  
  /**
   * Build complete workspace context
   */
  async buildContext(items: WorkItem[]): Promise<WorkspaceContext> {
    const summary = this.buildSummary();
    const tree = this.buildTree(items);
    const recentChanges = this.buildRecentChanges(items);
    const metadata = this.buildMetadata(items);
    
    this.contextCache = {
      summary,
      tree,
      recentChanges,
      metadata
    };
    
    await this.persistContext();
    return this.contextCache;
  }
  
  /**
   * Build workspace summary
   */
  private buildSummary(): WorkspaceSummary {
    return this.index.getWorkspaceSummary();
  }
  
  /**
   * Build compact tree structure
   */
  private buildTree(items: WorkItem[]): TreeNode[] {
    const topLevel = items.filter(item => !item.parentId);
    
    return topLevel.map(item => {
      const children = items.filter(i => i.parentId === item.id);
      const descendants = this.countDescendants(item.id, items);
      const completed = this.countCompleted(item.id, items);
      
      return {
        id: item.id,
        title: item.title,
        status: item.status,
        owner: item.assignee,
        children: descendants,
        progress: descendants > 0 ? `${completed}/${descendants}` : undefined,
        branches: children.slice(0, 5).map(child => ({
          id: child.id,
          title: child.title,
          children: this.countDescendants(child.id, items),
          status: child.status
        }))
      };
    });
  }
  
  /**
   * Build recent changes log
   */
  private buildRecentChanges(items: WorkItem[]): RecentChange[] {
    // Group items by update date (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentItems = items.filter(item => 
      new Date(item.updatedAt) > sevenDaysAgo
    );
    
    // Group by date
    const byDate = new Map<string, WorkItem[]>();
    recentItems.forEach(item => {
      const date = item.updatedAt.split('T')[0];
      if (!byDate.has(date)) {
        byDate.set(date, []);
      }
      byDate.get(date)!.push(item);
    });
    
    // Convert to recent changes format
    const changes: RecentChange[] = [];
    const sortedDates = Array.from(byDate.keys()).sort().reverse();
    
    for (const date of sortedDates.slice(0, 7)) {
      const dateItems = byDate.get(date)!;
      changes.push({
        date,
        changes: dateItems.map(item => ({
          id: item.id,
          action: 'updated' as const,
          field: 'status',
          to: item.status,
          by: item.assignee
        }))
      });
    }
    
    return changes;
  }
  
  /**
   * Build compact metadata index
   */
  private buildMetadata(items: WorkItem[]): Record<string, CompactItem> {
    const metadata: Record<string, CompactItem> = {};
    
    for (const item of items) {
      const childCount = items.filter(i => i.parentId === item.id).length;
      const preview = item.content.substring(0, 50).replace(/\n/g, ' ').trim();
      const wordCount = item.content.split(/\s+/).filter(w => w.length > 0).length;
      
      metadata[item.id] = {
        id: item.id,
        title: item.title,
        type: item.type,
        status: item.status,
        assignee: item.assignee,
        parentId: item.parentId,
        childCount,
        preview,
        wordCount
      };
    }
    
    return metadata;
  }
  
  /**
   * Persist context to disk
   */
  private async persistContext(): Promise<void> {
    if (!this.contextCache) return;
    
    const files = [
      { name: 'workspace-summary.json', data: this.contextCache.summary },
      { name: 'tree-structure.json', data: this.contextCache.tree },
      { name: 'recent-changes.json', data: this.contextCache.recentChanges },
      { name: 'item-metadata.json', data: this.contextCache.metadata }
    ];
    
    for (const file of files) {
      const filePath = path.join(this.cacheDir, file.name);
      fs.writeFileSync(filePath, JSON.stringify(file.data, null, 2), 'utf-8');
    }
  }
  
  /**
   * Load context from disk
   */
  async loadContext(): Promise<WorkspaceContext | null> {
    try {
      const summary = JSON.parse(
        fs.readFileSync(path.join(this.cacheDir, 'workspace-summary.json'), 'utf-8')
      );
      const tree = JSON.parse(
        fs.readFileSync(path.join(this.cacheDir, 'tree-structure.json'), 'utf-8')
      );
      const recentChanges = JSON.parse(
        fs.readFileSync(path.join(this.cacheDir, 'recent-changes.json'), 'utf-8')
      );
      const metadata = JSON.parse(
        fs.readFileSync(path.join(this.cacheDir, 'item-metadata.json'), 'utf-8')
      );
      
      this.contextCache = { summary, tree, recentChanges, metadata };
      return this.contextCache;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Get context for specific query
   */
  getContextForQuery(query: string, maxTokens: number = 4000): string {
    if (!this.contextCache) {
      return 'No workspace context available. Please load a workspace first.';
    }
    
    const intent = this.detectIntent(query);
    
    switch (intent.type) {
      case 'summary':
        return this.formatSummaryContext();
      case 'status':
        return this.formatStatusContext(intent.filters);
      case 'item':
        return this.formatItemContext(intent.itemIds);
      default:
        return this.formatGeneralContext(maxTokens);
    }
  }
  
  /**
   * Detect query intent
   */
  private detectIntent(query: string): {
    type: 'summary' | 'status' | 'item' | 'general';
    filters: any;
    itemIds: string[];
  } {
    const lower = query.toLowerCase();
    
    // Extract item IDs
    const itemIds = query.match(/[A-Z]+-\d+/g) || [];
    if (itemIds.length > 0) {
      return { type: 'item', filters: {}, itemIds };
    }
    
    // Status query
    if (lower.match(/status|progress|what.*doing/)) {
      return { type: 'status', filters: {}, itemIds: [] };
    }
    
    // Summary query  
    if (lower.match(/summary|overview|stats/)) {
      return { type: 'summary', filters: {}, itemIds: [] };
    }
    
    return { type: 'general', filters: {}, itemIds: [] };
  }
  
  /**
   * Format summary context
   */
  private formatSummaryContext(): string {
    const s = this.contextCache!.summary;
    return `WORKSPACE SUMMARY:
Total Items: ${s.totalItems}
Top-Level: ${s.topLevelItems}

STATUS:
${Object.entries(s.byStatus).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

TYPES:
${Object.entries(s.byType).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

TEAM: ${s.activeAssignees.join(', ')}
Recent Updates (24h): ${s.updatesLast24h}
Last Updated: ${s.lastUpdated || 'Never'}
`;
  }
  
  /**
   * Format status context
   */
  private formatStatusContext(filters: any): string {
    return this.formatGeneralContext(4000);
  }
  
  /**
   * Format item-specific context
   */
  private formatItemContext(itemIds: string[]): string {
    const items = itemIds.map(id => this.contextCache!.metadata[id]).filter(Boolean);
    
    return items.map(item => `
[${item.id}] ${item.title}
Type: ${item.type} | Status: ${item.status}${item.assignee ? ` | Assigned: @${item.assignee}` : ''}
${item.childCount > 0 ? `Children: ${item.childCount}` : ''}
Preview: ${item.preview}
`).join('\n---\n');
  }
  
  /**
   * Format general context with token budget
   */
  private formatGeneralContext(maxTokens: number): string {
    let context = this.formatSummaryContext();
    let tokens = this.estimateTokens(context);
    
    // Add tree if budget allows
    if (tokens + 500 < maxTokens) {
      const treeContext = this.formatTreeContext();
      context += '\n\n' + treeContext;
      tokens += this.estimateTokens(treeContext);
    }
    
    // Add recent changes if budget allows
    if (tokens + 300 < maxTokens) {
      const changesContext = this.formatRecentChangesContext();
      context += '\n\n' + changesContext;
    }
    
    return context;
  }
  
  /**
   * Format tree structure
   */
  private formatTreeContext(): string {
    const tree = this.contextCache!.tree;
    return `TOP-LEVEL ITEMS:
${tree.slice(0, 10).map(node => 
  `• ${node.id} ${node.title} [${node.children} children${node.progress ? `, ${node.progress} done` : ''}] ${node.owner ? `@${node.owner}` : ''} ${node.status}`
).join('\n')}`;
  }
  
  /**
   * Format recent changes
   */
  private formatRecentChangesContext(): string {
    const changes = this.contextCache!.recentChanges;
    return `RECENT ACTIVITY (7 days):
${changes.slice(0, 3).map(day => 
  `${day.date}: ${day.changes.length} updates`
).join('\n')}`;
  }
  
  /**
   * Estimate token count (rough)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Helper: Count descendants
   */
  private countDescendants(itemId: string, items: WorkItem[]): number {
    let count = 0;
    const children = items.filter(i => i.parentId === itemId);
    count += children.length;
    
    for (const child of children) {
      count += this.countDescendants(child.id, items);
    }
    
    return count;
  }
  
  /**
   * Helper: Count completed descendants
   */
  private countCompleted(itemId: string, items: WorkItem[]): number {
    let count = 0;
    const children = items.filter(i => i.parentId === itemId);
    
    for (const child of children) {
      if (child.status === 'Done') count++;
      count += this.countCompleted(child.id, items);
    }
    
    return count;
  }
}
