import Database from 'better-sqlite3';
import { initializeDatabase } from './database';
import { WorkItem } from '../types';

export interface WorkspaceSummary {
  totalItems: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byAssignee: Record<string, number>;
  topLevelItems: number;
  activeAssignees: string[];
  lastUpdated: string | null;
  blockedItems: number;
  updatesLast24h: number;
}

export interface SearchResult {
  id: string;
  title: string;
  type: string;
  status: string;
  rank: number;
}

export class WorkspaceIndex {
  private db: Database.Database;
  private workspacePath: string;
  
  constructor(workspacePath: string) {
    this.workspacePath = workspacePath;
    this.db = initializeDatabase(workspacePath);
  }
  
  /**
   * Index a work item (insert or update)
   */
  indexItem(item: WorkItem): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO work_items 
      (id, title, type, status, assignee, parent_id, file_path, 
       created_at, updated_at, content_preview, word_count, has_subtasks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const preview = item.content.substring(0, 200).replace(/\n/g, ' ');
    const wordCount = item.content.split(/\s+/).filter(w => w.length > 0).length;
    const hasSubtasks = /- \[[ x]\]/.test(item.content) ? 1 : 0;
    
    stmt.run(
      item.id,
      item.title,
      item.type,
      item.status,
      item.assignee || null,
      item.parentId || null,
      item.fileName,
      item.createdAt,
      item.updatedAt,
      preview,
      wordCount,
      hasSubtasks
    );
    
    // Update hierarchy
    this.updateHierarchy(item.id, item.parentId);
  }
  
  /**
   * Update hierarchy table when parent changes
   */
  private updateHierarchy(itemId: string, parentId: string | undefined): void {
    // Delete existing hierarchy entries for this item
    this.db.prepare('DELETE FROM item_hierarchy WHERE item_id = ?').run(itemId);
    
    if (!parentId) {
      return; // Top-level item, no ancestors
    }
    
    // Get all ancestors of parent
    const ancestors = this.db.prepare(`
      SELECT ancestor_id, depth FROM item_hierarchy WHERE item_id = ?
    `).all(parentId) as Array<{ ancestor_id: string; depth: number }>;
    
    // Insert parent as direct ancestor (depth 1)
    this.db.prepare(`
      INSERT INTO item_hierarchy (item_id, ancestor_id, depth) VALUES (?, ?, 1)
    `).run(itemId, parentId);
    
    // Insert all of parent's ancestors with increased depth
    for (const ancestor of ancestors) {
      this.db.prepare(`
        INSERT INTO item_hierarchy (item_id, ancestor_id, depth) VALUES (?, ?, ?)
      `).run(itemId, ancestor.ancestor_id, ancestor.depth + 1);
    }
  }
  
  /**
   * Remove item from index
   */
  removeItem(id: string): void {
    this.db.prepare('DELETE FROM work_items WHERE id = ?').run(id);
    // Hierarchy entries will be auto-deleted due to CASCADE
  }
  
  /**
   * Full-text search across items
   */
  search(query: string, limit: number = 20): SearchResult[] {
    const stmt = this.db.prepare(`
      SELECT 
        w.id,
        w.title,
        w.type,
        w.status,
        rank
      FROM work_items_fts f
      JOIN work_items w ON w.rowid = f.rowid
      WHERE work_items_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `);
    
    return stmt.all(query, limit) as SearchResult[];
  }
  
  /**
   * Get items by filters
   */
  getItemsBy(filters: {
    type?: string;
    status?: string;
    assignee?: string;
    parentId?: string | null;
  }): WorkItem[] {
    let query = 'SELECT * FROM work_items WHERE 1=1';
    const params: any[] = [];
    
    if (filters.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.assignee) {
      query += ' AND assignee = ?';
      params.push(filters.assignee);
    }
    if (filters.parentId !== undefined) {
      if (filters.parentId === null) {
        query += ' AND parent_id IS NULL';
      } else {
        query += ' AND parent_id = ?';
        params.push(filters.parentId);
      }
    }
    
    query += ' ORDER BY updated_at DESC';
    
    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map(row => this.rowToWorkItem(row));
  }
  
