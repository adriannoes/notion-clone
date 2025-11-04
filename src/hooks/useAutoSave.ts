import { useState, useCallback, useRef, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { logger } from "@/lib/logger";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  delay?: number;
}

interface PendingSave {
  id: number;
  timestamp: number;
}

export function useAutoSave({ onSave, delay = 800 }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isMountedRef = useRef(true);
  const isSavingRef = useRef(false);
  const saveQueueRef = useRef<PendingSave[]>([]);
  const saveIdRef = useRef(0);
  const currentSaveIdRef = useRef<number | null>(null);

  const onSaveRef = useRef(onSave);
  
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      debouncedSave.cancel();
    };
  }, []);

  const processSaveQueue = useCallback(async () => {
    if (isSavingRef.current || saveQueueRef.current.length === 0) {
      return;
    }

    isSavingRef.current = true;
    const saveId = saveQueueRef.current[saveQueueRef.current.length - 1].id;
    currentSaveIdRef.current = saveId;

    if (!isMountedRef.current) {
      isSavingRef.current = false;
      return;
    }

    setStatus("saving");
    
    try {
      await onSaveRef.current();
      
      // Only update if this is still the latest save
      if (currentSaveIdRef.current === saveId && isMountedRef.current) {
        setStatus("saved");
        setLastSaved(new Date());
        
        // Clear queue up to this save
        saveQueueRef.current = saveQueueRef.current.filter(s => s.id > saveId);
        
        // Reset to idle after 2 seconds
        setTimeout(() => {
          if (isMountedRef.current && currentSaveIdRef.current === saveId) {
            setStatus("idle");
          }
        }, 2000);
      }
    } catch (error) {
      logger.error("Auto-save error:", error);
      if (isMountedRef.current && currentSaveIdRef.current === saveId) {
        setStatus("error");
      }
    } finally {
      isSavingRef.current = false;
      currentSaveIdRef.current = null;
      
      // Process next item in queue if any
      if (saveQueueRef.current.length > 0) {
        setTimeout(() => processSaveQueue(), 100);
      }
    }
  }, []);

  const debouncedSave = useDebouncedCallback(
    async () => {
      if (!isMountedRef.current) return;
      
      const saveId = ++saveIdRef.current;
      saveQueueRef.current.push({
        id: saveId,
        timestamp: Date.now(),
      });
      
      // Process queue
      await processSaveQueue();
    },
    delay
  );

  const triggerSave = useCallback(() => {
    debouncedSave();
  }, [debouncedSave]);

  const cancelSave = useCallback(() => {
    debouncedSave.cancel();
    saveQueueRef.current = [];
  }, [debouncedSave]);

  return {
    status,
    lastSaved,
    triggerSave,
    cancelSave,
  };
}
