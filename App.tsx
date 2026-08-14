// App.tsx
// import './src/spine/spinePhysicsShim'; // Temporarily removed to debug physics issues
import React, { useState, useEffect } from "react";
import { Platform, View, AppState, Linking, ImageSourcePropType } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useProgressionStore } from "./src/data/stores/progressionStore";
import { useUserStore } from "./src/data/stores/userStore";
import { CraftBottomNav, CraftNavItem } from "./src/ui/components/handcrafted";
import HomeScreen from "./src/ui/screens/HudScreen"; // HudScreen serves as HomeScreen
// import DexcomEgvsScreen from "./src/ui/screens/DexcomEgvsScreen"; // Preserved for future Bluetooth device integration
import GameCanvas from "./src/game/view/GameCanvas";
import ShopScreen, { ShopCategory } from "./src/ui/screens/ShopScreen";
import EquipScreen from "./src/ui/screens/EquipScreen";
import SettingsScreen from "./src/ui/screens/SettingsScreen";
import LeaderboardScreen from "./src/ui/screens/LeaderboardScreen";
import GalleryScreen from "./src/ui/screens/GalleryScreen";
import AcornHuntScreen from "./src/ui/screens/AcornHuntScreen";
import UpsAndDownsScreen from "./src/ui/screens/UpsAndDownsScreen";
import OnboardingScreen from "./src/ui/screens/OnboardingScreen";
import CosmeticThumbnailCapture from "./src/dev/CosmeticThumbnailCapture";
import { useGameStore } from "./src/data/stores/gameStore";
import { useSettingsStore } from "./src/data/stores/settingsStore";
import { startEgvsSimulator, stopEgvsSimulator } from "./src/engine/simCgms";
import ToastHost from "./src/ui/components/ToastHost";
import AcornFlightOverlay from "./src/ui/components/AcornFlightOverlay";
import DevDebugPanel from "./src/ui/components/DevDebugPanel";
import StreakSplashOverlay from "./src/ui/components/StreakSplashOverlay";
import StreakCommitmentModal from "./src/ui/components/StreakCommitmentModal";
import StreakTestButton from "./src/ui/components/StreakTestButton";
import { useStreakStore } from "./src/data/stores/streakStore";
import { useCheckInStore } from "./src/data/stores/checkInStore";
import {
  triggerStartedSplash,
  triggerContinuedSplash,
  simulateFrozenGap,
  simulateSkippedDay,
  triggerCommitmentModal,
  triggerMilestone,
} from "./src/data/stores/streakTestScenarios";
import { configureNotificationHandler } from "./src/notifications/streakReminder";
import { useTheme } from "./src/data/hooks/useTheme";
import { initializeCosmeticSystem } from "./src/game/cosmetics/cosmeticDefinitions";
import { useOutfitStore } from "./src/data/stores/outfitStore";
import { POSE_DEFINITIONS } from "./src/data/poses/poseDefinitions";
import { useHealthKit } from "./src/data/hooks/useHealthKit";
// import { migrateEquippedCosmeticsToOutfit, syncOutfitToCosmeticsStore } from "./src/data/utils/outfitMigration.ts";

// Arcade is deprecated and deliberately excluded from TABS (not just hidden
// in the nav) -- ArcadeScreen itself is left in place, just disconnected.
// Settings stays a valid Tab (still reachable via setTab("SETTINGS") / the
// glidermon://settings deep link below, and SettingsScreen still renders
// off it) but is intentionally excluded from NAV_TABS -- see NAV_TABS.
const TABS = ["HOME", "SHOP", "OUTFIT", "🎨 GALLERY", "SETTINGS"] as const;
type Tab = typeof TABS[number];

// The persistent bottom nav's four primary destinations. Settings has no
// dedicated nav/UI entry point right now (product decision, 2026-08) --
// deep-link-only until a proper location (e.g. a profile/menu entry) is
// designed for it.
const NAV_TABS = ["HOME", "SHOP", "OUTFIT", "🎨 GALLERY"] as const;
type NavTab = typeof NAV_TABS[number];

const homeNavIcon = require("./src/assets/UI Assets/Icons/Home.png");
const shopNavIcon = require("./src/assets/UI Assets/Icons/Shop.png");

// Display metadata for the crafted bottom nav -- kept separate from TABS
// (which stays the single source of truth for routing/deep-link/state
// values) so the nav shows clean title-case labels + icons without any of
// that touching navigation logic. Home/Shop use the existing custom craft
// icon set; Outfit/Gallery fall back to emoji since no custom icon exists
// for them yet (Wardrobe.png bakes in its own green felt badge, which would
// clash with the nav's blue/green color semantics).
const NAV_ICONS: Record<NavTab, string | ImageSourcePropType> = {
  HOME: homeNavIcon,
  SHOP: shopNavIcon,
  OUTFIT: "👕",
  "🎨 GALLERY": "🎨",
};
const NAV_LABELS: Record<NavTab, string> = {
  HOME: "Home",
  SHOP: "Shop",
  OUTFIT: "Outfit",
  "🎨 GALLERY": "Gallery",
};

// Dev/test deep links, e.g.:
//   adb shell am start -a android.intent.action.VIEW -d "glidermon://shop/floors"
const DEEP_LINK_TABS: Record<string, Tab> = {
  home: "HOME",
  shop: "SHOP",
  outfit: "OUTFIT",
  gallery: "🎨 GALLERY",
  settings: "SETTINGS",
};
const SHOP_CATEGORIES: ShopCategory[] = ["cosmetics", "floors", "walls", "furniture"];

