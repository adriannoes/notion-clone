import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type Page = Database['public']['Tables']['pages']['Row'];
export type PageInsert = Database['public']['Tables']['pages']['Insert'];
export type PageUpdate = Database['public']['Tables']['pages']['Update'];

export function usePages(workspaceId?: string) {
  return useQuery({
    queryKey: ['pages', workspaceId],
    queryFn: async () => {
      let query = supabase
        .from('pages')
        .select('*')
        .order('position');
      
      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Page[];
    },
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (page: Omit<PageInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('pages')
        .insert({ ...page, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['pages', data.workspace_id] });
      toast({ title: 'Página criada!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar página',
        description: error.message,
      });
    },
  });
}

export function useUpdatePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PageUpdate }) => {
      const { data, error } = await supabase
        .from('pages')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar página',
        description: error.message,
      });
    },
  });
}

export function useDeletePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pages')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast({ title: 'Página deletada' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar página',
        description: error.message,
      });
    },
  });
}

export function useReorderPages() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (pages: { id: string; position: number }[]) => {
      const updates = pages.map(({ id, position }) =>
        supabase.from('pages').update({ position }).eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao reordenar páginas',
        description: error.message,
      });
    },
  });
}

export function useUpdatePageParent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      pageId, 
      newParentId 
    }: { 
      pageId: string; 
      newParentId: string | null;
    }) => {
      const { data, error } = await supabase
        .from('pages')
        .update({ parent_id: newParentId })
        .eq('id', pageId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast({ title: 'Página movida!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao mover página',
        description: error.message,
      });
    },
  });
}
