import React, { useMemo } from "react";
import { View, Text } from "react-native";

type Props = {
  level: number;
  current: number; // xp into current level
  next: number;    // xp needed to reach next level
};

export default function LevelBar({ level, current, next }: Props) {
  const pct = useMemo(() => {
    const denom = Math.max(1, next);
    const p = Math.max(0, Math.min(1, current / denom));
    return p;
  }, [current, next]);

  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: "#cfe6ff", fontWeight: "800" }}>Level {level}</Text>
        <Text style={{ color: "#9aa6b2" }}>
          {Math.floor(current)}/{next} XP
        </Text>
      </View>

      <View
        style={{
          height: 10,
          backgroundColor: "#0f1720",
          borderRadius: 8,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#233043",
        }}
      >
        <View
          style={{
            width: `${pct * 100}%`,
            height: "100%",
            backgroundColor: "#60a5fa",
          }}
        />
      </View>
    </View>
  );
}