// Dev/test deep links for jumping straight to a specific streak popup, e.g.:
//   adb shell am start -a android.intent.action.VIEW -d "glidermon://streak/lost"
// Forces the store into that scenario and shows HOME so the popup is visible.
const STREAK_SCENARIOS: Record<string, () => void> = {
  started: triggerStartedSplash,
  continued: triggerContinuedSplash,
  frozen: simulateFrozenGap,
  lost: simulateSkippedDay,
  commitment: triggerCommitmentModal,
  milestone7: () => triggerMilestone(7),
  milestone30: () => triggerMilestone(30),
  milestone100: () => triggerMilestone(100),
  milestone365: () => triggerMilestone(365),
};

function parseGlidermonUrl(url: string): { tab: Tab; shopCategory?: ShopCategory } | { streakScenario: string } | { devRoute: string } | null {
  const match = url.match(/^glidermon:\/\/([^/?]+)\/?([^/?]*)/i);
  if (!match) return null;
  const segment = match[1].toLowerCase();
  const sub = match[2].toLowerCase();

  if (segment === "streak" && STREAK_SCENARIOS[sub]) {
    return { streakScenario: sub };
  }

  // Dev-only tooling, e.g. glidermon://dev/thumbnails -- see
  // src/dev/CosmeticThumbnailCapture.tsx and its generator script.
  if (segment === "dev" && sub) {
    return { devRoute: sub };
  }

  const tab = DEEP_LINK_TABS[segment];
  if (!tab) return null;
  if (tab === "SHOP" && SHOP_CATEGORIES.includes(sub as ShopCategory)) {
    return { tab, shopCategory: sub as ShopCategory };
  }
  return { tab };
}

export default function App() {
  // ---- theme ----
  const { colors } = useTheme();

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

  // ---- persistence → engine sync ----
  const rehydrated = useProgressionStore((s) => s._rehydrated);
  const userRehydrated = useUserStore((s) => s._rehydrated);
  const outfitRehydrated = useOutfitStore((s) => s._rehydrated);
  const hasCompletedOnboarding = useUserStore((s) => s.hasCompletedOnboarding);
  const syncProgressionToEngine = useGameStore((s) => s.syncProgressionToEngine);

  // ---- tabs ----
  const [tab, setTab] = useState<Tab>("HOME");
  const [shopCategory, setShopCategory] = useState<ShopCategory | undefined>(undefined);
  const [shopLinkNonce, setShopLinkNonce] = useState(0);
  const [devRoute, setDevRoute] = useState<string | null>(null);

  // ---- dev/test deep links (glidermon://<tab>[/<shop-category>]) ----
  useEffect(() => {
    const handleUrl = (url: string) => {
      const parsed = parseGlidermonUrl(url);
      if (!parsed) return;

      if ("streakScenario" in parsed) {
        STREAK_SCENARIOS[parsed.streakScenario]();
        setTab("HOME");
        return;
      }

      if ("devRoute" in parsed) {
        if (__DEV__) setDevRoute(parsed.devRoute);
        return;
      }

      setTab(parsed.tab);
      if (parsed.shopCategory) {
        setShopCategory(parsed.shopCategory);
        setShopLinkNonce((n) => n + 1);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });
    const sub = Linking.addEventListener("url", (e) => handleUrl(e.url));
    return () => sub.remove();
  }, []);

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

  // Notification handler + channel setup (idempotent)
  useEffect(() => {
    configureNotificationHandler();
  }, []);

  // Daily reset guard (no Date arg; store handles its own clock)
  useEffect(() => {
    const check = () => {
      useProgressionStore.getState().resetDailyIfNeeded();
      useStreakStore.getState().evaluate();
      useCheckInStore.getState().resetDailyIfNeeded();
    };

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

  // Dev-only tooling routes (glidermon://dev/<route>), e.g. thumbnail capture.
  if (__DEV__ && devRoute === "thumbnails") {
    return <CosmeticThumbnailCapture />;
  }

  // Show onboarding screen if user hasn't completed it
  if (showOnboarding) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
          <OnboardingScreen onComplete={() => {
            // Onboarding completion is handled by the OnboardingScreen component
            // The state will update automatically via the store
          }} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* content */}
      <View style={{ flex: 1 }}>
        {tab === "HOME" && <HomeScreen />}
        {/* DEXCOM tab removed - component preserved for future Bluetooth device integration */}
        {/* GAME tab removed - GameCanvas is now embedded in Home (formerly HUD) screen */}

        {tab === "SHOP" && <ShopScreen key={shopLinkNonce} initialCategory={shopCategory} />}
        {tab === "OUTFIT" && <EquipScreen />}
        {tab === "🎨 GALLERY" && <GalleryScreen />}
        {tab === "SETTINGS" && <SettingsScreen />}
      </View>

      {/* bottom nav: one continuous crafted shelf, matching the Home/Equip
          handmade material system -- see src/ui/components/handcrafted/. */}
      <CraftBottomNav>
        {NAV_TABS.map((t) => (
          <CraftNavItem
            key={t}
            icon={NAV_ICONS[t]}
            label={NAV_LABELS[t]}
            active={tab === t}
            onPress={() => setTab(t)}
          />
        ))}
      </CraftBottomNav>

      {/* global overlays */}
      <ToastHost />
      <StreakSplashOverlay />
      <StreakCommitmentModal />
      <StreakTestButton />
      {/* Acorn flight particles render last so they stay above any modal-style overlay above (e.g. the streak splash) */}
      <AcornFlightOverlay />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
