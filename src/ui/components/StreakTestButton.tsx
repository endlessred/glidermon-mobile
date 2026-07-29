// components/StreakTestButton.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSettingsStore } from "../../data/stores/settingsStore";
import { useStreakStore, MAX_FREEZES } from "../../data/stores/streakStore";
import {
  resetFresh,
  hitTodaysGoal,
  simulateSkippedDay,
  simulateFrozenGap,
  simulateInsufficientFreezeGap,
  setStreakNearMilestone,
} from "../../data/stores/streakTestScenarios";

export default function StreakTestButton() {
  const showLevelUpTest = useSettingsStore((s) => s.showLevelUpTest);
  const freezesAvailable = useStreakStore((s) => s.freezesAvailable);
  if (!showLevelUpTest) return null;

  return (
    <View style={{
      position: "absolute",
      top: 220,
      right: 20,
      backgroundColor: "#2d4356",
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#e29e4a",
    }}>
      <Text style={{ color: "#ffd8a8", fontWeight: "600", fontSize: 12, marginBottom: 4, textAlign: "center" }}>
        Test Streak System
      </Text>
      <Text style={{ color: "#9cc4e4", fontSize: 11, marginBottom: 8, textAlign: "center" }}>
        Freezes: {freezesAvailable} / {MAX_FREEZES}
      </Text>

      <Pressable
        onPress={hitTodaysGoal}
        style={{ paddingVertical: 8, paddingHorizontal: 12, backgroundColor: "#e29e4a", borderRadius: 6, marginBottom: 6 }}
      >
        <Text style={{ color: "#1a1305", fontWeight: "600", fontSize: 14, textAlign: "center" }}>
          Hit today's goal
        </Text>
      </Pressable>

      <Pressable
        onPress={simulateSkippedDay}
        style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#233043", borderRadius: 6, marginBottom: 6 }}
      >
        <Text style={{ color: "#9cc4e4", fontWeight: "500", fontSize: 12, textAlign: "center" }}>
          Simulate skipped day (lost)
        </Text>
      </Pressable>

      <Pressable
        onPress={simulateFrozenGap}
        style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#233043", borderRadius: 6, marginBottom: 6 }}
      >
        <Text style={{ color: "#9cc4e4", fontWeight: "500", fontSize: 12, textAlign: "center" }}>
          Simulate 1-day gap (freeze covers)
        </Text>
      </Pressable>

      <Pressable
        onPress={simulateInsufficientFreezeGap}
        style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#233043", borderRadius: 6, marginBottom: 6 }}
      >
        <Text style={{ color: "#9cc4e4", fontWeight: "500", fontSize: 12, textAlign: "center" }}>
          Simulate 2-day gap (freeze insufficient)
        </Text>
      </Pressable>

      <Pressable
        onPress={setStreakNearMilestone}
        style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#233043", borderRadius: 6, marginBottom: 6 }}
      >
        <Text style={{ color: "#9cc4e4", fontWeight: "500", fontSize: 12, textAlign: "center" }}>
          Set streak to 6 (test milestone)
        </Text>
      </Pressable>

      <Pressable
        onPress={resetFresh}
        style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: "#233043", borderRadius: 6 }}
      >
        <Text style={{ color: "#9cc4e4", fontWeight: "500", fontSize: 12, textAlign: "center" }}>
          Reset streak
        </Text>
      </Pressable>
    </View>
  );
}
