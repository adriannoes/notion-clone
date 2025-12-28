import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Plus, Settings, Filter, X } from "lucide-react";
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type FilterConfig = {
  property: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'is_empty' | 'is_not_empty';
  value: string | number | boolean | null;
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
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [groupBy, setGroupBy] = useState<string | null>(null);

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

    // Apply property filters
    filters.forEach(filter => {
      filtered = filtered.filter(page => {
        const property = page.properties[filter.property];
        if (!property) {
          return filter.operator === 'is_empty';
        }

        const propValue = property.value;
        const propType = property.type;

        switch (filter.operator) {
          case 'equals':
            return String(propValue).toLowerCase() === String(filter.value).toLowerCase();
          case 'contains':
            return String(propValue).toLowerCase().includes(String(filter.value).toLowerCase());
          case 'greater':
            if (propType === 'number' || propType === 'date') {
              return Number(propValue) > Number(filter.value);
            }
            return false;
          case 'less':
            if (propType === 'number' || propType === 'date') {
              return Number(propValue) < Number(filter.value);
            }
            return false;
          case 'is_empty':
            return !propValue || propValue === '';
          case 'is_not_empty':
            return propValue && propValue !== '';
          default:
            return true;
        }
      });
    });

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply grouping if enabled
    if (groupBy) {
      const grouped: Record<string, typeof filtered> = {};
      filtered.forEach(page => {
        const groupKey = page.properties[groupBy]?.value 
          ? String(page.properties[groupBy].value) 
          : 'Sem grupo';
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(page);
      });
      
      // Sort groups and return flattened with group headers
      const sortedGroups = Object.keys(grouped).sort();
      return sortedGroups.flatMap(groupKey => [
        { isGroupHeader: true, groupKey } as any,
        ...grouped[groupKey]
      ]);
    }

    return filtered;
  }, [pages, searchTerm, sortConfig, filters, groupBy]);

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
        <div className="flex items-center gap-4 flex-wrap">
          <Input
            placeholder="Buscar páginas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          
          {/* Filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {filters.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Filtros</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters([])}
                    className="h-6 px-2"
                  >
                    Limpar
                  </Button>
                </div>
                
                {filters.map((filter, index) => (
                  <div key={index} className="space-y-2 p-2 border rounded">
                    <div className="flex items-center justify-between">
                      <Select
                        value={filter.property}
                        onValueChange={(value) => {
                          const newFilters = [...filters];
                          newFilters[index].property = value;
                          setFilters(newFilters);
                        }}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {propertySchema.map(prop => (
                            <SelectItem key={prop.property_name} value={prop.property_name}>
                              {prop.property_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters(filters.filter((_, i) => i !== index))}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Select
                      value={filter.operator}
                      onValueChange={(value: FilterConfig['operator']) => {
                        const newFilters = [...filters];
                        newFilters[index].operator = value;
                        setFilters(newFilters);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Igual a</SelectItem>
                        <SelectItem value="contains">Contém</SelectItem>
                        <SelectItem value="greater">Maior que</SelectItem>
                        <SelectItem value="less">Menor que</SelectItem>
                        <SelectItem value="is_empty">Está vazio</SelectItem>
                        <SelectItem value="is_not_empty">Não está vazio</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                      <Input
                        value={filter.value as string}
                        onChange={(e) => {
                          const newFilters = [...filters];
                          newFilters[index].value = e.target.value;
                          setFilters(newFilters);
                        }}
                        placeholder="Valor..."
                        className="h-8"
                      />
                    )}
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters([...filters, { property: propertySchema[0]?.property_name || '', operator: 'equals', value: '' }])}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar filtro
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Group By */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Agrupar
                {groupBy && (
                  <Badge variant="secondary" className="ml-2">
                    {groupBy}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Agrupar por</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setGroupBy(null)}>
                Nenhum
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {propertySchema.map(prop => (
                <DropdownMenuItem
                  key={prop.property_name}
                  onClick={() => setGroupBy(prop.property_name)}
                >
                  {prop.property_name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

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
            {filteredAndSortedPages.map((item, index) => {
              // Check if this is a group header
              if ((item as any).isGroupHeader) {
                return (
                  <TableRow key={`group-${(item as any).groupKey}`} className="bg-muted/50">
                    <TableCell colSpan={visibleColumns.length + 1} className="font-semibold py-2">
                      {(item as any).groupKey}
                    </TableCell>
                  </TableRow>
                );
              }
              
              const page = item as PageWithProperties;
              return (
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
              );
            })}
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
