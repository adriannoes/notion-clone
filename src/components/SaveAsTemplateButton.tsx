import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateTemplate } from "@/hooks/useTemplates";
import { useToast } from "@/hooks/use-toast";
import type { Block } from "@/components/Editor";

interface SaveAsTemplateButtonProps {
  title: string;
  blocks: Block[];
  disabled?: boolean;
}

export function SaveAsTemplateButton({ title, blocks, disabled }: SaveAsTemplateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createTemplateMutation = useCreateTemplate();
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templateName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Digite um nome para o template.",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createTemplateMutation.mutateAsync({
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        blocks: JSON.stringify(blocks),
        is_public: false,
      });
      
      toast({
        title: "Template salvo!",
        description: "Seu template foi salvo com sucesso.",
      });
      
      setIsOpen(false);
      setTemplateName("");
      setTemplateDescription("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar template",
        description: "Não foi possível salvar o template.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || blocks.length === 0}
          className="h-9 px-3"
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar como Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar como Template</DialogTitle>
          <DialogDescription>
            Salve esta página como um template personalizado para reutilizar no futuro.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nome do Template *</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ex: Minha Lista de Tarefas"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="template-description">Descrição (opcional)</Label>
            <Textarea
              id="template-description"
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Descreva o que este template contém..."
              rows={3}
            />
          </div>
          
          <div className="text-sm text-text-tertiary">
            <p><strong>Página:</strong> {title}</p>
            <p><strong>Blocos:</strong> {blocks.length} blocos</p>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !templateName.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Template
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
