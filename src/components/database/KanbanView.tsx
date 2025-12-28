import { useState, useMemo, useEffect } from "react";
import { Plus, MoreHorizontal, Settings, Edit2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useSetPageProperty } from "@/hooks/usePageProperties";
import { useToast } from "@/hooks/use-toast";
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
  workspaceId?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  pages: PageWithProperties[];
  color?: string;
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
  onAddPage,
  onEditColumn,
  onDeleteColumn,
  canEdit
}: { 
  column: KanbanColumn; 
  onPageSelect?: (pageId: string) => void;
  onAddPage?: () => void;
  onEditColumn?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  canEdit?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex-1 min-w-[280px] rounded-lg p-4",
        column.color ? `bg-${column.color}/10 border border-${column.color}/20` : "bg-muted/30"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text-primary">{column.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {column.pages.length}
          </Badge>
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditColumn?.(column.id)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar coluna
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDeleteColumn?.(column.id)}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir coluna
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <SortableContext items={column.pages.map(p => p.page_id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[200px]">
          {column.pages.map((page) => (
            <KanbanCard key={page.page_id} page={page} onSelect={onPageSelect} />
          ))}
        </div>
      </SortableContext>

      {onAddPage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddPage}
          className="w-full mt-2 text-text-secondary hover:text-text-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar página
        </Button>
      )}
    </div>
  );
}

export function KanbanView({ 
  pages, 
  propertySchema, 
  onPageSelect, 
  onAddPage,
  className,
  workspaceId
}: KanbanViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [columns, setColumns] = useState<KanbanColumn[]>([
    { id: 'todo', title: 'To Do', pages: [] },
    { id: 'in-progress', title: 'In Progress', pages: [] },
    { id: 'done', title: 'Done', pages: [] },
  ]);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const { toast } = useToast();
  const setPageProperty = useSetPageProperty();

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

  // Get unique values from status property to create columns dynamically
  useEffect(() => {
    if (statusProperty && pages.length > 0) {
      const uniqueValues = new Set<string>();
      pages.forEach(page => {
        const statusValue = page.properties[statusProperty.property_name];
        if (statusValue && typeof statusValue === 'object' && statusValue.value) {
          uniqueValues.add(String(statusValue.value));
        }
      });

      // Create columns from unique values if we have a status property
      if (uniqueValues.size > 0) {
        const dynamicColumns: KanbanColumn[] = Array.from(uniqueValues).map(value => ({
          id: value.toLowerCase().replace(/\s+/g, '-'),
          title: value,
          pages: []
        }));
        setColumns(dynamicColumns);
      }
    }
  }, [statusProperty, pages]);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    
    // Find which column the page is being moved to
    const targetColumn = filteredColumns.find(col => {
      // Check if dropped on column itself or on a card in the column
      if (col.id === over.id) return true;
      return col.pages.some(p => p.page_id === over.id);
    });
    
    if (!targetColumn) return;
    
    // Find source column
    const sourceColumn = filteredColumns.find(col => 
      col.pages.some(p => p.page_id === activeId)
    );
    
    if (!sourceColumn || sourceColumn.id === targetColumn.id) return;
    
    // Update page property if status property exists
    if (statusProperty && workspaceId) {
      try {
        const page = sourceColumn.pages.find(p => p.page_id === activeId);
        if (page) {
          await setPageProperty.mutateAsync({
            pageId: activeId,
            propertyName: statusProperty.property_name,
            propertyType: statusProperty.property_type,
            value: { select: targetColumn.title }
          });
          
          toast({
            title: "Página movida",
            description: `Movida para "${targetColumn.title}"`,
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Erro ao mover página",
          description: "Não foi possível atualizar a propriedade.",
        });
      }
    }
    
    // Optimistically update UI
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

  const handleAddColumn = () => {
    const newId = `column-${Date.now()}`;
    setColumns(prev => [...prev, { id: newId, title: 'Nova Coluna', pages: [] }]);
    setEditingColumn(newId);
    setNewColumnTitle('Nova Coluna');
  };

  const handleEditColumn = (columnId: string) => {
    const column = columns.find(c => c.id === columnId);
    if (column) {
      setEditingColumn(columnId);
      setNewColumnTitle(column.title);
    }
  };

  const handleSaveColumn = () => {
    if (!editingColumn || !newColumnTitle.trim()) return;
    
    setColumns(prev => prev.map(col => 
      col.id === editingColumn 
        ? { ...col, title: newColumnTitle.trim() }
        : col
    ));
    setEditingColumn(null);
    setNewColumnTitle('');
  };

  const handleDeleteColumn = (columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar páginas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddColumn}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Coluna
          </Button>
        </div>
        {onAddPage && (
          <Button onClick={onAddPage} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Página
          </Button>
        )}
      </div>

      {/* Edit Column Dialog */}
      <Dialog open={!!editingColumn} onOpenChange={(open) => !open && setEditingColumn(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Coluna</DialogTitle>
            <DialogDescription>
              Altere o nome da coluna
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="column-title">Nome da Coluna</Label>
              <Input
                id="column-title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Nome da coluna..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveColumn();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingColumn(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveColumn}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              onEditColumn={handleEditColumn}
              onDeleteColumn={handleDeleteColumn}
              canEdit={!!workspaceId}
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

