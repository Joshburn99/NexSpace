import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Users,
  Calendar,
  Building,
  Briefcase,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: number;
  type: 'staff' | 'shift' | 'facility' | 'job';
  title: string;
  subtitle: string;
  description: string;
  route: string;
}

interface SearchResponse {
  results: SearchResult[];
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Search query
  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ['/api/search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 2) {
        return { results: [] };
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: debouncedQuery.trim().length >= 2,
  });

  const results = data?.results || [];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Close search with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }

      // Navigate results with arrow keys
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const selected = results[selectedIndex];
          if (selected) {
            navigate(selected.route);
            setIsOpen(false);
            setQuery('');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'staff':
        return <Users className="h-4 w-4" />;
      case 'shift':
        return <Calendar className="h-4 w-4" />;
      case 'facility':
        return <Building className="h-4 w-4" />;
      case 'job':
        return <Briefcase className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'staff':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'shift':
        return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'facility':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'job':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.route);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Search trigger button in navbar */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Quick search...</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-1.5 font-mono text-[10px] font-medium opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Search dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Global Search</DialogTitle>
          
          {/* Search input */}
          <div className="flex items-center border-b px-4 py-3">
            <Search className="h-5 w-5 text-gray-400 mr-3" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for staff, shifts, facilities, or jobs..."
              className="flex-1 border-0 p-0 text-base placeholder:text-gray-400 focus-visible:ring-0"
            />
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-[400px] overflow-y-auto p-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                    index === selectedIndex
                      ? "bg-gray-100 dark:bg-gray-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  )}
                >
                  <div className={cn("p-2 rounded-md", getTypeColor(result.type))}>
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {result.title}
                      </p>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {result.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {result.subtitle}
                    </p>
                    {result.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">
                        {result.description}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {query.trim().length >= 2 && !isLoading && results.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try searching with different keywords</p>
            </div>
          )}

          {/* Initial state */}
          {query.trim().length < 2 && !isLoading && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">Start typing to search across the platform</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4 text-xs">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Staff names</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Shift titles</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Facility names</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Job postings</span>
              </div>
            </div>
          )}

          {/* Keyboard shortcuts help */}
          <div className="border-t px-4 py-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">esc</kbd>
                Close
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}