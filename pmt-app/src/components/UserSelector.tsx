import React, { useState, useRef, useEffect } from 'react';
import { Box, ListItemIcon, ListItemText, Divider, Tooltip } from '@mui/material';
import { User, ChevronDown } from 'lucide-react';

interface UserSelectorProps {
  currentUser: string | null;
  availableUsers: string[];
  onUserChange: (user: string) => Promise<void>;
  onAddUser: (user: string) => Promise<void>;
  collapsed?: boolean;
}

export function UserSelector({
  currentUser,
  availableUsers,
  onUserChange,
  onAddUser,
  collapsed = false,
}: UserSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSelectUser = async (user: string) => {
    if (user !== currentUser) {
      await onUserChange(user);
    }
    setOpen(false);
  };

  const handleAddUserSubmit = async () => {
    if (newUserName.trim()) {
      await onAddUser(newUserName.trim());
      await onUserChange(newUserName.trim());
    }
    setIsAdding(false);
    setNewUserName('');
    setOpen(false);
  };

  const displayUser = currentUser || 'Select user';
  const isGuest = currentUser && !availableUsers.includes(currentUser);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      {collapsed ? (
        <Tooltip title={displayUser} placement="right">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex justify-center p-2 rounded hover:bg-white/10 transition-colors text-white"
          >
            <User size={20} />
          </button>
        </Tooltip>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left group"
        >
          <User size={16} className="flex-shrink-0 text-white/60" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white/50 font-medium uppercase tracking-wider mb-0.5">User</div>
            <div className="text-sm font-semibold text-white truncate">{displayUser}</div>
          </div>
          <ChevronDown
            size={14}
            className={`text-white/40 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* Dropdown Menu */}
      {open && (
        <div
          className={`absolute z-50 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden ${
            collapsed ? 'left-full top-0 ml-2 w-56' : 'left-0 right-0 top-full mt-1'
          }`}
          style={{ maxHeight: '300px', display: 'flex', flexDirection: 'column' }}
        >
          {/* User List */}
          <div className="overflow-y-auto flex-1 py-1">
            {isGuest && (
              <button
                onClick={() => handleSelectUser(currentUser)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors bg-blue-600/20 text-blue-300"
              >
                <User size={14} className="flex-shrink-0" />
                <span className="text-sm font-medium truncate">{currentUser} <span className="opacity-70">(Guest)</span></span>
                <span className="ml-auto text-xs font-bold">✓</span>
              </button>
            )}
            
            {availableUsers.map(user => {
              const isCurrent = user === currentUser;
              return (
                <button
                  key={user}
                  onClick={() => handleSelectUser(user)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                    isCurrent
                      ? 'bg-blue-600/20 text-blue-300'
                      : 'text-white/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <User size={14} className="flex-shrink-0" />
                  <span className="text-sm font-medium truncate">{user}</span>
                  {isCurrent && <span className="ml-auto text-xs font-bold">✓</span>}
                </button>
              );
            })}
            
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 0.5 }} />
            
            {isAdding ? (
              <div className="px-3 py-2 flex items-center gap-2">
                <input 
                  autoFocus
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddUserSubmit();
                    if (e.key === 'Escape') {
                      setIsAdding(false);
                      setNewUserName('');
                    }
                  }}
                  className="w-full bg-black/30 border border-white/20 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Username..."
                />
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-blue-400 hover:bg-white/5 hover:text-blue-300 transition-colors"
              >
                <span className="text-lg leading-none">+</span>
                <span className="text-sm font-medium">Add user</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
