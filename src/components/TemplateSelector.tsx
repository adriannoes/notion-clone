import { FileText, CheckSquare, Calendar, Code, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const handleSelect = (template: Template) => {
    onSelect(template.id, template.blocks);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose a template</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 mt-4">
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
      </DialogContent>
    </Dialog>
  );
}
