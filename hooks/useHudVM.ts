import { useMemo, useRef } from "react";
import { useGameStore } from "../stores/gameStore";

type TrendCode = 0 | 1 | 2 | 3;
type HistPoint = { ts: number; mgdl: number };
export type HudVM = {
  currentMgdl: number | null;
  currentTrendCode: TrendCode | null;
  history: HistPoint[];
};

function toTs(x: any): number | null {
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Date.parse(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function useHudVM(): HudVM {
  // Always call hooks in the same order (no early returns).
  const hud = useGameStore((s) => s.hud);
  const engineAny = useGameStore((s) => s.engine) as unknown as Record<string, any> | null;

  // Derive from engine (we’ll prefer HUD later, but we still compute so hook order is stable).
  const engineMgdl: number | null =
    engineAny?.currentMgdl ??
    engineAny?.mgdl ??
    engineAny?.glucose?.mgdl ??
    engineAny?.egvs?.current?.mgdl ??
    null;

  const engineTrend: TrendCode | null =
    (engineAny?.currentTrendCode ??
      engineAny?.trendCode ??
      engineAny?.egvs?.current?.trendCode ??
      null) as TrendCode | null;

  const engineHistRef =
    (engineAny?.history ??
      engineAny?.egvs?.history ??
      engineAny?.readings) as any[] | undefined;

  const lastRef = useRef<any[] | undefined>(undefined);
  const lastOut = useRef<HistPoint[]>([]);

  const engineHistory = useMemo(() => {
    if (engineHistRef === lastRef.current) return lastOut.current;

    const src = Array.isArray(engineHistRef) ? engineHistRef : [];
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
    lastRef.current = engineHistRef;
    lastOut.current = trimmed;
    return trimmed;
  }, [engineHistRef]);

  // Prefer HUD slice if it has data; otherwise fall back to engine-derived values.
  const hasHud = !!hud && (hud.currentMgdl != null || (hud.history?.length ?? 0) > 0);
  return hasHud
    ? { currentMgdl: hud.currentMgdl, currentTrendCode: hud.currentTrendCode, history: hud.history }
    : { currentMgdl: engineMgdl, currentTrendCode: engineTrend, history: engineHistory };
}
