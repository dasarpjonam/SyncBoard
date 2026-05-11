import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listTodosToolHandler,
  createTodoToolHandler,
  updateTodoToolHandler,
  deleteTodoToolHandler,
} from '../../src/lib/tools/todos-tool';
import { ToolContext } from '../../src/types/chat';
import { PersonalTodo } from '../../src/types';

describe('Personal Todos Tools', () => {
  let mockContext: ToolContext;
  let mockTodos: PersonalTodo[];

  beforeEach(() => {
    mockTodos = [
      {
        id: 'todo-1',
        text: 'Buy groceries',
        targetDate: '2024-05-15',
        done: false,
        createdAt: '2024-05-10T10:00:00Z',
        updatedAt: '2024-05-10T10:00:00Z',
      },
      {
        id: 'todo-2',
        text: 'Write report',
        targetDate: '2024-05-12',
        recurrence: 'weekly',
        done: false,
        createdAt: '2024-05-09T10:00:00Z',
        updatedAt: '2024-05-09T10:00:00Z',
      },
    ];

    mockContext = {
      items: [],
      personalNotes: [],
      config: { types: [], statuses: [], users: [] },
      workspacePath: '/test',
      currentUser: 'alice',
      todos: mockTodos,
      addTodo: vi.fn().mockResolvedValue(undefined),
      updateTodo: vi.fn().mockResolvedValue(undefined),
      deleteTodo: vi.fn().mockResolvedValue(undefined),
      toggleTodoDone: vi.fn().mockResolvedValue(undefined),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
      addPersonalNote: vi.fn(),
      updatePersonalNote: vi.fn(),
      deletePersonalNote: vi.fn(),
      electronAPI: {} as any,
    };
  });

  describe('listTodosToolHandler', () => {
    it('should list all todos', async () => {
      const result = await listTodosToolHandler({}, mockContext);

      expect(result.summary).toContain('Found 2 todos');
      expect(result.data).toHaveLength(2);
    });

    it('should format todos in markdown with details', async () => {
      const result = await listTodosToolHandler({}, mockContext);

      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('Buy groceries');
      expect(result.richContent?.[0]?.content).toContain('Write report');
    });

    it('should show recurrence in output', async () => {
      const result = await listTodosToolHandler({}, mockContext);

      expect(result.richContent?.[0]?.content).toContain('weekly');
    });

    it('should handle empty todo list', async () => {
      mockContext.todos = [];
      const result = await listTodosToolHandler({}, mockContext);

      expect(result.summary).toContain('No todos found');
    });

    it('should require current user', async () => {
      mockContext.currentUser = undefined;
      const result = await listTodosToolHandler({}, mockContext);

      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('No user selected');
    });
  });

  describe('createTodoToolHandler', () => {
    it('should create new todo with text only', async () => {
      const result = await createTodoToolHandler({ text: 'New task' }, mockContext);

      expect(mockContext.addTodo).toHaveBeenCalled();
      expect(result.summary).toContain('Created todo');
      expect(result.summary).toContain('New task');
    });

    it('should create todo with target date', async () => {
      const result = await createTodoToolHandler(
        { text: 'New task', targetDate: '2024-05-20' },
        mockContext
      );

      expect(mockContext.addTodo).toHaveBeenCalled();
      expect(result.richContent?.[0]?.content).toContain('2024-05-20');
    });

    it('should create todo with recurrence', async () => {
      const result = await createTodoToolHandler(
        { text: 'Weekly review', recurrence: 'weekly' },
        mockContext
      );

      expect(mockContext.addTodo).toHaveBeenCalled();
      expect(result.richContent?.[0]?.content).toContain('weekly');
    });

    it('should require current user', async () => {
      mockContext.currentUser = undefined;
      const result = await createTodoToolHandler({ text: 'Task' }, mockContext);

      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('No user selected');
      expect(mockContext.addTodo).not.toHaveBeenCalled();
    });

    it('should create new todo with defaults', async () => {
      const result = await createTodoToolHandler({}, mockContext);

      // Implementation creates todo even without text (uses undefined)
      expect(mockContext.addTodo).toHaveBeenCalled();
    });
  });

  describe('updateTodoToolHandler', () => {
    it('should update todo text', async () => {
      const result = await updateTodoToolHandler(
        { id: 'todo-1', text: 'Updated task' },
        mockContext
      );

      expect(mockContext.updateTodo).toHaveBeenCalled();
      expect(result.summary).toContain('Updated todo');
    });

    it('should update todo date', async () => {
      const result = await updateTodoToolHandler(
        { id: 'todo-1', targetDate: '2024-05-25' },
        mockContext
      );

      expect(mockContext.updateTodo).toHaveBeenCalled();
      expect(result.richContent?.[0]?.content).toContain('2024-05-25');
    });

    it('should update todo recurrence', async () => {
      const result = await updateTodoToolHandler(
        { id: 'todo-1', recurrence: 'monthly' },
        mockContext
      );

      expect(mockContext.updateTodo).toHaveBeenCalled();
      expect(result.richContent?.[0]?.content).toContain('monthly');
    });

    it('should mark todo as done', async () => {
      const result = await updateTodoToolHandler(
        { id: 'todo-1', done: true },
        mockContext
      );

      expect(mockContext.updateTodo).toHaveBeenCalled();
      expect(result.richContent?.[0]?.content).toContain('Done');
    });

    it('should require current user', async () => {
      mockContext.currentUser = undefined;
      const result = await updateTodoToolHandler({ id: 'todo-1' }, mockContext);

      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('No user selected');
    });

    it('should handle non-existent todo', async () => {
      const result = await updateTodoToolHandler(
        { id: 'nonexistent' },
        mockContext
      );

      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('not found');
    });

    it('should handle missing id parameter', async () => {
      const result = await updateTodoToolHandler({}, mockContext);

      // Implementation looks for todo with id:undefined
      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('not found');
    });
  });

  describe('deleteTodoToolHandler', () => {
    it('should delete todo by id', async () => {
      const result = await deleteTodoToolHandler({ id: 'todo-1' }, mockContext);

      expect(mockContext.deleteTodo).toHaveBeenCalledWith('todo-1');
      expect(result.summary).toContain('Deleted');
    });

    it('should require current user', async () => {
      mockContext.currentUser = undefined;
      const result = await deleteTodoToolHandler({ id: 'todo-1' }, mockContext);

      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('No user selected');
    });

    it('should handle non-existent todo', async () => {
      const result = await deleteTodoToolHandler(
        { id: 'nonexistent' },
        mockContext
      );

      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('not found');
    });

    it('should handle missing id parameter', async () => {
      const result = await deleteTodoToolHandler({}, mockContext);

      // When id is undefined, todo won't be found
      expect(result.richContent?.[0]?.type).toBe('markdown');
      expect(result.richContent?.[0]?.content).toContain('not found');
    });
  });
});
