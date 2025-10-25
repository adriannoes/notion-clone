import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update'];

export type NotificationType = 'invite' | 'mention' | 'page_shared' | 'page_updated' | 'comment' | 'activity';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Notification[];
    },
  });
}

export function useUnreadNotificationsCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateNotificationParams) => {
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: params.userId,
        p_type: params.type,
        p_title: params.title,
        p_message: params.message,
        p_metadata: params.metadata || {}
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar notificação',
        description: error.message,
      });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao marcar notificação como lida',
        description: error.message,
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('mark_all_notifications_read');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Notificações marcadas como lidas',
        description: `${count} notificações foram marcadas como lidas.`,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao marcar notificações como lidas',
        description: error.message,
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({ title: 'Notificação removida' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover notificação',
        description: error.message,
      });
    },
  });
}
