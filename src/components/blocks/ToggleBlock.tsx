import { useState } from "react";
import { ChevronRight, ChevronDown, Plus } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ToggleBlockProps {
  content: string;
  onChange: (content: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onAddChild?: () => void;
  children?: React.ReactNode;
}

export function ToggleBlock({ content, onChange, onKeyDown, onAddChild, children }: ToggleBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="space-y-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="mt-1 p-0.5 rounded hover:bg-hover-bg transition-colors"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-text-secondary" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-secondary" />
          )}
        </button>
        <RichTextEditor
          content={content}
          onChange={onChange}
          placeholder="Toggle heading..."
          className="flex-1 text-text-primary font-medium"
          onKeyDown={onKeyDown}
        />
        {isHovered && onAddChild && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-hover-bg opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onAddChild}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
      {isOpen && (
        <div className="ml-6 pl-4 border-l-2 border-border space-y-2 animate-accordion-down">
          {children}
          {onAddChild && (
            <div className="group cursor-pointer" onClick={onAddChild}>
              <div className="flex items-center gap-2 py-1 text-text-placeholder group-hover:text-text-secondary transition-colors">
                <Plus className="h-3 w-3" />
                <span className="text-sm">Add a block</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}