  /**
   * Get workspace summary for LLM context
   */
  getWorkspaceSummary(): WorkspaceSummary {
    const totalItems = this.db.prepare('SELECT COUNT(*) as count FROM work_items').get() as { count: number };
    
    const byStatus = this.db.prepare(`
      SELECT status, COUNT(*) as count FROM work_items GROUP BY status
    `).all() as Array<{ status: string; count: number }>;
    
    const byType = this.db.prepare(`
      SELECT type, COUNT(*) as count FROM work_items GROUP BY type
    `).all() as Array<{ type: string; count: number }>;
    
    const byAssignee = this.db.prepare(`
      SELECT assignee, COUNT(*) as count FROM work_items 
      WHERE assignee IS NOT NULL 
      GROUP BY assignee
    `).all() as Array<{ assignee: string; count: number }>;
    
    const topLevel = this.db.prepare(`
      SELECT COUNT(*) as count FROM work_items WHERE parent_id IS NULL
    `).get() as { count: number };
    
    const activeAssignees = this.db.prepare(`
      SELECT DISTINCT assignee FROM work_items WHERE assignee IS NOT NULL
    `).all() as Array<{ assignee: string }>;
    
    const lastUpdated = this.db.prepare(`
      SELECT MAX(updated_at) as last_updated FROM work_items
    `).get() as { last_updated: string | null };
    
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentUpdates = this.db.prepare(`
      SELECT COUNT(*) as count FROM work_items WHERE updated_at > ?
    `).get(last24h) as { count: number };
    
    return {
      totalItems: totalItems.count,
      byStatus: Object.fromEntries(byStatus.map(r => [r.status, r.count])),
      byType: Object.fromEntries(byType.map(r => [r.type, r.count])),
      byAssignee: Object.fromEntries(byAssignee.map(r => [r.assignee, r.count])),
      topLevelItems: topLevel.count,
      activeAssignees: activeAssignees.map(a => a.assignee),
      lastUpdated: lastUpdated.last_updated,
      blockedItems: 0, // TODO: Implement blocked detection
      updatesLast24h: recentUpdates.count
    };
  }
  
  /**
   * Get all descendants of an item
   */
  getDescendants(itemId: string): string[] {
    const descendants = this.db.prepare(`
      SELECT item_id FROM item_hierarchy WHERE ancestor_id = ? ORDER BY depth
    `).all(itemId) as Array<{ item_id: string }>;
    
    return descendants.map(d => d.item_id);
  }
  
  /**
   * Get all ancestors of an item
   */
  getAncestors(itemId: string): string[] {
    const ancestors = this.db.prepare(`
      SELECT ancestor_id FROM item_hierarchy WHERE item_id = ? ORDER BY depth
    `).all(itemId) as Array<{ ancestor_id: string }>;
    
    return ancestors.map(a => a.ancestor_id);
  }
  
  /**
   * Rebuild entire index from scratch
   */
  async rebuildIndex(items: WorkItem[]): Promise<void> {
    // Clear existing data
    this.db.prepare('DELETE FROM work_items').run();
    this.db.prepare('DELETE FROM item_hierarchy').run();
    
    // Index all items
    for (const item of items) {
      this.indexItem(item);
    }
    
    // Update metadata
    this.updateMetadata('last_rebuild', new Date().toISOString());
  }
  
  /**
   * Store workspace metadata
   */
  updateMetadata(key: string, value: string): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO workspace_metadata (key, value, updated_at)
      VALUES (?, ?, ?)
    `).run(key, value, new Date().toISOString());
  }
  
  /**
   * Get workspace metadata
   */
  getMetadata(key: string): string | null {
    const result = this.db.prepare(`
      SELECT value FROM workspace_metadata WHERE key = ?
    `).get(key) as { value: string } | undefined;
    
    return result?.value || null;
  }
  
  /**
   * Convert database row to WorkItem
   */
  private rowToWorkItem(row: any): WorkItem {
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      assignee: row.assignee || undefined,
      parentId: row.parent_id || undefined,
      fileName: row.file_path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      content: row.content_preview || '', // This is just preview, full content from file
      comments: []
    };
  }
  
  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
