import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Blockquote from '@tiptap/extension-blockquote';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { common, createLowlight } from 'lowlight';
import { Markdown } from 'tiptap-markdown';
import { EditorToolbar } from './EditorToolbar';
import { BubbleMenuToolbar } from './BubbleMenuToolbar';
import { SlashCommandMenu, slashCommands, SlashCommand } from './SlashCommands';
import { AutoSaveIndicator, SaveStatus } from './AutoSaveIndicator';
import { useWorkspace } from '../store/WorkspaceContext';
import { generateDescriptionRewrite, WorkItemMetadata } from '../lib/llm-autofill';
import { Sparkles, ChevronDown, X } from 'lucide-react';

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

interface Props {
  content: string;
  onChange: (markdown: string) => void;
  onMention?: (query: string) => string[];
  placeholder?: string;
  className?: string;
  autoSave?: boolean;
  saveStatus?: SaveStatus;
  lastSavedAt?: Date;
  workspacePath?: string;
  workItemMetadata?: WorkItemMetadata;
}

export function RichEditor({
  content,
  onChange,
  onMention,
  placeholder = 'Write your content here... (Type / for commands)',
  className = '',
  autoSave = false,
  saveStatus = 'idle',
  lastSavedAt,
  workspacePath,
  workItemMetadata,
}: Props) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashQuery, setSlashQuery] = useState('');
  const [viewMode, setViewMode] = useState<'rich' | 'markdown'>('rich');
  const [markdownText, setMarkdownText] = useState(content);
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewriteError, setRewriteError] = useState<string | null>(null);
  const cancelRef = useRef(false);

  // Get LLM settings from workspace context
  const { llmProvider, llmApiKeys, llmModel } = useWorkspace();

  // Handle image upload to workspace
  const handleImageUpload = useCallback(
    async (file: File): Promise<string> => {
      if (!workspacePath) {
        // Fallback to base64 if no workspace path
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }

      try {
        // Create attachments directory if it doesn't exist
        const attachmentsDir = `${workspacePath}/.syncboard/attachments`;
        await window.electronAPI.ensureDir(attachmentsDir);

        // Generate unique filename
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}-${safeName}`;
        const filePath = `${attachmentsDir}/${fileName}`;

        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Write file (convert to base64 string for Electron API)
        const base64 = btoa(String.fromCharCode(...uint8Array));
        await window.electronAPI.writeFile(filePath, base64);

        // Return relative path for markdown
        return `.syncboard/attachments/${fileName}`;
      } catch (error) {
        console.error('Failed to upload image:', error);
        // Fallback to base64
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }
    },
    [workspacePath]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: false, // Disable default code block, use CodeBlockLowlight instead
        blockquote: false, // Disable default, use configured one below
        horizontalRule: false, // Disable default, use configured one below
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'code-block bg-gray-900 text-gray-100 rounded-lg p-4 my-4 overflow-x-auto',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg my-4',
        },
      }),
      Blockquote.configure({
        HTMLAttributes: {
          class: 'border-l-4 border-gray-300 pl-4 italic text-gray-700 my-4',
        },
      }),
      HorizontalRule.configure({
        HTMLAttributes: {
          class: 'my-8 border-gray-300',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      Mention.configure({
        HTMLAttributes: {
          class: 'mention bg-blue-100 text-blue-700 px-1 rounded',
        },
        suggestion: {
          items: ({ query }) => {
            if (!onMention) {
              console.log('[Mention] onMention not provided');
              return [];
            }
            const results = onMention(query);
            console.log('[Mention] Query:', query, 'Results:', results);
            return results;
          },
          render: () => {
            let component: HTMLDivElement;
            let selectedIndex = 0;

            return {
              onStart: (props: any) => {
                console.log('[Mention] onStart triggered', props.items);
                component = document.createElement('div');
                component.className =
                  'mention-suggestions bg-white border rounded-lg shadow-lg max-h-48 overflow-auto z-[9999] absolute';
                component.style.position = 'absolute';

                const updateItems = () => {
                  component.textContent = '';
                  if (props.items.length === 0) {
                    const noResults = document.createElement('div');
                    noResults.className = 'px-3 py-2 text-sm text-gray-500';
                    noResults.textContent = 'No users found';
                    component.appendChild(noResults);
                    return;
                  }

                  props.items.forEach((item: string, index: number) => {
                    const button = document.createElement('button');
                    button.className = `w-full text-left px-3 py-2 text-sm transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100 text-gray-900'
                    }`;
                    button.textContent = item;
                    button.onclick = () => {
                      console.log('[Mention] User selected:', item);
                      props.command({ id: item, label: item });
                    };
                    component.appendChild(button);
                  });
                };

                updateItems();

                // Position the component
                if (props.clientRect) {
                  const rect = props.clientRect();
                  component.style.left = `${rect.left}px`;
                  component.style.top = `${rect.bottom + 5}px`;
                  console.log('[Mention] Positioned at:', { left: rect.left, top: rect.bottom + 5 });
                }

                document.body.appendChild(component);
                selectedIndex = 0;
              },

              onUpdate(props: any) {
                selectedIndex = 0;
                component.textContent = '';
                
                if (props.items.length === 0) {
                  const noResults = document.createElement('div');
                  noResults.className = 'px-3 py-2 text-sm text-gray-500';
                  noResults.textContent = 'No users found';
                  component.appendChild(noResults);
                } else {
                  props.items.forEach((item: string, index: number) => {
                    const button = document.createElement('button');
                    button.className = `w-full text-left px-3 py-2 text-sm transition-colors ${
                      index === selectedIndex
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100 text-gray-900'
                    }`;
                    button.textContent = item;
                    button.onclick = () => props.command({ id: item, label: item });
                    component.appendChild(button);
                  });
                }

                // Update position
                if (props.clientRect) {
                  const rect = props.clientRect();
                  component.style.left = `${rect.left}px`;
                  component.style.top = `${rect.bottom + 5}px`;
                }
              },

              onKeyDown(props: any) {
                if (props.event.key === 'ArrowUp') {
                  selectedIndex = Math.max(0, selectedIndex - 1);
                  // Re-render to update selection
                  this.onUpdate?.(props);
                  return true;
                }

                if (props.event.key === 'ArrowDown') {
                  selectedIndex = Math.min(props.items.length - 1, selectedIndex + 1);
                  // Re-render to update selection
                  this.onUpdate?.(props);
                  return true;
                }

                if (props.event.key === 'Enter') {
                  if (props.items[selectedIndex]) {
                    props.command({ id: props.items[selectedIndex], label: props.items[selectedIndex] });
                    return true;
                  }
                }

                if (props.event.key === 'Escape') {
                  if (component && component.parentNode) {
                    component.remove();
                  }
                  return true;
                }

                return false;
              },

              onExit() {
                if (component && component.parentNode) {
                  component.remove();
                }
              },
            };
          },
        },
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4',
      },
      handleDrop: (view, event, slice, moved) => {
        // Handle image drops
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith('image/')) {
            event.preventDefault();
            handleImageUpload(file).then((src) => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (coordinates) {
                const node = schema.nodes.image.create({ src });
                const transaction = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(transaction);
              }
            });
            return true;
          }
        }
        return false;
      },
      handlePaste: (view, event) => {
        // Handle image paste
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
              event.preventDefault();
              const file = items[i].getAsFile();
              if (file) {
                handleImageUpload(file).then((src) => {
                  editor?.chain().focus().setImage({ src }).run();
                });
              }
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Get markdown from editor using the extension's getMarkdown method
      const markdown = (editor.storage as any).markdown?.getMarkdown?.() || editor.getText();
      setMarkdownText(markdown); // Sync to markdown state
      onChange(markdown);
    },
  });

  // Update editor content when prop changes externally
  useEffect(() => {
    if (editor) {
      const currentMarkdown = (editor.storage as any).markdown?.getMarkdown?.() || editor.getText();
      if (content !== currentMarkdown) {
        setMarkdownText(content);
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  // Handle slash command detection
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        // Get cursor position
        const { selection } = editor.state;
        const { from } = selection;
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from);

        // Only show menu if at start of line or after space
        if (textBefore === '' || textBefore === ' ' || textBefore === '\n') {
          setTimeout(() => {
            const coords = editor.view.coordsAtPos(from);
            setSlashMenuPosition({ top: coords.bottom + 8, left: coords.left });
            setShowSlashMenu(true);
            setSlashQuery('');
          }, 0);
        }
      } else if (showSlashMenu && e.key === 'Escape') {
        setShowSlashMenu(false);
      }
    };

    const handleInput = () => {
      if (!showSlashMenu) return;

      const { selection } = editor.state;
      const { from } = selection;

      // Find the slash command text
      let slashPos = from - 1;
      while (slashPos > 0) {
        const char = editor.state.doc.textBetween(slashPos - 1, slashPos);
        if (char === '/') {
          break;
        }
        slashPos--;
      }

      if (slashPos > 0) {
        const query = editor.state.doc.textBetween(slashPos, from);
        setSlashQuery(query);
      } else {
        setShowSlashMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    editor.on('update', handleInput);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      editor.off('update', handleInput);
    };
  }, [editor, showSlashMenu]);

  // Handle description rewrite using AI Assist
  const handleRewriteDescription = useCallback(async () => {
    if (isRewriting) {
      cancelRef.current = true;
      return;
    }

    const currentApiKey = llmApiKeys[llmProvider];
    if (!currentApiKey) {
      setRewriteError('Please configure your LLM API key in Settings');
      setTimeout(() => setRewriteError(null), 3000);
      return;
    }

    setIsRewriting(true);
    setRewriteError(null);
    cancelRef.current = false;

    try {
      let fullText = '';
      
      if (viewMode === 'rich' && editor) {
        fullText = editor.getText();
      } else {
        fullText = markdownText;
      }

      // Collect all rewritten text
      let rewritten = '';

      for await (const chunk of generateDescriptionRewrite({
        provider: llmProvider,
        apiKey: currentApiKey,
        model: llmModel || undefined,
        contextBefore: fullText,
        contextAfter: '',
        workItemMetadata,
      })) {
        if (cancelRef.current) break;
        rewritten += chunk;
      }

      // Replace all content with rewritten version
      if (!cancelRef.current && rewritten.trim()) {
        if (viewMode === 'rich' && editor) {
          editor.chain().focus().selectAll().deleteSelection().insertContent(rewritten).run();
        } else {
          setMarkdownText(rewritten);
          onChange(rewritten);
        }
      }
    } catch (error) {
      console.error('[Description Rewrite] Error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Rewrite failed';
      setRewriteError(errorMsg);
      setTimeout(() => setRewriteError(null), 5000);
    } finally {
      setIsRewriting(false);
      cancelRef.current = false;
    }
  }, [editor, isRewriting, llmProvider, llmApiKeys, llmModel, viewMode, markdownText, onChange, workItemMetadata]);

  // Handle Cmd/Ctrl + K for rewriting description
  useEffect(() => {
    if (!editor || viewMode !== 'rich') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleRewriteDescription();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, viewMode, handleRewriteDescription]);

  // Listen for rewrite events from the chat interface
  useEffect(() => {
    const handleChatRewrite = (e: Event) => {
      const detail = (e as CustomEvent).detail as { action: string };
      if (!detail?.action || detail.action !== 'rewrite') return;

      handleRewriteDescription();
    };

    window.addEventListener('syncboard:rewrite', handleChatRewrite);
    return () => window.removeEventListener('syncboard:rewrite', handleChatRewrite);
  }, [handleRewriteDescription]);

  const handleSlashCommandSelect = useCallback(
    (command: SlashCommand) => {
      if (!editor) return;

      const { selection } = editor.state;
      const { from } = selection;

      // Find and delete the slash command text
      let slashPos = from - 1;
      while (slashPos > 0) {
        const char = editor.state.doc.textBetween(slashPos - 1, slashPos);
        if (char === '/') {
          break;
        }
        slashPos--;
      }

      if (slashPos > 0) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: slashPos - 1, to: from })
          .run();
      }

      // Execute the command
      command.command(editor);
      setShowSlashMenu(false);
    },
    [editor]
  );
const handleMarkdownChange = (newMarkdown: string) => {
    setMarkdownText(newMarkdown);
    if (editor) {
      editor.commands.setContent(newMarkdown);
    }
    onChange(newMarkdown);
  };

  const handleViewModeChange = (mode: 'rich' | 'markdown') => {
    if (mode === 'markdown' && editor) {
      // Sync latest content from rich editor to markdown
      const currentMarkdown = (editor.storage as any).markdown?.getMarkdown?.() || editor.getText();
      setMarkdownText(currentMarkdown);
    }
    setViewMode(mode);
  };

  return (
    <div className={`overflow-hidden bg-transparent ${className}`}>
      {/* View Mode Toggle Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => handleViewModeChange('rich')}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            viewMode === 'rich'
              ? 'text-blue-600 border-b-2 border-blue-600 -mb-[1px]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🎨 Rich Text
        </button>
        <button
          onClick={() => handleViewModeChange('markdown')}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            viewMode === 'markdown'
              ? 'text-blue-600 border-b-2 border-blue-600 -mb-[1px]'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📝 Markdown
        </button>
      </div>

      {viewMode === 'rich' ? (
        <>
          {/* Toolbar - Clean */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <EditorToolbar editor={editor} />

              {/* AI Rewrite Button */}
              <div className="relative">
                <button
                  onClick={handleRewriteDescription}
                  disabled={isRewriting || !llmApiKeys[llmProvider]}
                  className="ai-assist-main"
                  title="Rewrite description (⌘K)"
                >
                  {isRewriting ? (
                    <>
                      <X size={14} />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Rewrite
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {autoSave && <AutoSaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />}
          </div>

          {/* Rewrite Error */}
          {rewriteError && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {rewriteError}
            </div>
          )}

          {/* Editor Content - No border */}
          <div className="relative">
            <EditorContent editor={editor} className="min-h-[200px]" />
            
            {/* Bubble Menu for text selection */}
            {editor && <BubbleMenuToolbar editor={editor} />}
            
            {/* Slash Command Menu */}
            {showSlashMenu && editor && (
              <SlashCommandMenu
                editor={editor}
                query={slashQuery}
                onSelect={handleSlashCommandSelect}
                onClose={() => setShowSlashMenu(false)}
                position={slashMenuPosition}
              />
            )}
          </div>
        </>
      ) : (
        <>
          {/* Toolbar for Markdown view */}
          <div className="flex items-center justify-between mb-4">
            {/* AI Rewrite Button (markdown mode) */}
            <div className="relative">
              <button
                onClick={handleRewriteDescription}
                disabled={isRewriting || !llmApiKeys[llmProvider]}
                className="ai-assist-main"
                title="Rewrite description (⌘K)"
              >
                {isRewriting ? (
                  <>
                    <X size={14} />
                    Cancel
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Rewrite
                  </>
                )}
              </button>
            </div>
            
            {autoSave && <AutoSaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} />}
          </div>

          {/* Rewrite Error */}
          {rewriteError && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {rewriteError}
            </div>
          )}

          {/* Shimmer indicator while generating in markdown mode */}
          {isRewriting && viewMode === 'markdown' && (
            <div className="mb-2 flex items-center gap-2 text-xs text-purple-600">
              <span className="autofill-shimmer" />
              Rewriting...
            </div>
          )}
          
          {/* Markdown Textarea */}
          <textarea
            value={markdownText}
            onChange={(e) => handleMarkdownChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                handleRewriteDescription();
              }
            }}
            placeholder={placeholder}
            className="w-full min-h-[400px] p-4 font-mono text-sm text-gray-900 bg-transparent border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            spellCheck={false}
          />
        </>
      )}
    </div>
  );
}
