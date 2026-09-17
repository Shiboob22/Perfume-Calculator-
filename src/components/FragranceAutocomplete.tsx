import React, { useState, useEffect, useRef } from 'react';
import { fetchFragranceSuggestions, SearchResult } from '../lib/searchApi';

interface FragranceAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (item: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export const FragranceAutocomplete: React.FC<FragranceAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "Search fragrance (e.g. Naxos)...",
  className = ""
}) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value.trim().length >= 2) {
        setLoading(true);
        const data = await fetchFragranceSuggestions(value);
        setResults(data);
        setIsOpen(data.length > 0);
        setLoading(false);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        className={className || "w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-base"}
        autoCorrect="off"
        autoCapitalize="none"
      />

      {loading && (
        <div className="absolute right-3 top-2.5 text-xs text-neutral-400 animate-pulse">
          Searching...
        </div>
      )}

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((item) => (
            <li
              key={item.id}
              onClick={() => {
                onChange(item.name);
                setIsOpen(false);
                if (onSelect) onSelect(item);
              }}
              className="px-4 py-2.5 hover:bg-neutral-100 cursor-pointer flex justify-between items-center border-b last:border-b-0 border-neutral-100 transition-colors"
            >
              <span className="font-medium text-neutral-900">{item.name}</span>
              {item.tier && (
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                  {item.tier}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
