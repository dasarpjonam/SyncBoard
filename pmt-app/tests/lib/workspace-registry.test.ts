import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addEntry, removeEntry, updateEntryUser, updateEntryStats, getBasename, searchEntries } from '../../src/lib/workspace-registry';
import { WorkspaceEntry } from '../../src/types';

describe('Workspace Registry', () => {
  let mockEntries: WorkspaceEntry[];

  beforeEach(() => {
    mockEntries = [];
  });

  describe('addEntry', () => {
    it('should add a new entry with current timestamp', () => {
      const result = addEntry(mockEntries, '/path/to/workspace', 'My Project');
      
      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('/path/to/workspace');
      expect(result[0].name).toBe('My Project');
      expect(result[0].lastOpenedAt).toBeTruthy();
    });

    it('should update existing entry instead of duplicating', () => {
      const result1 = addEntry(mockEntries, '/path/to/workspace', 'My Project');
      const result2 = addEntry(result1, '/path/to/workspace', 'My Project');

      expect(result2).toHaveLength(1);
    });

    it('should sort entries by lastOpenedAt descending', () => {
      let entries: WorkspaceEntry[] = [];
      
      // Add first entry
      entries = addEntry(entries, '/path1', 'Project 1');
      const firstEntry = entries[0];
      
      // Add second entry - will have newer or same timestamp
      entries = addEntry(entries, '/path2', 'Project 2');

      // Most recent should be first (or equal timestamp)
      expect(entries[0].path).toBe('/path2');
      expect(entries[1].path).toBe('/path1');
    });

    it('should move updated entry to top of list', () => {
      let entries: WorkspaceEntry[] = [];
      
      // Create entries with different timestamps to ensure proper sorting
      entries.push({ path: '/path1', name: 'Project 1', lastOpenedAt: '2024-05-10T10:00:00Z' });
      entries.push({ path: '/path2', name: 'Project 2', lastOpenedAt: '2024-05-10T10:00:01Z' });
      
      // Re-open project 1 with newer timestamp
      entries = addEntry(entries, '/path1', 'Project 1');

      // Should be at top now (it has the newest timestamp)
      expect(entries[0].path).toBe('/path1');
      expect(entries[1].path).toBe('/path2');
    });

    it('should limit entries to MAX_ENTRIES', () => {
      let entries: WorkspaceEntry[] = [];
      
      // Add more than MAX_ENTRIES (200)
      for (let i = 0; i < 250; i++) {
        entries = addEntry(entries, `/path${i}`, `Project ${i}`);
      }

      // Should be capped at 200
      expect(entries.length).toBeLessThanOrEqual(200);
    });
  });

  describe('removeEntry', () => {
    beforeEach(() => {
      mockEntries = [
        { path: '/path1', name: 'Project 1', lastOpenedAt: '2024-05-10T10:00:00Z' },
        { path: '/path2', name: 'Project 2', lastOpenedAt: '2024-05-10T11:00:00Z' },
        { path: '/path3', name: 'Project 3', lastOpenedAt: '2024-05-10T12:00:00Z' },
      ];
    });

    it('should remove entry by path', () => {
      const result = removeEntry(mockEntries, '/path2');
      
      expect(result).toHaveLength(2);
      expect(result.find(e => e.path === '/path2')).toBeUndefined();
    });

    it('should not modify entries array if path not found', () => {
      const result = removeEntry(mockEntries, '/nonexistent');
      
      expect(result).toHaveLength(3);
    });
  });

  describe('updateEntryUser', () => {
    beforeEach(() => {
      mockEntries = [
        { path: '/path1', name: 'Project 1', lastOpenedAt: '2024-05-10T10:00:00Z' },
        { path: '/path2', name: 'Project 2', lastOpenedAt: '2024-05-10T11:00:00Z' },
      ];
    });

    it('should update lastUser for matching entry', () => {
      const result = updateEntryUser(mockEntries, '/path1', 'alice');
      
      expect(result[0].lastUser).toBe('alice');
    });

    it('should not affect other entries', () => {
      const result = updateEntryUser(mockEntries, '/path1', 'alice');
      
      expect(result[1].lastUser).toBeUndefined();
    });
  });

  describe('updateEntryStats', () => {
    beforeEach(() => {
      mockEntries = [
        { path: '/path1', name: 'Project 1', lastOpenedAt: '2024-05-10T10:00:00Z' },
      ];
    });

    it('should update stats for matching entry', () => {
      const stats = { itemCount: 10, inProgressCount: 3 };
      const result = updateEntryStats(mockEntries, '/path1', stats);
      
      expect(result[0].stats).toEqual(stats);
    });

    it('should not affect other entries', () => {
      const stats = { itemCount: 10, inProgressCount: 3 };
      mockEntries.push({ path: '/path2', name: 'Project 2', lastOpenedAt: '2024-05-10T11:00:00Z' });
      
      const result = updateEntryStats(mockEntries, '/path1', stats);
      
      expect(result[1].stats).toBeUndefined();
    });
  });

  describe('getBasename', () => {
    it('should extract basename from POSIX path', () => {
      const result = getBasename('/home/user/projects/my-project');
      expect(result).toBe('my-project');
    });

    it('should extract basename from Windows path', () => {
      const result = getBasename('C:\\Users\\user\\projects\\my-project');
      expect(result).toBe('my-project');
    });

    it('should handle trailing slashes', () => {
      const result = getBasename('/home/user/projects/my-project/');
      expect(result).toBe('my-project');
    });

    it('should return full path if no separators', () => {
      const result = getBasename('my-project');
      expect(result).toBe('my-project');
    });
  });

  describe('searchEntries', () => {
    beforeEach(() => {
      mockEntries = [
        { path: '/home/alice/project-alpha', name: 'Alpha Project', lastOpenedAt: '2024-05-10T10:00:00Z' },
        { path: '/home/alice/project-beta', name: 'Beta Project', lastOpenedAt: '2024-05-10T11:00:00Z' },
        { path: '/home/bob/gamma-project', name: 'Gamma Project', lastOpenedAt: '2024-05-10T12:00:00Z' },
      ];
    });

    it('should return all entries when query is empty', () => {
      const result = searchEntries(mockEntries, '');
      expect(result).toHaveLength(3);
    });

    it('should filter by name', () => {
      const result = searchEntries(mockEntries, 'alpha');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alpha Project');
    });

    it('should filter by path', () => {
      const result = searchEntries(mockEntries, 'bob');
      expect(result).toHaveLength(1);
      expect(result[0].path).toContain('bob');
    });

    it('should be case-insensitive', () => {
      const result = searchEntries(mockEntries, 'BETA');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Beta Project');
    });

    it('should handle no matches', () => {
      const result = searchEntries(mockEntries, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });
});
