import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type Workspace = Database['public']['Tables']['workspaces']['Row'];
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert'];
export type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'];
export type WorkspaceMemberInsert = Database['public']['Tables']['workspace_members']['Insert'];

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          workspace_members!inner (
            role
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Workspace[];
    },
  });
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          *,
          profiles!inner (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as (WorkspaceMember & { profiles: any })[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (workspace: Omit<WorkspaceInsert, 'owner_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({ 
          ...workspace, 
          owner_id: user.id,
          slug: workspace.slug || workspace.name.toLowerCase().replace(/\s+/g, '-')
        })
        .select()
        .single();
      
      if (workspaceError) throw workspaceError;

      // Add owner as member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceData.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) throw memberError;

      return workspaceData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({ 
        title: 'Workspace criado!',
        description: 'Seu novo workspace foi criado com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar workspace',
        description: error.message,
      });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Workspace> }) => {
      const { data, error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({ title: 'Workspace atualizado!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar workspace',
        description: error.message,
      });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({ title: 'Workspace deletado' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar workspace',
        description: error.message,
      });
    },
  });
}

export function useAddWorkspaceMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (member: WorkspaceMemberInsert) => {
      const { data, error } = await supabase
        .from('workspace_members')
        .insert(member)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast({ title: 'Membro adicionado!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar membro',
        description: error.message,
      });
    },
  });
}

export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ workspaceId, userId }: { workspaceId: string; userId: string }) => {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast({ title: 'Membro removido' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover membro',
        description: error.message,
      });
    },
  });
}

export function useUpdateWorkspaceMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      userId, 
      role 
    }: { 
      workspaceId: string; 
      userId: string; 
      role: string; 
    }) => {
      const { data, error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] });
      toast({ title: 'Permissões atualizadas!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar permissões',
        description: error.message,
      });
    },
  });
}
