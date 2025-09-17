// App.tsx
import React, { useState, useEffect } from "react";
import { Platform } from "react-native";
import { SafeAreaView, View, Text, Pressable, AppState } from "react-native";
import { useProgressionStore } from "./stores/progressionStore";
import SkiaBootstrap from "./SkiaBootstrap";
import HudScreen from "./screens/HudScreen";
import DexcomEgvsScreen from "./src/DexcomEgvsScreen";
import GameCanvas from "./view/GameCanvas";
import ShopScreen from "./screens/ShopScreen";
import EquipScreen from "./screens/EquipScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { useGameStore } from "./stores/gameStore";
import { useSettingsStore } from "./stores/settingsStore";
import { startEgvsSimulator, stopEgvsSimulator } from "./src/simCgms";

const TABS = ["HUD", "DEXCOM", "GAME", "SHOP", "EQUIP", "SETTINGS"] as const;
type Tab = typeof TABS[number];

export default function App() {

  const [tab, setTab] = useState<Tab>("HUD");
 const onEgvs = useGameStore.getState().onEgvs;
  const useSimulator = useSettingsStore(s => s.useSimulator);
  const simSpeed = useSettingsStore(s => s.simSpeed);

  useEffect(() => {
  useSettingsStore.getState().load();
}, []);

  useEffect(() => {
  const shouldSim = useSimulator || Platform.OS === "web";
  if (!shouldSim) { stopEgvsSimulator(); return; }

  const baseFiveMinMs = 300_000; // 5 minutes
  const realTickMs = Math.max(250, Math.round(baseFiveMinMs / Math.max(0.25, simSpeed)));
  // 1× -> 300000ms (5m) • 2× -> 150000ms (2.5m) • 10× -> 30000ms (30s)

  const handle = startEgvsSimulator({
    onEgvs,
    startMgdl: 120,
    virtualStepSec: 300, // each tick represents 5 minutes
    realTickMs,
  });

  return () => { handle.stop(); };
}, [useSimulator, simSpeed, onEgvs]);
  
  useEffect(() => {
  const check = () => useProgressionStore.getState().resetDailyIfNeeded(new Date());

  // 1) on mount
  check();

  // 2) when app becomes active (foreground)
  const sub = AppState.addEventListener("change", (s) => {
    if (s === "active") check();
  });

  // 3) periodic guard (every minute) to catch midnight even if app stays open
  const t = setInterval(check, 60_000);

  // 4) web: also catch tab visibility changes (optional)
  const vis = () => { if (document.visibilityState === "visible") check(); };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", vis);
  }

  return () => {
    sub.remove();
    clearInterval(t);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", vis);
    }
  };
}, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0e141b" }}>
      {/* top tabs */}
      <View style={{ flexDirection: "row", padding: 8, gap: 8, backgroundColor: "#111a23" }}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: tab === t ? "#1d2a36" : "#0e141b",
              borderWidth: 1,
              borderColor: tab === t ? "#3b556e" : "#1d2a36",
            }}
          >
            <Text style={{ color: "#cfe6ff", fontWeight: "600" }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {/* content */}
      <SkiaBootstrap>
        <View style={{ flex: 1 }}>
          {tab === "HUD" && <HudScreen />}
          {tab === "DEXCOM" && <DexcomEgvsScreen />}
          {tab === "GAME" && <GameCanvas />}
          {tab === "SHOP" && <ShopScreen />}
          {tab === "EQUIP" && <EquipScreen />}{/* ← NEW */}
          {tab === "SETTINGS" && <SettingsScreen />}
        </View>
      </SkiaBootstrap>
    </SafeAreaView>
  );
}
