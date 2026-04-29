import React from 'react';

interface FollowUpChipsProps {
  suggestions: string[];
  onSelect?: (suggestion: string) => void;
}

export function FollowUpChips({ suggestions, onSelect }: FollowUpChipsProps) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect?.(suggestion)}
          className="text-[11px] px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-full hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
