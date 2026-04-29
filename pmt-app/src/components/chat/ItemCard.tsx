import React from 'react';
import { WorkItem } from '../../types';

const TYPE_COLORS: Record<string, string> = {
  Bug: 'bg-red-100 text-red-700',
  Task: 'bg-blue-100 text-blue-700',
  Feature: 'bg-green-100 text-green-700',
  Epic: 'bg-purple-100 text-purple-700',
};

const STATUS_DOTS: Record<string, string> = {
  'To Do': 'bg-gray-400',
  'In Progress': 'bg-yellow-400',
  'In Review': 'bg-blue-400',
  'Done': 'bg-green-400',
};

interface ItemCardProps {
  item: WorkItem;
  onClick?: (item: WorkItem) => void;
  compact?: boolean;
}

export function ItemCard({ item, onClick, compact = false }: ItemCardProps) {
  const typeColor = TYPE_COLORS[item.type] || 'bg-gray-100 text-gray-700';
  const statusDot = STATUS_DOTS[item.status] || 'bg-gray-400';

  if (compact) {
    return (
      <button
        onClick={() => onClick?.(item)}
        className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/60 transition-colors group"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
        <span className="text-xs text-gray-500 font-mono flex-shrink-0">{item.id}</span>
        <span className="text-xs text-gray-800 truncate flex-1 group-hover:text-blue-600">
          {item.title}
        </span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${typeColor}`}>
          {item.type}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onClick?.(item)}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
            <span className="text-xs text-gray-400 font-mono">{item.id}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColor}`}>
              {item.type}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
            {item.title}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            <span>{item.status}</span>
            {item.assignee && <span>@{item.assignee}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
