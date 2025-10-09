import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, FileText, Trash2, Edit2, Star, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface Page {
  id: string;
  title: string;
  isExpanded?: boolean;
  isFavorite?: boolean;
  level?: number;
  hasChildren?: boolean;
  parent_id?: string | null;
}

interface SidebarProps {
  pages: Page[];
  currentPageId?: string;
  onPageSelect: (page: Page) => void;
  onPageCreate: (parentId?: string) => void;
  onPageDelete: (pageId: string) => void;
  onPageRename: (pageId: string, newTitle: string) => void;
  onPageReorder: (pages: Page[]) => void;
  onToggleFavorite: (pageId: string) => void;
  onUpdatePageParent: (pageId: string, newParentId: string | null) => void;
  expandedPageIds: Set<string>;
  onToggleExpand: (pageId: string) => void;
  allPages: any[];
}

interface SortablePageItemProps {
  page: Page;
  currentPageId?: string;
  editingPageId: string | null;
  editTitle: string;
  onPageSelect: (page: Page) => void;
  onStartEdit: (page: Page) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  setEditTitle: (title: string) => void;
  onPageCreate: (parentId?: string) => void;
  onPageDelete: (pageId: string) => void;
  onToggleFavorite: (pageId: string) => void;
  onToggleExpand: (pageId: string) => void;
  dropZone: { targetId: string; position: 'over' | 'above' | 'below' } | null;
  isInvalidTarget: boolean;
}

function SortablePageItem({
  page,
  currentPageId,
  editingPageId,
  editTitle,
  onPageSelect,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  setEditTitle,
  onPageCreate,
  onPageDelete,
  onToggleFavorite,
  onToggleExpand,
  dropZone,
  isInvalidTarget,
}: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isInvalidTarget && isDragging ? 'not-allowed' : undefined,
  };

  const level = page.level || 0;
  const showDropIndicator = dropZone?.targetId === page.id;
  const dropPosition = dropZone?.position;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {showDropIndicator && dropPosition === 'above' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-10" />
      )}
      {showDropIndicator && dropPosition === 'below' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-10" />
      )}
      {showDropIndicator && dropPosition === 'over' && (
        <div className="absolute inset-0 border-2 border-primary rounded-md opacity-50 pointer-events-none" />
      )}
      
      <div
        className={cn(
          "group flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors duration-150",
          "hover:bg-hover-bg",
          currentPageId === page.id && "bg-block-selected",
          isInvalidTarget && isDragging && "opacity-30"
        )}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3 w-3 text-text-tertiary opacity-0 group-hover:opacity-100" />
        </div>

        {page.hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(page.id);
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
            onBlur={onSaveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
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
            className={cn(
              "h-6 w-6 p-0",
              page.isFavorite ? "text-yellow-500" : "hover:bg-hover-bg"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(page.id);
            }}
          >
            <Star className={cn("h-3 w-3", page.isFavorite && "fill-current")} />
          </Button>
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
              onStartEdit(page);
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
    </div>
  );
}

