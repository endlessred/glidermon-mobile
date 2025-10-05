// App.tsx
import React, { useState, useEffect } from "react";
import { Platform, SafeAreaView, View, Text, Pressable, AppState } from "react-native";
import { useProgressionStore } from "./src/data/stores/progressionStore";
import { useUserStore } from "./src/data/stores/userStore";
import HomeScreen from "./src/ui/screens/HudScreen"; // HudScreen serves as HomeScreen
// import DexcomEgvsScreen from "./src/ui/screens/DexcomEgvsScreen"; // Preserved for future Bluetooth device integration
import GameCanvas from "./src/game/view/GameCanvas";
import ShopScreen from "./src/ui/screens/ShopScreen";
import EquipScreen from "./src/ui/screens/EquipScreen";
import OutfitScreen from "./src/ui/screens/OutfitScreen";
import SettingsScreen from "./src/ui/screens/SettingsScreen";
import LeaderboardScreen from "./src/ui/screens/LeaderboardScreen";
import GalleryScreen from "./src/ui/screens/GalleryScreen";
import AcornHuntScreen from "./src/ui/screens/AcornHuntScreen";
import ArcadeScreen from "./src/ui/screens/ArcadeScreen";
import UpsAndDownsScreen from "./src/ui/screens/UpsAndDownsScreen";
import OnboardingScreen from "./src/ui/screens/OnboardingScreen";
import { useGameStore } from "./src/data/stores/gameStore";
import { useSettingsStore } from "./src/data/stores/settingsStore";
import { startEgvsSimulator, stopEgvsSimulator } from "./src/engine/simCgms";
import ToastHost from "./src/ui/components/ToastHost";
import LevelUpOverlay from "./src/ui/components/LevelUpOverlay";
import LevelUpTestButton from "./src/ui/components/LevelUpTestButton";
import DevDebugPanel from "./src/ui/components/DevDebugPanel";
import { useTheme } from "./src/data/hooks/useTheme";
import { initializeCosmeticSystem } from "./src/game/cosmetics/cosmeticDefinitions";
import { useOutfitStore } from "./src/data/stores/outfitStore";
import { POSE_DEFINITIONS } from "./src/data/poses/poseDefinitions";
import { useHealthKit } from "./src/data/hooks/useHealthKit";
// import { migrateEquippedCosmeticsToOutfit, syncOutfitToCosmeticsStore } from "./src/data/utils/outfitMigration.ts";

const TABS = ["HOME", "SHOP", "OUTFIT", "🕹️ ARCADE", "SETTINGS"] as const;
type Tab = typeof TABS[number];

