// ui/components/StreakBadge.tsx
import React from "react";
import { Text } from "react-native";
import { BadgeChip } from "./BadgeChip";
import { useStreakStore } from "../../data/stores/streakStore";

export default function StreakBadge() {
  const currentStreak = useStreakStore((s) => s.currentStreak);

  return (
    <BadgeChip
      text={`${currentStreak}`}
      tone="accent"
      width={72}
      height={36}
      LeftIcon={<Text style={{ fontSize: 16 }}>🔥</Text>}
    />
  );
}
