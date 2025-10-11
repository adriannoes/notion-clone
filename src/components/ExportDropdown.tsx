import { useState } from "react";
import { ChevronDown, Download, FileText, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { exportToMarkdown, importFromMarkdown } from "@/lib/markdown";
import { useToast } from "@/hooks/use-toast";
import type { Block } from "@/components/Editor";

interface ExportDropdownProps {
  title: string;
  blocks: Block[];
  onImport?: (title: string, blocks: Block[]) => void;
  disabled?: boolean;
}

export function ExportDropdown({ title, blocks, onImport, disabled }: ExportDropdownProps) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleExportMarkdown = async () => {
    try {
      const markdown = await exportToMarkdown(blocks, title);

      // Create and download file
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'untitled'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportado!",
        description: "Arquivo Markdown baixado com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível exportar o arquivo.",
      });
    }
  };

  const handleExportJSON = () => {
    try {
      const data = {
        title,
        blocks,
        exportedAt: new Date().toISOString(),
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'untitled'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportado!",
        description: "Arquivo JSON baixado com sucesso.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na exportação",
        description: "Não foi possível exportar o arquivo.",
      });
    }
  };

  const handleImportMarkdown = async () => {
    if (!importText.trim()) {
      toast({
        variant: "destructive",
        title: "Texto vazio",
        description: "Cole o conteúdo do arquivo Markdown.",
      });
      return;
    }

    setIsImporting(true);

    try {
      const { title: importedTitle, blocks: importedBlocks } = await importFromMarkdown(importText);

      if (onImport) {
        onImport(importedTitle, importedBlocks);
      }

      toast({
        title: "Importado!",
        description: `Página "${importedTitle}" importada com sucesso.`,
      });

      setIsImportDialogOpen(false);
      setImportText("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: "Não foi possível importar o arquivo Markdown.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={disabled} className="h-9 px-3">
            <Download className="h-4 w-4 mr-2" />
            Exportar
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportMarkdown}>
            <FileText className="h-4 w-4 mr-2" />
            Exportar como Markdown
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleExportJSON}>
            <Code className="h-4 w-4 mr-2" />
            Exportar como JSON
          </DropdownMenuItem>

          {onImport && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Importar Markdown
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Markdown</DialogTitle>
            <DialogDescription>
              Cole o conteúdo de um arquivo Markdown ou selecione um arquivo para importar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="markdown-input">Conteúdo Markdown</Label>
              <Textarea
                id="markdown-input"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Cole o conteúdo do arquivo Markdown aqui..."
                rows={10}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="file-input" className="text-sm text-text-secondary">
                Ou selecione um arquivo:
              </Label>
              <Input
                id="file-input"
                type="file"
                accept=".md,.markdown"
                onChange={handleFileImport}
                className="w-auto"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsImportDialogOpen(false);
                  setImportText("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImportMarkdown}
                disabled={isImporting || !importText.trim()}
              >
                {isImporting ? 'Importando...' : 'Importar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
