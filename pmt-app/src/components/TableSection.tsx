import React, { useState, useMemo, useEffect } from 'react';
import { WorkItem } from '../types';
import { getAllItems } from '../lib/hierarchy';
import { useWorkspace } from '../store/WorkspaceContext';
import { EditableCell } from './EditableCell';
import { serializeMarkdownItem } from '../lib/markdown';
import { ITEMS_FOLDER } from '../lib/constants';
import { ChevronUp, ChevronDown, ChevronRight, Plus } from 'lucide-react';

interface TableSectionProps {
  itemsTree: WorkItem[];
  onEditItem: (item: WorkItem) => void;
  onNewItem: (parentId?: string) => void;
}

type SortColumn = 'id' | 'title' | 'type' | 'status' | 'assignee' | 'updated' | null;
type SortDirection = 'asc' | 'desc' | null;

export function TableSection({ itemsTree, onEditItem, onNewItem }: TableSectionProps) {
  const { config, workspacePath, updateItem, deleteItem } = useWorkspace();
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('tableColumnWidths');
    return saved ? JSON.parse(saved) : {
      checkbox: 48,
      id: 120,
      title: 400,
      type: 120,
      status: 140,
      assignee: 140,
      updated: 120
    };
  });
  
  // Get all items as flat array with hierarchy info preserved
  const allItems = useMemo(() => getAllItems(itemsTree), [itemsTree]);
  
  // Initialize expansion state - expand all items with children by default
  useEffect(() => {
    const saved = localStorage.getItem('tableExpandedIds');
    if (saved) {
      try {
        setExpandedIds(new Set(JSON.parse(saved)));
        return;
      } catch {
        // Fall through to default
      }
    }
    // Default to all items with children expanded
    const itemsWithChildren = allItems.filter(item => item.children && item.children.length > 0);
    setExpandedIds(new Set(itemsWithChildren.map(item => item.id)));
  }, [allItems]);

  // Persist column widths
  useEffect(() => {
    localStorage.setItem('tableColumnWidths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  // Filter items based on expansion state
  const visibleItems = useMemo(() => {
    const result: WorkItem[] = [];
    
    function traverse(items: WorkItem[], parentExpanded: boolean = true) {
      items.forEach(item => {
        if (parentExpanded) {
          result.push(item);
        }
        
        if (item.children && item.children.length > 0) {
          const isExpanded = expandedIds.has(item.id);
          traverse(item.children, parentExpanded && isExpanded);
        }
      });
    }
    
    // Start with all root items visible
    traverse(itemsTree, true);
    return result;
  }, [itemsTree, expandedIds]);

  // Sort items
  const sortedItems = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return visibleItems;
    }

    const sorted = [...visibleItems].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortColumn) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'type':
          aVal = a.type.toLowerCase();
          bVal = b.type.toLowerCase();
          break;
        case 'status':
          aVal = a.status.toLowerCase();
          bVal = b.status.toLowerCase();
          break;
        case 'assignee':
          aVal = (a.assignee || '').toLowerCase();
          bVal = (b.assignee || '').toLowerCase();
          break;
        case 'updated':
          aVal = a.updatedAt || '';
          bVal = b.updatedAt || '';
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [visibleItems, sortColumn, sortDirection]);

  // Handle inline field updates
  const handleFieldUpdate = async (item: WorkItem, field: keyof WorkItem, value: string) => {
    const updated: WorkItem = { ...item, [field]: value };
    await updateItem(updated);
    
    // Also update the file
    if (workspacePath) {
      const markdownContent = serializeMarkdownItem(updated);
      await window.electronAPI.writeFile(`${workspacePath}/${ITEMS_FOLDER}/${updated.fileName}`, markdownContent);
    }
  };

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Handle checkbox selection
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedItems.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(sortedItems.map(item => item.id)));
      }

      // Escape: Clear selection
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setFocusedRowIndex(-1);
      }

      // Delete: Delete selected items (with confirmation)
      if (e.key === 'Delete' && selectedIds.size > 0) {
        e.preventDefault();
        const confirmed = window.confirm(`Delete ${selectedIds.size} item(s)? This cannot be undone.`);
        if (confirmed) {
          selectedIds.forEach(id => deleteItem(id));
          setSelectedIds(new Set());
        }
      }

      // N: New item
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNewItem();
      }

      // Arrow keys: Navigate rows
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRowIndex(prev => Math.min(prev + 1, sortedItems.length - 1));
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRowIndex(prev => Math.max(prev - 1, 0));
      }

      // Enter: Open focused item
      if (e.key === 'Enter' && focusedRowIndex >= 0 && focusedRowIndex < sortedItems.length) {
        e.preventDefault();
        onEditItem(sortedItems[focusedRowIndex]);
      }

      // Space: Toggle selection of focused row
      if (e.key === ' ' && focusedRowIndex >= 0 && focusedRowIndex < sortedItems.length) {
        e.preventDefault();
        toggleSelect(sortedItems[focusedRowIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, sortedItems, focusedRowIndex]);

  // Handle expand/collapse
  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
    localStorage.setItem('tableExpandedIds', JSON.stringify([...newExpanded]));
  };

  // Column resizing
  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = columnWidths[columnKey] || 100;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX;
      const newWidth = Math.max(60, startWidth + diff); // Min width 60px
      setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Get indentation for hierarchy
  const getIndentLevel = (item: WorkItem): number => {
    return item.level || 0;
  };

  // Check if item has children
  const hasChildren = (item: WorkItem): boolean => {
    return Boolean(item.children && item.children.length > 0);
  };

  // Render sort indicator
  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ChevronUp size={14} className="opacity-0 group-hover:opacity-30" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp size={14} className="opacity-100" />
    ) : (
      <ChevronDown size={14} className="opacity-100" />
    );
  };

  // Format date for display
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const allSelected = sortedItems.length > 0 && selectedIds.size === sortedItems.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < sortedItems.length;

  // Show empty state if no items exist
  if (allItems.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Work Items Yet</h2>
          <p className="text-gray-600 mb-6">
            Create your first work item to start using the table view. Edit items inline and manage your work efficiently.
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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Keyboard shortcuts hint */}
      <div className="px-4 py-2 bg-gray-50 border-b text-xs text-gray-500 flex items-center gap-4">
        <span><kbd className="px-1.5 py-0.5 bg-white border rounded text-gray-700">N</kbd> New item</span>
        <span><kbd className="px-1.5 py-0.5 bg-white border rounded text-gray-700">⌘A</kbd> Select all</span>
        <span><kbd className="px-1.5 py-0.5 bg-white border rounded text-gray-700">Space</kbd> Toggle selection</span>
        <span><kbd className="px-1.5 py-0.5 bg-white border rounded text-gray-700">↑↓</kbd> Navigate</span>
        <span><kbd className="px-1.5 py-0.5 bg-white border rounded text-gray-700">Enter</kbd> Open</span>
        <span><kbd className="px-1.5 py-0.5 bg-white border rounded text-gray-700">Esc</kbd> Clear</span>
        <span><kbd className="px-1.5 py-0.5 bg-white border rounded text-gray-700">Delete</kbd> Delete selection</span>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200 shadow-sm">
            <tr>
              {/* Checkbox Column */}
              <th className="px-4 py-3 text-left relative" style={{ width: columnWidths.checkbox }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => handleResizeStart('checkbox', e)}
                />
              </th>

              {/* ID Column */}
              <th 
                className="px-4 py-3 text-left cursor-pointer select-none group hover:bg-gray-100 relative"
                onClick={() => handleSort('id')}
                style={{ width: columnWidths.id }}
              >
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                  ID
                  {renderSortIndicator('id')}
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('id', e); }}
                />
              </th>

              {/* Title Column */}
              <th 
                className="px-4 py-3 text-left cursor-pointer select-none group hover:bg-gray-100 relative"
                onClick={() => handleSort('title')}
                style={{ width: columnWidths.title }}
              >
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                  Title
                  {renderSortIndicator('title')}
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('title', e); }}
                />
              </th>

              {/* Type Column */}
              <th 
                className="px-4 py-3 text-left cursor-pointer select-none group hover:bg-gray-100 relative"
                onClick={() => handleSort('type')}
                style={{ width: columnWidths.type }}
              >
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                  Type
                  {renderSortIndicator('type')}
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('type', e); }}
                />
              </th>

              {/* Status Column */}
              <th 
                className="px-4 py-3 text-left cursor-pointer select-none group hover:bg-gray-100 relative"
                onClick={() => handleSort('status')}
                style={{ width: columnWidths.status }}
              >
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                  Status
                  {renderSortIndicator('status')}
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('status', e); }}
                />
              </th>

              {/* Assignee Column */}
              <th 
                className="px-4 py-3 text-left cursor-pointer select-none group hover:bg-gray-100 relative"
                onClick={() => handleSort('assignee')}
                style={{ width: columnWidths.assignee }}
              >
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                  Assignee
                  {renderSortIndicator('assignee')}
                </div>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors"
                  onMouseDown={(e) => { e.stopPropagation(); handleResizeStart('assignee', e); }}
                />
              </th>

              {/* Updated Column */}
              <th 
                className="px-4 py-3 text-left cursor-pointer select-none group hover:bg-gray-100 relative"
                onClick={() => handleSort('updated')}
                style={{ width: columnWidths.updated }}
              >
                <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                  Updated
                  {renderSortIndicator('updated')}
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {sortedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No items to display
                </td>
              </tr>
            ) : (
              sortedItems.map((item, index) => {
                const indentLevel = getIndentLevel(item);
                const itemHasChildren = hasChildren(item);
                const isExpanded = expandedIds.has(item.id);
                const isFocused = index === focusedRowIndex;

                return (
                  <tr 
                    key={item.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedIds.has(item.id) ? 'bg-blue-50' : ''
                    } ${isFocused ? 'ring-2 ring-blue-400 ring-inset' : ''}`}
                    onClick={() => onEditItem(item)}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded"
                      />
                    </td>

                    {/* ID */}
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                      {item.id}
                    </td>

                    {/* Title with hierarchy indent */}
                    <td className="px-4 py-3 text-sm text-gray-900" onClick={e => e.stopPropagation()}>
                      <div 
                        className="flex items-center gap-1"
                        style={{ paddingLeft: `${indentLevel * 24}px` }}
                      >
                        {itemHasChildren ? (
                          <button
                            onClick={(e) => toggleExpand(item.id, e)}
                            className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded"
                          >
                            <ChevronRight 
                              size={16} 
                              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                          </button>
                        ) : (
                          <span className="w-5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <EditableCell
                            value={item.title}
                            onSave={async (newValue) => await handleFieldUpdate(item, 'title', newValue)}
                            placeholder="Untitled"
                          />
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3 text-sm text-gray-700" onClick={e => e.stopPropagation()}>
                      <EditableCell
                        value={item.type}
                        type="select"
                        options={config.types}
                        onSave={async (newValue) => await handleFieldUpdate(item, 'type', newValue)}
                      />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-sm" onClick={e => e.stopPropagation()}>
                      <EditableCell
                        value={item.status}
                        type="select"
                        options={config.statuses}
                        onSave={async (newValue) => await handleFieldUpdate(item, 'status', newValue)}
                        className="inline-block"
                      />
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3 text-sm text-gray-700" onClick={e => e.stopPropagation()}>
                      <EditableCell
                        value={item.assignee || ''}
                        type={config.users && config.users.length > 0 ? 'select' : 'text'}
                        options={config.users || []}
                        onSave={async (newValue) => await handleFieldUpdate(item, 'assignee', newValue)}
                        placeholder="Unassigned"
                      />
                    </td>

                    {/* Updated */}
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(item.updatedAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with selection info */}
      {selectedIds.size > 0 && (
        <div className="border-t bg-gray-50 px-4 py-2 text-sm text-gray-600">
          {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}
