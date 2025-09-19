import React from "react";
import { View, Text } from "react-native";

export default function GameScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#0d1117", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Text style={{ color: "#cfe6ff", fontSize: 18, fontWeight: "700", textAlign: "center" }}>
        The game view now lives on the HUD tab.
      </Text>
      <Text style={{ color: "#9aa6b2", marginTop: 8, textAlign: "center" }}>
        Check the HUD to see your glider and scene alongside your stats.
      </Text>
    </View>
  );
}
