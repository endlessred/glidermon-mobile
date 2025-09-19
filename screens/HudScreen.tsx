import React from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { useProgressionStore } from "../stores/progressionStore";
import AcornBadge from "../components/AcornBadge";
import LevelBar from "../components/LevelBar";
import DailyCapBar from "../components/DailyCapBar";
import { useHudVM } from "../hooks/useHudVM";
import GameCanvas from "../view/GameCanvas";

export default function HudScreen() {
  const { width } = useWindowDimensions();

  // Progression (live)
  const acorns     = useProgressionStore(s => s.acorns);
  const level      = useProgressionStore(s => s.level);
  const xpInto     = useProgressionStore(s => s.xpIntoCurrent);
  const nextXp     = useProgressionStore(s => s.nextXp);
  const dailyEarn  = useProgressionStore(s => s.dailyEarned);
  const dailyCap   = useProgressionStore(s => s.dailyCap);
  const restedBank = useProgressionStore(s => s.restedBank);

  // Glucose VM (null-safe)
  const { mgdl, trendCode, minutesAgo } = useHudVM();

  // Optional: slightly smaller canvas on tiny screens
  const canvasScale = width < 380 ? 0.9 : 1;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0d1117" }}
      contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 24 }}
    >
      {/* ===== Progress Section ===== */}
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <AcornBadge count={acorns} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <LevelBar level={level} current={xpInto} next={nextXp} />
          </View>
        </View>
        <DailyCapBar value={dailyEarn} cap={dailyCap} rested={restedBank} />
      </View>

      {/* ===== Game Canvas (moved here) ===== */}
      <View style={{ alignItems: "center", justifyContent: "center", transform: [{ scale: canvasScale }] }}>
        <GameCanvas variant="embedded" />
      </View>

      {/* ===== Glucose Section ===== */}
      <View style={{ gap: 6, marginTop: 4 }}>
        <Text style={{ color: "#cfe6ff", fontWeight: "700", fontSize: 16 }}>
          Glucose
        </Text>

        <View
          style={{
            backgroundColor: "#161b22",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#233043",
            paddingVertical: 10,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ color: "white", fontSize: 28, fontWeight: "800" }}>
            {mgdl != null ? `${mgdl} mg/dL` : "—"}
          </Text>
          <Text style={{ color: "#9aa6b2", marginTop: 2 }}>
            Trend: {renderTrend(trendCode)} · {minutesAgo != null ? `${minutesAgo}m ago` : "no data"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function renderTrend(t: 0 | 1 | 2 | 3) {
  switch (t) {
    case 0: return "↓";
    case 1: return "→";
    case 2: return "↑";
    default: return "—";
  }
}
