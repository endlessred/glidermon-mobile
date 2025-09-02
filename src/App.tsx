import React from "react";
import { SafeAreaView } from "react-native";
import DexcomEgvsScreen from "./DexcomEgvsScreen";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <DexcomEgvsScreen />
    </SafeAreaView>
  );
}