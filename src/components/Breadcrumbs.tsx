import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Page } from "@/components/Sidebar";

interface BreadcrumbsProps {
  currentPageId: string;
  pages: Page[];
  onPageSelect: (pageId: string) => void;
}

export function Breadcrumbs({ currentPageId, pages, onPageSelect }: BreadcrumbsProps) {
  const findPagePath = (pageId: string, pageList: Page[], path: Page[] = []): Page[] | null => {
    for (const page of pageList) {
      if (page.id === pageId) {
        return [...path, page];
      }
      if (page.children) {
        const childPath = findPagePath(pageId, page.children, [...path, page]);
        if (childPath) return childPath;
      }
    }
    return null;
  };

  const path = findPagePath(currentPageId, pages);

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
