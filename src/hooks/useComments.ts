import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
};

export type CommentInsert = Database['public']['Tables']['comments']['Insert'];

export function useComments(blockId?: string, pageId?: string) {
  return useQuery({
    queryKey: ['comments', blockId, pageId],
    queryFn: async () => {
      let query = supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('resolved', false)
        .order('created_at', { ascending: true });

      if (blockId) {
        query = query.eq('block_id', blockId);
      } else if (pageId) {
        query = query.eq('page_id', pageId);
      } else {
        return [];
      }

      const { data, error } = await query;

      if (error) throw error;

      // Organize comments into threads (parent + replies)
      const comments = (data || []) as Comment[];
      const parentComments = comments.filter(c => !c.parent_id);
      const repliesMap = new Map<string, Comment[]>();

      comments.forEach(comment => {
        if (comment.parent_id) {
          if (!repliesMap.has(comment.parent_id)) {
            repliesMap.set(comment.parent_id, []);
          }
          repliesMap.get(comment.parent_id)!.push(comment);
        }
      });

      return parentComments.map(comment => ({
        ...comment,
        replies: repliesMap.get(comment.id) || [],
      }));
    },
    enabled: !!(blockId || pageId),
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (comment: CommentInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({ ...comment, user_id: user.id })
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.block_id, variables.page_id] });
      toast({ title: 'Comentário adicionado!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar comentário',
        description: error.message,
      });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CommentInsert> }) => {
      const { data, error } = await supabase
        .from('comments')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comments', data.block_id, data.page_id] });
      toast({ title: 'Comentário atualizado!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar comentário',
        description: error.message,
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get comment info before deleting for cache invalidation
      const { data: comment } = await supabase
        .from('comments')
        .select('block_id, page_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return comment;
    },
    onSuccess: (comment) => {
      if (comment) {
        queryClient.invalidateQueries({ queryKey: ['comments', comment.block_id, comment.page_id] });
      }
      toast({ title: 'Comentário deletado' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar comentário',
        description: error.message,
      });
    },
  });
}

export function useResolveComment() {
  return useUpdateComment();
}

