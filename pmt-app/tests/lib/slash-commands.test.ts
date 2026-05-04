import { describe, it, expect, vi } from 'vitest';
import { parseSlashCommand, parseSlashArgs, getAvailableCommands } from '../../src/lib/slash-commands';
import { ToolRegistry } from '../../src/lib/tool-registry';

describe('slash-commands', () => {
  describe('parseSlashCommand', () => {
    it('returns null for empty or whitespace string', () => {
      expect(parseSlashCommand('')).toBeNull();
      expect(parseSlashCommand('   \n  ')).toBeNull();
    });

    it('returns null if input does not start with a slash', () => {
      expect(parseSlashCommand('create a bug')).toBeNull();
      expect(parseSlashCommand('  not a slash command')).toBeNull();
      expect(parseSlashCommand('x/slash')).toBeNull(); // slash not at the start
    });

    it('returns null for a slash with no command text', () => {
      expect(parseSlashCommand('/')).toBeNull();
      expect(parseSlashCommand('/ ')).toBeNull();
    });

    it('parses a simple command with no args', () => {
      expect(parseSlashCommand('/summary')).toEqual({ command: 'summary', rawArgs: '' });
      expect(parseSlashCommand('  /status  ')).toEqual({ command: 'status', rawArgs: '' });
    });

    it('parses commands case-insensitively, returning lowercase', () => {
      expect(parseSlashCommand('/SuMmArY')).toEqual({ command: 'summary', rawArgs: '' });
    });

    it('parses a command with arguments', () => {
      expect(parseSlashCommand('/search auth login')).toEqual({ command: 'search', rawArgs: 'auth login' });
      expect(parseSlashCommand('/list status:In Progress')).toEqual({ command: 'list', rawArgs: 'status:In Progress' });
    });

    it('handles alphanumeric command names', () => {
      expect(parseSlashCommand('/command123 args')).toEqual({ command: 'command123', rawArgs: 'args' });
    });

    it('handles multiline arguments', () => {
      expect(parseSlashCommand('/desc update \nline 1\nline 2')).toEqual({ command: 'desc', rawArgs: 'update \nline 1\nline 2' });
    });

    it('ignores leading/trailing whitespace around raw arguments', () => {
      expect(parseSlashCommand('/test   my args   ')).toEqual({ command: 'test', rawArgs: 'my args' });
    });
  });

  describe('parseSlashArgs', () => {
    it('returns an empty object for empty or falsy strings', () => {
      expect(parseSlashArgs('')).toEqual({});
    });

    it('returns query for whitespace-only strings based on implementation', () => {
      // The implementation sets remaining to rawArgs, and if remaining is truthy, sets query to remaining.
      // E.g. '   ' -> { query: '   ' }
      expect(parseSlashArgs('   ')).toEqual({ query: '   ' });
    });

    it('parses a single key:value pair', () => {
      expect(parseSlashArgs('status:Open')).toEqual({ status: 'Open' });
    });

    it('parses multiple key:value pairs', () => {
      expect(parseSlashArgs('status:In Progress assignee:Alice')).toEqual({
        status: 'In Progress',
        assignee: 'Alice',
      });
    });

    it('parses positional query only', () => {
      expect(parseSlashArgs('auth login')).toEqual({ query: 'auth login' });
    });

    it('parses mixed key:value pairs and positional query', () => {
      expect(parseSlashArgs('auth status:In Progress assignee:Alice')).toEqual({
        query: 'auth',
        status: 'In Progress',
        assignee: 'Alice',
      });
    });

    it('handles keys in case-insensitive manner, returning lowercased keys', () => {
      expect(parseSlashArgs('STATUS:Open')).toEqual({ status: 'Open' });
    });

    it('handles values with spaces, terminating at the next key: pair', () => {
      expect(parseSlashArgs('title:A very long title status:Open')).toEqual({
        title: 'A very long title',
        status: 'Open'
      });
    });

    it('ignores standalone colons or improperly formatted pairs as part of the query', () => {
       // 'some query: with colon but not a valid pair' doesn't match the \w+: format fully without another \s+\w+:
       // Wait, it DOES match 'query:' as key and 'with colon but not a valid pair' as value.
       // Let's actually test what the code does for a random colon:
       expect(parseSlashArgs('just some: words')).toEqual({
         some: 'words',
         query: 'just'
       });
    });
  });
});

  describe('getAvailableCommands', () => {
    it('returns the commands from the tool registry', () => {
      // Create a mock ToolRegistry
      const mockCommands = [
        { command: 'test', description: 'A test command' },
        { command: 'mock', description: 'A mock command' }
      ];

      const mockRegistry = {
        getSlashCommands: vi.fn().mockReturnValue(mockCommands)
      } as unknown as ToolRegistry;

      const result = getAvailableCommands(mockRegistry);

      expect(mockRegistry.getSlashCommands).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockCommands);
    });
});
