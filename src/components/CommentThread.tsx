import { useState } from "react";
import { MessageSquare, Reply, Trash2, CheckCircle2, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useComments, useCreateComment, useDeleteComment, useResolveComment } from "@/hooks/useComments";
import { useAuth } from "@/contexts/AuthContext";
import type { Comment } from "@/hooks/useComments";

interface CommentThreadProps {
  blockId: string;
  pageId: string;
  className?: string;
}

function CommentItem({ comment, onReply, onDelete, onResolve }: {
  comment: Comment;
  onReply: (parentId: string) => void;
  onDelete: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const { user } = useAuth();
  const isOwner = user?.id === comment.user_id;
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const createCommentMutation = useCreateComment();

  const handleReply = async () => {
    if (!replyText.trim()) return;

    await createCommentMutation.mutateAsync({
      block_id: comment.block_id,
      page_id: comment.page_id,
      content: replyText.trim(),
      parent_id: comment.id,
    });

    setReplyText("");
    setShowReplyForm(false);
  };

  const userName = comment.profiles?.full_name || comment.profiles?.email || "Usuário";
  const userInitials = userName.charAt(0).toUpperCase();

  return (
    <div className={cn("space-y-2", comment.resolved && "opacity-60")}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary text-sm">{userName}</span>
            <span className="text-xs text-text-tertiary">
              {format(new Date(comment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>
          
          <p className="text-sm text-text-primary whitespace-pre-wrap">{comment.content}</p>
          
          <div className="flex items-center gap-2">
            {!comment.resolved && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Responder
                </Button>
                {isOwner && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onResolve(comment.id)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolver
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive"
                      onClick={() => onDelete(comment.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Deletar
                    </Button>
                  </>
                )}
              </>
            )}
            {comment.resolved && (
              <span className="text-xs text-text-tertiary">Resolvido</span>
            )}
          </div>

          {showReplyForm && (
            <div className="mt-2 space-y-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Escreva uma resposta..."
                rows={2}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={!replyText.trim() || createCommentMutation.isPending}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Enviar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-4 mt-2 space-y-2 border-l-2 border-border pl-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onReply={onReply}
                  onDelete={onDelete}
                  onResolve={onResolve}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentThread({ blockId, pageId, className }: CommentThreadProps) {
  const { data: comments = [], isLoading } = useComments(blockId, pageId);
  const [showNewComment, setShowNewComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const createCommentMutation = useCreateComment();
  const deleteCommentMutation = useDeleteComment();
  const resolveCommentMutation = useResolveComment();

  const handleCreateComment = async () => {
    if (!newCommentText.trim()) return;

    await createCommentMutation.mutateAsync({
      block_id: blockId,
      page_id: pageId,
      content: newCommentText.trim(),
    });

    setNewCommentText("");
    setShowNewComment(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja deletar este comentário?")) {
      await deleteCommentMutation.mutateAsync(id);
    }
  };

  const handleResolve = async (id: string) => {
    await resolveCommentMutation.mutateAsync({
      id,
      updates: { resolved: true },
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comentários ({comments.length})
        </h3>
        {!showNewComment && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNewComment(true)}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Adicionar comentário
          </Button>
        )}
      </div>

      {showNewComment && (
        <div className="space-y-2">
          <Textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Escreva um comentário..."
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateComment}
              disabled={!newCommentText.trim() || createCommentMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowNewComment(false);
                setNewCommentText("");
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4 text-text-tertiary text-sm">
          Carregando comentários...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-text-tertiary text-sm">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum comentário ainda.</p>
          <p>Seja o primeiro a comentar!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={() => {}}
              onDelete={handleDelete}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}

