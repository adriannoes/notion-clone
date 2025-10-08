import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Page } from "@/components/Sidebar";

interface BreadcrumbsProps {
  currentPageId: string;
  pages: Page[];
  onPageSelect: (pageId: string) => void;
}

export function Breadcrumbs({ currentPageId, pages, onPageSelect }: BreadcrumbsProps) {
  const findPagePath = (pageId: string): Page[] => {
    const path: Page[] = [];
    let currentPage = pages.find(p => p.id === pageId);
    
    while (currentPage) {
      path.unshift(currentPage);
      if (currentPage.parent_id) {
        currentPage = pages.find(p => p.id === currentPage!.parent_id);
      } else {
        currentPage = undefined;
      }
    }
    
    return path;
  };

  const path = findPagePath(currentPageId);

  if (!path || path.length === 0) return null;

  return (
    <div className="flex items-center gap-1 text-sm text-text-tertiary mb-4">
      {path.map((page, index) => (
        <div key={page.id} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3" />}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageSelect(page.id)}
            className="h-6 px-2 text-text-tertiary hover:text-text-primary hover:bg-hover-bg"
          >
            {page.title}
          </Button>
        </div>
      ))}
    </div>
  );
}
