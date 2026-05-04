import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SlashCommandMenu, slashCommands, SlashCommand } from '../../src/components/SlashCommands';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

describe('SlashCommands', () => {
  describe('slashCommands array', () => {
    it('should contain all expected commands', () => {
      const commandTitles = slashCommands.map(cmd => cmd.title);

      expect(commandTitles).toContain('Heading 1');
      expect(commandTitles).toContain('Heading 2');
      expect(commandTitles).toContain('Heading 3');
      expect(commandTitles).toContain('Bullet List');
      expect(commandTitles).toContain('Numbered List');
      expect(commandTitles).toContain('Task List');
      expect(commandTitles).toContain('Code Block');
      expect(commandTitles).toContain('Quote');
      expect(commandTitles).toContain('Divider');
      expect(commandTitles).toContain('Image');
    });

    it('should have correct aliases for commands', () => {
      const h1Command = slashCommands.find(cmd => cmd.title === 'Heading 1');
      expect(h1Command?.aliases).toContain('h1');
      expect(h1Command?.aliases).toContain('heading1');

      const bulletCommand = slashCommands.find(cmd => cmd.title === 'Bullet List');
      expect(bulletCommand?.aliases).toContain('ul');
      expect(bulletCommand?.aliases).toContain('bullet');
    });

    it('should have icon for each command', () => {
      slashCommands.forEach(cmd => {
        expect(cmd.icon).toBeDefined();
      });
    });

    it('should have command function for each command', () => {
      slashCommands.forEach(cmd => {
        expect(typeof cmd.command).toBe('function');
      });
    });
  });

  describe('SlashCommandMenu component', () => {
    let mockEditor: any;
    let mockOnSelect: (command: SlashCommand) => void;
    let mockOnClose: () => void;

    beforeEach(() => {
      mockEditor = {
        chain: () => mockEditor,
        focus: () => mockEditor,
        toggleHeading: () => mockEditor,
        run: () => {},
        isActive: () => false,
      };

      mockOnSelect = () => {};
      mockOnClose = () => {};
    });

    it('should render all commands when query is empty', () => {
      render(
        <SlashCommandMenu
          editor={mockEditor}
          query=""
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          position={{ top: 100, left: 100 }}
        />
      );

      expect(screen.getByText('Heading 1')).toBeInTheDocument();
      expect(screen.getByText('Bullet List')).toBeInTheDocument();
      expect(screen.getByText('Code Block')).toBeInTheDocument();
    });

    it('should filter commands based on query', () => {
      const { rerender } = render(
        <SlashCommandMenu
          editor={mockEditor}
          query="head"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          position={{ top: 100, left: 100 }}
        />
      );

      expect(screen.getByText('Heading 1')).toBeInTheDocument();
      expect(screen.getByText('Heading 2')).toBeInTheDocument();
      expect(screen.queryByText('Bullet List')).not.toBeInTheDocument();
    });

    it('should filter commands by aliases', () => {
      render(
        <SlashCommandMenu
          editor={mockEditor}
          query="h1"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          position={{ top: 100, left: 100 }}
        />
      );

      expect(screen.getByText('Heading 1')).toBeInTheDocument();
      expect(screen.queryByText('Heading 2')).not.toBeInTheDocument();
    });

    it('should show keyboard navigation hints', () => {
      render(
        <SlashCommandMenu
          editor={mockEditor}
          query=""
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          position={{ top: 100, left: 100 }}
        />
      );

      expect(screen.getByText(/Navigate/)).toBeInTheDocument();
      expect(screen.getByText(/Select/)).toBeInTheDocument();
      expect(screen.getByText(/Close/)).toBeInTheDocument();
    });

    it('should render at correct position', () => {
      const { container } = render(
        <SlashCommandMenu
          editor={mockEditor}
          query=""
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          position={{ top: 200, left: 150 }}
        />
      );

      const menu = container.firstChild as HTMLElement;
      expect(menu.style.top).toBe('200px');
      expect(menu.style.left).toBe('150px');
    });

    it('should display command descriptions', () => {
      render(
        <SlashCommandMenu
          editor={mockEditor}
          query=""
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          position={{ top: 100, left: 100 }}
        />
      );

      expect(screen.getByText('Large section heading')).toBeInTheDocument();
      expect(screen.getByText('Create a bulleted list')).toBeInTheDocument();
    });

    it('should return null when no commands match', () => {
      const { container } = render(
        <SlashCommandMenu
          editor={mockEditor}
          query="nonexistentcommand"
          onSelect={mockOnSelect}
          onClose={mockOnClose}
          position={{ top: 100, left: 100 }}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
