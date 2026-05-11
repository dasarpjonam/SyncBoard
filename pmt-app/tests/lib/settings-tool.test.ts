import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  viewSettingsToolHandler,
  updateSettingsToolHandler,
  listUsersToolHandler,
  setCurrentUserToolHandler,
} from '../../src/lib/tools/settings-tool';
import { ToolContext } from '../../src/types/chat';

describe('Settings Tools', () => {
  let mockContext: ToolContext;

  beforeEach(() => {
    mockContext = {
      items: [],
      personalNotes: [],
      config: {
        types: ['Task', 'Bug'],
        statuses: ['To Do', 'Done'],
        users: ['Alice', 'Bob', 'Charlie'],
      },
      workspacePath: '/test/workspace',
      currentUser: 'Alice',
      llmProvider: 'anthropic',
      llmModel: 'claude-opus',
      llmApiKeys: { anthropic: 'test-key' },
      availableUsers: ['Alice', 'Bob', 'Charlie'],
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      addPersonalNote: vi.fn(),
      updatePersonalNote: vi.fn(),
      deletePersonalNote: vi.fn(),
      todos: [],
      addTodo: vi.fn(),
      updateTodo: vi.fn(),
      deleteTodo: vi.fn(),
      toggleTodoDone: vi.fn(),
      electronAPI: {} as any,
    };
  });

  describe('viewSettingsToolHandler', () => {
    it('should return current settings', async () => {
      const result = await viewSettingsToolHandler({}, mockContext);

      expect(result.summary).toBe('Current workspace settings');
      expect(result.data?.llmProvider).toBe('anthropic');
      expect(result.data?.llmModel).toBe('claude-opus');
      expect(result.data?.hasApiKey).toBe(true);
      expect(result.data?.currentUser).toBe('Alice');
    });

    it('should indicate when API key is missing', async () => {
      mockContext.llmApiKeys = {};
      const result = await viewSettingsToolHandler({}, mockContext);

      expect(result.data?.hasApiKey).toBe(false);
    });

    it('should format settings in markdown', async () => {
      const result = await viewSettingsToolHandler({}, mockContext);

      expect(result.richContent).toBeDefined();
      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('anthropic');
    });
  });

  describe('updateSettingsToolHandler', () => {
    beforeEach(() => {
      mockContext.setLLMProvider = vi.fn();
      mockContext.setLLMModel = vi.fn();
      mockContext.setApiKey = vi.fn();
    });

    it('should update LLM provider', async () => {
      const result = await updateSettingsToolHandler({ llmProvider: 'openai' }, mockContext);

      expect(mockContext.setLLMProvider).toHaveBeenCalledWith('openai');
      expect(result.summary).toContain('Updated 1 setting(s)');
    });

    it('should update LLM model', async () => {
      const result = await updateSettingsToolHandler({ llmModel: 'gpt-4' }, mockContext);

      expect(mockContext.setLLMModel).toHaveBeenCalledWith('gpt-4');
    });

    it('should update API key', async () => {
      const result = await updateSettingsToolHandler(
        { llmProvider: 'openai', apiKey: 'sk-test' },
        mockContext
      );

      expect(mockContext.setApiKey).toHaveBeenCalledWith('openai', 'sk-test');
    });

    it('should handle multiple updates', async () => {
      const result = await updateSettingsToolHandler(
        { llmProvider: 'google', llmModel: 'gemini-pro', apiKey: 'goog-key' },
        mockContext
      );

      expect(mockContext.setLLMProvider).toHaveBeenCalledWith('google');
      expect(mockContext.setLLMModel).toHaveBeenCalledWith('gemini-pro');
      expect(mockContext.setApiKey).toHaveBeenCalledWith('google', 'goog-key');
      expect(result.summary).toContain('3 setting(s)');
    });

    it('should report no updates when no settings provided', async () => {
      const result = await updateSettingsToolHandler({}, mockContext);

      expect(result.summary).toBe('No settings were updated');
      expect(result.richContent?.[0]?.type).toBe('markdown');
    });

    it('should handle missing update handlers gracefully', async () => {
      mockContext.setLLMProvider = undefined;
      mockContext.setLLMModel = undefined;
      mockContext.setApiKey = undefined;

      const result = await updateSettingsToolHandler({ llmProvider: 'openai' }, mockContext);

      expect(result.richContent?.[0]?.type).toBe('error');
    });
  });

  describe('listUsersToolHandler', () => {
    it('should list all available users', async () => {
      const result = await listUsersToolHandler({}, mockContext);

      expect(result.summary).toBe('Found 3 user(s)');
      expect(result.data?.users).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(result.data?.currentUser).toBe('Alice');
    });

    it('should mark current user in output', async () => {
      const result = await listUsersToolHandler({}, mockContext);

      expect(result.richContent?.[0]?.content).toContain('✓ Alice');
    });

    it('should handle empty user list', async () => {
      mockContext.availableUsers = [];
      const result = await listUsersToolHandler({}, mockContext);

      expect(result.summary).toBe('No users found');
      expect(result.richContent?.[0]?.type).toBe('markdown');
    });
  });

  describe('setCurrentUserToolHandler', () => {
    beforeEach(() => {
      mockContext.setCurrentUser = vi.fn().mockResolvedValue(undefined);
    });

    it('should switch to specified user', async () => {
      const result = await setCurrentUserToolHandler({ user: 'Bob' }, mockContext);

      expect(mockContext.setCurrentUser).toHaveBeenCalledWith('Bob');
      expect(result.summary).toContain('Bob');
    });

    it('should validate user exists in available list', async () => {
      const result = await setCurrentUserToolHandler({ user: 'NonExistent' }, mockContext);

      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('not found');
      expect(mockContext.setCurrentUser).not.toHaveBeenCalled();
    });

    it('should handle missing user parameter', async () => {
      const result = await setCurrentUserToolHandler({}, mockContext);

      expect(result.richContent?.[0]?.type).toBe('error');
    });

    it('should handle non-string user parameter', async () => {
      const result = await setCurrentUserToolHandler({ user: 123 }, mockContext);

      expect(result.richContent?.[0]?.type).toBe('error');
    });

    it('should report success when user switched', async () => {
      const result = await setCurrentUserToolHandler({ user: 'Charlie' }, mockContext);

      expect(result.summary).toBe('Switched to user: Charlie');
      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('Charlie');
    });

    it('should handle missing setCurrentUser handler', async () => {
      mockContext.setCurrentUser = undefined;
      const result = await setCurrentUserToolHandler({ user: 'Bob' }, mockContext);

      expect(result.richContent?.[0]?.type).toBe('error');
    });

    it('should allow switching to same user', async () => {
      const result = await setCurrentUserToolHandler({ user: 'Alice' }, mockContext);

      expect(mockContext.setCurrentUser).toHaveBeenCalledWith('Alice');
      expect(result.summary).toContain('Alice');
    });
  });
});
