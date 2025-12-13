import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

// Stub types - page_versions table not yet created
export interface PageVersion {
  id: string;
  page_id: string;
  title: string;
  blocks: any[];
  created_by: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface PageVersionInsert {
  page_id: string;
  title: string;
  blocks: any[];
  created_by: string;
}

// Stub hook - page_versions table not yet created
export function usePageVersions(pageId: string) {
  return useQuery({
    queryKey: ['page-versions', pageId],
    queryFn: async () => {
      console.warn('Page versions feature requires database migration');
      return [] as (PageVersion & { profiles: any })[];
    },
    enabled: false, // Disabled until table is created
  });
}

// Stub hook - RPC function not yet created
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
      console.warn('Page versions feature requires database migration');
      // Silently fail - versions are optional
      return null;
    },
  });
}

// Stub hook - RPC function not yet created
export function useRestoreVersion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (versionId: string) => {
      console.warn('Page versions feature requires database migration');
      throw new Error('Page versions feature not yet implemented');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Versões não disponíveis',
        description: 'Esta funcionalidade será implementada em breve.',
      });
    },
  });
}

// Stub hook - page_versions table not yet created
export function useDeleteVersion() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (versionId: string) => {
      console.warn('Page versions feature requires database migration');
      throw new Error('Page versions feature not yet implemented');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Versões não disponíveis',
        description: 'Esta funcionalidade será implementada em breve.',
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
