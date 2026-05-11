import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { FolderOpen, FolderPlus, ChevronDown, Check, X, AlertTriangle, Search, Layers } from 'lucide-react';
import { WorkspaceEntry } from '../types';
import { searchEntries } from '../lib/workspace-registry';

interface WorkspaceSwitcherProps {
  recentWorkspaces: WorkspaceEntry[];
  currentPath: string | null;
  collapsed?: boolean;
  onSwitch: (path: string) => void;
  onOpenNew: () => void;
  onRemove: (path: string) => void;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function WorkspaceSwitcher({
  recentWorkspaces,
  currentPath,
  collapsed = false,
  onSwitch,
  onOpenNew,
  onRemove,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focusedIdx, setFocusedIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentEntry = recentWorkspaces.find(e => e.path === currentPath);
  const currentName = currentEntry?.name ?? (currentPath ? currentPath.split(/[/\\]/).pop() : null) ?? 'No workspace';
  const filtered = searchEntries(recentWorkspaces, query);

  useEffect(() => {
    if (open) {
      setQuery('');
      setFocusedIdx(0);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx(i => Math.min(i + 1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIdx === filtered.length) {
        onOpenNew(); setOpen(false);
      } else if (filtered[focusedIdx]) {
        onSwitch(filtered[focusedIdx].path); setOpen(false);
      }
    }
  };

  const trigger = collapsed ? (
    <button
      onClick={() => setOpen(!open)}
      title={currentName}
      className="w-full flex justify-center p-2 rounded hover:bg-white/10 transition-colors"
    >
      <Layers size={20} />
    </button>
  ) : (
    <button
      onClick={() => setOpen(!open)}
      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left group"
    >
      <Layers size={16} className="flex-shrink-0 text-white/60" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white/50 font-medium uppercase tracking-wider mb-0.5">Workspace</div>
        <div className="text-sm font-semibold text-white truncate">{currentName}</div>
      </div>
      <ChevronDown size={14} className={`text-white/40 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {trigger}

      {open && (
        <div
          className={`absolute z-50 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden ${
            collapsed
              ? 'left-full top-0 ml-2 w-72'
              : 'left-0 right-0 top-full mt-1'
          }`}
          style={{ maxHeight: '420px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Search */}
          <div className="p-2 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <Search size={13} className="text-white/40 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setFocusedIdx(0); }}
                placeholder="Search workspaces…"
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-white/30 hover:text-white/60">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 py-1">
            {filtered.length === 0 && (
              <div className="text-xs text-white/30 text-center py-4">No workspaces found</div>
            )}
            {filtered.map((entry, idx) => {
              const isCurrent = entry.path === currentPath;
              const isFocused = idx === focusedIdx;
              return (
                <div
                  key={entry.path}
                  className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors ${
                    isFocused ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                  onMouseEnter={() => setFocusedIdx(idx)}
                  onClick={() => { onSwitch(entry.path); setOpen(false); }}
                >
                  <div className="mt-0.5 flex-shrink-0 w-4">
                    {isCurrent && <Check size={13} className="text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${isCurrent ? 'text-blue-300' : 'text-white/90'}`}>
                        {entry.name}
                      </span>
                      {entry.stats && (
                        <span className="text-[10px] text-white/30 whitespace-nowrap">
                          {entry.stats.itemCount} items · {entry.stats.inProgressCount} active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-white/30 truncate">{entry.path}</span>
                      <span className="text-[11px] text-white/20 whitespace-nowrap flex-shrink-0">
                        {formatRelativeTime(entry.lastOpenedAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onRemove(entry.path); }}
                    className="opacity-0 group-hover:opacity-100 mt-0.5 flex-shrink-0 p-1 text-white/30 hover:text-red-400 rounded transition-all"
                    title="Remove from list"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 flex-shrink-0">
            <button
              className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors ${
                focusedIdx === filtered.length ? 'bg-white/5 text-white' : ''
              }`}
              onMouseEnter={() => setFocusedIdx(filtered.length)}
              onClick={() => { onOpenNew(); setOpen(false); }}
            >
              <FolderOpen size={15} />
              Open folder…
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
