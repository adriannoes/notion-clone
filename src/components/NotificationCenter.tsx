import { useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  useNotifications, 
  useUnreadNotificationsCount,
  useMarkAllNotificationsRead 
} from "@/hooks/useNotifications";
import { NotificationItem } from "./NotificationItem";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const unreadNotifications = notifications.filter(n => !n.is_read);
  const readNotifications = notifications.filter(n => n.is_read);

  const handleMarkAllRead = async () => {
    await markAllReadMutation.mutateAsync();
  };

  const handleNotificationClick = () => {
    // Close dropdown when notification is clicked
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b border-border-light">
          <h3 className="font-semibold text-text-primary">
            Notificações
          </h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-7 px-2 text-xs"
                disabled={markAllReadMutation.isPending}
              >
                <Check className="h-3 w-3 mr-1" />
                Marcar todas como lidas
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="p-4 text-center text-text-secondary">
              Carregando notificações...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-text-placeholder mb-2" />
              <p className="text-sm text-text-secondary">
                Nenhuma notificação ainda
              </p>
            </div>
          ) : (
            <div>
              {unreadNotifications.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-blue-50/50 border-b border-border-light">
                    <p className="text-xs font-medium text-blue-700">
                      Não lidas ({unreadNotifications.length})
                    </p>
                  </div>
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleNotificationClick}
                      showActions={true}
                    />
                  ))}
                </>
              )}

              {readNotifications.length > 0 && (
                <>
                  {unreadNotifications.length > 0 && <Separator />}
                  <div className="px-4 py-2 bg-gray-50/50 border-b border-border-light">
                    <p className="text-xs font-medium text-gray-600">
                      Lidas ({readNotifications.length})
                    </p>
                  </div>
                  {readNotifications.slice(0, 10).map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleNotificationClick}
                      showActions={false}
                    />
                  ))}
                  {readNotifications.length > 10 && (
                    <div className="p-2 text-center">
                      <p className="text-xs text-text-placeholder">
                        +{readNotifications.length - 10} notificações mais antigas
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs text-text-secondary hover:text-text-primary"
                onClick={() => {
                  // Navigate to full notifications page
                  console.log('Navigate to notifications page');
                }}
              >
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
