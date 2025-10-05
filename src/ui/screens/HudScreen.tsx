import React, { useEffect } from "react";
import { View, Text, ScrollView, useWindowDimensions, Platform } from "react-native";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useUserStore } from "../../data/stores/userStore";
import { useGalleryStore } from "../../data/stores/galleryStore";
import AcornBadge from "../components/AcornBadge";
import LevelBar from "../components/LevelBar";
import DailyCapBar from "../components/DailyCapBar";
import { useHudVM } from "../../data/hooks/useHudVM";
import GameCanvas from "../../game/view/GameCanvas";
import SpineCharacter from "../../game/view/SpineCharacter";
import { IsometricHousingThreeJS } from "../../game/housing";
import { useTheme } from "../../data/hooks/useTheme";
import { getGlucoseColor, getTrendIcon } from "../../styles/theme";
import GlucoseWindTrail from "../components/GlucoseWindTrail";
import { useGlucoseHistory } from "../../data/hooks/useGlucoseHistory";
import { useComplimentShower } from "../components/ComplimentShower";
import { useActiveLocalOutfit } from "../../data/stores/outfitStore";

export default function HudScreen() {
  const { width } = useWindowDimensions();
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

  // Glucose VM (null-safe)
  const { mgdl, trendCode, minutesAgo } = useHudVM();
  const glucoseHistory = useGlucoseHistory();

  // Optional: slightly smaller canvas on tiny screens
  const canvasScale = width < 380 ? 0.9 : 1;

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

  // Cross-platform shadow styles
  const cardShadow = Platform.select({
    web: {
      boxShadow: `0 2px 4px rgba(0, 0, 0, 0.05)`,
    },
    default: {
      shadowColor: colors.gray[900],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      contentContainerStyle={{
        padding: spacing.lg,
        gap: spacing.lg,
        paddingBottom: spacing['3xl'],
      }}
    >
      {/* ===== Progress Section ===== */}
      <View style={{
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        gap: spacing.md,
        ...cardShadow,
      }}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing.md,
        }}>
          <AcornBadge count={acorns} />
          <View style={{ flex: 1 }}>
            <LevelBar level={level} current={xpInto} next={nextXp} />
          </View>
        </View>
        <DailyCapBar value={dailyEarn} cap={dailyCap} rested={restedBank} />
      </View>

      {/* ===== Game Canvas (moved here) ===== */}
      <View style={{
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        transform: [{ scale: canvasScale }],
        ...cardShadow,
      }}>
        {glidermonName && (
          <Text style={{
            fontSize: typography.size.lg,
            fontWeight: typography.weight.semibold as any,
            color: colors.text.primary,
            marginBottom: spacing.md,
            textAlign: "center",
          }}>
            {glidermonName}
          </Text>
        )}
        {/* Isometric apartment with character */}
        <View style={{ width: 300, height: 250, overflow: 'hidden', borderRadius: 8 }}>
          <IsometricHousingThreeJS
            width={300}
            height={250}
            characterX={4}
            characterY={4}
          />
        </View>
      </View>

      {/* ===== Glucose Section ===== */}
      <View style={{
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        gap: spacing.md,
        ...cardShadow,
      }}>
        <Text style={{
          color: colors.text.primary,
          fontWeight: typography.weight.bold as any,
          fontSize: typography.size.lg,
        }}>
          🩺 Glucose Monitor
        </Text>

        <View style={{
          backgroundColor: colors.background.secondary,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.gray[200],
          padding: spacing.lg,
        }}>
          <View style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: spacing.sm,
          }}>
            <Text style={{
              color: mgdl != null ? getGlucoseColor(mgdl) : colors.text.secondary,
              fontSize: typography.size['3xl'],
              fontWeight: typography.weight.extrabold as any,
              lineHeight: typography.lineHeight.tight,
            }}>
              {mgdl != null ? `${mgdl} mg/dL` : "—"}
            </Text>
            <Text style={{
              color: colors.text.secondary,
              fontSize: typography.size.lg,
            }}>
              {getTrendIcon(trendCode)}
            </Text>
            <Text style={{
              color: colors.text.secondary,
              fontSize: typography.size.sm,
            }}>
              {minutesAgo != null ? `${minutesAgo}m ago` : "no data"}
            </Text>
          </View>

          {/* Wind Trail Chart */}
          <GlucoseWindTrail readings={glucoseHistory} height={100} />
        </View>
      </View>

      {/* Compliment Shower Animation Overlay */}
      {ComplimentShowerComponent}
    </ScrollView>
  );
}
