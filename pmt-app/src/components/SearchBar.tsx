import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { WorkItem } from '../types';

interface Props {
  onSearch: (query: string) => void;
  onClear: () => void;
  placeholder?: string;
  results?: WorkItem[];
  onSelectResult?: (item: WorkItem) => void;
}

export function SearchBar({
  onSearch,
  onClear,
  placeholder = 'Search work items...',
  results = [],
  onSelectResult,
}: Props) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch(value);
    setShowResults(value.length > 0);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
    setShowResults(false);
  };

  const handleSelectResult = (item: WorkItem) => {
    onSelectResult?.(item);
    setShowResults(false);
    setQuery('');
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {results.map(item => (
            <button
              key={item.id}
              onClick={() => handleSelectResult(item)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="font-medium text-gray-900 truncate">{item.title}</div>
              <div className="text-sm text-gray-500 mt-1">
                {item.id} • {item.type} • {item.status}
                {item.assignee && ` • @${item.assignee}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm z-50">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}
