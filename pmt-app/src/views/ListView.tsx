import React, { useState, useMemo, useEffect } from 'react';
import { useWorkspace } from '../store/WorkspaceContext';
import { WorkItem } from '../types';
import { WorkItemCard } from '../components/WorkItemCard';
import { WorkItemModal } from '../components/WorkItemModal';
import { serializeMarkdownItem } from '../lib/markdown';
import { List, LayoutGrid, Search, Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

type ViewMode = 'table' | 'cards';
type SortField = 'id' | 'title' | 'type' | 'status' | 'assignee' | 'updatedAt';
type SortOrder = 'asc' | 'desc' | null;

export function ListView() {
  const { items, config, workspacePath, updateItem } = useWorkspace();
  
  // View mode and persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('listViewMode') as ViewMode) || 'table';
  });
  
  // Filter state
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  
  // Sort state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  
  // Modal state
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('listViewMode', viewMode);
  }, [viewMode]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Apply type filter
    if (selectedTypes.length > 0) {
      result = result.filter(item => selectedTypes.includes(item.type));
    }

    // Apply status filter
    if (selectedStatuses.length > 0) {
      result = result.filter(item => selectedStatuses.includes(item.status));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        (item.assignee && item.assignee.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    if (sortField && sortOrder) {
      result.sort((a, b) => {
        let aVal: any = a[sortField];
        let bVal: any = b[sortField];

        if (sortField === 'updatedAt') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else {
          aVal = aVal?.toString().toLowerCase() || '';
          bVal = bVal?.toString().toLowerCase() || '';
        }

        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, selectedTypes, selectedStatuses, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortOrder === 'asc') setSortOrder('desc');
      else if (sortOrder === 'desc') {
        setSortOrder(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSaveItem = async (item: WorkItem) => {
    if (!workspacePath) return;
    try {
      const markdown = serializeMarkdownItem(item);
      const filePath = `${workspacePath}/${item.fileName}`;
      await window.electronAPI.writeFile(filePath, markdown);
      updateItem(item);
      setShowModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Failed to save item', error);
    }
  };

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setSelectedStatuses([]);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedTypes.length > 0 || selectedStatuses.length > 0 || searchQuery.trim().length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">All Work Items</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Table view"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded ${viewMode === 'cards' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Card view"
            >
              <LayoutGrid size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by title, content, or ID..."
                className="w-full pl-10 pr-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <button
              onClick={() => setShowTypeFilter(!showTypeFilter)}
              className={`flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50 ${selectedTypes.length > 0 ? 'border-blue-500 bg-blue-50' : ''}`}
            >
              <Filter size={16} />
              Type {selectedTypes.length > 0 && `(${selectedTypes.length})`}
              <ChevronDown size={16} />
            </button>
            {showTypeFilter && (
              <div className="absolute top-full mt-1 bg-white border rounded shadow-lg z-10 min-w-[200px]">
                {config.types.map(type => (
                  <label key={type} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleTypeFilter(type)}
                      className="rounded"
                    />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <button
              onClick={() => setShowStatusFilter(!showStatusFilter)}
              className={`flex items-center gap-2 px-4 py-2 border rounded hover:bg-gray-50 ${selectedStatuses.length > 0 ? 'border-blue-500 bg-blue-50' : ''}`}
            >
              <Filter size={16} />
              Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
              <ChevronDown size={16} />
            </button>
            {showStatusFilter && (
              <div className="absolute top-full mt-1 bg-white border rounded shadow-lg z-10 min-w-[200px]">
                {config.statuses.map(status => (
                  <label key={status} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(status)}
                      onChange={() => toggleStatusFilter(status)}
                      className="rounded"
                    />
                    <span>{status}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <X size={16} />
              Clear filters
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredAndSortedItems.length} of {items.length} items
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {viewMode === 'table' ? (
          <TableView
            items={filteredAndSortedItems}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            onItemClick={(item) => {
              setSelectedItem(item);
              setShowModal(true);
            }}
          />
        ) : (
          <CardListView
            items={filteredAndSortedItems}
            onItemClick={(item) => {
              setSelectedItem(item);
              setShowModal(true);
            }}
          />
        )}

        {filteredAndSortedItems.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {hasActiveFilters ? 'No items match your filters' : 'No work items yet'}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <WorkItemModal
          item={selectedItem}
          onClose={() => {
            setShowModal(false);
            setSelectedItem(null);
          }}
          onSave={handleSaveItem}
        />
      )}
    </div>
  );
}

// Table View Component
interface TableViewProps {
  items: WorkItem[];
  sortField: SortField | null;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onItemClick: (item: WorkItem) => void;
}

function TableView({ items, sortField, sortOrder, onSort, onItemClick }: TableViewProps) {
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortField === field && (
          sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
        )}
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="w-full">
        <thead className="border-b">
          <tr>
            <SortableHeader field="id">ID</SortableHeader>
            <SortableHeader field="title">Title</SortableHeader>
            <SortableHeader field="type">Type</SortableHeader>
            <SortableHeader field="status">Status</SortableHeader>
            <SortableHeader field="assignee">Assignee</SortableHeader>
            <SortableHeader field="updatedAt">Updated</SortableHeader>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onItemClick(item)}
              className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                  {item.id}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-gray-900">{item.title}</td>
              <td className="px-4 py-3">
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {item.type}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-1 text-xs rounded ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {item.assignee ? (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs">
                      {item.assignee.charAt(0).toUpperCase()}
                    </div>
                    <span>{item.assignee}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">Unassigned</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                {new Date(item.updatedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Card List View Component
interface CardListViewProps {
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
}

function CardListView({ items, onItemClick }: CardListViewProps) {
  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <WorkItemCard key={item.id} item={item} onClick={() => onItemClick(item)} />
      ))}
    </div>
  );
}

// Helper function for status colors
function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('done') || statusLower.includes('complete')) {
    return 'bg-green-100 text-green-800';
  }
  if (statusLower.includes('progress') || statusLower.includes('doing')) {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (statusLower.includes('review')) {
    return 'bg-purple-100 text-purple-800';
  }
  return 'bg-gray-100 text-gray-800';
}
