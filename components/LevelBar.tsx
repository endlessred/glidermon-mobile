import React, { useMemo } from "react";
import { View, Text } from "react-native";

type Props = {
  level: number;
  xpNow: number;   // xp toward next level
  xpNext: number;  // xp required to reach next
  style?: any;
  showNumbers?: boolean; // default true
};

export default function LevelBar({ level, xpNow, xpNext, style, showNumbers = true }: Props) {
  const pct = useMemo(() => {
    if (!xpNext || xpNext <= 0) return 0;
    return Math.max(0, Math.min(1, xpNow / xpNext));
  }, [xpNow, xpNext]);

  const pctText = Math.round(pct * 100) + "%";

  return (
    <View
      style={[
        {
          backgroundColor: "#161b22",
          padding: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#233043",
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ color: "#cfe6ff", fontWeight: "800", fontSize: 16, marginRight: 8 }}>
          Lv {level}
        </Text>
        {showNumbers && (
          <Text style={{ color: "#9aa6b2" }}>
            {xpNow.toLocaleString()} / {xpNext.toLocaleString()}
          </Text>
        )}
        <View style={{ flex: 1 }} />
        <Text style={{ color: "#9cc4e4" }}>{pctText}</Text>
      </View>

      <View
        style={{
          height: 10,
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
            backgroundColor: "#2ea043", // cozy green
          }}
        />
      </View>
    </View>
  );
}
