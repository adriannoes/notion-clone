import { useState, useEffect } from "react";
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  Image, 
  Code, 
  Quote, 
  Info, 
  ChevronRight,
  Minus
} from "lucide-react";
import { BlockType } from "@/components/Editor";
import { cn } from "@/lib/utils";

interface SlashMenuProps {
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  position: { top: number; left: number };
  search?: string;
}

const BLOCK_OPTIONS = [
  { 
    type: "paragraph" as BlockType, 
    label: "Text", 
    description: "Just start writing with plain text.", 
    icon: Type,
    keywords: ["text", "paragraph", "p"]
  },
  { 
    type: "heading1" as BlockType, 
    label: "Heading 1", 
    description: "Big section heading.", 
    icon: Heading1,
    keywords: ["heading", "h1", "title"]
  },
  { 
    type: "heading2" as BlockType, 
    label: "Heading 2", 
    description: "Medium section heading.", 
    icon: Heading2,
    keywords: ["heading", "h2", "subtitle"]
  },
  { 
    type: "heading3" as BlockType, 
    label: "Heading 3", 
    description: "Small section heading.", 
    icon: Heading3,
    keywords: ["heading", "h3"]
  },
  { 
    type: "bulleted-list" as BlockType, 
    label: "Bulleted list", 
    description: "Create a simple bulleted list.", 
    icon: List,
    keywords: ["list", "bullet", "ul"]
  },
  { 
    type: "numbered-list" as BlockType, 
    label: "Numbered list", 
    description: "Create a list with numbering.", 
    icon: ListOrdered,
    keywords: ["list", "numbered", "ol", "ordered"]
  },
  { 
    type: "image" as BlockType, 
    label: "Image", 
    description: "Upload or embed an image.", 
    icon: Image,
    keywords: ["image", "picture", "photo", "img"]
  },
  { 
    type: "code" as BlockType, 
    label: "Code", 
    description: "Capture a code snippet.", 
    icon: Code,
    keywords: ["code", "snippet", "programming"]
  },
  { 
    type: "quote" as BlockType, 
    label: "Quote", 
    description: "Capture a quote or citation.", 
    icon: Quote,
    keywords: ["quote", "citation", "blockquote"]
  },
  { 
    type: "callout" as BlockType, 
    label: "Callout", 
    description: "Make writing stand out.", 
    icon: Info,
    keywords: ["callout", "info", "note", "warning"]
  },
  { 
    type: "toggle" as BlockType, 
    label: "Toggle", 
    description: "Create a toggleable section.", 
    icon: ChevronRight,
    keywords: ["toggle", "collapse", "expand"]
  },
  { 
    type: "divider" as BlockType, 
    label: "Divider", 
    description: "Visually divide blocks.", 
    icon: Minus,
    keywords: ["divider", "separator", "hr"]
  },
];

export function SlashMenu({ onSelect, onClose, position, search = "" }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredOptions = BLOCK_OPTIONS.filter(option => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      option.label.toLowerCase().includes(searchLower) ||
      option.description.toLowerCase().includes(searchLower) ||
      option.keywords.some(keyword => keyword.includes(searchLower))
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredOptions[selectedIndex]) {
            onSelect(filteredOptions[selectedIndex].type);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, filteredOptions, onSelect, onClose]);

  if (filteredOptions.length === 0) {
    return (
      <div
        className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-4 min-w-80"
        style={{ top: position.top, left: position.left }}
      >
        <div className="text-text-tertiary text-sm">No blocks found for "{search}"</div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-2 min-w-80 max-h-80 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {search && (
        <div className="px-3 py-2 text-xs text-text-tertiary border-b border-border mb-2">
          Blocks matching "{search}"
        </div>
      )}
      <div className="space-y-1">
        {filteredOptions.map((option, index) => {
          const Icon = option.icon;
          return (
            <button
              key={option.type}
              className={cn(
                "w-full text-left p-3 rounded-md transition-colors group flex items-start gap-3",
                index === selectedIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-hover-bg"
              )}
              onClick={() => onSelect(option.type)}
            >
              <Icon className={cn(
                "h-5 w-5 mt-0.5 flex-shrink-0",
                index === selectedIndex ? "text-primary-foreground" : "text-text-tertiary"
              )} />
              <div className="min-w-0 flex-1">
                <div className={cn(
                  "font-medium text-sm",
                  index === selectedIndex ? "text-primary-foreground" : "text-text-primary"
                )}>
                  {option.label}
                </div>
                <div className={cn(
                  "text-xs mt-0.5",
                  index === selectedIndex ? "text-primary-foreground/80" : "text-text-tertiary"
                )}>
                  {option.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}