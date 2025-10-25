import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Bell, 
  UserPlus, 
  MessageSquare, 
  Share, 
  Edit, 
  Activity, 
  X,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useMarkNotificationRead, useDeleteNotification } from "@/hooks/useNotifications";
import type { Notification } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'invite':
      return <UserPlus className="h-4 w-4" />;
    case 'mention':
      return <MessageSquare className="h-4 w-4" />;
    case 'page_shared':
      return <Share className="h-4 w-4" />;
    case 'page_updated':
      return <Edit className="h-4 w-4" />;
    case 'comment':
      return <MessageSquare className="h-4 w-4" />;
    case 'activity':
      return <Activity className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'invite':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'mention':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'page_shared':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'page_updated':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'comment':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'activity':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  showActions = true 
}: NotificationItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const markAsReadMutation = useMarkNotificationRead();
  const deleteMutation = useDeleteNotification();

  const handleMarkAsRead = async () => {
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id);
      onMarkAsRead?.();
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(notification.id);
    onDelete?.();
  };

  const handleClick = () => {
    if (!notification.is_read) {
      handleMarkAsRead();
    }
    
    // Navigate to page if metadata contains page_id
    if (notification.metadata && typeof notification.metadata === 'object' && 'page_id' in notification.metadata) {
      // This would be handled by the parent component
      console.log('Navigate to page:', notification.metadata.page_id);
    }
  };

  return (
    <div
      className={cn(
        "group relative p-4 border-b border-border-light hover:bg-hover-bg transition-colors cursor-pointer",
        !notification.is_read && "bg-blue-50/50 border-l-4 border-l-blue-500"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border",
          getNotificationColor(notification.type)
        )}>
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={cn(
                "text-sm font-medium text-text-primary",
                !notification.is_read && "font-semibold"
              )}>
                {notification.title}
              </h4>
              <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-text-placeholder">
                  {formatDistanceToNow(new Date(notification.created_at), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </span>
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                >
                  {notification.type}
                </Badge>
              </div>
            </div>
            
            {showActions && (
              <div className={cn(
                "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
                isHovered && "opacity-100"
              )}>
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead();
                    }}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
