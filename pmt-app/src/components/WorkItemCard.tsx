import React from 'react';
import { WorkItem } from '../types';

export function WorkItemCard({ item, onClick, showHierarchy = false }: { item: WorkItem; onClick: () => void; showHierarchy?: boolean }) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold text-gray-500">{item.id}</span>
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{item.type}</span>
      </div>
      <h4 className="text-sm font-medium text-gray-900 mb-2">{item.title}</h4>
      {showHierarchy && item.children && item.children.length > 0 && (
        <div className="text-xs text-gray-500 mb-2">
          📁 {item.children.length} child item{item.children.length !== 1 ? 's' : ''}
        </div>
      )}
      {item.assignee && (
        <div className="text-xs text-gray-600 flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[10px] text-white font-bold">
            {item.assignee.charAt(0).toUpperCase()}
          </div>
          {item.assignee}
        </div>
      )}
    </div>
  );
}
