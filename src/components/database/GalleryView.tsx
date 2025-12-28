import { useState, useMemo } from "react";
import { Plus, MoreHorizontal, Image as ImageIcon, Grid3x3, List } from "lucide-react";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPropertyValue } from "@/types/properties";
import type { PageWithProperties, PropertySchema } from "@/hooks/useDatabaseViews";

interface GalleryViewProps {
  pages: PageWithProperties[];
  propertySchema: PropertySchema[];
  onPageSelect?: (pageId: string) => void;
  onAddPage?: () => void;
  className?: string;
}

type ViewMode = 'grid' | 'list';

export function GalleryView({ 
  pages, 
  propertySchema, 
  onPageSelect, 
  onAddPage,
  className 
}: GalleryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [cardSize, setCardSize] = useState<'sm' | 'md' | 'lg'>('md');

  // Filter pages by search
  const filteredPages = useMemo(() => {
    if (!searchTerm) return pages;
    
    return pages.filter(page =>
      page.page_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      Object.values(page.properties).some(prop =>
        prop && typeof prop === 'object' &&
        JSON.stringify(prop).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [pages, searchTerm]);

  // Get primary property for card display
  const primaryProperty = propertySchema.find(p => 
    p.property_type === 'text' || p.property_type === 'select'
  );

  const getCardSizeClasses = () => {
    switch (cardSize) {
      case 'sm':
        return 'w-48 h-48';
      case 'md':
        return 'w-64 h-64';
      case 'lg':
        return 'w-80 h-80';
    }
  };

  const renderCard = (page: PageWithProperties) => {
    const primaryValue = primaryProperty 
      ? page.properties[primaryProperty.property_name]
      : null;

    return (
      <div
        key={page.page_id}
        onClick={() => onPageSelect?.(page.page_id)}
        className={cn(
          "bg-background border border-border rounded-lg p-4 cursor-pointer",
          "hover:shadow-lg hover:border-primary/50 transition-all",
          "flex flex-col",
          viewMode === 'grid' ? getCardSizeClasses() : "w-full h-auto"
        )}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-text-primary text-sm line-clamp-2 flex-1">
            {page.page_title}
          </h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPageSelect?.(page.page_id)}>
                Abrir
              </DropdownMenuItem>
              <DropdownMenuItem>
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Card Content */}
        <div className="flex-1 flex flex-col gap-2">
          {primaryValue && (
            <div className="text-xs text-text-secondary">
              {formatPropertyValue({
                property_type: primaryValue.type,
                value: primaryValue.value
              } as any)}
            </div>
          )}

          {/* Properties Preview */}
          <div className="flex flex-wrap gap-1 mt-auto">
            {Object.entries(page.properties)
              .slice(0, 3)
              .map(([key, prop]: [string, any]) => (
                prop && prop.value && (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {typeof prop.value === 'object' ? JSON.stringify(prop.value) : String(prop.value).slice(0, 10)}
                  </Badge>
                )
              ))}
          </div>

          {/* Date Info */}
          <div className="text-xs text-text-tertiary mt-auto pt-2 border-t border-border">
            {format(new Date(page.page_updated_at), 'dd/MM/yyyy', { locale: ptBR })}
          </div>
        </div>
      </div>
    );
  };

  const renderListItem = (page: PageWithProperties) => {
    return (
      <div
        key={page.page_id}
        onClick={() => onPageSelect?.(page.page_id)}
        className={cn(
          "bg-background border border-border rounded-lg p-4 cursor-pointer",
          "hover:shadow-md hover:border-primary/50 transition-all",
          "flex items-center gap-4"
        )}
      >
        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
          <ImageIcon className="h-6 w-6 text-text-tertiary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-text-primary mb-1">
            {page.page_title}
          </h4>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.entries(page.properties)
              .slice(0, 3)
              .map(([key, prop]: [string, any]) => (
                prop && prop.value && (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {typeof prop.value === 'object' ? JSON.stringify(prop.value) : String(prop.value).slice(0, 15)}
                  </Badge>
                )
              ))}
          </div>
        </div>

        <div className="text-xs text-text-tertiary flex-shrink-0">
          {format(new Date(page.page_updated_at), 'dd/MM/yyyy', { locale: ptBR })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPageSelect?.(page.page_id)}>
              Abrir
            </DropdownMenuItem>
            <DropdownMenuItem>
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Input
            placeholder="Buscar páginas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          
          {/* View Mode Toggle */}
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none border-l"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Card Size (only in grid mode) */}
          {viewMode === 'grid' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Tamanho: {cardSize === 'sm' ? 'Pequeno' : cardSize === 'md' ? 'Médio' : 'Grande'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setCardSize('sm')}>
                  Pequeno
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCardSize('md')}>
                  Médio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCardSize('lg')}>
                  Grande
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        {onAddPage && (
          <Button onClick={onAddPage} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Página
          </Button>
        )}
      </div>

      {/* Gallery Content */}
      {filteredPages.length === 0 ? (
        <div className="text-center py-8">
          <ImageIcon className="h-12 w-12 mx-auto text-text-placeholder mb-4" />
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
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-2"
          )}
        >
          {filteredPages.map(page =>
            viewMode === 'grid' ? renderCard(page) : renderListItem(page)
          )}
        </div>
      )}
    </div>
  );
}
