import { useUserRole, getRoleDisplayName, getRoleColor } from '@/hooks/usePermissions';

interface UserRoleBadgeProps {
  workspaceId?: string;
  className?: string;
}

export function UserRoleBadge({ workspaceId, className = "" }: UserRoleBadgeProps) {
  const role = useUserRole(workspaceId);

  if (!role) return null;

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role)} ${className}`}>
      {getRoleDisplayName(role)}
    </span>
  );
}
