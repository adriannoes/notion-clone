import { Check, Loader2, AlertCircle, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SaveStatus } from "@/hooks/useAutoSave";

interface SaveIndicatorProps {
  status: SaveStatus;
  lastSaved: Date | null;
  className?: string;
}

export function SaveIndicator({ status, lastSaved, className }: SaveIndicatorProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case "saving":
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          text: "Salvando...",
          color: "text-primary",
        };
      case "saved":
        return {
          icon: <Check className="h-3.5 w-3.5" />,
          text: lastSaved ? getTimeSince(lastSaved) : "Salvo",
          color: "text-success",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          text: "Erro ao salvar",
          color: "text-destructive",
        };
      default:
        return null;
    }
  };

  const getTimeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return "Salvo agora";
    if (seconds < 60) return `Salvo há ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes === 1) return "Salvo há 1 minuto";
    return `Salvo há ${minutes} minutos`;
  };

  const display = getStatusDisplay();

  if (!display) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs animate-fade-in",
        display.color,
        className
      )}
    >
      {display.icon}
      <span className="font-medium">{display.text}</span>
    </div>
  );
}
