// components/StreakTestButton.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSettingsStore } from "../../data/stores/settingsStore";
import { useStreakStore, ymd, DAILY_GOAL_ACORNS } from "../../data/stores/streakStore";
import { useProgressionStore } from "../../data/stores/progressionStore";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return ymd(d);
}

export default function StreakTestButton() {
  const showLevelUpTest = useSettingsStore((s) => s.showLevelUpTest);
  if (!showLevelUpTest) return null;

  const resetFresh = () => {
    useProgressionStore.setState({ dailyEarned: 0 });
    useStreakStore.setState({
      currentStreak: 0,
      longestStreak: 0,
      lastGoalMetDate: null,
      lastEvaluatedDate: ymd(),
      lastSplashShownDate: null,
      pendingSplash: null,
      hasCommitted: false,
    });
  };

  const hitTodaysGoal = () => {
    // Real path: bumping dailyEarned fires streakStore's subscribe -> evaluate().
    useProgressionStore.setState({ dailyEarned: DAILY_GOAL_ACORNS });
  };

  const simulateSkippedDay = () => {
    useProgressionStore.setState({ dailyEarned: 0 });
    useStreakStore.setState({
      currentStreak: 5,
      longestStreak: 5,
      lastGoalMetDate: daysAgo(3),
      lastEvaluatedDate: daysAgo(2),
      pendingSplash: null,
    });
    useStreakStore.getState().evaluate();
  };

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
      <Text style={{ color: "#ffd8a8", fontWeight: "600", fontSize: 12, marginBottom: 8, textAlign: "center" }}>
        Test Streak System
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
