import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, Plus, Filter, FileText } from 'lucide-react';
import { useWorkspace } from '../store/WorkspaceContext';
import { WorkItem } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreateItem?: () => void;
  onNavigateTo?: (view: string) => void;
  onFilterBy?: (type: string, value: string) => void;
  onOpenItem?: (item: WorkItem) => void;
}

export function CommandPalette({
  open,
  onClose,
  onCreateItem,
  onNavigateTo,
  onFilterBy,
  onOpenItem,
}: Props) {
  const { items, config } = useWorkspace();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (open) {
          onClose();
        }
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onClose]);

  if (!open) return null;

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.id.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[20vh]">
      <Command
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      >
        <div className="flex items-center border-b px-4">
          <Search className="mr-2 text-gray-400" size={20} />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Type a command or search..."
            className="flex-1 py-4 bg-transparent outline-none text-gray-900 placeholder-gray-400"
          />
        </div>

        <Command.List className="max-h-96 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-gray-500">
            No results found.
          </Command.Empty>

          {/* Actions */}
          <Command.Group heading="Actions" className="text-xs font-semibold text-gray-500 px-2 pt-2 pb-1">
            <Command.Item
              onSelect={() => {
                onCreateItem?.();
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-blue-50 aria-selected:bg-blue-50"
            >
              <Plus size={16} />
              <span>Create new work item</span>
              <span className="ml-auto text-xs text-gray-400">⌘N</span>
            </Command.Item>
          </Command.Group>

          {/* Navigation */}
          <Command.Group heading="Navigate" className="text-xs font-semibold text-gray-500 px-2 pt-2 pb-1">
            <Command.Item
              onSelect={() => {
                onNavigateTo?.('/');
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-blue-50 aria-selected:bg-blue-50"
            >
              <FileText size={16} />
              <span>Go to Workspace</span>
            </Command.Item>
            <Command.Item
              onSelect={() => {
                onNavigateTo?.('/settings');
                onClose();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-blue-50 aria-selected:bg-blue-50"
            >
              <FileText size={16} />
              <span>Go to Settings</span>
            </Command.Item>
          </Command.Group>

          {/* Filter by Status */}
          <Command.Group heading="Filter by Status" className="text-xs font-semibold text-gray-500 px-2 pt-2 pb-1">
            {config.statuses.map(status => (
              <Command.Item
                key={status}
                onSelect={() => {
                  onFilterBy?.('status', status);
                  onClose();
                }}
                className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-blue-50 aria-selected:bg-blue-50"
              >
                <Filter size={16} />
                <span>{status}</span>
              </Command.Item>
            ))}
          </Command.Group>

          {/* Search Results */}
          {filteredItems.length > 0 && (
            <Command.Group heading="Work Items" className="text-xs font-semibold text-gray-500 px-2 pt-2 pb-1">
              {filteredItems.map(item => (
                <Command.Item
                  key={item.id}
                  onSelect={() => {
                    onOpenItem?.(item);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-blue-50 aria-selected:bg-blue-50"
                >
                  <FileText size={16} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.title}</div>
                    <div className="text-xs text-gray-500">
                      {item.id} • {item.type} • {item.status}
                    </div>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
