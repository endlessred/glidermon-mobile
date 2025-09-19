import React, { useMemo } from "react";
import { View, Text } from "react-native";

type Props = {
  value: number;  // earned today that counts toward cap
  cap: number;    // daily cap
  rested: number; // overflow bucket (not in bar, just shown)
};

export default function DailyCapBar({ value, cap, rested }: Props) {
  const pct = useMemo(() => {
    const denom = Math.max(1, cap);
    const p = Math.max(0, Math.min(1, value / denom));
    return p;
  }, [value, cap]);

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ color: "#cfe6ff", fontWeight: "700" }}>Daily Acorns</Text>
        <Text style={{ color: "#9aa6b2" }}>
          {value.toLocaleString()} / {cap.toLocaleString()}
        </Text>
      </View>

      <View
        style={{
          height: 8,
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
            backgroundColor: "#10b981",
          }}
        />
      </View>

      <Text style={{ color: "#7f93a8", fontSize: 12 }}>
        Rested bonus bank: {rested.toLocaleString()} 🌰
      </Text>
    </View>
  );
}
