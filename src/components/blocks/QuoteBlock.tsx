import { Quote } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";

interface QuoteBlockProps {
  content: string;
  onChange: (content: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function QuoteBlock({ content, onChange, onKeyDown }: QuoteBlockProps) {
  return (
    <div className="flex items-start gap-3 pl-4 border-l-4 border-text-tertiary/30 bg-hover-bg/30 py-2 rounded-r-md">
      <Quote className="h-5 w-5 text-text-tertiary mt-1 flex-shrink-0" />
      <RichTextEditor
        content={content}
        onChange={onChange}
        placeholder="Quote something inspiring..."
        className="flex-1 text-text-secondary italic text-lg leading-relaxed"
        onKeyDown={onKeyDown}
      />
    </div>
  );
}