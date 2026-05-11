import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../store/WorkspaceContext';
import { WorkItem } from '../types';
import { BoardSection } from '../components/BoardSection';
import { ListSection } from '../components/ListSection';
import { TableSection } from '../components/TableSection';
import { serializeMarkdownItem } from '../lib/markdown';
import { filterWithAncestors } from '../lib/hierarchy';
import { LayoutDashboard, List, Table as TableIcon, Search, Filter, ChevronDown, X, FolderOpen } from 'lucide-react';

type ViewMode = 'board' | 'list' | 'table';

export function WorkspaceView() {
  const navigate = useNavigate();
  const { itemsTree, config, workspacePath, updateItem, addItem, currentUser, setCurrentUser, loadWorkspace } = useWorkspace();
  
  console.log('[WorkspaceView] Rendering - path:', workspacePath, 'items:', itemsTree.length);
  
  // View mode and persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('workspaceViewMode') as ViewMode) || 'board';
  });
  
  // Filter state
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('workspaceViewMode', viewMode);
  }, [viewMode]);

  // Filter items with hierarchy support
  const filteredTree = useMemo(() => {
    if (selectedTypes.length === 0 && selectedStatuses.length === 0 && !searchQuery.trim()) {
      return itemsTree;
    }

    return filterWithAncestors(itemsTree, (item) => {
      // Apply type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) {
        return false;
      }

      // Apply status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) {
        return false;
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches = (
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query) ||
          (item.assignee?.toLowerCase().includes(query) || false)
        );
        return matches;
      }

      return true;
    });
  }, [itemsTree, selectedTypes, selectedStatuses, searchQuery]);

  const handleNewItem = (parentId?: string) => {
    navigate('/workspace/item/new' + (parentId ? `?parentId=${parentId}` : ''));
  };

  const handleEditItem = (item: WorkItem) => {
    navigate(`/workspace/item/${item.id}`);
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

  // Show workspace selection screen if no workspace is loaded
  if (!workspacePath) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-6">
          <FolderOpen size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Workspace Selected</h2>
          <p className="text-gray-600 mb-6">
            Select or create a workspace folder to get started with managing your work items.
          </p>
          <button
            onClick={async () => {
              const path = await window.electronAPI.openDirectory();
              if (path) {
                await loadWorkspace(path);
              }
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Open Workspace Folder
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Or use the folder icon in the sidebar to select a workspace
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with filters and view toggle */}
      <div className="bg-white border-b p-3 md:p-4 flex-shrink-0">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0 mb-3 md:mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold">Workspace</h1>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm md:text-base ${
                viewMode === 'board' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Board view"
            >
              <LayoutDashboard size={18} />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm md:text-base ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="List view"
            >
              <List size={18} />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm md:text-base ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Table view"
            >
              <TableIcon size={18} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
          {/* Search */}
          <div className="flex-1 min-w-full sm:min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <button
              onClick={() => setShowTypeFilter(!showTypeFilter)}
              className={`flex items-center gap-2 px-3 md:px-4 py-2 border rounded hover:bg-gray-50 text-sm md:text-base w-full sm:w-auto ${
                selectedTypes.length > 0 ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <Filter size={16} />
              Type {selectedTypes.length > 0 && `(${selectedTypes.length})`}
              <ChevronDown size={16} />
            </button>
            {showTypeFilter && (
              <div className="absolute top-full mt-1 bg-white border rounded shadow-lg z-10 min-w-[200px] left-0 right-0 sm:left-auto sm:right-auto">
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
              className={`flex items-center gap-2 px-3 md:px-4 py-2 border rounded hover:bg-gray-50 text-sm md:text-base w-full sm:w-auto ${
                selectedStatuses.length > 0 ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <Filter size={16} />
              Status {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
              <ChevronDown size={16} />
            </button>
            {showStatusFilter && (
              <div className="absolute top-full mt-1 bg-white border rounded shadow-lg z-10 min-w-[200px] left-0 right-0 sm:left-auto sm:right-auto">
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
      </div>

      {/* Content - Board, List, or Table */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' ? (
          <BoardSection 
            itemsTree={filteredTree} 
            onEditItem={handleEditItem}
            onNewItem={handleNewItem}
          />
        ) : viewMode === 'list' ? (
          <ListSection 
            itemsTree={filteredTree} 
            onEditItem={handleEditItem}
            onNewItem={handleNewItem}
          />
        ) : (
          <TableSection 
            itemsTree={filteredTree} 
            onEditItem={handleEditItem}
            onNewItem={handleNewItem}
          />
        )}
      </div>
    </div>
  );
}
