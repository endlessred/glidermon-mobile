// selectViewModel.ts
export type TrendCode = 0 | 1 | 2 | 3; // 0=down, 1=flat, 2=up, 3=unknown
export type HistPoint = { ts: number; mgdl: number };
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

function normalizeHistory(engine: any): HistPoint[] {
  const raw =
    engine?.history ??
    engine?.egvs?.history ??
    engine?.readings ??
    [];

  const out: HistPoint[] = [];
  for (const r of raw) {
    if (!r) continue;
    const mgdl = Number(r.mgdl ?? r.value ?? r.value_mgdl ?? r.glucose ?? NaN);
    const ts =
      r.ts ??
      r.tsMs ??
      r.ms ??
      toTs(r.time) ??
      toTs(r.systemTime) ??
      toTs(r.displayTime) ??
      null;
    if (Number.isFinite(mgdl) && typeof ts === "number") out.push({ ts, mgdl });
  }
  out.sort((a, b) => a.ts - b.ts);
  return out.slice(-120);
}

export function selectHudVM(s: { engine: unknown }): HudVM {
  const e = s?.engine as any;
  const currentMgdl: number | null =
    e?.currentMgdl ?? e?.mgdl ?? e?.glucose?.mgdl ?? e?.egvs?.current?.mgdl ?? null;

  const currentTrendCode =
    (e?.currentTrendCode ?? e?.trendCode ?? e?.egvs?.current?.trendCode ?? null) as TrendCode | null;

  const history = normalizeHistory(e);
  return { currentMgdl, currentTrendCode, history };
}
