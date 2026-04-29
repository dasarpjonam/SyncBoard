import React from 'react';
import { WorkspaceSummaryData } from '../../types/chat';

interface SummaryCardProps {
  data: WorkspaceSummaryData;
}

export function SummaryCard({ data }: SummaryCardProps) {
  const maxStatusCount = Math.max(...Object.values(data.byStatus), 1);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Project Summary
        </span>
        <span className="text-xs text-gray-400">
          {data.totalItems} item{data.totalItems !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Status Distribution Bar */}
      <div className="space-y-1.5">
        <div className="text-[11px] text-gray-500 font-medium">Status</div>
        {Object.entries(data.byStatus).map(([status, count]) => (
          <div key={status} className="flex items-center gap-2">
            <span className="text-[11px] text-gray-600 w-20 truncate">{status}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-400 transition-all"
                style={{ width: `${(count / maxStatusCount) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-500 w-6 text-right">{count}</span>
          </div>
        ))}
      </div>

      {/* Type Counts */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(data.byType).map(([type, count]) => (
          <span
            key={type}
            className="text-[11px] px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-gray-600"
          >
            {type}: {count}
          </span>
        ))}
      </div>

      {/* Team & Activity */}
      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 border-t border-gray-100">
        <span>
          Team: {data.activeAssignees.length > 0 ? data.activeAssignees.join(', ') : 'None'}
        </span>
        <span>{data.updatesLast24h} update{data.updatesLast24h !== 1 ? 's' : ''} today</span>
      </div>
    </div>
  );
}
