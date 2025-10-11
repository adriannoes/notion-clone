import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  page_id: string;
  type: string;
  content: string;
  metadata: any;
  page_title: string;
  rank: number;
}

export interface PageSearchResult {
  id: string;
  title: string;
  rank: number;
}

export interface SearchSuggestion {
  suggestion: string;
  type: string;
  count: number;
}

export function useSearchBlocks(
  query: string,
  workspaceId?: string,
  blockType?: string,
  limit: number = 20
) {
  return useQuery({
    queryKey: ['search-blocks', query, workspaceId, blockType, limit],
    queryFn: async () => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .rpc('search_blocks_advanced', {
          search_query: query,
          workspace_filter: workspaceId,
          block_type_filter: blockType,
          limit_count: limit,
        });

      if (error) throw error;
      return data as SearchResult[];
    },
    enabled: !!query.trim(),
  });
}

export function useSearchPages(
  query: string,
  workspaceId?: string,
  limit: number = 20
) {
  return useQuery({
    queryKey: ['search-pages', query, workspaceId, limit],
    queryFn: async () => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .rpc('search_pages_by_title', {
          search_query: query,
          workspace_filter: workspaceId,
          limit_count: limit,
        });

      if (error) throw error;
      return data as PageSearchResult[];
    },
    enabled: !!query.trim(),
  });
}

export function useSearchSuggestions(
  query: string,
  workspaceId?: string,
  limit: number = 5
) {
  return useQuery({
    queryKey: ['search-suggestions', query, workspaceId, limit],
    queryFn: async () => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .rpc('get_search_suggestions', {
          search_query: query,
          workspace_filter: workspaceId,
          limit_count: limit,
        });

      if (error) throw error;
      return data as SearchSuggestion[];
    },
    enabled: !!query.trim(),
  });
}

// Hook for combined search (pages + blocks)
export function useCombinedSearch(
  query: string,
  workspaceId?: string,
  blockType?: string,
  limit: number = 20
) {
  const pageSearch = useSearchPages(query, workspaceId, Math.floor(limit / 2));
  const blockSearch = useSearchBlocks(query, workspaceId, blockType, Math.floor(limit / 2));

  return {
    pages: pageSearch.data || [],
    blocks: blockSearch.data || [],
    isLoading: pageSearch.isLoading || blockSearch.isLoading,
    error: pageSearch.error || blockSearch.error,
    isError: pageSearch.isError || blockSearch.isError,
  };
}

// Helper function to highlight search terms in text
export function highlightSearchTerm(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Helper function to truncate text for preview
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
