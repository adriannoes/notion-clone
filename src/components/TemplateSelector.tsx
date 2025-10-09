import { FileText, CheckSquare, Calendar, Code, Lightbulb, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTemplates, useDeleteTemplate } from "@/hooks/useTemplates";
import type { Block } from "@/components/Editor";

export type TemplateType = "blank" | "todo" | "meeting" | "code" | "brainstorm";

interface Template {
  id: TemplateType;
  name: string;
  description: string;
  icon: React.ReactNode;
  blocks: Block[];
}

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: TemplateType, blocks: Block[]) => void;
}

const templates: Template[] = [
  {
    id: "blank",
    name: "Blank Page",
    description: "Start with an empty page",
    icon: <FileText className="h-5 w-5" />,
    blocks: [
      { id: "1", type: "paragraph", content: "" }
    ]
  },
  {
    id: "todo",
    name: "Todo List",
    description: "Task list template",
    icon: <CheckSquare className="h-5 w-5" />,
    blocks: [
      { id: "1", type: "heading1", content: "Todo List" },
      { id: "2", type: "heading2", content: "Today" },
      { id: "3", type: "bulleted-list", content: "Task 1" },
      { id: "4", type: "bulleted-list", content: "Task 2" },
      { id: "5", type: "heading2", content: "Later" },
      { id: "6", type: "bulleted-list", content: "Task 3" }
    ]
  },
  {
    id: "meeting",
    name: "Meeting Notes",
    description: "Template for meeting notes",
    icon: <Calendar className="h-5 w-5" />,
    blocks: [
      { id: "1", type: "heading1", content: "Meeting Notes" },
      { id: "2", type: "heading2", content: "Date & Time" },
      { id: "3", type: "paragraph", content: "" },
      { id: "4", type: "heading2", content: "Attendees" },
      { id: "5", type: "bulleted-list", content: "" },
      { id: "6", type: "heading2", content: "Agenda" },
      { id: "7", type: "numbered-list", content: "" },
      { id: "8", type: "heading2", content: "Notes" },
      { id: "9", type: "paragraph", content: "" },
      { id: "10", type: "heading2", content: "Action Items" },
      { id: "11", type: "bulleted-list", content: "" }
    ]
  },
  {
    id: "code",
    name: "Code Documentation",
    description: "Document your code",
    icon: <Code className="h-5 w-5" />,
    blocks: [
      { id: "1", type: "heading1", content: "Documentation" },
      { id: "2", type: "heading2", content: "Overview" },
      { id: "3", type: "paragraph", content: "" },
      { id: "4", type: "heading2", content: "Code Example" },
      { id: "5", type: "code", content: "// Your code here" },
      { id: "6", type: "heading2", content: "Notes" },
      { id: "7", type: "paragraph", content: "" }
    ]
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    description: "Capture ideas",
    icon: <Lightbulb className="h-5 w-5" />,
    blocks: [
      { id: "1", type: "heading1", content: "Brainstorm" },
      { id: "2", type: "paragraph", content: "Let's capture some ideas..." },
      { id: "3", type: "divider", content: "" },
      { id: "4", type: "heading2", content: "Ideas" },
      { id: "5", type: "bulleted-list", content: "" },
      { id: "6", type: "heading2", content: "Next Steps" },
      { id: "7", type: "numbered-list", content: "" }
    ]
  }
];

export function TemplateSelector({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const { data: userTemplates = [], isLoading } = useTemplates();
  const deleteTemplateMutation = useDeleteTemplate();

  const handleSelect = (template: Template) => {
    onSelect(template.id, template.blocks);
    onClose();
  };

  const handleSelectUserTemplate = (template: any) => {
    // Parse the blocks from JSON
    const blocks = JSON.parse(template.blocks || '[]');
    onSelect('blank' as TemplateType, blocks);
    onClose();
  };

  const handleDeleteUserTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja deletar este template?')) {
      await deleteTemplateMutation.mutateAsync(templateId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Escolher template</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="default" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="default">Templates Padrão</TabsTrigger>
            <TabsTrigger value="custom">Meus Templates</TabsTrigger>
          </TabsList>
          
          <TabsContent value="default" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  onClick={() => handleSelect(template)}
                  className="h-auto flex-col items-start p-4 hover:bg-hover-bg hover:border-primary"
                >
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    {template.icon}
                    <span className="font-semibold">{template.name}</span>
                  </div>
                  <p className="text-xs text-text-tertiary text-left">
                    {template.description}
                  </p>
                </Button>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="custom" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : userTemplates.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Você ainda não criou nenhum template personalizado.</p>
                <p className="text-sm">Crie uma página e salve-a como template!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {userTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    onClick={() => handleSelectUserTemplate(template)}
                    className="h-auto flex-col items-start p-4 hover:bg-hover-bg hover:border-primary group relative"
                  >
                    <div className="flex items-center gap-2 mb-2 text-primary w-full">
                      <User className="h-5 w-5" />
                      <span className="font-semibold flex-1">{template.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleDeleteUserTemplate(template.id, e)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-xs text-text-tertiary text-left">
                      {template.description || 'Template personalizado'}
                    </p>
                  </Button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
