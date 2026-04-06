import React, { useState, useEffect } from 'react';
import { WorkItem, Comment } from '../types';
import { useWorkspace } from '../store/WorkspaceContext';
import { generateWorkItemId } from '../lib/id-generator';
import { getAllowedChildTypes, validateParent } from '../lib/hierarchy';
import { Comments } from './Comments';
import { RichEditor } from './RichEditor';
import { Tabs, Tab, Box } from '@mui/material';

interface Props {
  item: WorkItem | null;
  parentId?: string;
  onClose: () => void;
  onSave: (item: WorkItem) => void;
}

export function WorkItemModal({ item, parentId, onClose, onSave }: Props) {
  const { config, items, deleteItem, workspacePath } = useWorkspace();
  const [formData, setFormData] = useState<Partial<WorkItem>>({});
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      // New item - set defaults based on parent
      let defaultType = config.types[0] || 'Task';
      
      if (parentId) {
        const parent = items.find(i => i.id === parentId);
        if (parent) {
          const allowedTypes = getAllowedChildTypes(parent);
          if (allowedTypes.length > 0) {
            defaultType = allowedTypes[0];
          }
        }
      }
      
      setFormData({
        title: '',
        type: defaultType,
        status: config.statuses[0] || 'To Do',
        content: '',
        parentId: parentId,
        comments: [],
      });
    }
    setDeleteConfirm(false);
    setActiveTab(0);
  }, [item, config, parentId, items]);

  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm]);

  const handleDelete = async () => {
    if (!item) return;
    
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    const success = await deleteItem(item.id);
    setIsDeleting(false);
    
    if (success) {
      onClose();
    } else {
      alert('Failed to delete item');
      setDeleteConfirm(false);
    }
  };

  if (!item && Object.keys(formData).length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    onSave({
      id: item?.id || generateWorkItemId(items),
      title: formData.title!,
      type: formData.type!,
      status: formData.status!,
      assignee: formData.assignee,
      content: formData.content || '',
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileName: item?.fileName || `${item?.id || generateWorkItemId(items)}.md`,
      parentId: formData.parentId,
      comments: formData.comments || [],
    });
  };

  const handleAddComment = (comment: Comment) => {
    setFormData({
      ...formData,
      comments: [...(formData.comments || []), comment],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">{item ? 'Edit Item' : 'New Item'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Details" />
            <Tab label={`Comments ${formData.comments?.length ? `(${formData.comments.length})` : ''}`} />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 0 && (
            <form onSubmit={handleSubmit} className="p-4 h-full overflow-y-auto flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.type || ''}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    {config.types.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status || ''}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    {config.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Parent Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Item (Optional)</label>
                <select
                  value={formData.parentId || ''}
                  onChange={e => setFormData({...formData, parentId: e.target.value || undefined})}
                  className="w-full p-2 border rounded"
                >
                  <option value="">None (Top Level)</option>
                  {items
                    .filter(i => !item || i.id !== item.id) // Can't be own parent
                    .map(i => (
                      <option key={i.id} value={i.id}>
                        {i.title} ({i.type}) - {i.id}
                      </option>
                    ))}
                </select>
                {formData.parentId && (() => {
                  const parent = items.find(i => i.id === formData.parentId);
                  if (parent && item) {
                    const validation = validateParent(item, parent);
                    if (!validation.valid) {
                      return <p className="text-red-600 text-xs mt-1">{validation.reason}</p>;
                    }
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                {config.users && config.users.length > 0 ? (
                  <select
                    value={formData.assignee || ''}
                    onChange={e => setFormData({...formData, assignee: e.target.value})}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Unassigned</option>
                    {config.users.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.assignee || ''}
                    onChange={e => setFormData({...formData, assignee: e.target.value})}
                    placeholder="Username"
                    className="w-full p-2 border rounded"
                  />
                )}
              </div>

              <div className="flex-grow flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <RichEditor
                  content={formData.content || ''}
                  onChange={content => setFormData({...formData, content})}
                  onMention={query => config.users.filter(u => u.toLowerCase().includes(query.toLowerCase()))}
                  placeholder="Describe this work item..."
                  className="flex-grow"
                  workspacePath={workspacePath || undefined}
                />
              </div>
            </form>
          )}

          {activeTab === 1 && (
            <Comments
              comments={formData.comments || []}
              onAddComment={handleAddComment}
            />
          )}
        </div>

        {/* Footer with action buttons */}
        <div className="flex justify-between gap-2 p-4 border-t">
          <div>
            {item && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className={`px-4 py-2 rounded transition-colors ${
                  deleteConfirm
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'text-red-600 hover:bg-red-50 border border-red-300'
                } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isDeleting ? 'Deleting...' : deleteConfirm ? 'Confirm Delete?' : 'Delete'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                if (!formData.title) return;
                onSave({
                  id: item?.id || generateWorkItemId(items),
                  title: formData.title!,
                  type: formData.type!,
                  status: formData.status!,
                  assignee: formData.assignee,
                  content: formData.content || '',
                  createdAt: item?.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  fileName: item?.fileName || `${item?.id || generateWorkItemId(items)}.md`,
                  parentId: formData.parentId,
                  comments: formData.comments || [],
                });
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
