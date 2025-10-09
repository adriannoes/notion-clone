import { useState, useEffect, useCallback } from "react";
import { Search, FileText, X, Loader2, Clock } from "lucide-react";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePages } from "@/hooks/usePages";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GlobalSearchProps {
  onPageSelect: (pageId: string) => void;
}

interface SearchResult {
  pageId: string;
  title: string;
  matchType: "title" | "content";
  preview?: string;
}

const MAX_RESULTS = 20;
const RECENT_SEARCHES_KEY = "notion-recent-searches";
const MAX_RECENT_SEARCHES = 5;

export function GlobalSearch({ onPageSelect }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const { data: pages = [] } = usePages();
  const { toast } = useToast();

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load recent searches:", error);
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    try {
      const updated = [
        searchQuery,
        ...recentSearches.filter(s => s !== searchQuery)
      ].slice(0, MAX_RECENT_SEARCHES);
      
      setRecentSearches(updated);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save recent search:", error);
    }
  }, [recentSearches]);

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Async search logic with database queries
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const lowerQuery = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    try {
      // First, search in page titles (fast, in-memory)
      const titleMatches = pages.filter(page =>
        page.title.toLowerCase().includes(lowerQuery)
      );

      titleMatches.forEach(page => {
        if (searchResults.length >= MAX_RESULTS) return;
        searchResults.push({
          pageId: page.id,
          title: page.title,
          matchType: "title"
        });
      });

      // If we haven't reached the limit, search in content
      if (searchResults.length < MAX_RESULTS) {
        const remainingSlots = MAX_RESULTS - searchResults.length;
        
        // Search in blocks content (requires DB query)
        const { data: blockMatches, error } = await supabase
          .from("blocks")
          .select("page_id, content")
          .ilike("content", `%${searchQuery}%`)
          .limit(remainingSlots);

        if (error) {
          console.error("Search error:", error);
          toast({
            title: "Erro na busca",
            description: "Não foi possível buscar no conteúdo das páginas.",
            variant: "destructive",
          });
        } else if (blockMatches) {
          // Get unique page IDs from block matches
          const matchedPageIds = new Set(blockMatches.map(b => b.page_id));
          
          matchedPageIds.forEach(pageId => {
            if (searchResults.length >= MAX_RESULTS) return;
            
            // Skip if already in results (title match)
            if (searchResults.some(r => r.pageId === pageId)) return;
            
            const page = pages.find(p => p.id === pageId);
            if (!page) return;

            const blockMatch = blockMatches.find(b => b.page_id === pageId);
            const preview = blockMatch?.content?.substring(0, 100) || "";

            searchResults.push({
              pageId: page.id,
              title: page.title,
              matchType: "content",
              preview
            });
          });
        }
      }

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error("Search error:", error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao realizar a busca.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [pages, toast]);

  // Debounced search effect
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setIsSearching(false);
    }
  }, [debouncedQuery, performSearch]);

  const handleSelect = (pageId: string) => {
    saveRecentSearch(query);
    onPageSelect(pageId);
    setIsOpen(false);
    setQuery("");
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex].pageId);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2 text-text-secondary hover:text-text-primary"
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[20%] z-50 w-full max-w-2xl translate-x-[-50%] animate-fade-in">
        <div className="bg-background border border-border rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-4 w-4 text-text-tertiary mr-2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages..."
              className="border-0 focus-visible:ring-0 text-base h-12"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                setQuery("");
              }}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {/* Loading State */}
            {isSearching && (
              <div className="flex items-center justify-center py-8 gap-2 text-text-tertiary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Buscando...</span>
              </div>
            )}

            {/* No Results */}
            {!isSearching && results.length === 0 && query && (
              <div className="py-8 text-center text-text-tertiary text-sm">
                Nenhum resultado para "{query}"
              </div>
            )}
            
            {/* Recent Searches */}
            {!isSearching && results.length === 0 && !query && recentSearches.length > 0 && (
              <div className="py-2">
                <div className="text-xs font-medium text-text-tertiary px-3 mb-2">
                  Buscas recentes
                </div>
                {recentSearches.map((recentQuery, index) => (
                  <div
                    key={index}
                    onClick={() => handleRecentSearchClick(recentQuery)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-hover-bg transition-colors"
                  >
                    <Clock className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                    <span className="text-sm text-text-secondary">{recentQuery}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isSearching && results.length === 0 && !query && recentSearches.length === 0 && (
              <div className="py-8 text-center text-text-tertiary text-sm">
                Digite para buscar páginas...
              </div>
            )}

            {/* Search Results */}
            {!isSearching && results.map((result, index) => (
              <div
                key={result.pageId}
                onClick={() => handleSelect(result.pageId)}
                className={cn(
                  "flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                  selectedIndex === index ? "bg-block-selected" : "hover:bg-hover-bg"
                )}
              >
                <FileText className="h-4 w-4 text-text-tertiary mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">
                    {result.title}
                  </div>
                  {result.preview && (
                    <div className="text-xs text-text-tertiary truncate mt-1">
                      {result.preview}...
                    </div>
                  )}
                  <div className="text-xs text-text-tertiary mt-1">
                    Match in {result.matchType}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
