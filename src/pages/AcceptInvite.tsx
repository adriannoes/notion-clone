import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useInviteByToken, useAcceptInvite } from '@/hooks/useInvites';
import { useToast } from '@/hooks/use-toast';

export default function AcceptInvite() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const [isAccepting, setIsAccepting] = useState(false);
  const { toast } = useToast();

  const { data: invite, isLoading, error } = useInviteByToken(token || '');
  const acceptInviteMutation = useAcceptInvite();

  // Redirect if already authenticated and on main page
  useEffect(() => {
    if (user && !isLoading && !invite) {
      navigate('/', { replace: true });
    }
  }, [user, isLoading, invite, navigate]);

  const handleAcceptInvite = async () => {
    if (!token) return;

    setIsAccepting(true);
    
    try {
      const workspaceId = await acceptInviteMutation.mutateAsync(token);
      navigate(`/?workspace=${workspaceId}`);
    } catch (error) {
      console.error('Failed to accept invite:', error);
    } finally {
      setIsAccepting(false);
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-lg bg-destructive flex items-center justify-center">
                <XCircle className="w-6 h-6 text-destructive-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Convite Inválido</CardTitle>
            <CardDescription>
              Este convite é inválido, expirou ou já foi usado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Voltar para o início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user email matches invite email
  const emailMatches = user?.email?.toLowerCase() === invite.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Convite para Workspace</CardTitle>
          <CardDescription>
            Você foi convidado para colaborar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg">{invite.workspaces.name}</h3>
            <p className="text-sm text-text-secondary">
              Convite enviado para: <strong>{invite.email}</strong>
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Badge className={getRoleColor(invite.role)}>
              {getRoleDisplayName(invite.role)}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <Clock className="h-4 w-4" />
            <span>
              Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
            </span>
          </div>

          {!user ? (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary text-center">
                Faça login para aceitar este convite
              </p>
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full"
              >
                Fazer Login
              </Button>
            </div>
          ) : !emailMatches ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive text-center">
                Este convite foi enviado para {invite.email}, mas você está logado como {user.email}
              </p>
              <Button 
                onClick={() => navigate('/auth')} 
                variant="outline"
                className="w-full"
              >
                Trocar de conta
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button 
                onClick={handleAcceptInvite}
                disabled={isAccepting}
                className="w-full"
              >
                {isAccepting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Aceitando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aceitar Convite
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
