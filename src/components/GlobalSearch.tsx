import { useState, useEffect, useCallback } from "react";
import { Search, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Page } from "@/components/Sidebar";
import type { Block } from "@/components/Editor";

interface GlobalSearchProps {
  pages: Page[];
  pageData: Record<string, { id: string; title: string; blocks: Block[] }>;
  onPageSelect: (pageId: string) => void;
}

interface SearchResult {
  pageId: string;
  title: string;
  matchType: "title" | "content";
  preview?: string;
}

export function GlobalSearch({ pages, pageData, onPageSelect }: GlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  // Search logic
  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    const searchInPages = (pageList: Page[]) => {
      pageList.forEach(page => {
        const data = pageData[page.id];
        if (!data) return;

        // Search in title
        if (data.title.toLowerCase().includes(lowerQuery)) {
          searchResults.push({
            pageId: page.id,
            title: data.title,
            matchType: "title"
          });
        } else {
          // Search in content
          const contentMatch = data.blocks.find(block => 
            block.content.toLowerCase().includes(lowerQuery)
          );
          
          if (contentMatch) {
            const preview = contentMatch.content.substring(0, 100);
            searchResults.push({
              pageId: page.id,
              title: data.title,
              matchType: "content",
              preview
            });
          }
        }

        if (page.children) {
          searchInPages(page.children);
        }
      });
    };

    searchInPages(pages);
    setResults(searchResults);
    setSelectedIndex(0);
  }, [pages, pageData]);

  useEffect(() => {
    performSearch(query);
  }, [query, performSearch]);

  const handleSelect = (pageId: string) => {
    onPageSelect(pageId);
    setIsOpen(false);
    setQuery("");
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
            {results.length === 0 && query && (
              <div className="py-8 text-center text-text-tertiary text-sm">
                No results found for "{query}"
              </div>
            )}
            
            {results.length === 0 && !query && (
              <div className="py-8 text-center text-text-tertiary text-sm">
                Start typing to search pages...
              </div>
            )}

            {results.map((result, index) => (
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
