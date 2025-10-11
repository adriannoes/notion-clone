import { useState, useRef, useEffect } from "react";
import { Plus, GripVertical, Trash2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ImageBlock } from "@/components/blocks/ImageBlock";
import { QuoteBlock } from "@/components/blocks/QuoteBlock";
import { CodeBlock } from "@/components/blocks/CodeBlock";
import { CalloutBlock } from "@/components/blocks/CalloutBlock";
import { ToggleBlock } from "@/components/blocks/ToggleBlock";
import { TableBlock, type TableMetadata } from "@/components/blocks/TableBlock";
import { SlashMenu } from "@/components/SlashMenu";

export type BlockType = "paragraph" | "heading1" | "heading2" | "heading3" | "bulleted-list" | "numbered-list" | "divider" | "image" | "code" | "quote" | "callout" | "toggle" | "table";

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  metadata?: Record<string, any>;
  children?: Block[];
}

interface EditorProps {
  title: string;
  blocks: Block[];
  onTitleChange: (title: string) => void;
  onBlocksChange: (blocks: Block[]) => void;
}

// Moved to SlashMenu component

export function Editor({ title, blocks, onTitleChange, onBlocksChange }: EditorProps) {
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState<{ blockId: string; position: { top: number; left: number }; search: string } | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);
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
    metadata: {},
    children: [],
  });

  const addBlock = (afterId?: string, type: BlockType = "paragraph", parentId?: string) => {
    const newBlock = createBlock(type);
    
    if (parentId) {
      // Add block as child of parent
      const newBlocks = blocks.map(block => {
        if (block.id === parentId) {
          return {
            ...block,
            children: [...(block.children || []), newBlock]
          };
        }
        return block;
      });
      onBlocksChange(newBlocks);
    } else if (!afterId) {
      onBlocksChange([...blocks, newBlock]);
    } else {
      const index = blocks.findIndex(b => b.id === afterId);
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      onBlocksChange(newBlocks);
    }
    setShowSlashMenu(null);
  };

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    const updateBlockRecursive = (blocks: Block[]): Block[] => {
      return blocks.map(block => {
        if (block.id === blockId) {
          return { ...block, ...updates };
        }
        if (block.children) {
          return { ...block, children: updateBlockRecursive(block.children) };
        }
        return block;
      });
    };
    onBlocksChange(updateBlockRecursive(blocks));
  };

  const deleteBlock = (blockId: string) => {
    const deleteBlockRecursive = (blocks: Block[]): Block[] => {
      return blocks.filter(block => block.id !== blockId).map(block => {
        if (block.children) {
          return { ...block, children: deleteBlockRecursive(block.children) };
        }
        return block;
      });
    };
    
    const newBlocks = deleteBlockRecursive(blocks);
    if (newBlocks.length === 0) {
      // Don't delete if it would result in no blocks
      return;
    }
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
    } else if (e.key === "/" && showSlashMenu === null) {
      // Show slash menu
      const target = e.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      setShowSlashMenu({
        blockId,
        position: { top: rect.bottom + 5, left: rect.left },
        search: ""
      });
    }
  };

  const handleSlashMenuSelect = (type: BlockType) => {
    if (showSlashMenu) {
      const blockIndex = blocks.findIndex(b => b.id === showSlashMenu.blockId);
      updateBlock(showSlashMenu.blockId, { type });
      setShowSlashMenu(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggedBlock(blockId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    
    if (!draggedBlock || draggedBlock === targetBlockId) {
      setDraggedBlock(null);
      return;
    }

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlock);
    const targetIndex = blocks.findIndex(b => b.id === targetBlockId);
    
    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, removed);
    
    onBlocksChange(newBlocks);
    setDraggedBlock(null);
  };

  const renderBlock = (block: Block, index: number) => {
    const isHovered = hoveredBlockId === block.id;
    const isDragged = draggedBlock === block.id;
    
    const commonProps = {
      content: block.content,
      onChange: (content: string) => updateBlock(block.id, { content }),
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, block.id, index),
    };

    let blockContent;

    switch (block.type) {
      case "heading1":
        blockContent = (
          <RichTextEditor
            {...commonProps}
            placeholder="Heading 1"
            className="text-3xl font-bold text-text-primary leading-tight"
          />
        );
        break;
      case "heading2":
        blockContent = (
          <RichTextEditor
            {...commonProps}
            placeholder="Heading 2"
            className="text-2xl font-semibold text-text-primary leading-tight"
          />
        );
        break;
      case "heading3":
        blockContent = (
          <RichTextEditor
            {...commonProps}
            placeholder="Heading 3"
            className="text-xl font-medium text-text-primary leading-tight"
          />
        );
        break;
      case "bulleted-list":
        blockContent = (
          <div className="flex items-start">
            <div className="w-1.5 h-1.5 bg-text-primary rounded-full mt-2 mr-3 flex-shrink-0" />
            <RichTextEditor
              {...commonProps}
              placeholder="List item"
              className="flex-1 text-base text-text-primary"
            />
          </div>
        );
        break;
      case "numbered-list":
        blockContent = (
          <div className="flex items-start">
            <span className="text-text-primary font-medium mr-3 flex-shrink-0 mt-0.5">{index + 1}.</span>
            <RichTextEditor
              {...commonProps}
              placeholder="List item"
              className="flex-1 text-base text-text-primary"
            />
          </div>
        );
        break;
      case "image":
        blockContent = (
          <ImageBlock
            content={block.content}
            onChange={(content) => updateBlock(block.id, { content })}
            onDelete={() => deleteBlock(block.id)}
            isHovered={isHovered}
          />
        );
        break;
      case "code":
        blockContent = (
          <CodeBlock
            content={block.content}
            onChange={(content) => updateBlock(block.id, { content })}
            onKeyDown={(e) => handleKeyDown(e, block.id, index)}
            isHovered={isHovered}
          />
        );
        break;
      case "quote":
        blockContent = (
          <QuoteBlock
            content={block.content}
            onChange={(content) => updateBlock(block.id, { content })}
            onKeyDown={(e) => handleKeyDown(e, block.id, index)}
          />
        );
        break;
      case "callout":
        blockContent = (
          <CalloutBlock
            content={block.content}
            onChange={(content) => updateBlock(block.id, { content })}
            onKeyDown={(e) => handleKeyDown(e, block.id, index)}
            calloutType={block.metadata?.calloutType || "info"}
            onTypeChange={(type) => updateBlock(block.id, { metadata: { ...block.metadata, calloutType: type } })}
          />
        );
        break;
      case "toggle":
        blockContent = (
          <ToggleBlock
            content={block.content}
            onChange={(content) => updateBlock(block.id, { content })}
            onKeyDown={(e) => handleKeyDown(e, block.id, index)}
            onAddChild={() => addBlock(undefined, "paragraph", block.id)}
          >
            {block.children && block.children.length > 0 && (
              <div className="space-y-2">
                {block.children.map((childBlock, childIndex) => 
                  renderNestedBlock(childBlock, childIndex, block.id)
                )}
              </div>
            )}
          </ToggleBlock>
        );
        break;
      case "table":
        blockContent = (
          <TableBlock
            content={block.content}
            metadata={block.metadata || { rows: 3, cols: 3, headerRow: true, headerCol: false }}
            onChange={(content, metadata) => updateBlock(block.id, { content, metadata })}
            onDelete={() => deleteBlock(block.id)}
            isHovered={hoveredBlockId === block.id}
          />
        );
        break;
      case "divider":
        blockContent = (
          <div className="flex items-center py-4">
            <div className="h-px bg-divider flex-1" />
          </div>
        );
        break;
      default:
        blockContent = (
          <RichTextEditor
            {...commonProps}
            placeholder="Type '/' for commands"
            className="text-base text-text-primary leading-relaxed"
          />
        );
        break;
    }

    return (
      <div
        key={block.id}
        className={cn(
          "group relative py-1",
          isDragged && "opacity-50",
          "transition-all duration-150"
        )}
        onMouseEnter={() => setHoveredBlockId(block.id)}
        onMouseLeave={() => setHoveredBlockId(null)}
        draggable
        onDragStart={(e) => handleDragStart(e, block.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, block.id)}
      >
        {blockContent}
        
        {isHovered && (
          <div className="absolute left-[-48px] top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-hover-bg cursor-grab"
              onMouseDown={() => setDraggedBlock(block.id)}
            >
              <GripVertical className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-hover-bg"
              onClick={() => {
                const target = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement;
                const rect = target?.getBoundingClientRect();
                if (rect) {
                  setShowSlashMenu({
                    blockId: block.id,
                    position: { top: rect.bottom + 5, left: rect.left },
                    search: ""
                  });
                }
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderNestedBlock = (block: Block, index: number, parentId: string) => {
    const isHovered = hoveredBlockId === block.id;
    
    const commonProps = {
      content: block.content,
      onChange: (content: string) => updateBlock(block.id, { content }),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          addBlock(undefined, "paragraph", parentId);
        } else if (e.key === "Backspace" && block.content === "") {
          e.preventDefault();
          deleteBlock(block.id);
        }
      },
    };

    let blockContent;
    switch (block.type) {
      case "heading1":
        blockContent = (
          <RichTextEditor
            {...commonProps}
            placeholder="Heading 1"
            className="text-2xl font-bold text-text-primary leading-tight"
          />
        );
        break;
      case "heading2":
        blockContent = (
          <RichTextEditor
            {...commonProps}
            placeholder="Heading 2"
            className="text-xl font-semibold text-text-primary leading-tight"
          />
        );
        break;
      case "heading3":
        blockContent = (
          <RichTextEditor
            {...commonProps}
            placeholder="Heading 3"
            className="text-lg font-medium text-text-primary leading-tight"
          />
        );
        break;
      case "bulleted-list":
        blockContent = (
          <div className="flex items-start">
            <div className="w-1.5 h-1.5 bg-text-primary rounded-full mt-2 mr-3 flex-shrink-0" />
            <RichTextEditor
              {...commonProps}
              placeholder="List item"
              className="flex-1 text-base text-text-primary"
            />
          </div>
        );
        break;
      case "numbered-list":
        blockContent = (
          <div className="flex items-start">
            <span className="text-text-primary font-medium mr-3 flex-shrink-0 mt-0.5">{index + 1}.</span>
            <RichTextEditor
              {...commonProps}
              placeholder="List item"
              className="flex-1 text-base text-text-primary"
            />
          </div>
        );
        break;
      default:
        blockContent = (
          <RichTextEditor
            {...commonProps}
            placeholder="Type text here..."
            className="text-base text-text-primary leading-relaxed"
          />
        );
        break;
    }

    return (
      <div
        key={block.id}
        className={cn(
          "group relative py-1",
          "transition-all duration-150"
        )}
        onMouseEnter={() => setHoveredBlockId(block.id)}
        onMouseLeave={() => setHoveredBlockId(null)}
      >
        {blockContent}
        
        {isHovered && (
          <div className="absolute left-[-32px] top-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
  };

  return (
    <div className="flex-1 bg-editor-bg">
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <RichTextEditor
            content={title}
            onChange={onTitleChange}
            placeholder="Untitled"
            className="text-5xl font-bold text-text-primary leading-tight"
            autoFocus
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

        {/* Slash Menu */}
        {showSlashMenu && (
          <SlashMenu
            onSelect={handleSlashMenuSelect}
            onClose={() => setShowSlashMenu(null)}
            position={showSlashMenu.position}
            search={showSlashMenu.search}
          />
        )}
      </div>
    </div>
  );
}