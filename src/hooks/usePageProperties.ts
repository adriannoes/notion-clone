import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PageProperty, PropertyType, PropertyValue } from '@/types/properties';

export interface SetPropertyParams {
  pageId: string;
  propertyName: string;
  propertyType: PropertyType;
  value: PropertyValue;
}

export interface DeletePropertyParams {
  pageId: string;
  propertyName: string;
}

export function usePageProperties(pageId?: string) {
  return useQuery({
    queryKey: ['page-properties', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      
      const { data, error } = await supabase.rpc('get_page_properties', {
        p_page_id: pageId
      });
      
      if (error) throw error;
      return data as PageProperty[];
    },
    enabled: !!pageId,
  });
}

export function useWorkspacePropertyNames(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-property-names', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase.rpc('get_workspace_property_names', {
        p_workspace_id: workspaceId
      });
      
      if (error) throw error;
      return data as Array<{
        property_name: string;
        property_type: string;
        usage_count: number;
      }>;
    },
    enabled: !!workspaceId,
  });
}

export function useSetPageProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SetPropertyParams) => {
      const { data, error } = await supabase.rpc('set_page_property', {
        p_page_id: params.pageId,
        p_property_name: params.propertyName,
        p_property_type: params.propertyType,
        p_value: params.value
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['page-properties', variables.pageId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-property-names'] });
      toast({ title: 'Propriedade atualizada' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar propriedade',
        description: error.message,
      });
    },
  });
}

export function useDeletePageProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: DeletePropertyParams) => {
      const { data, error } = await supabase.rpc('delete_page_property', {
        p_page_id: params.pageId,
        p_property_name: params.propertyName
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['page-properties', variables.pageId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-property-names'] });
      toast({ title: 'Propriedade removida' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover propriedade',
        description: error.message,
      });
    },
  });
}

export function useBatchSetPageProperties() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (properties: SetPropertyParams[]) => {
      const promises = properties.map(property =>
        supabase.rpc('set_page_property', {
          p_page_id: property.pageId,
          p_property_name: property.propertyName,
          p_property_type: property.propertyType,
          p_value: property.value
        })
      );
      
      const results = await Promise.all(promises);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} properties`);
      }
      
      return results;
    },
    onSuccess: (_, variables) => {
      const pageIds = [...new Set(variables.map(p => p.pageId))];
      pageIds.forEach(pageId => {
        queryClient.invalidateQueries({ queryKey: ['page-properties', pageId] });
      });
      queryClient.invalidateQueries({ queryKey: ['workspace-property-names'] });
      toast({ title: 'Propriedades atualizadas' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar propriedades',
        description: error.message,
      });
    },
  });
}
