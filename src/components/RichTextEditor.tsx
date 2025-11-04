import { useRef, useEffect, useState, useCallback } from "react";
import { Bold, Italic, Underline, Code, Link, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MentionMenu } from "./MentionMenu";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
  workspaceId?: string;
  onMention?: (userId: string, userName: string) => void;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  code: boolean;
}

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder = "Start typing...",
  className = "",
  onKeyDown,
  autoFocus = false,
  workspaceId,
  onMention
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    code: false
  });
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [showMentionMenu, setShowMentionMenu] = useState<{ position: { top: number; left: number }; search: string } | null>(null);

  useEffect(() => {
    if (editorRef.current && autoFocus) {
      editorRef.current.focus();
    }
  }, [autoFocus]);

  const updateFormatState = useCallback(() => {
    setFormatState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      code: false // Custom handling for code
    });
  }, []);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setToolbarPosition({
        top: rect.top - 60,
        left: rect.left + rect.width / 2 - 120
      });
      setShowToolbar(true);
      updateFormatState();
    } else {
      setShowToolbar(false);
    }
  }, [updateFormatState]);

  const detectMention = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    
    if (textNode.nodeType === Node.TEXT_NODE) {
      const text = textNode.textContent || '';
      const cursorPosition = range.startOffset;
      const textBeforeCursor = text.substring(0, cursorPosition);
      
      // Check for @mention pattern
      const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
      
      if (mentionMatch && workspaceId && onMention) {
        const search = mentionMatch[1];
        const rect = range.getBoundingClientRect();
        setShowMentionMenu({
          position: {
            top: rect.bottom + 5,
            left: rect.left
          },
          search
        });
      } else {
        setShowMentionMenu(null);
      }
    } else {
      setShowMentionMenu(null);
    }
  }, [workspaceId, onMention]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      onChange(newContent);
      
      // Detect mentions after content change
      setTimeout(() => detectMention(), 0);
    }
  }, [onChange, detectMention]);

  const handleKeyDownInternal = useCallback((e: React.KeyboardEvent) => {
    // Handle mention menu navigation
    if (showMentionMenu) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionMenu(null);
        return;
      }
      // Let MentionMenu handle Arrow keys and Enter
    }
    
    // Rich text shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          document.execCommand('bold');
          updateFormatState();
          break;
        case 'i':
          e.preventDefault();
          document.execCommand('italic');
          updateFormatState();
          break;
        case 'u':
          e.preventDefault();
          document.execCommand('underline');
          updateFormatState();
          break;
      }
    }
    
    onKeyDown?.(e);
  }, [onKeyDown, updateFormatState, showMentionMenu]);

  const applyFormat = (command: string) => {
    document.execCommand(command);
    updateFormatState();
    editorRef.current?.focus();
  };

  const applyLink = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const url = prompt('Enter URL:');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    }
    editorRef.current?.focus();
  };

  const toggleCode = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      const selectedText = selection.toString();
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const codeElement = document.createElement('code');
      codeElement.className = 'bg-hover-bg text-text-primary px-1 py-0.5 rounded text-sm font-mono';
      codeElement.textContent = selectedText;
      range.insertNode(codeElement);
    }
    editorRef.current?.focus();
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  return (
    <div className="relative">
      <div
        ref={editorRef}
        className={cn(
          "w-full min-h-[1.5rem] bg-transparent border-none outline-none",
          "focus:outline-none focus:ring-0",
          "empty:before:content-[attr(data-placeholder)] empty:before:text-text-placeholder",
          className
        )}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDownInternal}
        style={{ whiteSpace: 'pre-wrap' }}
      />

      {/* Floating Toolbar */}
      {showToolbar && (
        <div
          className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-2 flex gap-1"
          style={{
            top: toolbarPosition.top,
            left: toolbarPosition.left,
            transform: 'translateX(-50%)'
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", formatState.bold && "bg-primary text-primary-foreground")}
            onClick={() => applyFormat('bold')}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", formatState.italic && "bg-primary text-primary-foreground")}
            onClick={() => applyFormat('italic')}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", formatState.underline && "bg-primary text-primary-foreground")}
            onClick={() => applyFormat('underline')}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={toggleCode}
          >
            <Code className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={applyLink}
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Mention Menu */}
      {showMentionMenu && workspaceId && onMention && (
        <MentionMenu
          position={showMentionMenu.position}
          search={showMentionMenu.search}
          workspaceId={workspaceId}
          onSelect={(userId, userName) => {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const textNode = range.startContainer;
              
              if (textNode.nodeType === Node.TEXT_NODE) {
                const text = textNode.textContent || '';
                const cursorPosition = range.startOffset;
                const textBeforeCursor = text.substring(0, cursorPosition);
                const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
                
                if (mentionMatch) {
                  const startPos = cursorPosition - mentionMatch[0].length;
                  const endPos = cursorPosition;
                  
                  range.setStart(textNode, startPos);
                  range.setEnd(textNode, endPos);
                  range.deleteContents();
                  
                  const mentionSpan = document.createElement('span');
                  mentionSpan.className = 'bg-primary/10 text-primary px-1 rounded';
                  mentionSpan.setAttribute('data-mention-id', userId);
                  mentionSpan.setAttribute('data-mention-name', userName);
                  mentionSpan.textContent = `@${userName}`;
                  range.insertNode(mentionSpan);
                  
                  // Move cursor after mention
                  range.setStartAfter(mentionSpan);
                  range.collapse(true);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              }
            }
            
            onMention(userId, userName);
            setShowMentionMenu(null);
            editorRef.current?.focus();
          }}
          onClose={() => setShowMentionMenu(null)}
        />
      )}
    </div>
  );
}