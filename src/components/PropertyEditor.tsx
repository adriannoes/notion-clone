import { useState, useEffect } from "react";
import { Calendar, Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PropertyType, PropertyValue, PropertyOption } from "@/types/properties";

interface PropertyEditorProps {
  name: string;
  type: PropertyType;
  value: PropertyValue;
  options?: PropertyOption[];
  onChange: (value: PropertyValue) => void;
  onDelete?: () => void;
  className?: string;
}

export function PropertyEditor({
  name,
  type,
  value,
  options = [],
  onChange,
  onDelete,
  className
}: PropertyEditorProps) {
  const [localValue, setLocalValue] = useState<any>(getCurrentValue());
  const [isOpen, setIsOpen] = useState(false);

  function getCurrentValue() {
    switch (type) {
      case 'text':
        return value.text || '';
      case 'number':
        return value.number || 0;
      case 'select':
        return value.select || '';
      case 'multi_select':
        return value.multi_select || [];
      case 'date':
        return value.date ? new Date(value.date) : null;
      case 'person':
        return value.person || '';
      case 'checkbox':
        return value.checkbox || false;
      case 'url':
        return value.url || '';
      case 'email':
        return value.email || '';
      case 'phone':
        return value.phone || '';
      default:
        return '';
    }
  }

  useEffect(() => {
    setLocalValue(getCurrentValue());
  }, [value, type]);

  const handleValueChange = (newValue: any) => {
    setLocalValue(newValue);
    
    const updatedValue: PropertyValue = {};
    switch (type) {
      case 'text':
        updatedValue.text = newValue;
        break;
      case 'number':
        updatedValue.number = newValue;
        break;
      case 'select':
        updatedValue.select = newValue;
        break;
      case 'multi_select':
        updatedValue.multi_select = newValue;
        break;
      case 'date':
        updatedValue.date = newValue ? newValue.toISOString() : '';
        break;
      case 'person':
        updatedValue.person = newValue;
        break;
      case 'checkbox':
        updatedValue.checkbox = newValue;
        break;
      case 'url':
        updatedValue.url = newValue;
        break;
      case 'email':
        updatedValue.email = newValue;
        break;
      case 'phone':
        updatedValue.phone = newValue;
        break;
    }
    
    onChange(updatedValue);
  };

  const handleMultiSelectToggle = (optionId: string) => {
    const currentValues = Array.isArray(localValue) ? localValue : [];
    const newValues = currentValues.includes(optionId)
      ? currentValues.filter(id => id !== optionId)
      : [...currentValues, optionId];
    
    handleValueChange(newValues);
  };

  const renderInput = () => {
    switch (type) {
      case 'text':
        return (
          <Input
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Digite o texto..."
            className="h-8"
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={localValue}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            placeholder="Digite o número..."
            className="h-8"
          />
        );
      
      case 'select':
        return (
          <Select value={localValue} onValueChange={handleValueChange}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Selecione uma opção..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'multi_select':
        return (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 justify-between"
                onClick={() => setIsOpen(!isOpen)}
              >
                {Array.isArray(localValue) && localValue.length > 0
                  ? `${localValue.length} selecionado(s)`
                  : "Selecione opções..."
                }
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              <div className="space-y-2">
                {options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={option.id}
                      checked={Array.isArray(localValue) && localValue.includes(option.id)}
                      onCheckedChange={() => handleMultiSelectToggle(option.id)}
                    />
                    <Label htmlFor={option.id} className="text-sm">
                      {option.name}
                    </Label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        );
      
      case 'date':
        return (
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-8 justify-start"
                onClick={() => setIsOpen(!isOpen)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {localValue ? format(localValue, 'dd/MM/yyyy', { locale: ptBR }) : "Selecione a data..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={localValue}
                onSelect={(date) => {
                  handleValueChange(date);
                  setIsOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
      
      case 'person':
        return (
          <Input
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Digite o nome da pessoa..."
            className="h-8"
          />
        );
      
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={localValue}
              onCheckedChange={handleValueChange}
            />
            <Label className="text-sm">
              {localValue ? 'Sim' : 'Não'}
            </Label>
          </div>
        );
      
      case 'url':
        return (
          <Input
            type="url"
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="https://exemplo.com"
            className="h-8"
          />
        );
      
      case 'email':
        return (
          <Input
            type="email"
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="email@exemplo.com"
            className="h-8"
          />
        );
      
      case 'phone':
        return (
          <Input
            type="tel"
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="(11) 99999-9999"
            className="h-8"
          />
        );
      
      default:
        return (
          <Input
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Valor..."
            className="h-8"
          />
        );
    }
  };

  return (
    <div className={cn("flex items-center gap-2 p-2 border rounded-md", className)}>
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium text-text-primary mb-1 block">
          {name}
        </Label>
        {renderInput()}
      </div>
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
