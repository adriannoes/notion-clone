import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DatabaseView {
  id: string;
  workspace_id: string;
  name: string;
  view_type: 'table' | 'kanban' | 'calendar';
  configuration: Record<string, any>;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageWithProperties {
  page_id: string;
  page_title: string;
  page_created_at: string;
  page_updated_at: string;
  page_is_favorite: boolean;
  properties: Record<string, any>;
}

export interface PropertySchema {
  property_name: string;
  property_type: string;
  usage_count: number;
  sample_values: any[];
}

export interface CreateViewParams {
  workspaceId: string;
  name: string;
  viewType: 'table' | 'kanban' | 'calendar';
  configuration?: Record<string, any>;
}

export function useDatabaseViews(workspaceId?: string) {
  return useQuery({
    queryKey: ['database-views', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('database_views')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at');
      
      if (error) throw error;
      return data as DatabaseView[];
    },
    enabled: !!workspaceId,
  });
}

export function usePagesWithProperties(workspaceId?: string, propertyNames?: string[]) {
  return useQuery({
    queryKey: ['pages-with-properties', workspaceId, propertyNames],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase.rpc('get_pages_with_properties', {
        p_workspace_id: workspaceId,
        p_property_names: propertyNames || null
      });
      
      if (error) throw error;
      return data as PageWithProperties[];
    },
    enabled: !!workspaceId,
  });
}

export function useWorkspacePropertySchema(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-property-schema', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase.rpc('get_workspace_property_schema', {
        p_workspace_id: workspaceId
      });
      
      if (error) throw error;
      return data as PropertySchema[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateDatabaseView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateViewParams) => {
      const { data, error } = await supabase
        .from('database_views')
        .insert({
          workspace_id: params.workspaceId,
          name: params.name,
          view_type: params.viewType,
          configuration: params.configuration || {}
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['database-views', data.workspace_id] });
      toast({ title: 'Visualização criada' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar visualização',
        description: error.message,
      });
    },
  });
}

export function useUpdateDatabaseView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<DatabaseView>; 
    }) => {
      const { data, error } = await supabase
        .from('database_views')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['database-views', data.workspace_id] });
      toast({ title: 'Visualização atualizada' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar visualização',
        description: error.message,
      });
    },
  });
}

export function useDeleteDatabaseView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('database_views')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['database-views'] });
      toast({ title: 'Visualização removida' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover visualização',
        description: error.message,
      });
    },
  });
}
