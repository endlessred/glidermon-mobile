// components/StreakDetailModal.tsx
import React from "react";
import { Modal, View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStreakStore, MAX_FREEZES, getMilestoneProgress } from "../../data/stores/streakStore";
import { useTheme } from "../../data/hooks/useTheme";

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Bubbles beyond this stretch length are shown as a bar instead — 265 individual dots isn't usable UI. */
const MAX_BUBBLES = 31;

export default function StreakDetailModal({ visible, onClose }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const freezesAvailable = useStreakStore((s) => s.freezesAvailable);

  const progress = getMilestoneProgress(currentStreak);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          padding: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.gray[200],
        }}>
          <Text style={{ color: colors.text.primary, fontSize: typography.size.lg, fontWeight: typography.weight.bold as any }}>
            🔥 Streak
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.text.secondary, fontSize: typography.size.md }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 56 }}>🔥</Text>
            <Text style={{ color: colors.text.primary, fontWeight: typography.weight.bold as any, fontSize: 40 }}>
              {currentStreak}
            </Text>
            <Text style={{ color: colors.text.secondary, fontSize: typography.size.base }}>
              day{currentStreak === 1 ? "" : "s"}
            </Text>
          </View>

          <View style={{
            flexDirection: "row",
            justifyContent: "space-around",
            backgroundColor: colors.background.card,
            borderRadius: borderRadius.lg,
            paddingVertical: spacing.md,
          }}>
            <StatBlock label="Best streak" value={`${longestStreak}`} colors={colors} typography={typography} />
            <StatBlock label="Freezes" value={`${freezesAvailable} / ${MAX_FREEZES}`} colors={colors} typography={typography} />
          </View>

          <View style={{
            backgroundColor: colors.background.card,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
          }}>
            {progress.nextTier === null ? (
              <Text style={{ color: colors.text.primary, fontSize: typography.size.base, fontWeight: typography.weight.medium as any, textAlign: "center" }}>
                🏆 Every milestone reached — legendary streak!
              </Text>
            ) : (
              <>
                <Text style={{
                  color: colors.text.primary,
                  fontSize: typography.size.base,
                  fontWeight: typography.weight.medium as any,
                  marginBottom: spacing.md,
                }}>
                  {progress.daysLeft} day{progress.daysLeft === 1 ? "" : "s"} until your {progress.nextTier}-day milestone
                </Text>

                {progress.stretchLength <= MAX_BUBBLES ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {Array.from({ length: progress.stretchLength }).map((_, i) => (
                      <View
                        key={i}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          backgroundColor: i < progress.daysIntoStretch ? colors.primary[500] : "transparent",
                          borderWidth: 2,
                          borderColor: i < progress.daysIntoStretch ? colors.primary[500] : colors.gray[300],
                        }}
                      />
                    ))}
                  </View>
                ) : (
                  <View style={{ height: 12, borderRadius: 6, backgroundColor: colors.gray[200], overflow: "hidden" }}>
                    <View style={{
                      height: "100%",
                      width: `${Math.min(100, (progress.daysIntoStretch / progress.stretchLength) * 100)}%`,
                      backgroundColor: colors.primary[500],
                      borderRadius: 6,
                    }} />
                  </View>
                )}

                <Text style={{ color: colors.text.secondary, fontSize: typography.size.sm, marginTop: spacing.sm }}>
                  {progress.daysIntoStretch} / {progress.stretchLength} days since your {progress.previousTier === 0 ? "start" : `${progress.previousTier}-day milestone`}
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function StatBlock({ label, value, colors, typography }: { label: string; value: string; colors: any; typography: any }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ color: colors.text.primary, fontSize: typography.size.lg, fontWeight: typography.weight.bold as any }}>
        {value}
      </Text>
      <Text style={{ color: colors.text.secondary, fontSize: typography.size.sm }}>
        {label}
      </Text>
    </View>
  );
}
