// screens/HudScreen.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useHudVM } from "../hooks/useHudVM";

function trendGlyph(tc: 0 | 1 | 2 | 3 | null) {
  if (tc === 0) return "↓";
  if (tc === 1) return "→";
  if (tc === 2) return "↑";
  return "•";
}

export default function HudScreen() {
  const { currentMgdl, currentTrendCode, history } = useHudVM();

  const lastUpdated = useMemo(() => {
    if (!history.length) return "—";
    const ts = history[history.length - 1].ts;
    const age = Math.max(0, Date.now() - ts);
    const min = Math.floor(age / 60000);
    if (min < 1) return "Just now";
    if (min === 1) return "1 min ago";
    return `${min} min ago`;
  }, [history]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>GliderMon — HUD</Text>
      <View style={styles.panel}>
        <View style={styles.row}>
          <Text style={styles.mgdlText}>{currentMgdl == null ? "--" : Math.round(currentMgdl)}</Text>
          <Text style={styles.trendText}>{trendGlyph(currentTrendCode)}</Text>
        </View>
        <Text style={styles.meta}>Last update: {lastUpdated} • Points: {history.length}</Text>
      </View>
      <Text style={styles.subtle}>Use the Dexcom tab to authorize and start auto-send.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1117", padding: 16, gap: 12 },
  title: { color: "white", fontSize: 18, fontWeight: "700" },
  panel: { backgroundColor: "#111827", borderRadius: 12, padding: 16, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mgdlText: { color: "white", fontSize: 64, fontWeight: "800" },
  trendText: { color: "white", fontSize: 42, fontWeight: "700" },
  meta: { color: "#9ca3af" },
  subtle: { color: "#9ca3af" },
});
