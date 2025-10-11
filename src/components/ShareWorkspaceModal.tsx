import { useState } from "react";
import { Copy, Mail, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceInvites, useCreateInvite, useDeleteInvite } from "@/hooks/useInvites";
import { useToast } from "@/hooks/use-toast";

interface ShareWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
}

export function ShareWorkspaceModal({ isOpen, onClose, workspaceId, workspaceName }: ShareWorkspaceModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [isCreating, setIsCreating] = useState(false);
  
  const { data: invites = [], isLoading } = useWorkspaceInvites(workspaceId);
  const createInviteMutation = useCreateInvite();
  const deleteInviteMutation = useDeleteInvite();
  const { toast } = useToast();

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        variant: "destructive",
        title: "Email obrigatório",
        description: "Digite um email para enviar o convite.",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      await createInviteMutation.mutateAsync({
        workspace_id: workspaceId,
        email: email.trim().toLowerCase(),
        role,
      });
      
      setEmail("");
      setRole("editor");
    } catch (error) {
      console.error('Failed to create invite:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (confirm('Tem certeza que deseja remover este convite?')) {
      await deleteInviteMutation.mutateAsync(inviteId);
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Link copiado!",
      description: "O link de convite foi copiado para a área de transferência.",
    });
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'editor': return 'Editor';
      case 'viewer': return 'Visualizador';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'editor': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compartilhar Workspace</DialogTitle>
          <DialogDescription>
            Convide pessoas para colaborar no workspace "{workspaceName}".
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Create new invite */}
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="usuario@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invite-role">Permissão</Label>
                <Select value={role} onValueChange={(value: "admin" | "editor" | "viewer") => setRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button type="submit" disabled={isCreating || !email.trim()}>
              {isCreating ? 'Enviando...' : 'Enviar Convite'}
            </Button>
          </form>

          {/* Existing invites */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-text-secondary">Convites Pendentes</h4>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : invites.length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-4">
                Nenhum convite pendente
              </p>
            ) : (
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-text-tertiary" />
                      <div>
                        <div className="font-medium text-sm">{invite.email}</div>
                        <div className="text-xs text-text-tertiary">
                          Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleColor(invite.role)}>
                        {getRoleDisplayName(invite.role)}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyInviteLink(invite.token)}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteInvite(invite.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
