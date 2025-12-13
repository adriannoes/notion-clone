import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Stub types - activities table not yet created
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

// Stub hook - activities table not yet created
export function useActivities(workspaceId?: string) {
  return useQuery({
    queryKey: ['activities', workspaceId],
    queryFn: async () => {
      // Activities table not yet implemented
      console.warn('Activities feature requires database migration');
      return [] as Activity[];
    },
    enabled: false, // Disabled until table is created
  });
}

// Stub hook - activities table not yet created
export function useCreateActivity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateActivityParams) => {
      console.warn('Activities feature requires database migration');
      // Silently fail - activities are optional
      return null;
    },
  });
}

// Stub hook - activities table not yet created
export function useRecentActivities(workspaceId?: string, limit: number = 10) {
  return useQuery({
    queryKey: ['activities', workspaceId, 'recent', limit],
    queryFn: async () => {
      // Activities table not yet implemented
      console.warn('Activities feature requires database migration');
      return [] as Activity[];
    },
    enabled: false, // Disabled until table is created
  });
}
