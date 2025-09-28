import { useState, useRef } from "react";
import { Upload, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageBlockProps {
  content: string;
  onChange: (content: string) => void;
  onDelete: () => void;
  isHovered: boolean;
}

export function ImageBlock({ content, onChange, onDelete, isHovered }: ImageBlockProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onChange(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  if (!content) {
    return (
      <div
        className={cn(
          "border-2 border-dashed border-border rounded-lg p-8 text-center",
          "hover:border-primary/50 transition-colors",
          isDragging && "border-primary bg-primary/5"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
      >
        <Upload className="h-8 w-8 text-text-tertiary mx-auto mb-4" />
        <p className="text-text-secondary mb-2">Drop an image or click to upload</p>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    );
  }

  return (
    <div className="relative group">
      <img
        src={content}
        alt="Uploaded content"
        className="max-w-full h-auto rounded-lg shadow-sm"
      />
      {isHovered && (
        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => window.open(content, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onDelete}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}