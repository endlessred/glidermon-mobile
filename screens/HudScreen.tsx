import React from "react";
import { View, Text, ScrollView, useWindowDimensions } from "react-native";
import { useProgressionStore } from "../stores/progressionStore";
import AcornBadge from "../components/AcornBadge";
import LevelBar from "../components/LevelBar";
import DailyCapBar from "../components/DailyCapBar";
import { useHudVM } from "../hooks/useHudVM";
import GameCanvas from "../view/GameCanvas";
import { useTheme } from "../hooks/useTheme";
import { getGlucoseColor, getTrendIcon } from "../styles/theme";

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

  // Glucose VM (null-safe)
  const { mgdl, trendCode, minutesAgo } = useHudVM();

  // Optional: slightly smaller canvas on tiny screens
  const canvasScale = width < 380 ? 0.9 : 1;

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
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
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
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <GameCanvas variant="embedded" />
      </View>

      {/* ===== Glucose Section ===== */}
      <View style={{
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        gap: spacing.md,
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
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
        </View>
      </View>
    </ScrollView>
  );
}
