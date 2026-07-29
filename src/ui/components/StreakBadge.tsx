// ui/components/StreakBadge.tsx
import React from "react";
import { Text } from "react-native";
import { BadgeChip } from "./BadgeChip";
import { useStreakStore } from "../../data/stores/streakStore";

export default function StreakBadge() {
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const freezesAvailable = useStreakStore((s) => s.freezesAvailable);

  const text = freezesAvailable > 0 ? `${currentStreak} ❄️${freezesAvailable}` : `${currentStreak}`;

  return (
    <BadgeChip
      text={text}
      tone="accent"
      width={freezesAvailable > 0 ? 96 : 72}
      height={36}
      LeftIcon={<Text style={{ fontSize: 16 }}>🔥</Text>}
    />
  );
}
