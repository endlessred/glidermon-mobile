// screens/GameScreen.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import GameCanvas from "../view/GameCanvas";

export default function GameScreen() {
  return (
    <View style={styles.root}>
      <GameCanvas />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1117" },
});
