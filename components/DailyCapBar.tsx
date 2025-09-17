import React, { useMemo } from "react";
import { View, Text } from "react-native";

type Props = {
  earned: number;  // dailyEarned
  cap: number;     // dailyCap
  rested?: number; // restedBank (optional)
  style?: any;
};

export default function DailyCapBar({ earned, cap, rested = 0, style }: Props) {
  const pct = useMemo(() => {
    if (!cap || cap <= 0) return 0;
    return Math.max(0, Math.min(1, earned / cap));
  }, [earned, cap]);

  return (
    <View
      style={[
        {
          backgroundColor: "#161b22",
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#233043",
          gap: 8,
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: "#cfe6ff", fontWeight: "700", marginRight: 8 }}>
          Daily Cap
        </Text>
        <Text style={{ color: "#9aa6b2" }}>
          {Math.min(earned, cap).toLocaleString()} / {cap.toLocaleString()}
        </Text>
        <View style={{ flex: 1 }} />
        {rested > 0 && (
          <Text style={{ color: "#9cc4e4" }}>+ Rested {rested.toLocaleString()}</Text>
        )}
      </View>

      {/* thin progress bar */}
      <View
        style={{
          height: 8,
          backgroundColor: "#0e141b",
          borderRadius: 6,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "#233043",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            backgroundColor: "#2563eb", // blue accent
          }}
        />
      </View>
    </View>
  );
}
