import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, useWindowDimensions, Platform } from "react-native";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useUserStore } from "../../data/stores/userStore";
import { useGalleryStore } from "../../data/stores/galleryStore";
import AcornBadge from "../components/AcornBadge";
import LevelBar from "../components/LevelBar";
import DailyCapBar from "../components/DailyCapBar";
import { useHudVM } from "../../data/hooks/useHudVM";
import { useTheme } from "../../data/hooks/useTheme";
import { getGlucoseColor, getTrendIcon } from "../../styles/theme";
import GlucoseWindTrail from "../components/GlucoseWindTrail";
import { useGlucoseHistory } from "../../data/hooks/useGlucoseHistory";
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
import { UIThemeProvider, useUITokens } from "../theme/UIThemeProvider";
import { FramedCard } from "../components/FramedCard";
import { BadgeChip } from "../components/BadgeChip";
import StreakBadge from "../components/StreakBadge";
import { CheckInCard } from "../components/CheckInCard";
import { CheckInFlowModal } from "../components/CheckInFlowModal";
import { useCheckInStore } from "../../data/stores/checkInStore";

// Phosphor icons - fallback if not available
let PhosphorIcons: any = {};
try {
  PhosphorIcons = require("phosphor-react-native");
} catch {
  // Fallback if phosphor is not installed yet
}

const { Acorn } = PhosphorIcons;

// Glucose section component that uses UI tokens
const GlucoseSection = () => {
  const uiTokens = useUITokens();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { mgdl, trendCode, minutesAgo } = useHudVM();
  const glucoseHistory = useGlucoseHistory();

  // Cross-platform shadow styles using UI tokens
  const cardShadow = Platform.select({
    web: {
      boxShadow: `0 2px 4px ${uiTokens.shadow}`,
    },
    default: {
      shadowColor: uiTokens.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 2,
    },
  });

  return (
    <View style={{
      backgroundColor: uiTokens.fill,
      borderRadius: uiTokens.radius,
      borderWidth: uiTokens.outline,
      borderColor: uiTokens.outlineColor,
      padding: uiTokens.padding * 1.2,
      gap: spacing.md,
      ...cardShadow,
    }}>
      <Text style={{
        color: uiTokens.text,
        fontWeight: typography.weight.bold as any,
        fontSize: typography.size.lg,
      }}>
        🩺 Glucose Monitor
      </Text>

      <View style={{
        backgroundColor: uiTokens.fillMuted,
        borderRadius: uiTokens.radius * 0.75,
        borderWidth: uiTokens.outline * 0.5,
        borderColor: uiTokens.outlineColor,
        padding: uiTokens.padding * 1.2,
      }}>
        <View style={{
          flexDirection: "row",
          alignItems: "baseline",
          gap: spacing.sm,
        }}>
          <Text style={{
            color: mgdl != null ? getGlucoseColor(mgdl) : uiTokens.textMuted,
            fontSize: typography.size['3xl'],
            fontWeight: typography.weight.extrabold as any,
            lineHeight: typography.lineHeight.tight,
          }}>
            {mgdl != null ? `${mgdl} mg/dL` : "—"}
          </Text>
          <Text style={{
            color: uiTokens.textMuted,
            fontSize: typography.size.lg,
          }}>
            {getTrendIcon(trendCode)}
          </Text>
          <Text style={{
            color: uiTokens.textMuted,
            fontSize: typography.size.sm,
          }}>
            {minutesAgo != null ? `${minutesAgo}m ago` : "no data"}
          </Text>
        </View>

        {/* Wind Trail Chart */}
        <GlucoseWindTrail readings={glucoseHistory} height={100} />
      </View>
    </View>
  );
};

export default function HudScreen() {
  const { width, height } = useWindowDimensions();
  const { colors, spacing, borderRadius, typography } = useTheme();

  // Progression (live)
  const acorns     = useProgressionStore(s => s.acorns);
  const level      = useProgressionStore(s => s.level);
  const xpInto     = useProgressionStore(s => s.xpIntoCurrent);
  const nextXp     = useProgressionStore(s => s.nextXp);
  const dailyEarn  = useProgressionStore(s => s.dailyEarned);
  const dailyCap   = useProgressionStore(s => s.dailyCap);
  const restedBank = useProgressionStore(s => s.restedBank);

  // User data
  const glidermonName = useUserStore(s => s.glidermonName);

  // Local outfit for character display (what the user sees in their own app)
  const localOutfit = useActiveLocalOutfit();

  // Gallery system for compliment shower
  const { myEntry, getNewReactions, clearNewReactions } = useGalleryStore();
  const { triggerShower, ComplimentShowerComponent } = useComplimentShower();

  // Check-in state
  const [checkInOpen, setCheckInOpen] = useState(false);
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
            {glidermonName && (
              <Text style={{
                fontSize: typography.size.lg,
                fontWeight: typography.weight.semibold as any,
                color: colors.text.primary,
                marginBottom: spacing.sm,
                textAlign: "center",
              }}>
                {glidermonName}
              </Text>
            )}
            {/* Isometric room with character at B3 */}
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
                    gridColumn={1}
                    gridRow={0}
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
        {/* ===== Progress Section (Cozy Theme) ===== */}
        <UIThemeProvider mode="cozy">
          <FramedCard width={width - spacing.lg * 2} height={140}>
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing.md,
              marginBottom: spacing.md,
            }}>
              <BadgeChip
                text={`${acorns}`}
                tone="accent"
                width={100}
                height={36}
                LeftIcon={Acorn ? <Acorn size={16} weight="fill" /> : <Text style={{ fontSize: 16 }}>🌰</Text>}
              />
              <StreakBadge />
              <View style={{ flex: 1 }}>
                <LevelBar level={level} current={xpInto} next={nextXp} />
              </View>
            </View>
            <View style={{ paddingBottom: spacing.sm }}>
              <DailyCapBar value={dailyEarn} cap={dailyCap} rested={restedBank} />
            </View>
          </FramedCard>
        </UIThemeProvider>

        {/* ===== Check-In Card (appears when a slot is active) ===== */}
        {availableSlot && (
          <UIThemeProvider mode="cozy">
            <CheckInCard onPress={() => setCheckInOpen(true)} />
          </UIThemeProvider>
        )}

        {/* ===== Glucose Section (Clinical Theme) ===== */}
        <UIThemeProvider mode="clinical">
          <GlucoseSection />
        </UIThemeProvider>
      </ScrollView>

      {/* Compliment Shower Animation Overlay */}
      {ComplimentShowerComponent}

      <CheckInFlowModal
        visible={checkInOpen}
        slot={availableSlot}
        onClose={() => setCheckInOpen(false)}
      />
    </View>
  );
}







