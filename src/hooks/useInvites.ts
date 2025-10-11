import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type WorkspaceInvite = Database['public']['Tables']['workspace_invites']['Row'];
export type WorkspaceInviteInsert = Database['public']['Tables']['workspace_invites']['Insert'];

export function useWorkspaceInvites(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace-invites', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select(`
          *,
          profiles!workspace_invites_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (WorkspaceInvite & { profiles: any })[];
    },
    enabled: !!workspaceId,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invite: Omit<WorkspaceInviteInsert, 'token' | 'expires_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate token and set expiration (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('workspace_invites')
        .insert({
          ...invite,
          token: crypto.randomUUID(),
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', data.workspace_id] });
      toast({ 
        title: 'Convite criado!',
        description: 'O link de convite foi gerado com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar convite',
        description: error.message,
      });
    },
  });
}

export function useDeleteInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspace_invites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites'] });
      toast({ title: 'Convite removido' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover convite',
        description: error.message,
      });
    },
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (token: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get invite details
      const { data: invite, error: inviteError } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('token', token)
        .eq('email', user.email)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invite) {
        throw new Error('Convite inválido ou expirado');
      }

      // Add user to workspace
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: invite.workspace_id,
          user_id: user.id,
          role: invite.role,
        });

      if (memberError) {
        // Check if user is already a member
        if (memberError.code === '23505') {
          throw new Error('Você já é membro deste workspace');
        }
        throw memberError;
      }

      // Delete the invite
      await supabase
        .from('workspace_invites')
        .delete()
        .eq('id', invite.id);

      return invite.workspace_id;
    },
    onSuccess: (workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast({ 
        title: 'Convite aceito!',
        description: 'Você foi adicionado ao workspace.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao aceitar convite',
        description: error.message,
      });
    },
  });
}

export function useInviteByToken(token: string) {
  return useQuery({
    queryKey: ['invite-by-token', token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select(`
          *,
          workspaces!inner (
            id,
            name,
            owner_id
          )
        `)
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (error) throw error;
      return data as WorkspaceInvite & { workspaces: any };
    },
    enabled: !!token,
  });
}
