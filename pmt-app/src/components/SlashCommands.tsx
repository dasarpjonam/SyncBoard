import { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Image as ImageIcon,
  Minus,
  Quote,
  FileText,
} from 'lucide-react';

export interface SlashCommand {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
  aliases?: string[];
}

export const slashCommands: SlashCommand[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 size={18} />,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    aliases: ['h1', 'heading1'],
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 size={18} />,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    aliases: ['h2', 'heading2'],
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 size={18} />,
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    aliases: ['h3', 'heading3'],
  },
  {
    title: 'Bullet List',
    description: 'Create a bulleted list',
    icon: <List size={18} />,
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
    aliases: ['ul', 'bullet', 'unordered'],
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered size={18} />,
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    aliases: ['ol', 'ordered', 'number'],
  },
  {
    title: 'Task List',
    description: 'Create a task list with checkboxes',
    icon: <CheckSquare size={18} />,
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
    aliases: ['todo', 'checkbox', 'check'],
  },
  {
    title: 'Code Block',
    description: 'Insert a code block',
    icon: <Code size={18} />,
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    aliases: ['code', 'codeblock'],
  },
  {
    title: 'Quote',
    description: 'Insert a blockquote',
    icon: <Quote size={18} />,
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
    aliases: ['blockquote', 'cite'],
  },
  {
    title: 'Divider',
    description: 'Insert a horizontal line',
    icon: <Minus size={18} />,
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
    aliases: ['hr', 'horizontal', 'line', 'divider'],
  },
  {
    title: 'Image',
    description: 'Upload and insert an image',
    icon: <ImageIcon size={18} />,
    command: (editor) => {
      // Trigger file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // Convert to base64 for now (later can be saved to disk)
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target?.result as string;
            editor.chain().focus().setImage({ src }).run();
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    },
    aliases: ['img', 'picture', 'photo'],
  },
];

interface Props {
  editor: Editor;
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export function SlashCommandMenu({ editor, query, onSelect, onClose, position }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filteredCommands = query
    ? slashCommands.filter((cmd) => {
        const searchText = query.toLowerCase();
        return (
          cmd.title.toLowerCase().includes(searchText) ||
          cmd.description.toLowerCase().includes(searchText) ||
          cmd.aliases?.some((alias) => alias.toLowerCase().includes(searchText))
        );
      })
    : slashCommands;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-80"
      style={{ top: position.top, left: position.left }}
    >
      <div className="max-h-80 overflow-y-auto">
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.title}
            type="button"
            className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
              index === selectedIndex ? 'bg-blue-50' : ''
            }`}
            onClick={() => onSelect(cmd)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <div className="mt-1 text-gray-600">{cmd.icon}</div>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">{cmd.title}</div>
              <div className="text-xs text-gray-500 mt-0.5">{cmd.description}</div>
            </div>
          </button>
        ))}
      </div>
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-xs text-gray-500">
        <span className="font-medium">↑↓</span> Navigate • <span className="font-medium">Enter</span> Select •{' '}
        <span className="font-medium">Esc</span> Close
      </div>
    </div>
  );
}
