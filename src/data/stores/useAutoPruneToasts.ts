import { useEffect } from "react";
import { useToastStore } from "./toastStore";

/** Auto-prunes toasts older than ttlMs at a small interval. */
export default function useAutoPruneToasts(ttlMs = 1600, intervalMs = 200) {
  const clearExpired = useToastStore(s => s.clearExpired);
  useEffect(() => {
    const id = setInterval(() => clearExpired(ttlMs), intervalMs);
    return () => clearInterval(id);
  }, [ttlMs, intervalMs, clearExpired]);
}
