import React, { useEffect, useState } from "react";
import { View, ScrollView, useWindowDimensions } from "react-native";
import { useGalleryStore } from "../../data/stores/galleryStore";
import { useTheme } from "../../data/hooks/useTheme";
import { useComplimentShower } from "../components/ComplimentShower";
import { useActiveLocalOutfit } from "../../data/stores/outfitStore";
import { IsometricHousingThreeJS, IsometricRoomView, IsometricRoomView3D } from "../../game/housing";

// Housing renderer switch: 'legacy' is the original Spine-room-skeleton
// renderer (root cause of choppy character animation, kept only as a
// fallback); 'quad' is the Phase 1 flat-sprite-plane rewrite (kept as a
// fallback); 'primitive3d' is the real-3D-primitive room shell -- now the
// default. Known gap vs 'quad': no camera preset support yet (fast-follow).
type HousingRenderer = 'legacy' | 'quad' | 'primitive3d';
const HOUSING_RENDERER: HousingRenderer = 'primitive3d';
// Dev-only furniture picker -- kept out of the normal layout even in dev
// builds (FurnitureDevPanel itself is already __DEV__-gated); flip this
// locally when you actually need it rather than leaving it always-on.
const SHOW_FURNITURE_DEV_PANEL = false;
import HomeHeader from "../components/HomeHeader";
import NestCraftPanel from "../components/NestCraftPanel";
import CameraPresetTabs, { CameraMode } from "../components/CameraPresetTabs";
import { useAcornBadgeAnchor } from "../hooks/useAcornBadgeAnchor";
import { CheckInCard } from "../components/CheckInCard";
import DailyGoalBoard from "../components/DailyGoalBoard";
import { CheckInFlowModal } from "../components/CheckInFlowModal";
import StreakDetailModal from "../components/StreakDetailModal";
import { useCheckInStore } from "../../data/stores/checkInStore";
import FurnitureDevPanel from "../components/FurnitureDevPanel";

// Same mint used on the Equip screen -- ties Home into the same crafted
// visual system without making every screen identical.
const HOME_BACKGROUND = "#BFE0DA";

export default function HudScreen() {
  const { width, height } = useWindowDimensions();
  const { spacing } = useTheme();
  const { viewRef: acornBadgeAnchorRef, onLayout: onAcornBadgeLayout } = useAcornBadgeAnchor();

  // Local outfit for character display (what the user sees in their own app)
  const localOutfit = useActiveLocalOutfit();

  // Gallery system for compliment shower
  const { myEntry, getNewReactions, clearNewReactions } = useGalleryStore();
  const { triggerShower, ComplimentShowerComponent } = useComplimentShower();

  // Check-in state
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [streakDetailOpen, setStreakDetailOpen] = useState(false);
  const availableSlot = useCheckInStore(s => s.availableSlot());
  const resetDailyIfNeeded = useCheckInStore(s => s.resetDailyIfNeeded);

  useEffect(() => {
    resetDailyIfNeeded();
  }, []);

  // Camera preset selected via CameraPresetTabs -- "nest" is the standard
  // wide overview, "glidermon" activates the existing close/follow camera.
  // Only reflects a deliberate tab press, never changes on its own.
  const [cameraMode, setCameraMode] = useState<CameraMode>("nest");

  // Glidermon room fills roughly the same vertical budget it always has;
  // its GL view is sized to whatever that box measures out to via
  // onLayout, rather than a fixed pixel size.
  const [roomBoxSize, setRoomBoxSize] = useState<{ width: number; height: number } | null>(null);
  // The Nest is the visual hero of Home -- sized a bit larger than a plain
  // third of the screen so it reads as more visually important.
  const roomSectionHeight = Math.round((height / 3) * 1.12);
  const roomCardWidth = width - spacing.lg * 2;

  // Check for new reactions and trigger compliment shower
  useEffect(() => {
    if (myEntry) {
      const newReactions = getNewReactions(myEntry.id);
      if (newReactions && newReactions.length > 0) {
        // Trigger the compliment shower animation
        triggerShower(newReactions);

        // Clear the new reactions after triggering
        setTimeout(() => {
          clearNewReactions(myEntry.id);
        }, 3000); // Clear after animation completes
      }
    }
  }, [myEntry, getNewReactions, clearNewReactions, triggerShower]);

  return (
    <View style={{ flex: 1, backgroundColor: HOME_BACKGROUND }}>
      {/* ===== Header + Nest (fixed, non-scrolling -- the Nest stays the
          dominant, always-visible element) ===== */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md }}>
        <HomeHeader
          acornAnchorRef={acornBadgeAnchorRef}
          onAcornBadgeLayout={onAcornBadgeLayout}
          onStreakPress={() => setStreakDetailOpen(true)}
        />

        <NestCraftPanel style={{ width: roomCardWidth, height: roomSectionHeight }}>
          {SHOW_FURNITURE_DEV_PANEL && HOUSING_RENDERER === 'primitive3d' && <FurnitureDevPanel />}
          <View
            style={{ flex: 1, overflow: 'hidden', borderRadius: 8 }}
            onLayout={(e) => {
              const rw = Math.round(e.nativeEvent.layout.width);
              const rh = Math.round(e.nativeEvent.layout.height);
              setRoomBoxSize((prev) => (prev && prev.width === rw && prev.height === rh) ? prev : { width: rw, height: rh });
            }}
          >
            {roomBoxSize && (
              HOUSING_RENDERER === 'legacy' ? (
                <IsometricHousingThreeJS
                  width={roomBoxSize.width}
                  height={roomBoxSize.height}
                  gridColumn={1}
                  gridRow={0}
                  characterScale={0.3}
                  outfit={localOutfit ?? undefined}
                />
              ) : HOUSING_RENDERER === 'primitive3d' ? (
                <IsometricRoomView3D
                  width={roomBoxSize.width}
                  height={roomBoxSize.height}
                  characterScale={0.35}
                  outfit={localOutfit ?? undefined}
                  zoomedIn={cameraMode === "glidermon"}
                />
              ) : (
                <IsometricRoomView
                  width={roomBoxSize.width}
                  height={roomBoxSize.height}
                  gridColumn={1}
                  gridRow={0}
                  characterScale={0.3}
                  outfit={localOutfit ?? undefined}
                />
              )
            )}
          </View>
        </NestCraftPanel>

        <CameraPresetTabs
          mode={cameraMode}
          onSelectNest={() => setCameraMode("nest")}
          onSelectGlidermon={() => setCameraMode("glidermon")}
        />
      </View>

      {/* ===== Rest of the HUD, scrollable below the Nest ===== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md + 6,
          gap: spacing.lg + 6,
          paddingBottom: spacing['3xl'],
        }}
      >
        {/* ===== Check-In Card: a deliberate special interaction, shown
            above Today's Goals whenever a slot is currently relevant ===== */}
        {availableSlot && <CheckInCard onPress={() => setCheckInOpen(true)} />}

        {/* ===== Today's Goals: one coherent handcrafted board ===== */}
        <DailyGoalBoard />
      </ScrollView>

      {/* Compliment Shower Animation Overlay */}
      {ComplimentShowerComponent}

      <CheckInFlowModal
        visible={checkInOpen}
        slot={availableSlot}
        onClose={() => setCheckInOpen(false)}
      />

      <StreakDetailModal
        visible={streakDetailOpen}
        onClose={() => setStreakDetailOpen(false)}
      />
    </View>
  );
}
