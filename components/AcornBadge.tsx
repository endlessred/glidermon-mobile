import React from "react";
import { View, Text } from "react-native";

type Props = {
  acorns: number;
  style?: any;
  label?: string; // default: "Acorns"
};

export default function AcornBadge({ acorns, style, label = "Acorns" }: Props) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: "#161b22",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#233043",
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 16 }}>🌰</Text>
      <Text style={{ color: "#cfe6ff", fontWeight: "700" }}>{acorns.toLocaleString()}</Text>
      <Text style={{ color: "#9aa6b2", marginLeft: 6 }}>{label}</Text>
    </View>
  );
}
