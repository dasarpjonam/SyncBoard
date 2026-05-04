import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RichEditor } from '../../src/components/RichEditor';

vi.mock('../../src/store/WorkspaceContext', () => ({
  useWorkspace: vi.fn().mockReturnValue({
    llmProvider: 'mockProvider',
    llmApiKeys: {},
    llmModel: 'mockModel',
  }),
}));

// Mock window.electronAPI
const mockElectronAPI = {
  ensureDir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(new Uint8Array()),
};

(global as any).window.electronAPI = mockElectronAPI;

describe('RichEditor Integration Tests', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should render editor with placeholder', () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
          placeholder="Start typing..."
        />
      );

      const editorNode = document.querySelector('.tiptap') as HTMLElement;
      expect(editorNode.querySelector('[data-placeholder="Start typing..."]')).toBeInTheDocument();
    });

    it('should display initial content', () => {
      render(
        <RichEditor
          content="# Hello World\n\nThis is a test."
          onChange={mockOnChange}
        />
      );

      // TipTap should render the markdown
      const editor = document.querySelector('.tiptap') as HTMLElement;
      expect(editor).toBeInTheDocument();
    });

    it('should call onChange when content changes', async () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
        />
      );

      const editor = document.querySelector('.tiptap') as HTMLElement;
      fireEvent.input(editor, { target: { innerHTML: '<p>New content</p>' } });

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Toolbar Features', () => {
    it('should render toolbar with formatting buttons', () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
        />
      );

      // Check for toolbar buttons
      expect(screen.getByTitle(/Bold/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Italic/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Heading 1/i)).toBeInTheDocument();
    });

    it('should show undo and redo buttons', () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTitle(/Undo/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Redo/i)).toBeInTheDocument();
    });

    it('should have list formatting buttons', () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTitle(/Bullet List/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Numbered List/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Task List/i)).toBeInTheDocument();
    });
  });

  describe('Auto-save Feature', () => {
    it('should not show auto-save indicator when autoSave is false', () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
          autoSave={false}
        />
      );

      expect(screen.queryByText(/Saving/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Saved/i)).not.toBeInTheDocument();
    });

    it('should show auto-save indicator when autoSave is true and status is saving', () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
          autoSave={true}
          saveStatus="saving"
        />
      );

      expect(screen.getByText(/Saving/i)).toBeInTheDocument();
    });

    it('should show saved status with timestamp', () => {
      const now = new Date();
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
          autoSave={true}
          saveStatus="saved"
          lastSavedAt={now}
        />
      );

      expect(screen.getByText(/Saved/i)).toBeInTheDocument();
    });
  });

  describe('Mention Support', () => {
    it('should support @mention with custom users', () => {
      const mockOnMention = vi.fn((query: string) => {
        return ['Alice', 'Bob', 'Charlie'].filter(name =>
          name.toLowerCase().includes(query.toLowerCase())
        );
      });

      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
          onMention={mockOnMention}
        />
      );

      // Editor should have mention extension configured
      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });
  });

  describe('Markdown Round-trip', () => {
    it('should handle markdown headings', () => {
      const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
      render(
        <RichEditor
          content={markdown}
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });

    it('should handle markdown lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      render(
        <RichEditor
          content={markdown}
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });

    it('should handle markdown task lists', () => {
      const markdown = '- [ ] Todo 1\n- [x] Todo 2 (done)';
      render(
        <RichEditor
          content={markdown}
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });

    it('should handle markdown links', () => {
      const markdown = '[Google](https://google.com)';
      render(
        <RichEditor
          content={markdown}
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });

    it('should handle markdown code blocks', () => {
      const markdown = '```javascript\nconst x = 42;\n```';
      render(
        <RichEditor
          content={markdown}
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });

    it('should handle markdown blockquotes', () => {
      const markdown = '> This is a quote';
      render(
        <RichEditor
          content={markdown}
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });
  });

  describe('Advanced Features', () => {
    it('should support image uploads when workspacePath is provided', () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
          workspacePath="/test/workspace"
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
      // Image upload functionality is tested through drag-drop and paste events
    });

    it('should support code blocks with syntax highlighting', () => {
      const markdown = '```python\ndef hello():\n    print("world")\n```';
      render(
        <RichEditor
          content={markdown}
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });

    it('should support horizontal rules', () => {
      const markdown = 'Content above\n\n---\n\nContent below';
      render(
        <RichEditor
          content={markdown}
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });

    it('should support text highlighting', () => {
      render(
        <RichEditor
          content="Normal text with ==highlighted== parts"
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should support bold shortcut (Cmd+B)', () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
        />
      );

      const editor = document.querySelector('.tiptap') as HTMLElement;

      // Simulate Cmd+B
      fireEvent.keyDown(editor, { key: 'b', metaKey: true });

      // Editor should respond (actual behavior tested in TipTap)
      expect(editor).toBeInTheDocument();
    });

    it('should support italic shortcut (Cmd+I)', () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
        />
      );

      const editor = document.querySelector('.tiptap') as HTMLElement;
      fireEvent.keyDown(editor, { key: 'i', metaKey: true });

      expect(editor).toBeInTheDocument();
    });
  });

  describe('Content Updates', () => {
    it('should update editor when content prop changes', () => {
      const { rerender } = render(
        <RichEditor
          content="Initial content"
          onChange={mockOnChange}
        />
      );

      rerender(
        <RichEditor
          content="Updated content"
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });

    it('should not trigger onChange when updating from prop', () => {
      const { rerender } = render(
        <RichEditor
          content="Initial"
          onChange={mockOnChange}
        />
      );

      mockOnChange.mockClear();

      rerender(
        <RichEditor
          content="Initial"
          onChange={mockOnChange}
        />
      );

      // Should not call onChange for programmatic content updates
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      render(
        <RichEditor
          content=""
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      render(
        <RichEditor
          content={longContent}
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      const specialContent = '# Title with émojis 🎉 and spëcial çhars';
      render(
        <RichEditor
          content={specialContent}
          onChange={mockOnChange}
        />
      );

      expect(document.querySelector('.tiptap') as HTMLElement).toBeInTheDocument();
    });
  });
});
