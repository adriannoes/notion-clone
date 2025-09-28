import { Info, AlertTriangle, CheckCircle, XCircle, Lightbulb } from "lucide-react";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "warning" | "success" | "error" | "note";

interface CalloutBlockProps {
  content: string;
  onChange: (content: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  calloutType?: CalloutType;
  onTypeChange?: (type: CalloutType) => void;
}

const CALLOUT_TYPES = [
  { type: "info" as CalloutType, icon: Info, label: "Info", bgColor: "bg-blue-50", borderColor: "border-blue-200", iconColor: "text-blue-600" },
  { type: "warning" as CalloutType, icon: AlertTriangle, label: "Warning", bgColor: "bg-yellow-50", borderColor: "border-yellow-200", iconColor: "text-yellow-600" },
  { type: "success" as CalloutType, icon: CheckCircle, label: "Success", bgColor: "bg-green-50", borderColor: "border-green-200", iconColor: "text-green-600" },
  { type: "error" as CalloutType, icon: XCircle, label: "Error", bgColor: "bg-red-50", borderColor: "border-red-200", iconColor: "text-red-600" },
  { type: "note" as CalloutType, icon: Lightbulb, label: "Note", bgColor: "bg-purple-50", borderColor: "border-purple-200", iconColor: "text-purple-600" },
];

export function CalloutBlock({ content, onChange, onKeyDown, calloutType = "info", onTypeChange }: CalloutBlockProps) {
  const currentType = CALLOUT_TYPES.find(t => t.type === calloutType) || CALLOUT_TYPES[0];
  const Icon = currentType.icon;

  return (
    <div className={cn(
      "border-l-4 rounded-r-lg p-4",
      currentType.bgColor,
      currentType.borderColor,
      "dark:bg-opacity-20 dark:border-opacity-40"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn("h-5 w-5 flex-shrink-0", currentType.iconColor)} />
          {onTypeChange && (
            <select
              value={calloutType}
              onChange={(e) => onTypeChange(e.target.value as CalloutType)}
              className="bg-transparent text-sm font-medium border-none outline-none cursor-pointer"
            >
              {CALLOUT_TYPES.map(type => (
                <option key={type.type} value={type.type}>
                  {type.label}
                </option>
              ))}
            </select>
          )}
          {!onTypeChange && (
            <span className="text-sm font-medium">{currentType.label}</span>
          )}
        </div>
        <RichTextEditor
          content={content}
          onChange={onChange}
          placeholder="Write your callout content..."
          className="flex-1 text-text-primary"
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}