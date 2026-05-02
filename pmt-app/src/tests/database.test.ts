import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';
import { initializeDatabase, createDatabaseSchema } from '../lib/database';

describe('Database Module', () => {
  let tempWorkspaceDir: string;
  let db: Database.Database | undefined;

  beforeEach(() => {
    // Create a temporary workspace directory
    tempWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pmt-app-test-'));

    // initializeDatabase expects the .syncboard directory to exist
    fs.mkdirSync(path.join(tempWorkspaceDir, '.syncboard'));
  });

  afterEach(() => {
    // Close the database connection if it was opened
    if (db) {
      db.close();
      db = undefined;
    }

    // Clean up the temporary directory
    if (tempWorkspaceDir && fs.existsSync(tempWorkspaceDir)) {
      fs.rmSync(tempWorkspaceDir, { recursive: true, force: true });
    }
  });

  describe('initializeDatabase', () => {
    it('should create a database file in the .syncboard directory', () => {
      db = initializeDatabase(tempWorkspaceDir);

      const dbPath = path.join(tempWorkspaceDir, '.syncboard', 'index.db');
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it('should set appropriate pragmas for performance', () => {
      db = initializeDatabase(tempWorkspaceDir);

      const journalMode = db.pragma('journal_mode', { simple: true });
      expect(journalMode).toBe('wal');

      const synchronous = db.pragma('synchronous', { simple: true });
      // synchronous = NORMAL evaluates to 1
      expect(synchronous).toBe(1);
    });
  });

  describe('createDatabaseSchema', () => {
    it('should create the necessary tables', () => {
      db = initializeDatabase(tempWorkspaceDir); // initializeDatabase calls createDatabaseSchema

      // Query sqlite_master to verify tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all() as { name: string }[];

      const tableNames = tables.map(t => t.name);

      expect(tableNames).toContain('work_items');
      expect(tableNames).toContain('item_hierarchy');
      expect(tableNames).toContain('workspace_metadata');
      // FTS creates multiple underlying tables, we check the main one
      expect(tableNames).toContain('work_items_fts');
    });

    it('should create the necessary indexes', () => {
      db = initializeDatabase(tempWorkspaceDir);

      const indexes = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='index'
      `).all() as { name: string }[];

      const indexNames = indexes.map(i => i.name);

      expect(indexNames).toContain('idx_work_items_type');
      expect(indexNames).toContain('idx_work_items_status');
      expect(indexNames).toContain('idx_work_items_assignee');
      expect(indexNames).toContain('idx_work_items_parent');
      expect(indexNames).toContain('idx_work_items_updated');
      expect(indexNames).toContain('idx_hierarchy_item');
      expect(indexNames).toContain('idx_hierarchy_ancestor');
    });

    it('should create triggers to keep FTS table in sync', () => {
      db = initializeDatabase(tempWorkspaceDir);

      const triggers = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='trigger'
      `).all() as { name: string }[];

      const triggerNames = triggers.map(t => t.name);

      expect(triggerNames).toContain('work_items_ai');
      expect(triggerNames).toContain('work_items_ad');
      expect(triggerNames).toContain('work_items_au');
    });

    it('should populate FTS virtual table via triggers when data is inserted', () => {
      db = initializeDatabase(tempWorkspaceDir);

      // Insert a row into work_items
      db.prepare(`
        INSERT INTO work_items (
          id, title, type, status, file_path, created_at, updated_at, content_preview
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        'task-1',
        'Test Task Title',
        'task',
        'open',
        '/path/to/task-1.md',
        new Date().toISOString(),
        new Date().toISOString(),
        'Some test preview content'
      );

      // Verify row exists in FTS table
      const ftsRow = db.prepare(`
        SELECT id, title, content_preview FROM work_items_fts WHERE id = ?
      `).get('task-1') as { id: string, title: string, content_preview: string };

      expect(ftsRow).toBeDefined();
      expect(ftsRow.title).toBe('Test Task Title');
      expect(ftsRow.content_preview).toBe('Some test preview content');
    });

    it('should update FTS table when data is updated via triggers', () => {
      db = initializeDatabase(tempWorkspaceDir);

      // Insert a row
      db.prepare(`
        INSERT INTO work_items (
          id, title, type, status, file_path, created_at, updated_at
        ) VALUES (
          'task-2', 'Initial Title', 'task', 'open', '/path/to/task-2.md', '2023-01-01', '2023-01-01'
        )
      `).run();

      // Update the row
      db.prepare(`
        UPDATE work_items SET title = ? WHERE id = ?
      `).run('Updated Title', 'task-2');

      // Verify FTS table is updated
      const ftsRow = db.prepare(`
        SELECT title FROM work_items_fts WHERE id = ?
      `).get('task-2') as { title: string };

      expect(ftsRow).toBeDefined();
      expect(ftsRow.title).toBe('Updated Title');
    });

    it('should delete from FTS table when data is deleted via triggers', () => {
      db = initializeDatabase(tempWorkspaceDir);

      // Insert a row
      db.prepare(`
        INSERT INTO work_items (
          id, title, type, status, file_path, created_at, updated_at
        ) VALUES (
          'task-3', 'To Be Deleted', 'task', 'open', '/path/to/task-3.md', '2023-01-01', '2023-01-01'
        )
      `).run();

      // Verify it exists in FTS
      const beforeDelete = db.prepare('SELECT count(*) as count FROM work_items_fts WHERE id = ?').get('task-3') as { count: number };
      expect(beforeDelete.count).toBe(1);

      // Delete the row
      db.prepare('DELETE FROM work_items WHERE id = ?').run('task-3');

      // Verify it is deleted from FTS
      const afterDelete = db.prepare('SELECT count(*) as count FROM work_items_fts WHERE id = ?').get('task-3') as { count: number };
      expect(afterDelete.count).toBe(0);
    });
  });
});
