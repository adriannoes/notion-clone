import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, FileText, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface Page {
  id: string;
  title: string;
  children?: Page[];
  isExpanded?: boolean;
}

interface SidebarProps {
  pages: Page[];
  currentPageId?: string;
  onPageSelect: (page: Page) => void;
  onPageCreate: (parentId?: string) => void;
  onPageDelete: (pageId: string) => void;
  onPageRename: (pageId: string, newTitle: string) => void;
}

export function Sidebar({ 
  pages, 
  currentPageId, 
  onPageSelect, 
  onPageCreate, 
  onPageDelete, 
  onPageRename 
}: SidebarProps) {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleStartEdit = (page: Page) => {
    setEditingPageId(page.id);
    setEditTitle(page.title);
  };

  const handleSaveEdit = () => {
    if (editingPageId && editTitle.trim()) {
      onPageRename(editingPageId, editTitle.trim());
    }
    setEditingPageId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingPageId(null);
    setEditTitle("");
  };

  const renderPageTree = (pageList: Page[], level = 0) => {
    return pageList.map((page) => (
      <div key={page.id} className="select-none">
        <div
          className={cn(
            "group flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors duration-150",
            "hover:bg-hover-bg",
            currentPageId === page.id && "bg-block-selected",
            level > 0 && "ml-4"
          )}
          style={{ paddingLeft: `${8 + level * 16}px` }}
        >
          {page.children && page.children.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                // Toggle expansion logic would go here
              }}
            >
              {page.isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          ) : (
            <div className="w-4" />
          )}
          
          <FileText className="h-4 w-4 text-text-tertiary flex-shrink-0" />
          
          {editingPageId === page.id ? (
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") handleCancelEdit();
              }}
              className="h-6 text-sm border-none shadow-none p-0 bg-transparent focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <span
              className="text-sm text-text-primary truncate flex-1 min-w-0"
              onClick={() => onPageSelect(page)}
            >
              {page.title}
            </span>
          )}
          
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-hover-bg"
              onClick={(e) => {
                e.stopPropagation();
                onPageCreate(page.id);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-hover-bg"
              onClick={(e) => {
                e.stopPropagation();
                handleStartEdit(page);
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-hover-bg text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onPageDelete(page.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {page.children && page.isExpanded && (
          <div className="ml-2">
            {renderPageTree(page.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="w-64 h-screen bg-sidebar-bg border-r border-border-light flex flex-col">
      <div className="p-4 border-b border-border-light">
        <div className="flex items-center justify-between">
          <h1 className="font-semibold text-lg text-text-primary">Notion Clone</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onPageCreate()}
            className="h-8 w-8 p-0 hover:bg-hover-bg"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {renderPageTree(pages)}
        </div>
        
        {pages.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-text-tertiary text-sm mb-3">No pages yet</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageCreate()}
              className="text-text-secondary border-border"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first page
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}