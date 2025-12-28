import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, FileText, X, Loader2, Clock, Filter, Zap, Tag } from "lucide-react";
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
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

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
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [propertyValueFilter, setPropertyValueFilter] = useState<string>("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();

  // Use advanced search with filters (use clean query if property filters exist)
  const searchQuery = parseSearchQuery.cleanQuery || debouncedQuery;
  const search = useCombinedSearch(
    searchQuery,
    workspaceId,
    blockTypeFilter === "all" ? undefined : blockTypeFilter,
    20
  );

  const suggestions = useSearchSuggestions(debouncedQuery, workspaceId, 5);
  const { data: propertySchema = [] } = useWorkspacePropertySchema(workspaceId);
  const { data: pagesWithProperties = [] } = usePagesWithProperties(workspaceId);

  // Parse search query for property filters (e.g., "tag:valor" or "status:done")
  const parseSearchQuery = useMemo(() => {
    const propertyPattern = /(\w+):([^\s]+)/g;
    const matches = [...query.matchAll(propertyPattern)];
    const propertyFilters: Record<string, string> = {};
    let cleanQuery = query;

    matches.forEach(match => {
      const [fullMatch, propertyName, propertyValue] = match;
      propertyFilters[propertyName] = propertyValue;
      cleanQuery = cleanQuery.replace(fullMatch, '').trim();
    });

    return { cleanQuery, propertyFilters };
  }, [query]);

  // Search pages by properties if property filters exist
  const propertySearchResults = useMemo(() => {
    if (Object.keys(parseSearchQuery.propertyFilters).length === 0) return [];

    return pagesWithProperties.filter(page => {
      return Object.entries(parseSearchQuery.propertyFilters).every(([propName, propValue]) => {
        const property = page.properties[propName];
        if (!property) return false;
        
        const value = property.value;
        if (typeof value === 'object') {
          return JSON.stringify(value).toLowerCase().includes(propValue.toLowerCase());
        }
        return String(value).toLowerCase().includes(propValue.toLowerCase());
      });
    }).map(page => ({
      id: page.page_id,
      title: page.page_title,
      type: 'page' as const,
      rank: 1.0,
      content: page.page_title,
      createdAt: undefined as Date | undefined,
    }));
  }, [pagesWithProperties, parseSearchQuery.propertyFilters]);

  // Apply date filter to results
  const filteredResults = useMemo(() => {
    // If property filters exist, use property search results
    if (Object.keys(parseSearchQuery.propertyFilters).length > 0) {
      return propertySearchResults;
    }

    // Otherwise use regular search
    let results = [
      ...search.pages.map(page => ({
        id: page.id,
        title: page.title,
        type: 'page' as const,
        rank: page.rank,
        content: page.title,
        createdAt: undefined as Date | undefined,
      })),
      ...search.blocks.map(block => ({
        id: block.page_id,
        title: block.page_title,
        type: 'block' as const,
        rank: block.rank,
        content: block.content,
        blockType: block.type,
        createdAt: undefined as Date | undefined,
      })),
    ];

    // Apply date filter if needed
    if (dateFilter !== "all" && debouncedQuery) {
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = null;

      switch (dateFilter) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
          break;
        case "week":
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case "month":
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case "year":
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
      }

      // Note: Date filtering would require fetching page dates, 
      // which is not currently in the search results
      // This is a placeholder for future implementation
    }

    return results.sort((a, b) => b.rank - a.rank).slice(0, 20);
  }, [search.pages, search.blocks, dateFilter, debouncedQuery, parseSearchQuery.propertyFilters, propertySearchResults]);

  const combinedResults = filteredResults;

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

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [combinedResults]);

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
                placeholder="Buscar páginas e conteúdo... (ex: tag:valor ou status:done)"
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
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-36 h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer data</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="year">Este ano</SelectItem>
                </SelectContent>
              </Select>
              {propertySchema.length > 0 && (
                <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                  <SelectTrigger className="w-40 h-12">
                    <SelectValue placeholder="Propriedade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {propertySchema.map(prop => (
                      <SelectItem key={prop.property_name} value={prop.property_name}>
                        {prop.property_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {propertyFilter && (
                <Input
                  value={propertyValueFilter}
                  onChange={(e) => setPropertyValueFilter(e.target.value)}
                  placeholder="Valor da propriedade..."
                  className="w-40 h-12"
                />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBlockTypeFilter("all");
                  setDateFilter("all");
                  setAuthorFilter("all");
                  setPropertyFilter("");
                  setPropertyValueFilter("");
                }}
                className="h-12"
                title="Limpar filtros"
              >
                <X className="h-4 w-4" />
              </Button>
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
            {search.isLoading && (
              <div className="flex items-center justify-center py-8 gap-2 text-text-tertiary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Buscando...</span>
              </div>
            )}

            {/* No Results */}
            {!search.isLoading && combinedResults.length === 0 && debouncedQuery && (
              <div className="py-8 text-center text-text-tertiary text-sm">
                Nenhum resultado para "{debouncedQuery}"
              </div>
            )}
            
            {/* Recent Searches */}
            {!search.isLoading && combinedResults.length === 0 && !debouncedQuery && recentSearches.length > 0 && (
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
            {!search.isLoading && combinedResults.length === 0 && !debouncedQuery && recentSearches.length === 0 && (
              <div className="py-8 text-center text-text-tertiary text-sm">
                Digite para buscar páginas...
              </div>
            )}

            {/* Search Results */}
            {!search.isLoading && combinedResults.map((result, index) => (
              <div
                key={`${result.type}-${result.id}-${index}`}
                onClick={() => handleSelect(result.id)}
                className={cn(
                  "flex items-start gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
                  selectedIndex === index ? "bg-primary/10 border border-primary/20" : "hover:bg-hover-bg"
                )}
              >
                <FileText className="h-4 w-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div 
                    className="font-medium text-sm"
                    dangerouslySetInnerHTML={{
                      __html: highlightSearchTerm(result.title, debouncedQuery)
                    }}
                  />
                  {result.type === 'block' && result.content && (
                    <div 
                      className="text-xs text-text-tertiary mt-0.5 truncate"
                      dangerouslySetInnerHTML={{
                        __html: highlightSearchTerm(truncateText(result.content, 80), debouncedQuery)
                      }}
                    />
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {result.type === 'page' ? 'página' : 'conteúdo'}
                    </Badge>
                    {result.type === 'block' && result.blockType && (
                      <Badge variant="secondary" className="text-xs">
                        {result.blockType}
                      </Badge>
                    )}
                    {result.rank && result.rank > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        {Math.round(result.rank * 100)}%
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
