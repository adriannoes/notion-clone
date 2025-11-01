import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface UserPresence {
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  cursor_position: Record<string, any>;
  last_seen: string;
  is_active: boolean;
}

export interface CursorPosition {
  x: number;
  y: number;
  blockId?: string;
}

export function usePresence(pageId?: string, workspaceId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [myCursor, setMyCursor] = useState<CursorPosition | null>(null);

  // Query to get active users on the page
  const { data: presenceData = [] } = useQuery({
    queryKey: ['presence', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      
      const { data, error } = await supabase.rpc('get_page_active_users', {
        p_page_id: pageId
      });
      
      if (error) throw error;
      return data as UserPresence[];
    },
    enabled: !!pageId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mutation to update user presence
  const updatePresenceMutation = useMutation({
    mutationFn: async ({ 
      cursorPosition, 
      isActive = true 
    }: { 
      cursorPosition?: CursorPosition; 
      isActive?: boolean; 
    }) => {
      if (!user || !pageId || !workspaceId) return;
      
      const { data, error } = await supabase.rpc('update_user_presence', {
        p_user_id: user.id,
        p_page_id: pageId,
        p_workspace_id: workspaceId,
        p_cursor_position: cursorPosition || {},
        p_is_active: isActive
      });
      
      if (error) throw error;
      return data;
    },
  });

  // Mutation to mark user as inactive
  const markInactiveMutation = useMutation({
    mutationFn: async () => {
      if (!user || !pageId) return;
      
      const { data, error } = await supabase.rpc('mark_user_inactive', {
        p_user_id: user.id,
        p_page_id: pageId
      });
      
      if (error) throw error;
      return data;
    },
  });

  // Update presence data when query data changes
  useEffect(() => {
    if (presenceData) {
      setActiveUsers(presenceData);
    }
  }, [presenceData]);

  // Set up real-time subscription for presence updates
  useEffect(() => {
    if (!pageId || !workspaceId) return;

    const channel = supabase
      .channel(`presence:${pageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'page_presence',
          filter: `page_id=eq.${pageId}`,
        },
        (payload) => {
          logger.log('Presence update:', payload);
          queryClient.invalidateQueries({ queryKey: ['presence', pageId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId, workspaceId, queryClient]);

  // Update cursor position
  const updateCursor = useCallback((position: CursorPosition) => {
    setMyCursor(position);
    updatePresenceMutation.mutate({ cursorPosition: position });
  }, [updatePresenceMutation]);

  // Mark user as active when they interact with the page
  const markActive = useCallback(() => {
    updatePresenceMutation.mutate({ isActive: true });
  }, [updatePresenceMutation]);

  // Mark user as inactive when they leave the page
  const markInactive = useCallback(() => {
    markInactiveMutation.mutate();
  }, [markInactiveMutation]);

  // Set up page visibility API to handle when user switches tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        markInactive();
      } else {
        markActive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [markActive, markInactive]);

  // Set up beforeunload to mark user as inactive
  useEffect(() => {
    const handleBeforeUnload = () => {
      markInactive();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [markInactive]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (user && pageId) {
        markInactive();
      }
    };
  }, [user, pageId, markInactive]);

  return {
    activeUsers: activeUsers.filter(user => user.user_id !== user?.id), // Exclude current user
    myCursor,
    updateCursor,
    markActive,
    markInactive,
    isUpdating: updatePresenceMutation.isPending,
  };
}

// Hook for getting active users count
export function useActiveUsersCount(pageId?: string) {
  const { data: presenceData = [] } = useQuery({
    queryKey: ['presence', pageId, 'count'],
    queryFn: async () => {
      if (!pageId) return 0;
      
      const { data, error } = await supabase.rpc('get_page_active_users', {
        p_page_id: pageId
      });
      
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!pageId,
    refetchInterval: 30000,
  });

  return data || 0;
}
