import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, MoreHorizontal, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface TableMetadata {
  rows: number;
  cols: number;
  headerRow: boolean;
  headerCol: boolean;
}

interface TableBlockProps {
  content: string;
  metadata: TableMetadata;
  onChange: (content: string, metadata: TableMetadata) => void;
  onDelete: () => void;
  isHovered: boolean;
}

export function TableBlock({ content, metadata, onChange, onDelete, isHovered }: TableBlockProps) {
  const [data, setData] = useState<string[][]>(() => {
    // Initialize table data
    const rows = Array(metadata.rows).fill(null).map(() =>
      Array(metadata.cols).fill("")
    );
    return rows;
  });

  const [isEditing, setIsEditing] = useState<{row: number; col: number} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update data when metadata changes
  useEffect(() => {
    setData(prev => {
      const newData = Array(metadata.rows).fill(null).map(() =>
        Array(metadata.cols).fill("")
      );

      // Copy existing data to new structure
      for (let i = 0; i < Math.min(prev.length, metadata.rows); i++) {
        for (let j = 0; j < Math.min(prev[i].length, metadata.cols); j++) {
          newData[i][j] = prev[i][j];
        }
      }

      return newData;
    });
  }, [metadata.rows, metadata.cols]);

  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = [...data];
    newData[row][col] = value;
    setData(newData);
    onChange(JSON.stringify(newData), metadata);
  };

  const handleCellClick = (row: number, col: number) => {
    setIsEditing({ row, col });
  };

  const handleCellBlur = () => {
    setIsEditing(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(null);
    } else if (e.key === 'Escape') {
      setIsEditing(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const nextCol = col + 1;
      const nextRow = nextCol >= metadata.cols ? row + 1 : row;
      const nextColFinal = nextCol >= metadata.cols ? 0 : nextCol;

      if (nextRow < metadata.rows) {
        setIsEditing({ row: nextRow, col: nextColFinal });
      }
    }
  };

  const addRow = (afterIndex: number) => {
    const newData = [...data];
    newData.splice(afterIndex + 1, 0, Array(metadata.cols).fill(""));
    const newMetadata = { ...metadata, rows: metadata.rows + 1 };
    setData(newData);
    onChange(JSON.stringify(newData), newMetadata);
  };

  const addColumn = (afterIndex: number) => {
    const newData = data.map(row => {
      const newRow = [...row];
      newRow.splice(afterIndex + 1, 0, "");
      return newRow;
    });
    const newMetadata = { ...metadata, cols: metadata.cols + 1 };
    setData(newData);
    onChange(JSON.stringify(newData), newMetadata);
  };

  const deleteRow = (rowIndex: number) => {
    if (metadata.rows <= 1) return;

    const newData = data.filter((_, index) => index !== rowIndex);
    const newMetadata = { ...metadata, rows: metadata.rows - 1 };
    setData(newData);
    onChange(JSON.stringify(newData), newMetadata);
  };

  const deleteColumn = (colIndex: number) => {
    if (metadata.cols <= 1) return;

    const newData = data.map(row => row.filter((_, index) => index !== colIndex));
    const newMetadata = { ...metadata, cols: metadata.cols - 1 };
    setData(newData);
    onChange(JSON.stringify(newData), newMetadata);
  };

  const toggleHeaderRow = () => {
    const newMetadata = { ...metadata, headerRow: !metadata.headerRow };
    onChange(JSON.stringify(data), newMetadata);
  };

  const toggleHeaderCol = () => {
    const newMetadata = { ...metadata, headerCol: !metadata.headerCol };
    onChange(JSON.stringify(data), newMetadata);
  };

  return (
    <div className="relative group">
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 p-0">
                {/* Corner cell for headers */}
              </TableHead>
              {Array.from({ length: metadata.cols }, (_, colIndex) => (
                <TableHead key={colIndex} className="relative">
                  {metadata.headerCol && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Col {colIndex + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteColumn(colIndex)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  {!metadata.headerCol && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addColumn(colIndex)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell className="w-12 p-0">
                  {metadata.headerRow && rowIndex === 0 ? (
                    <div className="flex items-center justify-between p-2">
                      <span className="font-semibold">Row {rowIndex + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRow(rowIndex)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addRow(rowIndex)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </TableCell>
                {row.map((cell, colIndex) => (
                  <TableCell key={colIndex} className="p-0">
                    {isEditing?.row === rowIndex && isEditing?.col === colIndex ? (
                      <Input
                        ref={inputRef}
                        value={cell}
                        onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                        className="border-0 h-8 text-sm"
                        autoFocus
                      />
                    ) : (
                      <div
                        className={cn(
                          "min-h-8 p-2 cursor-text hover:bg-muted/50",
                          metadata.headerRow && rowIndex === 0 && "font-semibold",
                          metadata.headerCol && colIndex === 0 && "font-semibold"
                        )}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                      >
                        {cell || <span className="text-muted-foreground">Empty</span>}
                      </div>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Table controls */}
      {isHovered && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleHeaderRow}
            className="h-8 w-8 p-0"
          >
            <span className="text-xs font-semibold">H</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleHeaderCol}
            className="h-8 w-8 p-0"
          >
            <span className="text-xs font-semibold">V</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
