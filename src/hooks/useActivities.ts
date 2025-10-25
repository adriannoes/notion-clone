import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Activity {
  id: string;
  user_id: string;
  action: 'created' | 'updated' | 'deleted' | 'shared' | 'commented' | 'moved';
  entity_type: 'page' | 'block' | 'workspace' | 'member';
  entity_id: string;
  entity_name: string | null;
  metadata: Record<string, any>;
  created_at: string;
  user_name: string | null;
  user_avatar: string | null;
}

export interface CreateActivityParams {
  userId: string;
  workspaceId: string;
  action: Activity['action'];
  entityType: Activity['entity_type'];
  entityId: string;
  entityName?: string;
  metadata?: Record<string, any>;
}

export function useActivities(workspaceId?: string) {
  return useQuery({
    queryKey: ['activities', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase.rpc('get_workspace_activities', {
        p_workspace_id: workspaceId,
        p_limit: 50
      });
      
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateActivityParams) => {
      const { data, error } = await supabase.rpc('create_activity', {
        p_user_id: params.userId,
        p_workspace_id: params.workspaceId,
        p_action: params.action,
        p_entity_type: params.entityType,
        p_entity_id: params.entityId,
        p_entity_name: params.entityName || null,
        p_metadata: params.metadata || {}
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activities', variables.workspaceId] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar atividade',
        description: error.message,
      });
    },
  });
}

export function useRecentActivities(workspaceId?: string, limit: number = 10) {
  return useQuery({
    queryKey: ['activities', workspaceId, 'recent', limit],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase.rpc('get_workspace_activities', {
        p_workspace_id: workspaceId,
        p_limit: limit
      });
      
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!workspaceId,
  });
}
