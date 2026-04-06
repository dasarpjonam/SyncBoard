import { Editor } from '@tiptap/react';
import { useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Highlighter,
  Type,
} from 'lucide-react';

interface Props {
  editor: Editor;
}

export function BubbleMenuToolbar({ editor }: Props) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const updateMenu = () => {
      const { selection } = editor.state;
      const { from, to, empty } = selection;

      // Hide menu if selection is empty
      if (empty) {
        setShow(false);
        return;
      }

      // Show menu if text is selected
      setShow(true);

      // Calculate position
      const start = editor.view.coordsAtPos(from);
      const end = editor.view.coordsAtPos(to);
      
      const left = (start.left + end.right) / 2;
      const top = start.top - 50; // Above the selection

      setPosition({ top, left });
    };

    editor.on('selectionUpdate', updateMenu);
    editor.on('update', updateMenu);

    return () => {
      editor.off('selectionUpdate', updateMenu);
      editor.off('update', updateMenu);
    };
  }, [editor]);

  if (!show) return null;
  const ToolbarButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 hover:bg-gray-100 rounded transition-colors ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
      }`}
    >
      {children}
    </button>
  );

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // Cancelled
    if (url === null) {
      return;
    }

    // Empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // Update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const colors = [
    { name: 'Yellow', value: '#fef08a' },
    { name: 'Green', value: '#bbf7d0' },
    { name: 'Blue', value: '#bfdbfe' },
    { name: 'Pink', value: '#fbcfe8' },
    { name: 'Remove', value: null },
  ];

  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg flex items-center gap-1 p-1"
      style={{ top: `${position.top}px`, left: `${position.left}px`, transform: 'translateX(-50%)' }}
    >
      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold (⌘B)"
      >
        <Bold size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic (⌘I)"
      >
        <Italic size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough size={16} />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="Inline Code (⌘E)"
      >
        <Code size={16} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Link */}
      <ToolbarButton
        onClick={setLink}
        active={editor.isActive('link')}
        title="Add Link (⌘K)"
      >
        <LinkIcon size={16} />
      </ToolbarButton>

      <div className="w-px h-6 bg-gray-200 mx-1" />

      {/* Highlight Colors */}
      <div className="flex items-center gap-1">
        {colors.map((color) => (
          <button
            key={color.name}
            type="button"
            onClick={() => {
              if (color.value === null) {
                editor.chain().focus().unsetHighlight().run();
              } else {
                editor.chain().focus().setHighlight({ color: color.value }).run();
              }
            }}
            title={`Highlight ${color.name}`}
            className={`w-6 h-6 rounded border-2 ${
              editor.isActive('highlight', { color: color.value })
                ? 'border-gray-700'
                : 'border-gray-300'
            } hover:border-gray-500 transition-colors`}
            style={{
              backgroundColor: color.value || 'transparent',
            }}
          >
            {color.value === null && (
              <span className="text-xs text-gray-500">✕</span>
            )}
          </button>
        ))}
      </div>

      {/* Turn into dropdown for headings */}
      <div className="w-px h-6 bg-gray-200 mx-1" />
      
      <div className="relative group">
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-700 flex items-center gap-1"
          title="Turn into..."
        >
          <Type size={16} />
          <span className="text-xs">▾</span>
        </button>
        <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg hidden group-hover:block min-w-[140px]">
          <button
            type="button"
            onClick={() => editor.chain().focus().setParagraph().run()}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          >
            Paragraph
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          >
            Heading 1
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          >
            Heading 2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          >
            Heading 3
          </button>
        </div>
      </div>
    </div>
  );
}
