import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Share, 
  MessageSquare, 
  Move,
  FileText,
  Square,
  Users,
  User
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useActivities } from "@/hooks/useActivities";
import { cn } from "@/lib/utils";
import type { Activity } from "@/hooks/useActivities";

interface ActivityFeedProps {
  workspaceId?: string;
  className?: string;
  showHeader?: boolean;
  limit?: number;
}

const getActivityIcon = (action: Activity['action'], entityType: Activity['entity_type']) => {
  if (entityType === 'page') {
    switch (action) {
      case 'created':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'updated':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'deleted':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'shared':
        return <Share className="h-4 w-4 text-purple-600" />;
      case 'moved':
        return <Move className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  } else if (entityType === 'block') {
    return <Square className="h-4 w-4 text-gray-600" />;
  } else if (entityType === 'member') {
    return <Users className="h-4 w-4 text-blue-600" />;
  } else {
    return <FileText className="h-4 w-4 text-gray-600" />;
  }
};

const getActivityText = (activity: Activity) => {
  const userName = activity.user_name || 'Usuário';
  const entityName = activity.entity_name || 'item';
  
  switch (activity.action) {
    case 'created':
      return `${userName} criou ${entityName}`;
    case 'updated':
      return `${userName} atualizou ${entityName}`;
    case 'deleted':
      return `${userName} deletou ${entityName}`;
    case 'shared':
      return `${userName} compartilhou ${entityName}`;
    case 'commented':
      return `${userName} comentou em ${entityName}`;
    case 'moved':
      return `${userName} moveu ${entityName}`;
    default:
      return `${userName} fez uma ação em ${entityName}`;
  }
};

const getActivityColor = (action: Activity['action']) => {
  switch (action) {
    case 'created':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'updated':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'deleted':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'shared':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'commented':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'moved':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function ActivityFeed({ 
  workspaceId, 
  className,
  showHeader = true,
  limit = 20 
}: ActivityFeedProps) {
  const { data: activities = [], isLoading } = useActivities(workspaceId);

  const recentActivities = activities.slice(0, limit);

  if (isLoading) {
    return (
      <div className={cn("p-4", className)}>
        {showHeader && (
          <h3 className="font-semibold text-text-primary mb-4">
            Atividades Recentes
          </h3>
        )}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentActivities.length === 0) {
    return (
      <div className={cn("p-4", className)}>
        {showHeader && (
          <h3 className="font-semibold text-text-primary mb-4">
            Atividades Recentes
          </h3>
        )}
        <div className="text-center py-8">
          <FileText className="h-8 w-8 mx-auto text-text-placeholder mb-2" />
          <p className="text-sm text-text-secondary">
            Nenhuma atividade ainda
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("p-4", className)}>
      {showHeader && (
        <>
          <h3 className="font-semibold text-text-primary mb-4">
            Atividades Recentes
          </h3>
          <Separator className="mb-4" />
        </>
      )}
      
      <ScrollArea className="max-h-96">
        <div className="space-y-3">
          {recentActivities.map((activity, index) => (
            <div key={activity.id} className="flex items-start gap-3 group">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={activity.user_avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {activity.user_name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getActivityIcon(activity.action, activity.entity_type)}
                  <p className="text-sm text-text-primary">
                    {getActivityText(activity)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-placeholder">
                    {formatDistanceToNow(new Date(activity.created_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                  <Badge 
                    variant="secondary" 
                    className={cn("text-xs", getActivityColor(activity.action))}
                  >
                    {activity.action}
                  </Badge>
                  {activity.entity_type !== 'page' && (
                    <Badge variant="outline" className="text-xs">
                      {activity.entity_type}
                    </Badge>
                  )}
                </div>
                
                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-text-secondary">
                    {activity.metadata.old_title && activity.metadata.new_title && (
                      <p>
                        <span className="line-through">{activity.metadata.old_title}</span>
                        {' → '}
                        <span className="font-medium">{activity.metadata.new_title}</span>
                      </p>
                    )}
                    {activity.metadata.block_type && (
                      <p>Bloco: {activity.metadata.block_type}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
