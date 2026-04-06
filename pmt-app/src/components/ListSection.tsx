import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../store/WorkspaceContext';
import { WorkItem } from '../types';
import { EditableCell } from './EditableCell';
import { canHaveChildren } from '../lib/hierarchy';
import { serializeMarkdownItem } from '../lib/markdown';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  itemsTree: WorkItem[];
  onEditItem: (item: WorkItem) => void;
  onNewItem: (parentId?: string) => void;
}

export function ListSection({ itemsTree, onEditItem, onNewItem }: Props) {
  const { config, workspacePath, updateItem, deleteItem } = useWorkspace();
  
  // Show empty state if no items exist
  if (itemsTree.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Work Items Yet</h2>
          <p className="text-gray-600 mb-6">
            Create your first work item to start organizing your projects. View and edit items in a hierarchical list.
          </p>
          <button
            onClick={() => onNewItem()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
          >
            <Plus size={20} />
            Create First Item
          </button>
        </div>
      </div>
    );
  }
  
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('expandedWorkItems');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem('expandedWorkItems', JSON.stringify([...expandedIds]));
  }, [expandedIds]);

  // Reset delete confirmation after 3 seconds
  useEffect(() => {
    if (deleteConfirm) {
      const timer = setTimeout(() => setDeleteConfirm(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteConfirm]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleUpdateField = async (item: WorkItem, field: keyof WorkItem, value: any) => {
    if (!workspacePath) return;
    
    const updatedItem: WorkItem = {
      ...item,
      [field]: value,
      updatedAt: new Date().toISOString()
    };

    try {
      const markdown = serializeMarkdownItem(updatedItem);
      const filePath = `${workspacePath}/${item.fileName}`;
      await window.electronAPI.writeFile(filePath, markdown);
      updateItem(updatedItem);
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  };

  const handleDelete = async (item: WorkItem) => {
    if (deleteConfirm !== item.id) {
      setDeleteConfirm(item.id);
      return;
    }

    const hasChildren = item.children && item.children.length > 0;
    if (hasChildren) {
      const confirmed = window.confirm(
        `This will delete "${item.title}" and all ${item.children!.length} child item(s). Continue?`
      );
      if (!confirmed) {
        setDeleteConfirm(null);
        return;
      }
    }

    const success = await deleteItem(item.id, true);
    if (success) {
      setDeleteConfirm(null);
    }
  };

  const renderRow = (item: WorkItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedIds.has(item.id);
    const canExpand = hasChildren;
    const indentWidth = level * 24; // 24px per level

    return (
      <React.Fragment key={item.id}>
        <tr className="border-b hover:bg-gray-50 group">
          {/* Expand/Collapse + Title */}
          <td className="px-3 py-2 sticky left-0 bg-white group-hover:bg-gray-50 min-w-[300px]">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${indentWidth}px` }}>
              {canExpand ? (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              ) : (
                <div className="w-6" />
              )}
              
              <EditableCell
                value={item.title}
                onSave={(value) => handleUpdateField(item, 'title', value)}
                className="flex-1 font-medium"
                placeholder="Untitled"
              />
            </div>
          </td>

          {/* ID */}
          <td className="px-3 py-2 text-sm">
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
              {item.id}
            </span>
          </td>

          {/* Type */}
          <td className="px-3 py-2">
            <EditableCell
              value={item.type}
              type="select"
              options={config.types}
              onSave={(value) => handleUpdateField(item, 'type', value)}
            />
          </td>

          {/* Status */}
          <td className="px-3 py-2">
            <EditableCell
              value={item.status}
              type="select"
              options={config.statuses}
              onSave={(value) => handleUpdateField(item, 'status', value)}
            />
          </td>

          {/* Assignee */}
          <td className="px-3 py-2">
            <EditableCell
              value={item.assignee || ''}
              onSave={(value) => handleUpdateField(item, 'assignee', value || undefined)}
              placeholder="Unassigned"
            />
          </td>

          {/* Updated */}
          <td className="px-3 py-2 text-sm text-gray-600">
            {format(new Date(item.updatedAt), 'MMM d, yyyy')}
          </td>

          {/* Actions */}
          <td className="px-3 py-2">
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {canHaveChildren(item) && (
                <button
                  onClick={() => onNewItem(item.id)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="Add child item"
                >
                  <Plus size={16} />
                </button>
              )}
              <button
                onClick={() => handleDelete(item)}
                className={`p-1 rounded ${
                  deleteConfirm === item.id
                    ? 'bg-red-600 text-white'
                    : 'text-red-600 hover:bg-red-50'
                }`}
                title={deleteConfirm === item.id ? 'Click again to confirm' : 'Delete'}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </td>
        </tr>

        {/* Render children if expanded */}
        {isExpanded && hasChildren && item.children!.map(child => renderRow(child, level + 1))}
      </React.Fragment>
    );
  };

  if (!workspacePath) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Please open a workspace to get started.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto">
        <table className="w-full bg-white border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-100 min-w-[300px]">
                Title
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 w-32">
                ID
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 w-32">
                Type
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 w-32">
                Status
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 w-40">
                Assignee
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 w-32">
                Updated
              </th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-gray-700 w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {itemsTree.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-gray-500">
                  No work items yet. Click "New Item" to create one.
                </td>
              </tr>
            ) : (
              itemsTree.map(item => renderRow(item, 0))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
