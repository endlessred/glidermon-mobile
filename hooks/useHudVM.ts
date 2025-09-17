import { useMemo } from "react";
import { useGameStore } from "../stores/gameStore";

export type TrendCode = 0 | 1 | 2 | 3; // down | flat | up | unknown

export function useHudVM() {
  // read only what we need to avoid rerender storms
  const trail = useGameStore(s => s.engine.trail);
  const lastTickMs = useGameStore(s => s.engine.lastTickMs);

  const vm = useMemo(() => {
    if (!trail || trail.length === 0) {
      return { mgdl: null as number | null, trendCode: 3 as TrendCode, minutesAgo: null as number | null };
    }
    const n = trail.length;
    const last = trail[n - 1];
    const prev = trail[n - 2] ?? last;

    const diff = last.mgdl - prev.mgdl; // per 5min diff
    let trend: TrendCode = 1; // flat
    if (diff > 4) trend = 2;       // up
    else if (diff < -4) trend = 0; // down

    const minutesAgo = Math.max(0, Math.floor((Date.now() - last.ts) / 60000));
    return { mgdl: last.mgdl as number, trendCode: trend, minutesAgo };
  }, [trail, lastTickMs]);

  return vm;
}
