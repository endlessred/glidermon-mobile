import React from "react";
import { View, Text } from "react-native";

type Props = { count: number };

export default function AcornBadge({ count }: Props) {
  const safe = typeof count === "number" ? count : 0;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#161b22",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#233043",
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 18 }}>🌰</Text>
      <Text style={{ color: "#cfe6ff", fontWeight: "800", fontSize: 16 }}>
        {safe.toLocaleString()}
      </Text>
    </View>
  );
}
