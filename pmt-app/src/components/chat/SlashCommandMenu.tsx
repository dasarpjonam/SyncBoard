import React from 'react';
import { SlashCommandInfo } from '../../types/chat';

interface SlashCommandMenuProps {
  commands: SlashCommandInfo[];
  filter: string;
  onSelect: (command: SlashCommandInfo) => void;
  visible: boolean;
}

export function SlashCommandMenu({
  commands,
  filter,
  onSelect,
  visible,
}: SlashCommandMenuProps) {
  if (!visible || commands.length === 0) return null;

  const filtered = filter
    ? commands.filter(cmd =>
        cmd.name.toLowerCase().startsWith(filter.toLowerCase())
      )
    : commands;

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-50">
      {filtered.map(cmd => (
        <button
          key={cmd.name}
          onClick={() => onSelect(cmd)}
          className="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2"
        >
          <span className="text-sm font-mono text-blue-600">/{cmd.name}</span>
          <span className="text-xs text-gray-500 truncate">{cmd.description}</span>
        </button>
      ))}
    </div>
  );
}
