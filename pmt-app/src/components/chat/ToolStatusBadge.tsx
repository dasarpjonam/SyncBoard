import React from 'react';

const TOOL_LABELS: Record<string, string> = {
  search_items: '🔍 Search',
  get_project_summary: '📊 Summary',
  get_item_detail: '📋 Detail',
  create_work_item: '➕ Create',
  update_work_item: '✏️ Update',
  list_items: '📃 List',
};

interface ToolStatusBadgeProps {
  toolName: string;
  status: 'running' | 'done';
  result?: string;
}

export function ToolStatusBadge({ toolName, status, result }: ToolStatusBadgeProps) {
  const label = TOOL_LABELS[toolName] || toolName;

  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {status === 'running' ? (
        <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <span className="text-green-500 text-xs">✓</span>
      )}
      <span className="text-[11px] text-gray-500 font-medium">
        {label}
        {status === 'running' ? '...' : ''}
      </span>
      {status === 'done' && result && (
        <span className="text-[11px] text-gray-400">— {result}</span>
      )}
    </div>
  );
}
