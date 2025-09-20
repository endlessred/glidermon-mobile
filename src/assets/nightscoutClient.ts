export type NightscoutEntry = {
  _id: string;
  sgv?: number;          // mg/dL
  direction?: string;    // "Flat" | "FortyFiveUp" | "SingleUp" | ...
  date: number;          // ms since epoch
  dateString?: string;
  type?: "sgv" | string;
  delta?: number;
};

export type Egv = {
  mgdl: number;
  ts: number;            // ms since epoch
  direction:
    | "Flat" | "FortyFiveUp" | "SingleUp" | "DoubleUp"
    | "FortyFiveDown" | "SingleDown" | "DoubleDown" | "NONE";
  delta?: number | null;
};

function normalize(e: NightscoutEntry): Egv | null {
  const mgdl = e.sgv ?? NaN;
  const ts = e.date ?? (e.dateString ? Date.parse(e.dateString) : NaN);
  if (!Number.isFinite(mgdl) || !Number.isFinite(ts)) return null;
  return {
    mgdl,
    ts,
    direction: (e.direction as Egv["direction"]) ?? "NONE",
    delta: typeof e.delta === "number" ? e.delta : null,
  };
}

export async function fetchRecentEGVs({ count = 24, sinceMs }: { count?: number; sinceMs?: number } = {}): Promise<Egv[]> {
  const qs = new URLSearchParams();
  if (count) qs.set("count", String(count));
  if (sinceMs) qs.set("sinceMs", String(sinceMs));
  const url = `/api/nightscout/entries${qs.toString() ? `?${qs}` : ""}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Nightscout fetch failed: ${r.status}`);
  const raw = (await r.json()) as NightscoutEntry[];
  return raw.map(normalize).filter((x): x is Egv => !!x).sort((a, b) => a.ts - b.ts);
}

export function directionToArrow(d: Egv["direction"]): "↑"|"↗"|"→"|"↘"|"↓"|"⇈"|"⇊" {
  switch (d) {
    case "DoubleUp": return "⇈";
    case "SingleUp": return "↑";
    case "FortyFiveUp": return "↗";
    case "Flat": return "→";
    case "FortyFiveDown": return "↘";
    case "SingleDown": return "↓";
    case "DoubleDown": return "⇊";
    default: return "→";
  }
}
