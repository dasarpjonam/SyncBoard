import Database from 'better-sqlite3';
import path from 'path';

export interface DatabaseSchema {
  work_items: {
    id: string;
    title: string;
    type: string;
    status: string;
    assignee: string | null;
    parent_id: string | null;
    file_path: string;
    created_at: string;
    updated_at: string;
    content_preview: string;
    word_count: number;
    has_subtasks: number; // SQLite doesn't have boolean, use 0/1
  };
  
  item_hierarchy: {
    item_id: string;
    ancestor_id: string;
    depth: number;
  };
  
  workspace_metadata: {
    key: string;
    value: string;
    updated_at: string;
  };
}

export function createDatabaseSchema(db: Database.Database): void {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  // Create work_items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS work_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      assignee TEXT,
      parent_id TEXT,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      content_preview TEXT,
      word_count INTEGER DEFAULT 0,
      has_subtasks INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES work_items(id) ON DELETE SET NULL
    )
  `);
  
  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_work_items_type ON work_items(type);
    CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
    CREATE INDEX IF NOT EXISTS idx_work_items_assignee ON work_items(assignee);
    CREATE INDEX IF NOT EXISTS idx_work_items_parent ON work_items(parent_id);
    CREATE INDEX IF NOT EXISTS idx_work_items_updated ON work_items(updated_at);
  `);
  
  // Create full-text search virtual table
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS work_items_fts USING fts5(
      id UNINDEXED,
      title,
      content_preview,
      type,
      status,
      assignee,
      content='work_items',
      content_rowid='rowid'
    )
  `);
  
  // Create triggers to keep FTS in sync
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS work_items_ai AFTER INSERT ON work_items BEGIN
      INSERT INTO work_items_fts(rowid, id, title, content_preview, type, status, assignee)
      VALUES (new.rowid, new.id, new.title, new.content_preview, new.type, new.status, new.assignee);
    END;
    
    CREATE TRIGGER IF NOT EXISTS work_items_ad AFTER DELETE ON work_items BEGIN
      DELETE FROM work_items_fts WHERE rowid = old.rowid;
    END;
    
    CREATE TRIGGER IF NOT EXISTS work_items_au AFTER UPDATE ON work_items BEGIN
      UPDATE work_items_fts 
      SET id = new.id,
          title = new.title,
          content_preview = new.content_preview,
          type = new.type,
          status = new.status,
          assignee = new.assignee
      WHERE rowid = new.rowid;
    END;
  `);
  
  // Create hierarchy table for fast ancestry queries
  db.exec(`
    CREATE TABLE IF NOT EXISTS item_hierarchy (
      item_id TEXT NOT NULL,
      ancestor_id TEXT NOT NULL,
      depth INTEGER NOT NULL,
      PRIMARY KEY (item_id, ancestor_id),
      FOREIGN KEY (item_id) REFERENCES work_items(id) ON DELETE CASCADE,
      FOREIGN KEY (ancestor_id) REFERENCES work_items(id) ON DELETE CASCADE
    )
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_hierarchy_item ON item_hierarchy(item_id);
    CREATE INDEX IF NOT EXISTS idx_hierarchy_ancestor ON item_hierarchy(ancestor_id);
  `);
  
  // Create metadata table for workspace stats
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspace_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

export function initializeDatabase(workspacePath: string): Database.Database {
  const dbPath = path.join(workspacePath, '.syncboard', 'index.db');
  const db = new Database(dbPath);
  
  // Set pragmas for better performance
  db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
  db.pragma('synchronous = NORMAL'); // Faster writes, still safe
  db.pragma('cache_size = -64000'); // 64MB cache
  
  createDatabaseSchema(db);
  
  return db;
}
