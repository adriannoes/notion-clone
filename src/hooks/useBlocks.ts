import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type Block = Database['public']['Tables']['blocks']['Row'];
export type BlockInsert = Database['public']['Tables']['blocks']['Insert'];
export type BlockUpdate = Database['public']['Tables']['blocks']['Update'];

export function useBlocks(pageId: string | null) {
  return useQuery({
    queryKey: ['blocks', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      
      const { data, error } = await supabase
        .from('blocks')
        .select('*')
        .eq('page_id', pageId)
        .order('position');
      
      if (error) throw error;
      return data as Block[];
    },
    enabled: !!pageId,
  });
}

export function useCreateBlock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (block: BlockInsert) => {
      const { data, error } = await supabase
        .from('blocks')
        .insert(block)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blocks', data.page_id] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar bloco',
        description: error.message,
      });
    },
  });
}

export function useUpdateBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: BlockUpdate }) => {
      const { data, error } = await supabase
        .from('blocks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['blocks', data.page_id] });
    },
  });
}

export function useDeleteBlock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, pageId }: { id: string; pageId: string }) => {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return pageId;
    },
    onSuccess: (pageId) => {
      queryClient.invalidateQueries({ queryKey: ['blocks', pageId] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar bloco',
        description: error.message,
      });
    },
  });
}

export function useBatchUpdateBlocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      blocks, 
      pageId 
    }: { 
      blocks: { id: string; updates: BlockUpdate }[];
      pageId: string;
    }) => {
      const updates = blocks.map(({ id, updates }) =>
        supabase.from('blocks').update(updates).eq('id', id)
      );
      
      await Promise.all(updates);
      return pageId;
    },
    onSuccess: (pageId) => {
      queryClient.invalidateQueries({ queryKey: ['blocks', pageId] });
    },
  });
}
