import { useState, useMemo } from "react";
import { Plus, MoreHorizontal, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageWithProperties } from "@/hooks/useDatabaseViews";

interface KanbanViewProps {
  pages: PageWithProperties[];
  propertySchema: any[];
  onPageSelect?: (pageId: string) => void;
  onAddPage?: () => void;
  className?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  pages: PageWithProperties[];
}

function KanbanCard({ page, onSelect }: { page: PageWithProperties; onSelect?: (id: string) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.page_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onSelect?.(page.page_id)}
      className={cn(
        "bg-background border border-border rounded-lg p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow",
        isDragging && "ring-2 ring-primary"
      )}
    >
      <h4 className="font-medium text-text-primary mb-1">{page.page_title}</h4>
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.entries(page.properties).slice(0, 3).map(([key, prop]: [string, any]) => (
          prop && (
            <Badge key={key} variant="secondary" className="text-xs">
              {key}: {prop.value || '-'}
            </Badge>
          )
        ))}
      </div>
    </div>
  );
}

function KanbanColumnComponent({ 
  column, 
  onPageSelect, 
  onAddPage 
}: { 
  column: KanbanColumn; 
  onPageSelect?: (pageId: string) => void;
  onAddPage?: () => void;
}) {
  return (
    <div
      className="flex-1 min-w-[280px] bg-muted/30 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text-primary">{column.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {column.pages.length}
          </Badge>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              Configurar coluna
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SortableContext items={column.pages.map(p => p.page_id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[200px]">
          {column.pages.map((page) => (
            <KanbanCard key={page.page_id} page={page} onSelect={onPageSelect} />
          ))}
        </div>
      </SortableContext>

      <Button
        variant="ghost"
        size="sm"
        onClick={onAddPage}
        className="w-full mt-2 text-text-secondary hover:text-text-primary"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar página
      </Button>
    </div>
  );
}

export function KanbanView({ 
  pages, 
  propertySchema, 
  onPageSelect, 
  onAddPage,
  className 
}: KanbanViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [columns, setColumns] = useState<KanbanColumn[]>([
    { id: 'todo', title: 'To Do', pages: [] },
    { id: 'in-progress', title: 'In Progress', pages: [] },
    { id: 'done', title: 'Done', pages: [] },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Find status property or use default columns
  const statusProperty = propertySchema.find(p => 
    p.property_type === 'select' || p.property_name.toLowerCase().includes('status')
  );

  // Group pages by status
  const groupedPages = useMemo(() => {
    const grouped: Record<string, PageWithProperties[]> = {};
    
    pages.forEach(page => {
      let status = 'todo';
      
      if (statusProperty) {
        const statusValue = page.properties[statusProperty.property_name];
        if (statusValue && typeof statusValue === 'object' && statusValue.value) {
          status = String(statusValue.value).toLowerCase().replace(/\s+/g, '-');
        }
      }
      
      // Map common status values to column IDs
      if (status.includes('todo') || status.includes('pendente') || status.includes('backlog')) {
        status = 'todo';
      } else if (status.includes('progress') || status.includes('andamento') || status.includes('doing')) {
        status = 'in-progress';
      } else if (status.includes('done') || status.includes('concluído') || status.includes('finalizado')) {
        status = 'done';
      } else {
        status = 'todo';
      }
      
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(page);
    });
    
    return grouped;
  }, [pages, statusProperty]);

  // Update columns with grouped pages
  useMemo(() => {
    setColumns(prev => prev.map(col => ({
      ...col,
      pages: groupedPages[col.id] || [],
    })));
  }, [groupedPages]);

  // Filter pages by search
  const filteredColumns = useMemo(() => {
    if (!searchTerm) return columns;
    
    return columns.map(col => ({
      ...col,
      pages: col.pages.filter(page =>
        page.page_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(page.properties).some(prop =>
          prop && typeof prop === 'object' &&
          JSON.stringify(prop).toLowerCase().includes(searchTerm.toLowerCase())
        )
      ),
    }));
  }, [columns, searchTerm]);

  const handleDragStart = (event: DragStartEvent) => {
    // Could add visual feedback here
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over logic
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find which column the page is being moved to
    const targetColumn = filteredColumns.find(col => 
      col.id === overId || col.pages.some(p => p.page_id === overId)
    );
    
    if (!targetColumn) return;
    
    // Find source column
    const sourceColumn = filteredColumns.find(col => 
      col.pages.some(p => p.page_id === activeId)
    );
    
    if (!sourceColumn || sourceColumn.id === targetColumn.id) return;
    
    // Move page to new column
    setColumns(prev => prev.map(col => {
      if (col.id === sourceColumn.id) {
        return {
          ...col,
          pages: col.pages.filter(p => p.page_id !== activeId),
        };
      }
      if (col.id === targetColumn.id) {
        const page = sourceColumn.pages.find(p => p.page_id === activeId);
        if (page) {
          return {
            ...col,
            pages: [...col.pages, page],
          };
        }
      }
      return col;
    }));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Buscar páginas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-64"
        />
        {onAddPage && (
          <Button onClick={onAddPage} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Página
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {filteredColumns.map((column) => (
            <KanbanColumnComponent
              key={column.id}
              column={column}
              onPageSelect={onPageSelect}
              onAddPage={onAddPage}
            />
          ))}
        </div>
      </DndContext>

      {filteredColumns.every(col => col.pages.length === 0) && (
        <div className="text-center py-8">
          <p className="text-text-secondary">
            {searchTerm ? 'Nenhuma página encontrada' : 'Nenhuma página ainda'}
          </p>
          {!searchTerm && onAddPage && (
            <Button onClick={onAddPage} variant="outline" className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira página
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

