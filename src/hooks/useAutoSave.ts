import { useState, useCallback, useRef, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { logger } from "@/lib/logger";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  delay?: number;
}

export function useAutoSave({ onSave, delay = 800 }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      debouncedSave.cancel();
    };
  }, []);

  const debouncedSave = useDebouncedCallback(
    async () => {
      if (!isMountedRef.current) return;
      
      setStatus("saving");
      try {
        await onSave();
        if (isMountedRef.current) {
          setStatus("saved");
          setLastSaved(new Date());
          
          // Reset to idle after 2 seconds
          setTimeout(() => {
            if (isMountedRef.current) {
              setStatus("idle");
            }
          }, 2000);
        }
      } catch (error) {
        logger.error("Auto-save error:", error);
        if (isMountedRef.current) {
          setStatus("error");
        }
      }
    },
    delay
  );

  const triggerSave = useCallback(() => {
    debouncedSave();
  }, [debouncedSave]);

  const cancelSave = useCallback(() => {
    debouncedSave.cancel();
  }, [debouncedSave]);

  return {
    status,
    lastSaved,
    triggerSave,
    cancelSave,
  };
}