export default function App() {
  // ---- theme ----
  const { colors, spacing, borderRadius, typography } = useTheme();

  // Filter out noisy EXGL warnings
  useEffect(() => {
    const originalLog = console.log;
    console.log = (...args) => {
      const message = args.join(' ');
      if (message.includes('EXGL: gl.pixelStorei() doesn\'t support this parameter yet!')) {
        return; // Silently ignore this warning
      }
      originalLog.apply(console, args);
    };

    return () => {
      console.log = originalLog;
    };
  }, []);

  // Cross-platform shadow styles for tabs
  const getTabShadow = (isActive: boolean) => Platform.select({
    web: {
      boxShadow: isActive ? `0 1px 2px rgba(0, 0, 0, 0.1)` : `0 1px 2px rgba(0, 0, 0, 0.05)`,
    },
    default: {
      shadowColor: colors.gray?.[900] || '#fafaf9',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isActive ? 0.1 : 0.05,
      shadowRadius: 2,
      elevation: isActive ? 2 : 1,
    },
  });

  // ---- persistence → engine sync ----
  const rehydrated = useProgressionStore((s) => s._rehydrated);
  const userRehydrated = useUserStore((s) => s._rehydrated);
  const outfitRehydrated = useOutfitStore((s) => s._rehydrated);
  const hasCompletedOnboarding = useUserStore((s) => s.hasCompletedOnboarding);
  const syncProgressionToEngine = useGameStore((s) => s.syncProgressionToEngine);

  // ---- tabs ----
  const [tab, setTab] = useState<Tab>("HOME");

  // ---- sim wiring & health integration ----
  const onEgvs = useGameStore.getState().onEgvs; // stable reference is fine
  const useSimulator = useSettingsStore((s) => s.useSimulator);
  const simSpeed = useSettingsStore((s) => s.simSpeed);
  const healthKit = useHealthKit();

  // Load settings once (if your settings store persists/loads)
  useEffect(() => {
    useSettingsStore.getState().load?.();
  }, []);

  // Initialize cosmetic system once
  useEffect(() => {
    initializeCosmeticSystem();
  }, []);

  // Initialize outfit system with poses and migration
  useEffect(() => {
    if (outfitRehydrated && rehydrated) {
      // Add poses to the outfit store if they're not already there
      const currentPoses = useOutfitStore.getState().poses;
      const missingPoses = POSE_DEFINITIONS.filter(
        pose => !currentPoses.find(cp => cp.id === pose.id)
      );

      if (missingPoses.length > 0) {
        useOutfitStore.setState(state => ({
          poses: [...state.poses, ...missingPoses]
        }));
      }

      // Migrate existing equipped cosmetics to outfit system
      // migrateEquippedCosmeticsToOutfit();

      // Set up sync to maintain backward compatibility
      // syncOutfitToCosmeticsStore();
    }
  }, [outfitRehydrated, rehydrated]);

  // Show onboarding if user hasn't completed it and stores are rehydrated
  const showOnboarding = userRehydrated && !hasCompletedOnboarding;

  // After progression rehydrates, mirror into engine (keeps HUD consistent on reload)
  useEffect(() => {
    if (rehydrated) syncProgressionToEngine();
  }, [rehydrated, syncProgressionToEngine]);

  // EGV data source lifecycle (HealthKit + simulator fallback)
  useEffect(() => {
    // Use HealthKit if available and monitoring, otherwise fall back to simulator
    const shouldUseHealthKit = healthKit.isAvailable && healthKit.isObserving;
    const shouldSim = useSimulator || Platform.OS === "web" || !shouldUseHealthKit;

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
  }, [useSimulator, simSpeed, onEgvs, healthKit.isAvailable, healthKit.isObserving]);

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

  // Show onboarding screen if user hasn't completed it
  if (showOnboarding) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <OnboardingScreen onComplete={() => {
          // Onboarding completion is handled by the OnboardingScreen component
          // The state will update automatically via the store
        }} />
      </SafeAreaView>
    );
  }

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
              backgroundColor: tab === t ? (colors.primary?.[500] || '#0ea5e9') : (colors.background?.card || '#ffffff'),
              borderWidth: 1,
              borderColor: tab === t ? (colors.primary?.[600] || '#0284c7') : (colors.gray?.[300] || '#d6d3d1'),
              ...getTabShadow(tab === t),
            }}
          >
            <Text style={{
              color: tab === t ? (colors.text?.inverse || '#ffffff') : (colors.text?.primary || '#1c1917'),
              fontWeight: (typography.weight?.semibold || '600') as any,
              fontSize: typography.size?.sm || 14,
            }}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* content */}
      <View style={{ flex: 1 }}>
        {tab === "HOME" && <HomeScreen />}
        {/* DEXCOM tab removed - component preserved for future Bluetooth device integration */}
        {/* GAME tab removed - GameCanvas is now embedded in Home (formerly HUD) screen */}

        {tab === "SHOP" && <ShopScreen />}
        {tab === "OUTFIT" && <OutfitScreen />}
        {tab === "🕹️ ARCADE" && <ArcadeScreen />}
        {tab === "SETTINGS" && <SettingsScreen />}
      </View>

      {/* global overlays */}
      <ToastHost />
      <LevelUpOverlay />
      <LevelUpTestButton />
      <DevDebugPanel />
    </SafeAreaView>
  );
}
