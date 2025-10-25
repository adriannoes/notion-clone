import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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

interface TableViewProps {
  pages: PageWithProperties[];
  propertySchema: PropertySchema[];
  onPageSelect?: (pageId: string) => void;
  onAddPage?: () => void;
  className?: string;
}

type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

const DEFAULT_COLUMNS = ['title', 'created_at', 'updated_at'];

export function TableView({ 
  pages, 
  propertySchema, 
  onPageSelect, 
  onAddPage,
  className 
}: TableViewProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'updated_at',
    direction: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_COLUMNS);

  // Get all available columns
  const availableColumns = useMemo(() => {
    const columns = new Set<string>();
    
    // Add default columns
    DEFAULT_COLUMNS.forEach(col => columns.add(col));
    
    // Add property columns
    propertySchema.forEach(prop => {
      columns.add(prop.property_name);
    });
    
    return Array.from(columns);
  }, [propertySchema]);

  // Filter and sort pages
  const filteredAndSortedPages = useMemo(() => {
    let filtered = pages;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(page => 
        page.page_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(page.properties).some(prop => 
          prop && typeof prop === 'object' && 
          JSON.stringify(prop).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [pages, searchTerm, sortConfig]);

  const getSortValue = (page: PageWithProperties, key: string) => {
    if (key === 'title') return page.page_title;
    if (key === 'created_at') return new Date(page.page_created_at).getTime();
    if (key === 'updated_at') return new Date(page.page_updated_at).getTime();
    if (key === 'is_favorite') return page.page_is_favorite ? 1 : 0;
    
    // Property value
    const property = page.properties[key];
    if (!property) return '';
    
    if (property.type === 'number') return property.value || 0;
    if (property.type === 'date') return property.value ? new Date(property.value).getTime() : 0;
    if (property.type === 'checkbox') return property.value ? 1 : 0;
    
    return String(property.value || '').toLowerCase();
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getColumnHeader = (key: string) => {
    switch (key) {
      case 'title': return 'Título';
      case 'created_at': return 'Criado em';
      case 'updated_at': return 'Atualizado em';
      case 'is_favorite': return 'Favorito';
      default: return key;
    }
  };

  const renderCellValue = (page: PageWithProperties, key: string) => {
    if (key === 'title') {
      return (
        <button
          onClick={() => onPageSelect?.(page.page_id)}
          className="text-left hover:underline font-medium text-text-primary"
        >
          {page.page_title}
        </button>
      );
    }
    
    if (key === 'created_at') {
      return format(new Date(page.page_created_at), 'dd/MM/yyyy', { locale: ptBR });
    }
    
    if (key === 'updated_at') {
      return format(new Date(page.page_updated_at), 'dd/MM/yyyy', { locale: ptBR });
    }
    
    if (key === 'is_favorite') {
      return page.page_is_favorite ? '⭐' : '';
    }
    
    // Property value
    const property = page.properties[key];
    if (!property) return '-';
    
    return formatPropertyValue({
      property_type: property.type,
      value: property.value
    } as any);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {availableColumns.map((column) => (
                <DropdownMenuItem
                  key={column}
                  onClick={() => {
                    setVisibleColumns(prev => 
                      prev.includes(column)
                        ? prev.filter(c => c !== column)
                        : [...prev, column]
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(column)}
                      onChange={() => {}}
                    />
                    {getColumnHeader(column)}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {onAddPage && (
          <Button onClick={onAddPage} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Página
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead key={column} className="font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort(column)}
                    className="h-auto p-0 font-medium hover:bg-transparent"
                  >
                    {getColumnHeader(column)}
                    {getSortIcon(column)}
                  </Button>
                </TableHead>
              ))}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedPages.map((page) => (
              <TableRow key={page.page_id} className="hover:bg-hover-bg">
                {visibleColumns.map((column) => (
                  <TableCell key={column} className="py-3">
                    {renderCellValue(page, column)}
                  </TableCell>
                ))}
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredAndSortedPages.length === 0 && (
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
