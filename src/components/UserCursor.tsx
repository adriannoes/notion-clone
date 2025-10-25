import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { UserPresence, CursorPosition } from '@/hooks/usePresence';

interface UserCursorProps {
  user: UserPresence;
  className?: string;
}

export function UserCursor({ user, className }: UserCursorProps) {
  const [position, setPosition] = useState<CursorPosition | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (user.cursor_position && typeof user.cursor_position === 'object') {
      const cursorPos = user.cursor_position as CursorPosition;
      setPosition(cursorPos);
      setIsVisible(true);
      
      // Hide cursor after 5 seconds of inactivity
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [user.cursor_position]);

  if (!position || !isVisible) {
    return null;
  }

  const userName = user.user_name || 'Usuário';
  const initials = userName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "fixed pointer-events-none z-50 transition-all duration-200",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor line */}
      <div className="absolute w-0.5 h-6 bg-blue-500 transform -translate-x-1/2" />
      
      {/* User avatar and name */}
      <div className="flex items-center gap-2 bg-blue-500 text-white px-2 py-1 rounded-md shadow-lg">
        <Avatar className="h-5 w-5">
          <AvatarImage src={user.user_avatar || undefined} />
          <AvatarFallback className="text-xs bg-blue-600">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium whitespace-nowrap">
          {userName}
        </span>
      </div>
    </div>
  );
}

interface ActiveUsersProps {
  users: UserPresence[];
  className?: string;
}

export function ActiveUsers({ users, className }: ActiveUsersProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.user_id} className="h-6 w-6 border-2 border-background">
            <AvatarImage src={user.user_avatar || undefined} />
            <AvatarFallback className="text-xs">
              {user.user_name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        ))}
        {users.length > 3 && (
          <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-background flex items-center justify-center">
            <span className="text-xs text-gray-600">+{users.length - 3}</span>
          </div>
        )}
      </div>
      <span className="text-xs text-text-secondary">
        {users.length} {users.length === 1 ? 'pessoa' : 'pessoas'} ativa{users.length === 1 ? '' : 's'}
      </span>
    </div>
  );
}
