import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePermissions(workspaceId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['permissions', workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user?.id) {
        return {
          role: null,
          canEdit: false,
          canDelete: false,
          canManage: false,
          canInvite: false,
        };
      }

      // Get user role in workspace
      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return {
          role: null,
          canEdit: false,
          canDelete: false,
          canManage: false,
          canInvite: false,
        };
      }

      const role = member.role;
      const canEdit = ['owner', 'admin', 'editor'].includes(role);
      const canDelete = ['owner', 'admin', 'editor'].includes(role);
      const canManage = ['owner', 'admin'].includes(role);
      const canInvite = ['owner', 'admin'].includes(role);

      return {
        role,
        canEdit,
        canDelete,
        canManage,
        canInvite,
      };
    },
    enabled: !!workspaceId && !!user?.id,
  });
}

export function useCanEdit(workspaceId?: string) {
  const { data: permissions } = usePermissions(workspaceId);
  return permissions?.canEdit ?? false;
}

export function useCanDelete(workspaceId?: string) {
  const { data: permissions } = usePermissions(workspaceId);
  return permissions?.canDelete ?? false;
}

export function useCanManage(workspaceId?: string) {
  const { data: permissions } = usePermissions(workspaceId);
  return permissions?.canManage ?? false;
}

export function useCanInvite(workspaceId?: string) {
  const { data: permissions } = usePermissions(workspaceId);
  return permissions?.canInvite ?? false;
}

export function useUserRole(workspaceId?: string) {
  const { data: permissions } = usePermissions(workspaceId);
  return permissions?.role ?? null;
}

// Helper function to get role display name
export function getRoleDisplayName(role: string | null): string {
  switch (role) {
    case 'owner':
      return 'Proprietário';
    case 'admin':
      return 'Administrador';
    case 'editor':
      return 'Editor';
    case 'viewer':
      return 'Visualizador';
    default:
      return 'Sem acesso';
  }
}

// Helper function to get role color
export function getRoleColor(role: string | null): string {
  switch (role) {
    case 'owner':
      return 'text-purple-600 bg-purple-50';
    case 'admin':
      return 'text-blue-600 bg-blue-50';
    case 'editor':
      return 'text-green-600 bg-green-50';
    case 'viewer':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-400 bg-gray-50';
  }
}
