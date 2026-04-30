import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { WorkItem, Comment } from '../types';
import { useWorkspace } from '../store/WorkspaceContext';
import { generateWorkItemId } from '../lib/id-generator';
import { getAllowedChildTypes, validateParent } from '../lib/hierarchy';
import { ITEMS_FOLDER } from '../lib/constants';
import { serializeMarkdownItem, serializeWorkItemToText, parseTextToWorkItem } from '../lib/markdown';
import { RichEditor } from '../components/RichEditor';
import { AutoSaveIndicator, useAutoSave } from '../components/AutoSaveIndicator';
import { ArrowLeft, Save, Trash2, MessageSquare, User, Calendar, Tag, Folder, FileText, Layout } from 'lucide-react';

export function WorkItemEditView() {
  const navigate = useNavigate();
  const { itemId } = useParams<{ itemId: string }>();
  const [searchParams] = useSearchParams();
  const { config, items, workspacePath, updateItem, deleteItem, addItem, currentUser } = useWorkspace();
  
  const [formData, setFormData] = useState<Partial<WorkItem>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [viewMode, setViewMode] = useState<'ui' | 'text'>('ui');
  const [textContent, setTextContent] = useState('');

  const isNewItem = itemId === 'new';
  const existingItem = !isNewItem ? items.find(i => i.id === itemId) : null;

  // Auto-save function
  const handleAutoSave = useCallback(async (data: Partial<WorkItem>) => {
    if (!data.title || !workspacePath || isNewItem) return;
    
    const workItem: WorkItem = {
      id: existingItem?.id || generateWorkItemId(items),
      title: data.title!,
      type: data.type!,
      status: data.status!,
      assignee: data.assignee,
      content: data.content || '',
      createdAt: existingItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileName: existingItem?.fileName || `${existingItem?.id || generateWorkItemId(items)}.md`,
      parentId: data.parentId,
      comments: data.comments || [],
    };

    const markdown = serializeMarkdownItem(workItem);
    await window.electronAPI.writeFile(`${workspacePath}/${workItem.fileName}`, markdown);
    updateItem(workItem);
  }, [workspacePath, isNewItem, existingItem, updateItem]);

  // Auto-save hook - only for existing items
  const { status: autoSaveStatus, lastSavedAt, error: autoSaveError } = useAutoSave(
    !isNewItem ? formData : null,
    handleAutoSave,
    2000 // 2 second delay
  );

  useEffect(() => {
    if (existingItem) {
      setFormData(existingItem);
      setTextContent(serializeWorkItemToText(existingItem));
    } else if (isNewItem) {
      // New item - set defaults
      const parentId = searchParams.get('parentId') || undefined;
      let defaultType = config.types[0] || 'Task';
      
      // If there's a parent, determine allowed types
      if (parentId) {
        const parent = items.find(i => i.id === parentId);
        if (parent) {
          const allowedTypes = getAllowedChildTypes(parent);
          if (allowedTypes.length > 0) {
            defaultType = allowedTypes[0];
          }
        }
      }
      
      const newData = {
        title: '',
        type: defaultType,
        status: config.statuses[0] || 'To Do',
        content: '',
        parentId: parentId,
        comments: [],
      };
      setFormData(newData);
      setTextContent(serializeWorkItemToText(newData));
    }
    setDeleteConfirm(false);
  }, [itemId, existingItem, config, isNewItem, items, searchParams]);

  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm]);

  const handleSave = async () => {
    if (!formData.title || !workspacePath) return;

    setIsSaving(true);
    try {
      const workItem: WorkItem = {
        id: existingItem?.id || generateWorkItemId(items),
        title: formData.title!,
        type: formData.type!,
        status: formData.status!,
        assignee: formData.assignee,
        content: formData.content || '',
        createdAt: existingItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fileName: existingItem?.fileName || `${existingItem?.id || generateWorkItemId(items)}.md`,
        parentId: formData.parentId,
        comments: formData.comments || [],
      };

      const markdown = serializeMarkdownItem(workItem);
      await window.electronAPI.ensureDir(`${workspacePath}/${ITEMS_FOLDER}`);
      await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${workItem.fileName}`, markdown);

      if (isNewItem) {
        addItem(workItem);
      } else {
        updateItem(workItem);
      }

      navigate('/workspace');
    } catch (error) {
      console.error('Failed to save item:', error);
      alert('Failed to save work item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existingItem) return;
    
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    const success = await deleteItem(existingItem.id);
    setIsDeleting(false);
    
    if (success) {
      navigate('/workspace');
    } else {
      alert('Failed to delete item');
      setDeleteConfirm(false);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      author: currentUser || 'Anonymous',
      content: newComment,
      createdAt: new Date().toISOString(),
      mentions: [], // Extract mentions if needed
    };

    setFormData({
      ...formData,
      comments: [...(formData.comments || []), comment],
    });
    setNewComment('');
  };

  const handleViewModeChange = (mode: 'ui' | 'text') => {
    if (mode === 'text') {
      // Switching to text view - serialize current formData
      setTextContent(serializeWorkItemToText(formData));
    } else {
      // Switching to UI view - parse text back to formData
      const parsed = parseTextToWorkItem(textContent, existingItem?.fileName);
      if (parsed) {
        setFormData({ ...formData, ...parsed });
      }
    }
    setViewMode(mode);
  };

  const handleTextChange = (newText: string) => {
    setTextContent(newText);
    // Parse and update formData for auto-save
    const parsed = parseTextToWorkItem(newText, existingItem?.fileName);
    if (parsed && parsed.title) {
      setFormData({ ...formData, ...parsed });
    }
  };

  if (!formData.title && !isNewItem && !existingItem) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Work item not found</p>
          <button
            onClick={() => navigate('/workspace')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Floating Header - Minimal */}
      <div className="px-6 py-4 flex items-center justify-between flex-shrink-0 border-b border-gray-200">
        {/* Left: View Toggle */}
        <div className="flex items-center gap-6">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleViewModeChange('ui')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'ui'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Visual editor"
            >
              <Layout size={16} />
              Editor
            </button>
            <button
              onClick={() => handleViewModeChange('text')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                viewMode === 'text'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Text/Markdown editor"
            >
              <FileText size={16} />
              Text
            </button>
          </div>
        </div>
        
        {/* Right: Auto-save indicator and Actions */}
        <div className="flex items-center gap-3">
          {!isNewItem && <AutoSaveIndicator status={autoSaveStatus} lastSavedAt={lastSavedAt} error={autoSaveError} />}
          
          {!isNewItem && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                deleteConfirm
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'text-red-600 hover:bg-red-50'
              } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isDeleting ? 'Deleting...' : deleteConfirm ? 'Confirm Delete?' : 'Delete'}
            </button>
          )}
          
          <button
            onClick={handleSave}
            disabled={!formData.title || isSaving}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content - Conditional based on view mode */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === 'ui' ? (
          /* UI View - Current interface */
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Back Link - Subtle */}
            <button
              onClick={() => navigate('/workspace')}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Workspace
            </button>

            {/* Title - Large and Prominent */}
            <div className="mb-12">
              <input
                type="text"
                value={formData.title || ''}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Untitled"
                className="w-full text-5xl font-bold text-gray-900 placeholder-gray-300 border-none focus:outline-none focus:ring-0 p-0 bg-transparent"
              />
            </div>

          {/* Properties - Inline, Minimal */}
          <div className="flex flex-wrap items-center gap-6 mb-12 text-sm">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-gray-400" />
              <select
                value={formData.type || ''}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="border-none bg-transparent text-gray-700 font-medium focus:outline-none focus:ring-0 cursor-pointer hover:text-gray-900"
              >
                {config.types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <select
                value={formData.status || ''}
                onChange={e => setFormData({...formData, status: e.target.value})}
                className="border-none bg-transparent text-gray-700 font-medium focus:outline-none focus:ring-0 cursor-pointer hover:text-gray-900"
              >
                {config.statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <User size={14} className="text-gray-400" />
              {config.users && config.users.length > 0 ? (
                <select
                  value={formData.assignee || ''}
                  onChange={e => setFormData({...formData, assignee: e.target.value})}
                  className="border-none bg-transparent text-gray-700 font-medium focus:outline-none focus:ring-0 cursor-pointer hover:text-gray-900"
                >
                  <option value="">Unassigned</option>
                  {config.users.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.assignee || ''}
                  onChange={e => setFormData({...formData, assignee: e.target.value})}
                  placeholder="Unassigned"
                  className="border-none bg-transparent text-gray-700 font-medium focus:outline-none focus:ring-0 placeholder-gray-400"
                />
              )}
            </div>

            {/* Parent Item Selector */}
            <div className="flex items-center gap-2">
              <Folder size={14} className="text-gray-400" />
              <select
                value={formData.parentId || ''}
                onChange={e => setFormData({...formData, parentId: e.target.value || undefined})}
                className="border-none bg-transparent text-gray-700 font-medium focus:outline-none focus:ring-0 cursor-pointer hover:text-gray-900"
              >
                <option value="">No Parent</option>
                {items
                  .filter(i => !existingItem || i.id !== existingItem.id)
                  .map(i => {
                    // Validate if this can be a parent (only check self-reference and circular dependency)
                    if (existingItem) {
                      const validation = validateParent(existingItem, i);
                      if (!validation.valid) return null;
                    }
                    return (
                      <option key={i.id} value={i.id}>
                        {i.title} ({i.type})
                      </option>
                    );
                  })
                  .filter(Boolean)}
              </select>
              {formData.parentId && existingItem && (() => {
                const parent = items.find(i => i.id === formData.parentId);
                if (parent) {
                  const validation = validateParent(existingItem, parent);
                  if (!validation.valid) {
                    return <span className="text-red-600 text-xs ml-2">⚠️ {validation.reason}</span>;
                  }
                }
                return null;
              })()}
            </div>
          </div>

          {/* Description - Clean Editor */}
          <div className="mb-16">
            <RichEditor
              content={formData.content || ''}
              onChange={content => setFormData({...formData, content})}
              onMention={query => config.users?.filter(u => u.toLowerCase().includes(query.toLowerCase())) || []}
              placeholder="Write something..."
              workspacePath={workspacePath || undefined}
              workItemMetadata={{
                title: formData.title,
                type: formData.type,
                status: formData.status,
                assignee: formData.assignee,
              }}
            />
          </div>

          {/* Comments - Simple Thread */}
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              💬 Comments
              {formData.comments && formData.comments.length > 0 && (
                <span className="text-gray-400 font-normal ml-2">({formData.comments.length})</span>
              )}
            </h2>

            {/* Existing Comments */}
            {formData.comments && formData.comments.length > 0 ? (
              <div className="space-y-6 mb-6">
                {formData.comments.map((comment) => (
                  <div key={comment.id} className="group">
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="font-semibold text-gray-900 text-sm">{comment.author}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic mb-6">No comments yet</p>
            )}

            {/* Add Comment - Minimal Input */}
            <div className="flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && newComment.trim()) {
                    handleAddComment();
                  }
                }}
                placeholder="Write a comment..."
                className="flex-1 px-0 py-2 text-gray-900 placeholder-gray-400 border-none border-b-2 border-transparent focus:border-blue-500 focus:outline-none transition-colors bg-transparent"
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="text-blue-600 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                →
              </button>
            </div>
          </div>

          {/* Metadata - Subtle Footer */}
          {!isNewItem && existingItem && (
            <div className="pt-8 border-t border-gray-100">
              <div className="flex gap-6 text-xs text-gray-400">
                <span>ID: {existingItem.id}</span>
                <span>Created {new Date(existingItem.createdAt).toLocaleDateString()}</span>
                <span>Updated {new Date(existingItem.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}
          </div>
        ) : (
          /* Text View - Full page text editor */
          <div className="h-full px-6 py-8">
            <div className="max-w-5xl mx-auto h-full flex flex-col">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => navigate('/workspace')}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Workspace
                </button>
                <p className="text-xs text-gray-500">
                  Edit the entire work item as text (YAML frontmatter + Markdown)
                </p>
              </div>
              
              <textarea
                value={textContent}
                onChange={(e) => handleTextChange(e.target.value)}
                className="flex-1 w-full p-6 font-mono text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="---
title: My Work Item
type: Task
status: To Do
assignee: username
---

Description content goes here...

---
# Comments

**Author** (date):
Comment content..."
                spellCheck={false}
              />
              
              <div className="mt-4 text-xs text-gray-500">
                <p>💡 <strong>Tip:</strong> Edit YAML frontmatter (between ---) for metadata. Content below is markdown. Comments at the end.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
