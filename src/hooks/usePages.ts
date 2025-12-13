import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Define types locally since the DB schema may not have workspace_id
export interface Page {
  id: string;
  title: string;
  icon: string;
  parent_id: string | null;
  position: number;
  is_favorite: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface PageInsert {
  title: string;
  icon?: string;
  parent_id?: string | null;
  position?: number;
  is_favorite?: boolean;
}

export interface PageUpdate {
  title?: string;
  icon?: string;
  parent_id?: string | null;
  position?: number;
  is_favorite?: boolean;
}

export function usePages(workspaceId?: string) {
  return useQuery({
    queryKey: ['pages', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .order('position');
      
      if (error) throw error;
      return data as Page[];
    },
  });
}

export function useCreatePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (page: PageInsert) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
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
