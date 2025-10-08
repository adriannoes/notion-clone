import { useMemo } from 'react';
import type { Page } from '@/hooks/usePages';

export interface PageNode {
  id: string;
  title: string;
  parent_id: string | null;
  position: number;
  is_favorite: boolean;
  icon: string | null;
  level: number;
  children: PageNode[];
}

/**
 * Transform flat list of pages into hierarchical tree structure
 */
export function usePageHierarchy(
  pages: Page[],
  expandedPageIds: Set<string>
): PageNode[] {
  return useMemo(() => {
    // Create a map for quick lookup
    const pageMap = new Map<string, PageNode>();
    
    // Initialize all pages as nodes
    pages.forEach(page => {
      pageMap.set(page.id, {
        id: page.id,
        title: page.title,
        parent_id: page.parent_id,
        position: page.position,
        is_favorite: page.is_favorite || false,
        icon: page.icon,
        level: 0,
        children: [],
      });
    });

    // Build the tree structure
    const rootNodes: PageNode[] = [];
    
    pages.forEach(page => {
      const node = pageMap.get(page.id)!;
      
      if (page.parent_id && pageMap.has(page.parent_id)) {
        // Add to parent's children
        const parent = pageMap.get(page.parent_id)!;
        parent.children.push(node);
        node.level = parent.level + 1;
      } else {
        // Root level page
        rootNodes.push(node);
      }
    });

    // Sort children by position
    const sortChildren = (nodes: PageNode[]) => {
      nodes.sort((a, b) => a.position - b.position);
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };
    
    sortChildren(rootNodes);

    // Flatten tree respecting expansion state
    const flattenTree = (nodes: PageNode[]): PageNode[] => {
      const result: PageNode[] = [];
      
      nodes.forEach(node => {
        result.push(node);
        
        // Only include children if node is expanded
        if (node.children.length > 0 && expandedPageIds.has(node.id)) {
          result.push(...flattenTree(node.children));
        }
      });
      
      return result;
    };

    return flattenTree(rootNodes);
  }, [pages, expandedPageIds]);
}
