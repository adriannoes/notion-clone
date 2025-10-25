import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PropertyEditor } from "./PropertyEditor";
import { usePageProperties, useSetPageProperty, useDeletePageProperty } from "@/hooks/usePageProperties";
import { useWorkspacePropertyNames } from "@/hooks/usePageProperties";
import type { PropertyType, PropertyValue, PropertyOption } from "@/types/properties";

interface PagePropertiesProps {
  pageId?: string;
  workspaceId?: string;
  className?: string;
}

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'select', label: 'Seleção' },
  { value: 'multi_select', label: 'Múltipla Seleção' },
  { value: 'date', label: 'Data' },
  { value: 'person', label: 'Pessoa' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'url', label: 'URL' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
];

export function PageProperties({ pageId, workspaceId, className }: PagePropertiesProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [newPropertyType, setNewPropertyType] = useState<PropertyType>('text');
  const [editingProperty, setEditingProperty] = useState<string | null>(null);

  const { data: properties = [], isLoading } = usePageProperties(pageId);
  const { data: workspaceProperties = [] } = useWorkspacePropertyNames(workspaceId);
  const setPropertyMutation = useSetPageProperty();
  const deletePropertyMutation = useDeletePageProperty();

  const handleAddProperty = async () => {
    if (!pageId || !newPropertyName.trim()) return;

    const emptyValue: PropertyValue = {};
    switch (newPropertyType) {
      case 'text':
        emptyValue.text = '';
        break;
      case 'number':
        emptyValue.number = 0;
        break;
      case 'select':
        emptyValue.select = '';
        break;
      case 'multi_select':
        emptyValue.multi_select = [];
        break;
      case 'date':
        emptyValue.date = '';
        break;
      case 'person':
        emptyValue.person = '';
        break;
      case 'checkbox':
        emptyValue.checkbox = false;
        break;
      case 'url':
        emptyValue.url = '';
        break;
      case 'email':
        emptyValue.email = '';
        break;
      case 'phone':
        emptyValue.phone = '';
        break;
    }

    await setPropertyMutation.mutateAsync({
      pageId,
      propertyName: newPropertyName.trim(),
      propertyType: newPropertyType,
      value: emptyValue,
    });

    setNewPropertyName('');
    setNewPropertyType('text');
    setIsAddDialogOpen(false);
  };

  const handlePropertyChange = async (propertyName: string, newValue: PropertyValue) => {
    if (!pageId) return;

    const property = properties.find(p => p.property_name === propertyName);
    if (!property) return;

    await setPropertyMutation.mutateAsync({
      pageId,
      propertyName,
      propertyType: property.property_type,
      value: newValue,
    });
  };

  const handleDeleteProperty = async (propertyName: string) => {
    if (!pageId) return;

    await deletePropertyMutation.mutateAsync({
      pageId,
      propertyName,
    });
  };

  const getPropertyOptions = (propertyName: string): PropertyOption[] => {
    // This would typically come from a workspace-level property definition
    // For now, return empty array - this would be enhanced with a property schema system
    return [];
  };

  if (isLoading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Propriedades</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Propriedade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="property-name">Nome da Propriedade</Label>
                <Input
                  id="property-name"
                  value={newPropertyName}
                  onChange={(e) => setNewPropertyName(e.target.value)}
                  placeholder="Ex: Status, Prioridade, Data de Vencimento..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="property-type">Tipo</Label>
                <Select value={newPropertyType} onValueChange={(value: PropertyType) => setNewPropertyType(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddProperty} disabled={!newPropertyName.trim()}>
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-8">
          <Settings className="h-8 w-8 mx-auto text-text-placeholder mb-2" />
          <p className="text-sm text-text-secondary">
            Nenhuma propriedade ainda
          </p>
          <p className="text-xs text-text-placeholder mt-1">
            Adicione propriedades para organizar suas páginas
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-96">
          <div className="space-y-3">
            {properties.map((property) => (
              <PropertyEditor
                key={property.id}
                name={property.property_name}
                type={property.property_type}
                value={property.value}
                options={getPropertyOptions(property.property_name)}
                onChange={(value) => handlePropertyChange(property.property_name, value)}
                onDelete={() => handleDeleteProperty(property.property_name)}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {workspaceProperties.length > 0 && (
        <>
          <Separator className="my-4" />
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-2">
              Propriedades Usadas no Workspace
            </h4>
            <div className="flex flex-wrap gap-2">
              {workspaceProperties.slice(0, 10).map((prop) => (
                <Badge key={prop.property_name} variant="secondary" className="text-xs">
                  {prop.property_name} ({prop.usage_count})
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
