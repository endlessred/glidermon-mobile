// App.tsx
import React, { useState, useEffect } from "react";
import { Platform, SafeAreaView, View, Text, Pressable, AppState } from "react-native";
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
import ToastHost from "./components/ToastHost";
import LevelUpOverlay from "./components/LevelUpOverlay";
import LevelUpTestButton from "./components/LevelUpTestButton";
import { useTheme } from "./hooks/useTheme";

const TABS = ["HUD", "DEXCOM", "GAME", "SHOP", "EQUIP", "SETTINGS"] as const;
type Tab = typeof TABS[number];

export default function App() {
  // ---- theme ----
  const { colors, spacing, borderRadius, typography } = useTheme();

  // ---- persistence → engine sync ----
  const rehydrated = useProgressionStore((s) => s._rehydrated);
  const syncProgressionToEngine = useGameStore((s) => s.syncProgressionToEngine);

  // ---- tabs ----
  const [tab, setTab] = useState<Tab>("HUD");

  // ---- sim wiring ----
  const onEgvs = useGameStore.getState().onEgvs; // stable reference is fine
  const useSimulator = useSettingsStore((s) => s.useSimulator);
  const simSpeed = useSettingsStore((s) => s.simSpeed);

  // Load settings once (if your settings store persists/loads)
  useEffect(() => {
    useSettingsStore.getState().load?.();
  }, []);

  // After progression rehydrates, mirror into engine (keeps HUD consistent on reload)
  useEffect(() => {
    if (rehydrated) syncProgressionToEngine();
  }, [rehydrated, syncProgressionToEngine]);

  // EGV simulator lifecycle
  useEffect(() => {
    const shouldSim = useSimulator || Platform.OS === "web";
    if (!shouldSim) {
      stopEgvsSimulator();
      return;
    }

    const baseFiveMinMs = 300_000; // 5 minutes
    const realTickMs = Math.max(250, Math.round(baseFiveMinMs / Math.max(0.25, simSpeed)));
    // 1× -> 300000ms (5m) • 2× -> 150000ms (2.5m) • 10× -> 30000ms (30s)

    const handle = startEgvsSimulator({
      onEgvs,
      startMgdl: 120,
      virtualStepSec: 300, // each tick represents 5 minutes
      realTickMs,
    });

    return () => handle.stop();
  }, [useSimulator, simSpeed, onEgvs]);

  // Daily reset guard (no Date arg; store handles its own clock)
  useEffect(() => {
    const check = () => useProgressionStore.getState().resetDailyIfNeeded();

    // 1) on mount
    check();

    // 2) when app becomes active (foreground)
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });

    // 3) periodic guard (every minute) to catch midnight even if app stays open
    const t = setInterval(check, 60_000);

    // 4) web: also catch tab visibility changes (optional)
    const vis = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") check();
    };
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* top tabs */}
      <View style={{
        flexDirection: "row",
        padding: spacing.md,
        gap: spacing.sm,
        backgroundColor: colors.background.secondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.gray[200],
      }}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: borderRadius.md,
              backgroundColor: tab === t ? colors.primary[500] : colors.background.card,
              borderWidth: 1,
              borderColor: tab === t ? colors.primary[600] : colors.gray[300],
              shadowColor: colors.gray[900],
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: tab === t ? 0.1 : 0.05,
              shadowRadius: 2,
              elevation: tab === t ? 2 : 1,
            }}
          >
            <Text style={{
              color: tab === t ? colors.text.inverse : colors.text.primary,
              fontWeight: typography.weight.semibold,
              fontSize: typography.size.sm,
            }}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* content */}
      <SkiaBootstrap>
        <View style={{ flex: 1 }}>
          {tab === "HUD" && <HudScreen />}
          {tab === "DEXCOM" && <DexcomEgvsScreen />}

          {/* GAME: eliminate top/bottom empties by using the "embedded" mode (see GameCanvas note below) */}
          {tab === "GAME" && (
            <View style={{
              alignItems: "center",
              paddingVertical: spacing.md,
              backgroundColor: colors.background.primary,
            }}>
              <GameCanvas variant="embedded" />
            </View>
          )}

          {tab === "SHOP" && <ShopScreen />}
          {tab === "EQUIP" && <EquipScreen />}
          {tab === "SETTINGS" && <SettingsScreen />}
        </View>
      </SkiaBootstrap>

      {/* global overlays */}
      <ToastHost />
      <LevelUpOverlay />
      <LevelUpTestButton />
    </SafeAreaView>
  );
}
