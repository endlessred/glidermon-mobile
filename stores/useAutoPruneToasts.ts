// stores/useAutoPruneToasts.ts
import { useEffect } from "react";
import { useGameStore } from "../stores/gameStore";

export function useAutoPruneToasts(intervalMs = 600) {
  const clearOldToasts = useGameStore((s) => s.clearOldToasts);
  useEffect(() => {
    const id = setInterval(() => clearOldToasts(), intervalMs);
    return () => clearInterval(id);
  }, [clearOldToasts, intervalMs]);
}
