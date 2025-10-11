import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type PageVersion = Database['public']['Tables']['page_versions']['Row'];
export type PageVersionInsert = Database['public']['Tables']['page_versions']['Insert'];

export function usePageVersions(pageId: string) {
  return useQuery({
    queryKey: ['page-versions', pageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_versions')
        .select(`
          *,
          profiles!page_versions_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('page_id', pageId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (PageVersion & { profiles: any })[];
    },
    enabled: !!pageId,
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      pageId, 
      title, 
      blocks 
    }: { 
      pageId: string; 
      title: string; 
      blocks: any[]; 
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('create_page_version', {
          p_page_id: pageId,
          p_title: title,
          p_blocks: blocks,
          p_created_by: user.id,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['page-versions', variables.pageId] });
      toast({ 
        title: 'Versão salva!',
        description: 'Uma nova versão foi criada com sucesso.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar versão',
        description: error.message,
      });
    },
  });
}

export function useRestoreVersion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .rpc('restore_page_from_version', {
          p_version_id: versionId,
          p_created_by: user.id,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      toast({ 
        title: 'Versão restaurada!',
        description: 'A página foi restaurada para esta versão.'
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao restaurar versão',
        description: error.message,
      });
    },
  });
}

export function useDeleteVersion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { error } = await supabase
        .from('page_versions')
        .delete()
        .eq('id', versionId);
      
      if (error) throw error;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['page-versions'] });
      toast({ title: 'Versão removida' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover versão',
        description: error.message,
      });
    },
  });
}

// Helper function to format version date
export function formatVersionDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffDays > 0) {
    return `${diffDays} dia${diffDays > 1 ? 's' : ''} atrás`;
  } else if (diffHours > 0) {
    return `${diffHours} hora${diffHours > 1 ? 's' : ''} atrás`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''} atrás`;
  } else {
    return 'Agora mesmo';
  }
}
