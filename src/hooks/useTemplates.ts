import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type Template = Database['public']['Tables']['templates']['Row'];
export type TemplateInsert = Database['public']['Tables']['templates']['Insert'];

export function useTemplates(includePublic: boolean = true) {
  return useQuery({
    queryKey: ['templates', includePublic],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('templates')
        .select('*');

      if (includePublic) {
        // Get own templates OR public templates
        query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
      } else {
        // Only own templates
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Template[];
    },
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: TemplateInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('templates')
        .insert({ ...template, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template criado!' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar template',
        description: error.message,
      });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast({ title: 'Template deletado' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao deletar template',
        description: error.message,
      });
    },
  });
}
