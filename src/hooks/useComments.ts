import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Stub types - table not yet created
export interface Comment {
  id: string;
  user_id: string;
  page_id: string | null;
  block_id: string | null;
  parent_id: string | null;
  content: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

export interface CommentInsert {
  page_id?: string | null;
  block_id?: string | null;
  parent_id?: string | null;
  content: string;
}

// Stub hook - comments table not yet created
export function useComments(blockId?: string, pageId?: string) {
  return useQuery({
    queryKey: ['comments', blockId, pageId],
    queryFn: async () => {
      // Comments table not yet implemented
      console.warn('Comments feature requires database migration');
      return [] as Comment[];
    },
    enabled: false, // Disabled until table is created
  });
}

// Stub hook - comments table not yet created
export function useCreateComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (comment: CommentInsert) => {
      console.warn('Comments feature requires database migration');
      throw new Error('Comments feature not yet implemented');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Comentários não disponíveis',
        description: 'Esta funcionalidade será implementada em breve.',
      });
    },
  });
}

// Stub hook - comments table not yet created
export function useUpdateComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CommentInsert> }) => {
      console.warn('Comments feature requires database migration');
      throw new Error('Comments feature not yet implemented');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Comentários não disponíveis',
        description: 'Esta funcionalidade será implementada em breve.',
      });
    },
  });
}

// Stub hook - comments table not yet created
export function useDeleteComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      console.warn('Comments feature requires database migration');
      throw new Error('Comments feature not yet implemented');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Comentários não disponíveis',
        description: 'Esta funcionalidade será implementada em breve.',
      });
    },
  });
}

export function useResolveComment() {
  return useUpdateComment();
}
