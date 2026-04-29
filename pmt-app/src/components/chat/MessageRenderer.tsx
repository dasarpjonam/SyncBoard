import React from 'react';
import { ChatContentBlock, ChatMessage } from '../../types/chat';
import { ItemCard } from './ItemCard';
import { ToolStatusBadge } from './ToolStatusBadge';
import { FollowUpChips } from './FollowUpChips';
import { SummaryCard } from './SummaryCard';
import { MarkdownView } from './MarkdownView';
import { WorkItem } from '../../types';

interface MessageRendererProps {
  message: ChatMessage;
  onNavigateToItem?: (item: WorkItem) => void;
  onSendMessage?: (message: string) => void;
}

function renderBlock(
  block: ChatContentBlock,
  index: number,
  onNavigateToItem?: (item: WorkItem) => void,
  onSendMessage?: (message: string) => void
): React.ReactNode {
  switch (block.type) {
    case 'markdown':
      return (
        <MarkdownView key={index} content={block.content} className="text-sm" />
      );

    case 'progress':
      return (
        <div key={index} className="flex items-center gap-2 text-xs text-gray-400 italic py-1">
          <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          {block.message}
        </div>
      );

    case 'item-card':
      return (
        <ItemCard
          key={index}
          item={block.item}
          onClick={onNavigateToItem}
        />
      );

    case 'item-list':
      return (
        <div key={index} className="space-y-1.5">
          {block.title && (
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {block.title}
            </div>
          )}
          {block.items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={onNavigateToItem}
              compact
            />
          ))}
        </div>
      );

    case 'summary':
      return <SummaryCard key={index} data={block.data} />;

    case 'button':
      return (
        <button
          key={index}
          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors font-medium"
          onClick={() => onSendMessage?.(block.label)}
        >
          {block.label}
        </button>
      );

    case 'table':
      return (
        <div key={index} className="overflow-x-auto text-xs">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-2 py-1 border-b border-gray-200 font-medium text-gray-600"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="hover:bg-gray-50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2 py-1 border-b border-gray-100">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'tool-status':
      return <ToolStatusBadge key={index} toolName={block.toolName} status={block.status} result={block.result} />;

    case 'follow-ups':
      return (
        <FollowUpChips
          key={index}
          suggestions={block.suggestions}
          onSelect={onSendMessage}
        />
      );

    case 'error':
      return (
        <div
          key={index}
          className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs"
        >
          <strong>Error:</strong> {block.message}
        </div>
      );

    default:
      return null;
  }
}

export function MessageRenderer({
  message,
  onNavigateToItem,
  onSendMessage,
}: MessageRendererProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[95%] space-y-2 p-2.5 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {message.blocks.map((block, i) =>
          renderBlock(block, i, onNavigateToItem, onSendMessage)
        )}
      </div>
    </div>
  );
}
