// hooks/useHudVM.ts
import { useMemo, useRef } from "react";
import { useGameStore } from "../stores/gameStore";

type TrendCode = 0 | 1 | 2 | 3;
type HistPoint = { ts: number; mgdl: number };
export type HudVM = { currentMgdl: number | null; currentTrendCode: TrendCode | null; history: HistPoint[] };

function toTs(x: any): number | null {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Date.parse(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function useHudVM(): HudVM {
  // Select the engine, then cast to a permissive shape for flexible probing.
  const engineAny = useGameStore((s) => s.engine) as unknown as Record<string, any> | null;

  const currentMgdl: number | null =
    engineAny?.currentMgdl ??
    engineAny?.mgdl ??
    engineAny?.glucose?.mgdl ??
    engineAny?.egvs?.current?.mgdl ??
    null;

  const currentTrendCode: TrendCode | null =
    (engineAny?.currentTrendCode ??
      engineAny?.trendCode ??
      engineAny?.egvs?.current?.trendCode ??
      null) as TrendCode | null;

  // Pull the history reference (no work yet, keep ref-stable)
  const historyRef =
    (engineAny?.history ??
      engineAny?.egvs?.history ??
      engineAny?.readings) as any[] | undefined;

  // Memoize normalized history by source reference to avoid loops
  const lastRef = useRef<any[] | undefined>(undefined);
  const lastOut = useRef<HistPoint[]>([]);

  const history = useMemo(() => {
    if (historyRef === lastRef.current) return lastOut.current;

    const src = Array.isArray(historyRef) ? historyRef : [];
    const out: HistPoint[] = [];
    for (const r of src) {
      if (!r) continue;
      const mgdl = Number(r.mgdl ?? r.value ?? r.value_mgdl ?? r.glucose ?? NaN);
      const ts =
        r.ts ?? r.tsMs ?? r.ms ??
        toTs(r.time) ?? toTs(r.systemTime) ?? toTs(r.displayTime);
      if (Number.isFinite(mgdl) && typeof ts === "number") out.push({ ts, mgdl });
    }
    out.sort((a, b) => a.ts - b.ts);
    const trimmed = out.slice(-120);

    lastRef.current = historyRef;
    lastOut.current = trimmed;
    return trimmed;
  }, [historyRef]);

  return { currentMgdl, currentTrendCode, history };
}
