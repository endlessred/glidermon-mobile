// screens/HudScreen.tsx
import React, { useMemo } from "react";
import { View, Text } from "react-native";

import { useHudVM } from "../hooks/useHudVM";
import { useProgressionStore } from "../stores/progressionStore";
import { useSettingsStore } from "../stores/settingsStore";

import AcornBadge from "../components/AcornBadge";
import LevelBar from "../components/LevelBar";
import DailyCapBar from "../components/DailyCapBar";

export default function HudScreen() {
  // --- progression (currency + leveling) ---
  const acorns   = useProgressionStore((s) => s.acorns);
  const level    = useProgressionStore((s) => s.level);
  const xpNow    = useProgressionStore((s) => s.xpIntoCurrent);
  const xpNext   = useProgressionStore((s) => s.nextXp);
  const daily    = useProgressionStore((s) => s.dailyEarned);
  const cap      = useProgressionStore((s) => s.dailyCap);
  const rested   = useProgressionStore((s) => s.restedBank);

  // --- current glucose (same pipeline as simulator / Dexcom) ---
  const { mgdl, trendCode, minutesAgo } = useHudVM();

  // --- user thresholds + sim badge ---
  const lowThr   = useSettingsStore((s) => s.low);
  const highThr  = useSettingsStore((s) => s.high);
  const simOn    = useSettingsStore((s) => s.useSimulator);

  const status = useMemo(() => {
    if (mgdl == null) return { text: "—", color: "#9aa6b2", state: "NO DATA" as const };
    if (mgdl < lowThr)  return { text: "LOW",  color: "#ef4444", state: "LOW" as const };
    if (mgdl > highThr) return { text: "HIGH", color: "#f59e0b", state: "HIGH" as const };
    return { text: "IN RANGE", color: "#22c55e", state: "IN" as const };
  }, [mgdl, lowThr, highThr]);

  const trendText = trendCode === 2 ? "↑ rising"
                   : trendCode === 0 ? "↓ falling"
                   : trendCode === 1 ? "→ flat"
                   : "·";

  return (
    <View style={{ flex: 1, backgroundColor: "#0e141b" }}>
      {/* Header panel: currency + level */}
      <View style={{ padding: 12, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AcornBadge acorns={acorns} />
          {simOn && (
            <View style={{
              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
              backgroundColor: "#1f2937", borderWidth: 1, borderColor: "#334155"
            }}>
              <Text style={{ color: "#93c5fd", fontWeight: "700" }}>SIM</Text>
            </View>
          )}
        </View>

        <LevelBar level={level} xpNow={xpNow} xpNext={xpNext} />
        <DailyCapBar earned={daily} cap={cap} rested={rested} />
      </View>

      {/* Glucose card */}
      <View style={{
        marginHorizontal: 12, marginBottom: 12,
        backgroundColor: "#161b22", padding: 16, borderRadius: 12,
        borderWidth: 1, borderColor: "#233043", gap: 8
      }}>
        <Text style={{ color: "#cfe6ff", fontWeight: "700", marginBottom: 6 }}>
          Current Glucose
        </Text>

        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <Text style={{ color: "#cfe6ff", fontSize: 28, fontWeight: "800" }}>
            {mgdl != null ? `${mgdl}` : "—"}
          </Text>
          <Text style={{ color: "#9aa6b2" }}>mg/dL</Text>
          <View style={{ flex: 1 }} />
          <Text style={{ color: status.color, fontWeight: "700" }}>{status.text}</Text>
        </View>

        <Text style={{ color: "#9aa6b2" }}>
          {trendText}
          {minutesAgo != null ? ` • ${minutesAgo}m ago` : ""}
        </Text>

        <Text style={{ color: "#718096", fontSize: 12 }}>
          Thresholds: {lowThr}–{highThr} mg/dL
        </Text>
      </View>
    </View>
  );
}
