import { useState, useRef, useEffect } from "react";
import { Plus, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BlockType = "paragraph" | "heading1" | "heading2" | "heading3" | "bulleted-list" | "numbered-list" | "divider";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
}

interface EditorProps {
  title: string;
  blocks: Block[];
  onTitleChange: (title: string) => void;
  onBlocksChange: (blocks: Block[]) => void;
}

const BLOCK_TYPES = [
  { type: "paragraph" as BlockType, label: "Text", description: "Just start writing with plain text." },
  { type: "heading1" as BlockType, label: "Heading 1", description: "Big section heading." },
  { type: "heading2" as BlockType, label: "Heading 2", description: "Medium section heading." },
  { type: "heading3" as BlockType, label: "Heading 3", description: "Small section heading." },
  { type: "bulleted-list" as BlockType, label: "Bulleted list", description: "Create a simple bulleted list." },
  { type: "numbered-list" as BlockType, label: "Numbered list", description: "Create a list with numbering." },
  { type: "divider" as BlockType, label: "Divider", description: "Visually divide blocks." },
];

export function Editor({ title, blocks, onTitleChange, onBlocksChange }: EditorProps) {
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState<string | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto';
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`;
    }
  }, [title]);

  const createBlock = (type: BlockType = "paragraph"): Block => ({
    id: Math.random().toString(36).substring(2),
    type,
    content: "",
  });

  const addBlock = (afterId?: string, type: BlockType = "paragraph") => {
    const newBlock = createBlock(type);
    if (!afterId) {
      onBlocksChange([...blocks, newBlock]);
    } else {
      const index = blocks.findIndex(b => b.id === afterId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      onBlocksChange(newBlocks);
    }
    setShowBlockMenu(null);
  };

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    );
    onBlocksChange(newBlocks);
  };

  const deleteBlock = (blockId: string) => {
    if (blocks.length === 1) return; // Don't delete the last block
    const newBlocks = blocks.filter(block => block.id !== blockId);
    onBlocksChange(newBlocks);
  };

  const handleKeyDown = (e: React.KeyboardEvent, blockId: string, blockIndex: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addBlock(blockId);
    } else if (e.key === "Backspace") {
      const block = blocks.find(b => b.id === blockId);
      if (block && block.content === "" && blocks.length > 1) {
        e.preventDefault();
        deleteBlock(blockId);
        // Focus previous block if exists
        if (blockIndex > 0) {
          setTimeout(() => {
            const prevBlockElement = document.querySelector(`[data-block-id="${blocks[blockIndex - 1].id}"]`) as HTMLElement;
            prevBlockElement?.focus();
          }, 0);
        }
      }
    }
  };

  const renderBlock = (block: Block, index: number) => {
    const isHovered = hoveredBlockId === block.id;
    
    const baseClasses = "w-full bg-transparent border-none outline-none resize-none placeholder-text-placeholder transition-colors duration-150";
    
    let Component: keyof JSX.IntrinsicElements = "textarea";
    let className = "";
    let placeholder = "Type '/' for commands";

    switch (block.type) {
      case "heading1":
        className = `${baseClasses} text-3xl font-bold text-text-primary leading-tight`;
        placeholder = "Heading 1";
        break;
      case "heading2":
        className = `${baseClasses} text-2xl font-semibold text-text-primary leading-tight`;
        placeholder = "Heading 2";
        break;
      case "heading3":
        className = `${baseClasses} text-xl font-medium text-text-primary leading-tight`;
        placeholder = "Heading 3";
        break;
      case "bulleted-list":
        className = `${baseClasses} text-base text-text-primary pl-6`;
        placeholder = "List item";
        break;
      case "numbered-list":
        className = `${baseClasses} text-base text-text-primary pl-6`;
        placeholder = "List item";
        break;
      case "divider":
        return (
          <div
            key={block.id}
            className="group relative py-3"
            onMouseEnter={() => setHoveredBlockId(block.id)}
            onMouseLeave={() => setHoveredBlockId(null)}
          >
            <div className="flex items-center">
              <div className="h-px bg-divider flex-1" />
            </div>
            {isHovered && (
              <div className="absolute left-[-24px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-hover-bg"
                  onClick={() => deleteBlock(block.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        );
      default:
        className = `${baseClasses} text-base text-text-primary leading-relaxed`;
        break;
    }

    return (
      <div
        key={block.id}
        className="group relative"
        onMouseEnter={() => setHoveredBlockId(block.id)}
        onMouseLeave={() => setHoveredBlockId(null)}
      >
        <div className="flex items-start">
          {(block.type === "bulleted-list" || block.type === "numbered-list") && (
            <div className="absolute left-0 top-0 pt-1">
              {block.type === "bulleted-list" ? (
                <div className="w-1.5 h-1.5 bg-text-primary rounded-full mt-2" />
              ) : (
                <span className="text-text-primary font-medium">{index + 1}.</span>
              )}
            </div>
          )}
          
          <textarea
            data-block-id={block.id}
            className={className}
            value={block.content}
            placeholder={placeholder}
            rows={1}
            onChange={(e) => {
              updateBlock(block.id, { content: e.target.value });
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onKeyDown={(e) => handleKeyDown(e, block.id, index)}
          />
        </div>
        
        {isHovered && (
          <div className="absolute left-[-24px] top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-hover-bg"
              onClick={() => setShowBlockMenu(showBlockMenu === block.id ? null : block.id)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
        
        {showBlockMenu === block.id && (
          <div className="absolute left-0 top-8 z-10 bg-background border border-border rounded-lg shadow-lg p-2 min-w-64">
            <div className="space-y-1">
              {BLOCK_TYPES.map(({ type, label, description }) => (
                <button
                  key={type}
                  className="w-full text-left p-2 rounded hover:bg-hover-bg transition-colors group"
                  onClick={() => addBlock(block.id, type)}
                >
                  <div className="font-medium text-text-primary text-sm">{label}</div>
                  <div className="text-text-tertiary text-xs">{description}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 bg-editor-bg">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <textarea
            ref={titleRef}
            className="w-full text-5xl font-bold text-text-primary bg-transparent border-none outline-none resize-none placeholder-text-placeholder leading-tight"
            placeholder="Untitled"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            rows={1}
          />
        </div>
        
        {/* Blocks */}
        <div className="space-y-2">
          {blocks.map((block, index) => renderBlock(block, index))}
          
          {blocks.length === 0 && (
            <div
              className="group cursor-pointer"
              onClick={() => addBlock()}
            >
              <div className="flex items-center gap-2 py-2 text-text-placeholder group-hover:text-text-secondary transition-colors">
                <Plus className="h-4 w-4" />
                <span>Click to add your first block</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}