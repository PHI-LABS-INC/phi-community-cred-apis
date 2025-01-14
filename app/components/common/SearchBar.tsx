"use client";

import { useState, useCallback } from 'react';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ 
  onSearch,
  placeholder = "Search APIs..."
}: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch?.(value);
  }, [onSearch]);

  return (
    <div className="relative">
      <input
        type="search"
        value={query}
        onChange={handleSearch}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 
                 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 focus:border-transparent 
                 placeholder-slate-400 text-sm transition-colors
                 hover:bg-slate-100"
        aria-label="Search"
      />
    </div>
  );
}