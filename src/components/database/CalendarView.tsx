import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PageWithProperties } from "@/hooks/useDatabaseViews";

interface CalendarViewProps {
  pages: PageWithProperties[];
  propertySchema: any[];
  onPageSelect?: (pageId: string) => void;
  onAddPage?: () => void;
  className?: string;
}

export function CalendarView({ 
  pages, 
  propertySchema, 
  onPageSelect, 
  onAddPage,
  className 
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  // Find date property
  const dateProperty = propertySchema.find(p => 
    p.property_type === 'date' || p.property_name.toLowerCase().includes('date') || 
    p.property_name.toLowerCase().includes('data')
  );

  // Group pages by date
  const pagesByDate = useMemo(() => {
    const grouped: Record<string, PageWithProperties[]> = {};
    
    pages.forEach(page => {
      let date: Date | null = null;
      
      if (dateProperty) {
        const dateValue = page.properties[dateProperty.property_name];
        if (dateValue && typeof dateValue === 'object' && dateValue.value) {
          date = new Date(dateValue.value);
        }
      } else {
        // Fallback to page created_at or updated_at
        date = new Date(page.page_created_at);
      }
      
      if (date && !isNaN(date.getTime())) {
        const dateKey = format(date, 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(page);
      }
    });
    
    return grouped;
  }, [pages, dateProperty]);

  // Filter pages by search
  const filteredPagesByDate = useMemo(() => {
    if (!searchTerm) return pagesByDate;
    
    const filtered: Record<string, PageWithProperties[]> = {};
    Object.entries(pagesByDate).forEach(([date, pagesList]) => {
      const filteredList = pagesList.filter(page =>
        page.page_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(page.properties).some(prop =>
          prop && typeof prop === 'object' &&
          JSON.stringify(prop).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      if (filteredList.length > 0) {
        filtered[date] = filteredList;
      }
    });
    return filtered;
  }, [pagesByDate, searchTerm]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { locale: ptBR });
  const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
  
  const daysInMonth = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="min-w-[120px]"
          >
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateMonth('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
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
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg bg-background">
        {/* Week Day Headers */}
        <div className="grid grid-cols-7 border-b">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center font-semibold text-text-secondary text-sm border-r last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {daysInMonth.map((day, idx) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayPages = filteredPagesByDate[dayKey] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[120px] border-r border-b p-2",
                  !isCurrentMonth && "bg-muted/30",
                  isToday && "bg-primary/5 ring-2 ring-primary"
                )}
              >
                <div className={cn(
                  "text-sm font-medium mb-1",
                  isToday && "text-primary font-bold",
                  !isCurrentMonth && "text-text-tertiary"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1 max-h-[90px] overflow-y-auto">
                  {dayPages.slice(0, 3).map((page) => (
                    <button
                      key={page.page_id}
                      onClick={() => onPageSelect?.(page.page_id)}
                      className="w-full text-left text-xs p-1 bg-primary/10 hover:bg-primary/20 rounded truncate"
                      title={page.page_title}
                    >
                      {page.page_title}
                    </button>
                  ))}
                  {dayPages.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{dayPages.length - 3} mais
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary/5 ring-2 ring-primary rounded" />
          <span>Hoje</span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          <span>{Object.keys(filteredPagesByDate).length} dias com páginas</span>
        </div>
      </div>

      {Object.keys(filteredPagesByDate).length === 0 && (
        <div className="text-center py-8">
          <CalendarIcon className="h-12 w-12 mx-auto text-text-placeholder mb-4" />
          <p className="text-text-secondary">
            {searchTerm ? 'Nenhuma página encontrada' : 'Nenhuma página com data encontrada'}
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

