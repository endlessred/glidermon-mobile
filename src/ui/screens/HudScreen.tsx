import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { useUserStore } from "../../data/stores/userStore";
import { useGalleryStore } from "../../data/stores/galleryStore";
import AcornBadge from "../components/AcornBadge";
import { useTheme } from "../../data/hooks/useTheme";
import { useComplimentShower } from "../components/ComplimentShower";
import { useActiveLocalOutfit } from "../../data/stores/outfitStore";
import { IsometricHousingThreeJS, IsometricRoomView, IsometricRoomView3D } from "../../game/housing";

// Housing renderer switch: 'legacy' is the original Spine-room-skeleton
// renderer (root cause of choppy character animation, kept only as a
// fallback); 'quad' is the Phase 1 flat-sprite-plane rewrite (kept as a
// fallback); 'primitive3d' is the real-3D-primitive room shell -- now the
// default. Known gap vs 'quad': no zoom-in toggle yet (fast-follow).
type HousingRenderer = 'legacy' | 'quad' | 'primitive3d';
const HOUSING_RENDERER: HousingRenderer = 'primitive3d';
import { UIThemeProvider } from "../theme/UIThemeProvider";
import { FramedCard } from "../components/FramedCard";
import AcornBadgeVisual from "../components/AcornBadgeVisual";
import { useAcornBadgeAnchor } from "../hooks/useAcornBadgeAnchor";
import StreakBadge from "../components/StreakBadge";
import { CheckInCard } from "../components/CheckInCard";
import GoalsList from "../components/GoalsList";
import { CheckInFlowModal } from "../components/CheckInFlowModal";
import StreakDetailModal from "../components/StreakDetailModal";
import { useCheckInStore } from "../../data/stores/checkInStore";
import FurnitureDevPanel from "../components/FurnitureDevPanel";

export default function HudScreen() {
  const { width, height } = useWindowDimensions();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { viewRef: acornBadgeAnchorRef, onLayout: onAcornBadgeLayout } = useAcornBadgeAnchor();

  // User data
  const glidermonName = useUserStore(s => s.glidermonName);

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

  // Glidermon room fills the top third of the screen; its GL view is sized
  // to whatever that box measures out to via onLayout, rather than a fixed
  // pixel size, since the box itself now depends on window height.
  const [roomBoxSize, setRoomBoxSize] = useState<{ width: number; height: number } | null>(null);
  const roomSectionHeight = Math.round(height / 3);
  const roomCardWidth = width - spacing.lg * 2;
  const roomCardHeight = roomSectionHeight - spacing.sm * 2;

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
    <View style={{ flex: 1, backgroundColor: colors.background.primary }}>
      {/* ===== Glidermon Room (top third of the screen) ===== */}
      <UIThemeProvider mode="cozy">
        <View style={{
          height: roomSectionHeight,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        }}>
          <FramedCard width={roomCardWidth} height={roomCardHeight}>
            <View style={{ flex: 1 }}>
              {/* ===== Status row: name + acorns + streak (reserved strip, doesn't overlap the scene below) ===== */}
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                marginBottom: spacing.sm,
              }}>
                {glidermonName && (
                  <Text style={{
                    fontSize: typography.size.base,
                    fontWeight: typography.weight.semibold as any,
                    color: colors.text.primary,
                  }}>
                    {glidermonName}
                  </Text>
                )}
                <View ref={acornBadgeAnchorRef} onLayout={onAcornBadgeLayout}>
                  <AcornBadgeVisual width={90} height={32} />
                </View>
                <StreakBadge onPress={() => setStreakDetailOpen(true)} />
              </View>

              {/* Isometric room with character at B3 */}
              {HOUSING_RENDERER === 'primitive3d' && <FurnitureDevPanel />}
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
                      characterScale={0.3}
                      outfit={localOutfit ?? undefined}
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
            </View>
          </FramedCard>
        </View>
      </UIThemeProvider>

      {/* ===== Rest of the HUD, scrollable below the room ===== */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: spacing.lg,
          gap: spacing.lg,
          paddingBottom: spacing['3xl'],
        }}
      >
        {/* ===== Goals list: small auto-generated diabetes-management goals ===== */}
        <GoalsList />

        {/* ===== Check-In Card (appears when a slot is active) ===== */}
        {availableSlot && (
          <UIThemeProvider mode="cozy">
            <CheckInCard onPress={() => setCheckInOpen(true)} />
          </UIThemeProvider>
        )}
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







