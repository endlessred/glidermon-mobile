// hooks/useHudVM.ts
import { useMemo } from "react";
import { useGameStore } from "../stores/gameStore";
import { useSettingsStore } from "../stores/settingsStore";

/**
 * Returns the HUD VM shape expected by HudScreen:
 * { mgdl: number|null, trendCode: 0|1|2|3, minutesAgo: number|null }
 *
 * This is null-safe (engine may be undefined on cold start).
 */
export function useHudVM() {
  // Always call hooks unconditionally
  const engine = useGameStore(s => s.engine); // can be undefined at boot
  const low    = useSettingsStore(s => s.low);
  const high   = useSettingsStore(s => s.high);

  return useMemo(() => {
    // Derive latest sample from engine.trail if available
    const trail = (engine as any)?.trail as Array<{ ts: number; mgdl: number }> | undefined;
    const n = trail?.length ?? 0;

    const last = n > 0 ? trail![n - 1] : undefined;
    const prev = n > 1 ? trail![n - 2] : undefined;

    const mgdl: number | null = typeof last?.mgdl === "number" ? last!.mgdl : null;

    // TrendCode: 0=down, 1=flat, 2=up, 3=unknown
    let trendCode: 0 | 1 | 2 | 3 = 3;
    if (mgdl != null && typeof prev?.mgdl === "number") {
      const delta = last!.mgdl - prev.mgdl;
      if (delta > 2) trendCode = 2;
      else if (delta < -2) trendCode = 0;
      else trendCode = 1;
    }

    const minutesAgo =
      typeof last?.ts === "number"
        ? Math.max(0, Math.round((Date.now() - last!.ts) / 60000))
        : null;

    // (Optional) You can expose status here if needed:
    // const state = mgdl == null ? "NO DATA" : mgdl < low ? "LOW" : mgdl > high ? "HIGH" : "IN";

    return { mgdl, trendCode, minutesAgo };
  }, [engine, low, high]);
}
