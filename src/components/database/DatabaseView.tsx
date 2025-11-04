import { useState } from "react";
import { Table, Kanban, Calendar, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TableView } from "./TableView";
import { KanbanView } from "./KanbanView";
import { CalendarView } from "./CalendarView";
import { useDatabaseViews, usePagesWithProperties, useWorkspacePropertySchema } from "@/hooks/useDatabaseViews";
import type { DatabaseView } from "@/hooks/useDatabaseViews";

interface DatabaseViewProps {
  workspaceId?: string;
  onPageSelect?: (pageId: string) => void;
  onAddPage?: () => void;
  className?: string;
}

const VIEW_ICONS = {
  table: Table,
  kanban: Kanban,
  calendar: Calendar,
};

export function DatabaseViewComponent({ 
  workspaceId, 
  onPageSelect, 
  onAddPage,
  className 
}: DatabaseViewProps) {
  const [activeView, setActiveView] = useState<string>('table');
  
  const { data: views = [], isLoading: viewsLoading } = useDatabaseViews(workspaceId);
  const { data: pages = [], isLoading: pagesLoading } = usePagesWithProperties(workspaceId);
  const { data: propertySchema = [] } = useWorkspacePropertySchema(workspaceId);

  const currentView = views.find(v => v.id === activeView) || views[0];

  if (viewsLoading || pagesLoading) {
    return (
      <div className={cn("p-6", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (views.length === 0) {
    return (
      <div className={cn("p-6 text-center", className)}>
        <Table className="h-12 w-12 mx-auto text-text-placeholder mb-4" />
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Nenhuma visualização ainda
        </h3>
        <p className="text-text-secondary mb-4">
          Crie uma visualização para organizar suas páginas
        </p>
        <Button onClick={onAddPage}>
          <Plus className="h-4 w-4 mr-2" />
          Criar primeira página
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* View Tabs */}
      <div className="flex items-center justify-between">
        <Tabs value={activeView} onValueChange={setActiveView}>
          <TabsList>
            {views.map((view) => {
              const Icon = VIEW_ICONS[view.view_type];
              return (
                <TabsTrigger key={view.id} value={view.id} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {view.name}
                  {view.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      Padrão
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Configurar
          </Button>
          {onAddPage && (
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Página
            </Button>
          )}
        </div>
      </div>

      {/* View Content */}
      <div className="border rounded-lg">
        {currentView?.view_type === 'table' && (
          <TableView
            pages={pages}
            propertySchema={propertySchema}
            onPageSelect={onPageSelect}
            onAddPage={onAddPage}
            className="p-4"
          />
        )}
        
        {currentView?.view_type === 'kanban' && (
          <KanbanView
            pages={pages}
            propertySchema={propertySchema}
            onPageSelect={onPageSelect}
            onAddPage={onAddPage}
            className="p-4"
          />
        )}
        
        {currentView?.view_type === 'calendar' && (
          <CalendarView
            pages={pages}
            propertySchema={propertySchema}
            onPageSelect={onPageSelect}
            onAddPage={onAddPage}
            className="p-4"
          />
        )}
      </div>
    </div>
  );
}
