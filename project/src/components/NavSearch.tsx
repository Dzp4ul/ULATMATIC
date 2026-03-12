import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface NavItem {
  label: string;
  icon?: React.ReactNode;
  /** Callback executed when this item is selected */
  action: () => void;
  /** Optional keywords to improve matching (e.g. aliases) */
  keywords?: string[];
  /** Breadcrumb path shown below the label (e.g. "Residents/Users > Approved Residents") */
  category?: string;
  /** Extra detail line shown below category (e.g. email, sitio, status) */
  detail?: string;
}

interface NavSearchProps {
  items: NavItem[];
  className?: string;
}

export function NavSearch({ items, className }: NavSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.category ?? '').toLowerCase().includes(q) ||
        (item.detail ?? '').toLowerCase().includes(q) ||
        (item.keywords ?? []).some((k) => k.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [items, query]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (item: NavItem) => {
    item.action();
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[selectedIndex]) select(filtered[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setQuery('');
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div className={`relative flex-1 ${className ?? ''}`} ref={containerRef}>
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        <Search className="h-4 w-4 text-white/80" />
      </div>
      <input
        ref={inputRef}
        className="h-10 w-full rounded-lg bg-white/15 pl-10 pr-8 text-sm text-white placeholder:text-white/70 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-white/25"
        placeholder="Search…"
        value={query}
        onFocus={() => { if (query.trim()) setOpen(true); }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(e.target.value.trim().length > 0);
        }}
        onKeyDown={handleKeyDown}
      />
      {query && (
        <button
          type="button"
          className="absolute inset-y-0 right-2 flex items-center text-white/60 hover:text-white"
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl z-50">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No results found
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto py-1">
              {filtered.map((item, i) => (
                <button
                  key={`${item.category ?? ''}::${item.label}::${i}`}
                  type="button"
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    i === selectedIndex
                      ? 'bg-brand/10 text-brand'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  onMouseEnter={() => setSelectedIndex(i)}
                  onClick={() => select(item)}
                >
                  {item.icon && (
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      i === selectedIndex ? 'bg-brand/15 text-brand' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.icon}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{item.label}</div>
                    {item.category && (
                      <div className="text-xs text-gray-400 truncate">{item.category}</div>
                    )}
                    {item.detail && (
                      <div className="text-xs text-gray-500 truncate">{item.detail}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-gray-100 px-4 py-2 text-[10px] text-gray-400">
            ↑↓ navigate &nbsp; ↵ select &nbsp; esc close
          </div>
        </div>
      )}
    </div>
  );
}
