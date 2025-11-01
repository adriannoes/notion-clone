import { useState, useEffect, useCallback } from "react";
import { Search, FileText, X, Loader2, Clock, Filter, Zap } from "lucide-react";
import { useDebounce } from "use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCombinedSearch, useSearchSuggestions, highlightSearchTerm, truncateText } from "@/hooks/useSearch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

interface GlobalSearchProps {
  onPageSelect: (pageId: string) => void;
  workspaceId?: string;
}

const MAX_RESULTS = 20;
const RECENT_SEARCHES_KEY = "notion-recent-searches";
const MAX_RECENT_SEARCHES = 5;

export function GlobalSearch({ onPageSelect, workspaceId }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [blockTypeFilter, setBlockTypeFilter] = useState<string>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();

  // Use advanced search
  const search = useCombinedSearch(
    debouncedQuery,
    workspaceId,
    blockTypeFilter === "all" ? undefined : blockTypeFilter,
    20
  );

  const suggestions = useSearchSuggestions(debouncedQuery, workspaceId, 5);

  // Combine and format results
  const combinedResults = [
    ...search.pages.map(page => ({
      id: page.id,
      title: page.title,
      type: 'page',
      rank: page.rank,
      content: page.title,
    })),
    ...search.blocks.map(block => ({
      id: block.page_id,
      title: block.page_title,
      type: 'block',
      rank: block.rank,
      content: block.content,
      blockType: block.type,
    })),
  ].sort((a, b) => b.rank - a.rank).slice(0, 20);

  // Load recent searches from localStorage
  useEffect(() => {
    if (user?.id) {
      try {
        const stored = localStorage.getItem(`${RECENT_SEARCHES_KEY}-${user.id}`);
        if (stored) {
          setRecentSearches(JSON.parse(stored));
        }
      } catch (error) {
        logger.error("Failed to load recent searches:", error);
      }
    }
  }, [user?.id]);

  // Save recent search
  const saveRecentSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim() || !user?.id) return;

    try {
      const updated = [
        searchQuery,
        ...recentSearches.filter(s => s !== searchQuery)
      ].slice(0, MAX_RECENT_SEARCHES);

      setRecentSearches(updated);
      localStorage.setItem(`${RECENT_SEARCHES_KEY}-${user.id}`, JSON.stringify(updated));
    } catch (error) {
      logger.error("Failed to save recent search:", error);
    }
  }, [recentSearches, user?.id]);

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
          logger.error("Search error:", error);
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
      logger.error("Search error:", error);
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
    setSelectedIndex(0);
  };

  const handleRecentSearchClick = (recentQuery: string) => {
    setQuery(recentQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, combinedResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && combinedResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(combinedResults[selectedIndex].id);
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
            <div className="flex gap-2 flex-1">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar páginas e conteúdo..."
                className="border-0 focus-visible:ring-0 text-base h-12"
                autoFocus
              />
              <Select value={blockTypeFilter} onValueChange={setBlockTypeFilter}>
                <SelectTrigger className="w-32 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tudo</SelectItem>
                  <SelectItem value="paragraph">Texto</SelectItem>
                  <SelectItem value="heading1">Título 1</SelectItem>
                  <SelectItem value="heading2">Título 2</SelectItem>
                  <SelectItem value="code">Código</SelectItem>
                  <SelectItem value="quote">Citação</SelectItem>
                  <SelectItem value="table">Tabela</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            {!search.isLoading && combinedResults.length === 0 && query && (
              <div className="py-8 text-center text-text-tertiary text-sm">
                Nenhum resultado para "{query}"
              </div>
            )}
            
            {/* Recent Searches */}
            {!search.isLoading && combinedResults.length === 0 && !query && recentSearches.length > 0 && (
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
            {!search.isLoading && combinedResults.length === 0 && !query && recentSearches.length === 0 && (
              <div className="py-8 text-center text-text-tertiary text-sm">
                Digite para buscar páginas...
              </div>
            )}

            {/* Search Results */}
            {!search.isLoading && combinedResults.map((result, index) => (
              <div
                key={`${result.type}-${result.id}`}
                onClick={() => handleSelect(result.id)}
                className={cn(
                  "flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                  selectedIndex === index ? "bg-block-selected" : "hover:bg-hover-bg"
                )}
              >
                <FileText className="h-4 w-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{result.title}</div>
                  {result.type === 'block' && result.content && (
                    <div className="text-xs text-text-tertiary mt-0.5 truncate">
                      {truncateText(result.content, 80)}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {result.type === 'page' ? 'página' : 'conteúdo'}
                    </Badge>
                    {result.type === 'block' && result.blockType && (
                      <Badge variant="outline" className="text-xs">
                        {result.blockType}
                      </Badge>
                    )}
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
