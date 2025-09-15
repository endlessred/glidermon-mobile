import { useMemo } from "react";
import { useGameStore } from "../stores/gameStore"; // for mgdl
// ^ if your mgdl lives elsewhere, adjust this import/selector
import { bucketOf } from "../core/buckets";
import {
  behavior_inRangeIdle,
  behavior_lowIdle,
  behavior_highIdle,
  type BehaviorSpriteProps,
} from "../core/behaviors";

// We’ll read bounds from settingsStore (if present), else default 70–180.
type Bounds = { low: number; high: number };

// Lazy import to avoid TS complaining if file shape differs
let useSettingsStore: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useSettingsStore = require("../stores/settingsStore").useSettingsStore;
} catch {
  useSettingsStore = null;
}

function useBounds(): Bounds {
  if (useSettingsStore) {
    // Try common shapes: {bounds:{low,high}} or {lowBound,highBound} or {low,high}
    const low = useSettingsStore((s: any) =>
      s?.bounds?.low ?? s?.lowBound ?? s?.low ?? 70
    );
    const high = useSettingsStore((s: any) =>
      s?.bounds?.high ?? s?.highBound ?? s?.high ?? 180
    );
    return { low, high };
  }
  return { low: 70, high: 180 };
}

export function useGliderBehavior(blinkTex?: string | number): BehaviorSpriteProps {
  const mgdl = useGameStore((s: any) => s.hud?.currentMgdl ?? null);
  const bounds = useBounds();

  const bucket = useMemo(() => bucketOf(mgdl, bounds), [mgdl, bounds]);
  switch (bucket) {
    case "LOW":  return behavior_lowIdle({ blinkTex });
    case "HIGH": return behavior_highIdle({ blinkTex });
    default:     return behavior_inRangeIdle({ blinkTex });
  }
}
