import { useState, useEffect, useRef } from "react";
import { User, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceMembers } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";

interface MentionMenuProps {
  position: { top: number; left: number };
  search: string;
  onSelect: (userId: string, userName: string) => void;
  onClose: () => void;
  workspaceId?: string;
}

export function MentionMenu({ 
  position, 
  search, 
  onSelect, 
  onClose,
  workspaceId 
}: MentionMenuProps) {
  const [users, setUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: members = [] } = useWorkspaceMembers(workspaceId || '');

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        let filteredUsers: Array<{ id: string; name: string; email: string }> = [];

        if (workspaceId && members.length > 0) {
          // Use workspace members
          filteredUsers = members
            .map(member => ({
              id: member.user_id,
              name: member.profiles?.full_name || member.profiles?.email || 'Usuário sem nome',
              email: member.profiles?.email || '',
            }))
            .filter(user => 
              user.name.toLowerCase().includes(search.toLowerCase()) ||
              user.email.toLowerCase().includes(search.toLowerCase())
            );
        } else {
          // Fallback: get all profiles (limited to current user's workspace or public)
          const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .limit(20);

          if (!error && profiles) {
            filteredUsers = profiles
              .map(profile => ({
                id: profile.id,
                name: profile.full_name || profile.email || 'Usuário sem nome',
                email: profile.email || '',
              }))
              .filter(user =>
                user.name.toLowerCase().includes(search.toLowerCase()) ||
                user.email.toLowerCase().includes(search.toLowerCase())
              );
          }
        }

        setUsers(filteredUsers.slice(0, 10));
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [search, workspaceId, members]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, users.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (users[selectedIndex]) {
          onSelect(users[selectedIndex].id, users[selectedIndex].name);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [users, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [users]);

  if (users.length === 0 && !loading) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-64 bg-background border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {loading ? (
        <div className="p-3 text-center text-text-secondary">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : (
        <>
          {users.length === 0 ? (
            <div className="p-3 text-center text-text-secondary text-sm">
              <Search className="h-4 w-4 mx-auto mb-2 opacity-50" />
              Nenhum usuário encontrado
            </div>
          ) : (
            users.map((user, index) => (
              <button
                key={user.id}
                onClick={() => onSelect(user.id, user.name)}
                className={cn(
                  "w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-hover-bg transition-colors",
                  index === selectedIndex && "bg-hover-bg"
                )}
              >
                <User className="h-4 w-4 text-text-tertiary" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary truncate">
                    {user.name}
                  </div>
                  {user.email && (
                    <div className="text-xs text-text-tertiary truncate">
                      {user.email}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </>
      )}
    </div>
  );
}

