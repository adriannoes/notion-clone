import { useState } from "react";
import { ChevronDown, Plus, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaces, useCreateWorkspace } from "@/hooks/useWorkspaces";
import { useAuth } from "@/contexts/AuthContext";
import { UserRoleBadge } from "@/components/UserRoleBadge";
import { ShareWorkspaceModal } from "@/components/ShareWorkspaceModal";
import { useCanInvite } from "@/hooks/usePermissions";
import { logger } from "@/lib/logger";

interface WorkspaceSelectorProps {
  currentWorkspaceId?: string;
  onWorkspaceChange: (workspaceId: string) => void;
}

export function WorkspaceSelector({ currentWorkspaceId, onWorkspaceChange }: WorkspaceSelectorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDescription, setWorkspaceDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const { data: workspaces = [], isLoading } = useWorkspaces();
  const createWorkspaceMutation = useCreateWorkspace();
  const { user } = useAuth();
  const canInvite = useCanInvite(currentWorkspaceId);

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceName.trim()) return;

    setIsCreating(true);
    
    try {
      const newWorkspace = await createWorkspaceMutation.mutateAsync({
        name: workspaceName.trim(),
        slug: workspaceName.toLowerCase().replace(/\s+/g, '-'),
      });
      
      onWorkspaceChange(newWorkspace.id);
      setIsCreateDialogOpen(false);
      setWorkspaceName("");
      setWorkspaceDescription("");
    } catch (error) {
      logger.error('Failed to create workspace:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" disabled className="h-9 px-3">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
        Carregando...
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 px-3 justify-start">
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center mr-2">
              <span className="text-xs font-semibold text-primary">
                {currentWorkspace?.name?.charAt(0) || 'W'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate max-w-32">
                {currentWorkspace?.name || 'Selecionar Workspace'}
              </div>
              {currentWorkspace && (
                <UserRoleBadge workspaceId={currentWorkspaceId} className="text-xs" />
              )}
            </div>
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-64">
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => onWorkspaceChange(workspace.id)}
              className="flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {workspace.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{workspace.name}</div>
                <div className="text-xs text-text-tertiary truncate">
                  {workspace.owner_id === user?.id ? 'Proprietário' : 'Membro'}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Criar Workspace
          </DropdownMenuItem>
          
          {currentWorkspace && (
            <>
              <DropdownMenuSeparator />
              {canInvite && (
                <DropdownMenuItem 
                  className="flex items-center gap-2"
                  onClick={() => setIsShareDialogOpen(true)}
                >
                  <Users className="h-4 w-4" />
                  Compartilhar Workspace
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Novo Workspace</DialogTitle>
            <DialogDescription>
              Crie um novo workspace para organizar suas páginas e colaborar com outros usuários.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Nome do Workspace *</Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Ex: Meu Projeto"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="workspace-description">Descrição (opcional)</Label>
              <Textarea
                id="workspace-description"
                value={workspaceDescription}
                onChange={(e) => setWorkspaceDescription(e.target.value)}
                placeholder="Descreva o propósito deste workspace..."
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !workspaceName.trim()}
              >
                {isCreating ? 'Criando...' : 'Criar Workspace'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {currentWorkspace && (
        <ShareWorkspaceModal
          isOpen={isShareDialogOpen}
          onClose={() => setIsShareDialogOpen(false)}
          workspaceId={currentWorkspaceId!}
          workspaceName={currentWorkspace.name}
        />
      )}
    </>
  );
}
