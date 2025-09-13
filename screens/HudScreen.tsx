// screens/HudScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import { useHudVM } from "../hooks/useHudVM";
import { findAndConnect, readStats, forceReconnect, disconnectBle } from "../src/bleClient";

function trendGlyph(tc: 0 | 1 | 2 | 3 | null) {
  if (tc === 0) return "↓";
  if (tc === 1) return "→";
  if (tc === 2) return "↑";
  return "•";
}

type BleStatus =
  | { state: "disconnected" }
  | { state: "connected"; name?: string | null; id?: string | null; stats?: string }
  | { state: "scanning" }
  | { state: "error"; msg: string };

export default function HudScreen() {
  const { currentMgdl, currentTrendCode, history } = useHudVM();

  const [ble, setBle] = useState<BleStatus>({ state: "disconnected" });

  // simple poll of stats every 10s when connected
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      try {
        const s = await readStats(); // implement to return a concise string or JSON.stringify on your side
        setBle((prev) =>
          prev.state === "connected"
            ? { ...prev, stats: typeof s === "string" ? s : JSON.stringify(s) }
            : prev
        );
      } catch {
        // don’t flip to error on transient read failures
      }
    };
    if (ble.state === "connected") {
      tick();
      id = setInterval(tick, 10_000);
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [ble.state]);

  const lastUpdated = useMemo(() => {
    if (!history.length) return { label: "—", stale: true };
    const ts = history[history.length - 1].ts;
    const ageMs = Math.max(0, Date.now() - ts);
    const min = Math.floor(ageMs / 60000);
    const label =
      min < 1 ? "Just now" : min === 1 ? "1 min ago" : `${min} min ago`;
    return { label, stale: min >= 15 }; // mark stale if >= 15min
  }, [history]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>GliderMon — HUD</Text>

      {/* Status card */}
      <View style={styles.card}>
        {/* BLE status pill */}
        <View style={styles.pillRow}>
          <View
            style={[
              styles.pill,
              ble.state === "connected"
                ? styles.pillConnected
                : ble.state === "scanning"
                ? styles.pillScanning
                : ble.state === "error"
                ? styles.pillError
                : styles.pillDisconnected,
            ]}
          >
            <Text style={styles.pillText}>
              {ble.state === "connected"
                ? `Connected ${ble.name ? `• ${ble.name}` : ""}`
                : ble.state === "scanning"
                ? "Scanning…"
                : ble.state === "error"
                ? "BLE Error"
                : "Disconnected"}
            </Text>
          </View>
          {ble.state === "connected" && !!ble.stats && (
            <Text style={styles.statsText}>{ble.stats}</Text>
          )}
        </View>

        {/* Big number + arrow */}
        <View style={styles.row}>
          <Text style={styles.mgdlText}>
            {currentMgdl == null ? "--" : Math.round(currentMgdl)}
          </Text>
          <Text style={styles.trendText}>{trendGlyph(currentTrendCode)}</Text>
        </View>

        {/* Meta row */}
        <Text style={[styles.meta, lastUpdated.stale && styles.metaStale]}>
          Last update: {lastUpdated.label} • Points: {history.length}
          {lastUpdated.stale ? " • STALE" : ""}
        </Text>

        {/* Actions */}
        <View style={styles.btnRow}>
          <Button
            title={ble.state === "connected" ? "Reconnect" : "Connect"}
            onPress={async () => {
              try {
                setBle({ state: "scanning" });
                const dev =
                  ble.state === "connected"
                    ? await forceReconnect()
                    : await findAndConnect();
                setBle({
                  state: "connected",
                  name: dev?.name ?? null,
                  id: dev?.id ?? null,
                  stats: undefined,
                });
              } catch (e: any) {
                setBle({ state: "error", msg: e?.message || "Failed to connect" });
                setTimeout(() => setBle({ state: "disconnected" }), 2500);
              }
            }}
            color="#10b981"
          />
          <Button
            title="Read Stats"
            onPress={async () => {
              try {
                const s = await readStats();
                setBle((prev) =>
                  prev.state === "connected"
                    ? { ...prev, stats: typeof s === "string" ? s : JSON.stringify(s) }
                    : prev
                );
              } catch (e: any) {
                setBle({ state: "error", msg: e?.message || "readStats failed" });
                setTimeout(() => setBle({ state: "disconnected" }), 2500);
              }
            }}
          />
          <Button
            title="Disconnect"
            color="#ef4444"
            onPress={async () => {
              try {
                await disconnectBle({ forget: false });
              } finally {
                setBle({ state: "disconnected" });
              }
            }}
          />
        </View>
      </View>

      <Text style={styles.subtle}>
        Use the Dexcom tab to authorize and start auto-send. The Game tab shows the Skia canvas.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1117", padding: 16, gap: 12 },
  title: { color: "white", fontSize: 18, fontWeight: "700" },
  card: { backgroundColor: "#111827", borderRadius: 12, padding: 16, gap: 10 },

  pillRow: { gap: 6 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  pillText: { color: "white", fontWeight: "600" },
  pillConnected: { backgroundColor: "#065f46" },   // emerald-900-ish
  pillScanning: { backgroundColor: "#1f2937" },    // gray-800
  pillDisconnected: { backgroundColor: "#374151" },// gray-700
  pillError: { backgroundColor: "#7f1d1d" },       // red-900
  statsText: { color: "#9ca3af" },

  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mgdlText: { color: "white", fontSize: 64, fontWeight: "800" },
  trendText: { color: "white", fontSize: 42, fontWeight: "700" },

  meta: { color: "#9ca3af" },
  metaStale: { color: "#f59e0b" },

  btnRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },

  subtle: { color: "#9ca3af" },
});
