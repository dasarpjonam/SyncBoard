import React, { useState, useEffect } from 'react';
import { WorkItem } from '../types';
import { useWorkspace } from '../store/WorkspaceContext';

interface Props {
  item: WorkItem | null;
  onClose: () => void;
  onSave: (item: WorkItem) => void;
}

export function WorkItemModal({ item, onClose, onSave }: Props) {
  const { config } = useWorkspace();
  const [formData, setFormData] = useState<Partial<WorkItem>>({});

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      setFormData({
        title: '',
        type: config.types[0] || 'Task',
        status: config.statuses[0] || 'To Do',
        content: '',
      });
    }
  }, [item, config]);

  if (!item && Object.keys(formData).length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    onSave({
      id: item?.id || `ITEM-${Date.now()}`,
      title: formData.title!,
      type: formData.type!,
      status: formData.status!,
      assignee: formData.assignee,
      content: formData.content || '',
      createdAt: item?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fileName: item?.fileName || `ITEM-${Date.now()}.md`,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">{item ? 'Edit Item' : 'New Item'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex-grow overflow-y-auto flex flex-col gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Markdown)</label>
            <textarea
              value={formData.content || ''}
              onChange={e => setFormData({...formData, content: e.target.value})}
              className="w-full p-2 border rounded flex-grow min-h-[200px] font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}
