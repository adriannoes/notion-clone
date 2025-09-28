import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { cn } from "@/lib/utils";

interface ToggleBlockProps {
  content: string;
  onChange: (content: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  children?: React.ReactNode;
}

export function ToggleBlock({ content, onChange, onKeyDown, children }: ToggleBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
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
      </div>
      {isOpen && children && (
        <div className="ml-6 pl-4 border-l-2 border-border space-y-2 animate-accordion-down">
          {children}
        </div>
      )}
    </div>
  );
}