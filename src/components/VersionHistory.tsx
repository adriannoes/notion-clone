import { useState } from "react";
import { History, RotateCcw, Trash2, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePageVersions, useRestoreVersion, useDeleteVersion, formatVersionDate } from "@/hooks/useVersions";
import { useToast } from "@/hooks/use-toast";

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  pageTitle: string;
}

export function VersionHistory({ isOpen, onClose, pageId, pageTitle }: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const { data: versions = [], isLoading } = usePageVersions(pageId);
  const restoreVersionMutation = useRestoreVersion();
  const deleteVersionMutation = useDeleteVersion();
  const { toast } = useToast();

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm('Tem certeza que deseja restaurar esta versão? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsRestoring(true);
    
    try {
      await restoreVersionMutation.mutateAsync(versionId);
      onClose();
    } catch (error) {
      console.error('Failed to restore version:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta versão?')) {
      return;
    }

    await deleteVersionMutation.mutateAsync(versionId);
  };

  const selectedVersionData = versions.find(v => v.id === selectedVersion);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </DialogTitle>
          <DialogDescription>
            Histórico de versões para "{pageTitle}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Versions List */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Versões</h4>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : versions.length === 0 ? (
              <p className="text-sm text-text-tertiary text-center py-8">
                Nenhuma versão encontrada
              </p>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedVersion === version.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-hover-bg'
                      }`}
                      onClick={() => setSelectedVersion(version.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-text-tertiary" />
                          <span className="text-sm font-medium">
                            {version.profiles?.full_name || 'Usuário'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-text-tertiary" />
                          <span className="text-xs text-text-tertiary">
                            {formatVersionDate(version.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-sm text-text-secondary mb-2">
                        {version.title}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {Array.isArray(version.blocks) ? version.blocks.length : 0} blocos
                        </Badge>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreVersion(version.id);
                            }}
                            disabled={isRestoring}
                            className="h-6 w-6 p-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVersion(version.id);
                            }}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Version Preview */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Preview</h4>
            
            {selectedVersionData ? (
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  <div className="p-4 border border-border rounded-lg bg-content-bg">
                    <h3 className="font-semibold text-lg mb-3">
                      {selectedVersionData.title}
                    </h3>
                    
                    <div className="space-y-2">
                      {Array.isArray(selectedVersionData.blocks) && selectedVersionData.blocks.length > 0 ? (
                        selectedVersionData.blocks.map((block: any, index: number) => (
                          <div key={index} className="text-sm text-text-secondary">
                            {block.type === 'heading1' && (
                              <h1 className="text-lg font-semibold">{block.content}</h1>
                            )}
                            {block.type === 'heading2' && (
                              <h2 className="text-base font-semibold">{block.content}</h2>
                            )}
                            {block.type === 'heading3' && (
                              <h3 className="text-sm font-semibold">{block.content}</h3>
                            )}
                            {block.type === 'paragraph' && (
                              <p>{block.content}</p>
                            )}
                            {block.type === 'bulleted-list' && (
                              <div className="flex items-start gap-2">
                                <span className="text-text-tertiary">•</span>
                                <span>{block.content}</span>
                              </div>
                            )}
                            {block.type === 'numbered-list' && (
                              <div className="flex items-start gap-2">
                                <span className="text-text-tertiary">{index + 1}.</span>
                                <span>{block.content}</span>
                              </div>
                            )}
                            {block.type === 'code' && (
                              <pre className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
                                {block.content}
                              </pre>
                            )}
                            {block.type === 'quote' && (
                              <blockquote className="border-l-4 border-border pl-3 italic">
                                {block.content}
                              </blockquote>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-text-tertiary italic">Nenhum conteúdo nesta versão</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRestoreVersion(selectedVersionData.id)}
                      disabled={isRestoring}
                      className="flex-1"
                    >
                      {isRestoring ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Restaurando...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restaurar esta versão
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center justify-center h-96 text-text-tertiary">
                <div className="text-center">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecione uma versão para visualizar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
