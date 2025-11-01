import { useState } from "react";
import { Code, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

interface CodeBlockProps {
  content: string;
  onChange: (content: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isHovered: boolean;
}

export function CodeBlock({ content, onChange, onKeyDown, isHovered }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="relative bg-sidebar-bg border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-hover-bg border-b border-border">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-text-tertiary" />
          <span className="text-sm text-text-secondary font-medium">Code</span>
        </div>
        {isHovered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="// Start coding..."
        className={cn(
          "w-full bg-transparent border-none outline-none resize-none",
          "text-sm font-mono text-text-primary placeholder-text-placeholder",
          "p-4 min-h-[120px]"
        )}
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          lineHeight: '1.5',
          tabSize: 2
        }}
      />
    </div>
  );
}