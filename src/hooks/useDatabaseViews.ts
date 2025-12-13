import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Stub types - database_views table not yet created
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

// Stub hook - database_views table not yet created
export function useDatabaseViews(workspaceId?: string) {
  return useQuery({
    queryKey: ['database-views', workspaceId],
    queryFn: async () => {
      console.warn('Database views feature requires database migration');
      return [] as DatabaseView[];
    },
    enabled: false, // Disabled until table is created
  });
}

// Stub hook - RPC function not yet created
export function usePagesWithProperties(workspaceId?: string, propertyNames?: string[]) {
  return useQuery({
    queryKey: ['pages-with-properties', workspaceId, propertyNames],
    queryFn: async () => {
      console.warn('Pages with properties feature requires database migration');
      return [] as PageWithProperties[];
    },
    enabled: false, // Disabled until RPC is created
  });
}

// Stub hook - RPC function not yet created
export function useWorkspacePropertySchema(workspaceId?: string) {
  return useQuery({
    queryKey: ['workspace-property-schema', workspaceId],
    queryFn: async () => {
      console.warn('Workspace property schema feature requires database migration');
      return [] as PropertySchema[];
    },
    enabled: false, // Disabled until RPC is created
  });
}

// Stub hook - database_views table not yet created
export function useCreateDatabaseView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateViewParams) => {
      console.warn('Database views feature requires database migration');
      throw new Error('Database views feature not yet implemented');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Visualizações não disponíveis',
        description: 'Esta funcionalidade será implementada em breve.',
      });
    },
  });
}

// Stub hook - database_views table not yet created
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
      console.warn('Database views feature requires database migration');
      throw new Error('Database views feature not yet implemented');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Visualizações não disponíveis',
        description: 'Esta funcionalidade será implementada em breve.',
      });
    },
  });
}

// Stub hook - database_views table not yet created
export function useDeleteDatabaseView() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      console.warn('Database views feature requires database migration');
      throw new Error('Database views feature not yet implemented');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Visualizações não disponíveis',
        description: 'Esta funcionalidade será implementada em breve.',
      });
    },
  });
}