export function Sidebar({ 
  pages, 
  currentPageId, 
  onPageSelect, 
  onPageCreate, 
  onPageDelete, 
  onPageRename,
  onPageReorder,
  onToggleFavorite,
  onUpdatePageParent,
  expandedPageIds,
  onToggleExpand,
  allPages,
}: SidebarProps) {
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [dropZone, setDropZone] = useState<{ targetId: string; position: 'over' | 'above' | 'below' } | null>(null);
  const [invalidDropTargets, setInvalidDropTargets] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  // Helper to get all descendants of a page
  const getAllDescendants = (pageId: string): string[] => {
    const children = allPages.filter(p => p.parent_id === pageId);
    return children.flatMap(child => [
      child.id,
      ...getAllDescendants(child.id)
    ]);
  };

  // Helper to check if a page is descendant of another
  const isDescendant = (pageId: string, potentialAncestorId: string): boolean => {
    const page = allPages.find(p => p.id === pageId);
    if (!page || !page.parent_id) return false;
    if (page.parent_id === potentialAncestorId) return true;
    return isDescendant(page.parent_id, potentialAncestorId);
  };

  // Custom collision detection
  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    
    return rectIntersection(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const draggedId = event.active.id as string;
    const descendants = getAllDescendants(draggedId);
    setInvalidDropTargets(new Set([draggedId, ...descendants]));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over || !active) {
      setDropZone(null);
      return;
    }

    const overId = over.id as string;
    const overElement = over.rect;
    
    if (!overElement) {
      setDropZone(null);
      return;
    }

    // Calculate drop position based on cursor Y position
    const pointerY = event.delta.y + overElement.top + overElement.height / 2;
    const relativeY = pointerY - overElement.top;
    const height = overElement.height;
    
    let position: 'above' | 'over' | 'below';
    
    // Top 30% = above, bottom 30% = below, middle 40% = over (make child)
    if (relativeY < height * 0.3) {
      position = 'above';
    } else if (relativeY > height * 0.7) {
      position = 'below';
    } else {
      position = 'over';
    }
    
    setDropZone({ targetId: overId, position });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDropZone(null);
    setInvalidDropTargets(new Set());
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const draggedPage = allPages.find(p => p.id === active.id);
    const targetPage = allPages.find(p => p.id === over.id);
    
    if (!draggedPage || !targetPage) return;

    // Check if trying to make a page child of its own descendant (prevent cycles)
    const isDescendant = (pageId: string, potentialAncestorId: string): boolean => {
      const page = allPages.find(p => p.id === pageId);
      if (!page || !page.parent_id) return false;
      if (page.parent_id === potentialAncestorId) return true;
      return isDescendant(page.parent_id, potentialAncestorId);
    };

    if (isDescendant(targetPage.id, draggedPage.id)) {
      return; // Prevent cycle
    }

    // Simple reordering within same level for now
    const oldIndex = pages.findIndex((page) => page.id === active.id);
    const newIndex = pages.findIndex((page) => page.id === over.id);

    onPageReorder(arrayMove(pages, oldIndex, newIndex));
  };

  const favoritePages = pages.filter(p => p.isFavorite);
  const regularPages = pages.filter(p => !p.isFavorite);

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
        {pages.length === 0 ? (
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
        ) : (
          <div className="space-y-4">
            {favoritePages.length > 0 && (
              <div>
                <div className="text-xs font-medium text-text-tertiary px-2 mb-2">
                  FAVORITES
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={customCollisionDetection}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={favoritePages.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {favoritePages.map((page) => (
                        <SortablePageItem
                          key={page.id}
                          page={page}
                          currentPageId={currentPageId}
                          editingPageId={editingPageId}
                          editTitle={editTitle}
                          onPageSelect={onPageSelect}
                          onStartEdit={handleStartEdit}
                          onSaveEdit={handleSaveEdit}
                          onCancelEdit={handleCancelEdit}
                          setEditTitle={setEditTitle}
                          onPageCreate={onPageCreate}
                          onPageDelete={onPageDelete}
                          onToggleFavorite={onToggleFavorite}
                          onToggleExpand={onToggleExpand}
                          dropZone={dropZone}
                          isInvalidTarget={invalidDropTargets.has(page.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {regularPages.length > 0 && (
              <div>
                <div className="text-xs font-medium text-text-tertiary px-2 mb-2">
                  PAGES
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={customCollisionDetection}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={regularPages.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1">
                      {regularPages.map((page) => (
                        <SortablePageItem
                          key={page.id}
                          page={page}
                          currentPageId={currentPageId}
                          editingPageId={editingPageId}
                          editTitle={editTitle}
                          onPageSelect={onPageSelect}
                          onStartEdit={handleStartEdit}
                          onSaveEdit={handleSaveEdit}
                          onCancelEdit={handleCancelEdit}
                          setEditTitle={setEditTitle}
                          onPageCreate={onPageCreate}
                          onPageDelete={onPageDelete}
                          onToggleFavorite={onToggleFavorite}
                          onToggleExpand={onToggleExpand}
                          dropZone={dropZone}
                          isInvalidTarget={invalidDropTargets.has(page.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}