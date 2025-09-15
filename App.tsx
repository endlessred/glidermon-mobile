// App.tsx
import React, { useState } from "react";
import { SafeAreaView, View, Text, Pressable } from "react-native";
import SkiaBootstrap from "./SkiaBootstrap";
import HudScreen from "./screens/HudScreen";
import DexcomEgvsScreen from "./src/DexcomEgvsScreen";
import GameCanvas from "./view/GameCanvas";
import ShopScreen from "./screens/ShopScreen"; // ← add this

const TABS = ["HUD", "DEXCOM", "GAME", "SHOP"] as const;
type Tab = typeof TABS[number];

export default function App() {
  const [tab, setTab] = useState<Tab>("HUD");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0e141b" }}>
      {/* top tabs */}
      <View style={{ flexDirection: "row", padding: 8, gap: 8, backgroundColor: "#111a23" }}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: tab === t ? "#1d2a36" : "#0e141b",
              borderWidth: 1,
              borderColor: tab === t ? "#3b556e" : "#1d2a36",
            }}
          >
            <Text style={{ color: "#cfe6ff", fontWeight: "600" }}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {/* content */}
      <SkiaBootstrap>
        <View style={{ flex: 1 }}>
          {tab === "HUD" && <HudScreen />}
          {tab === "DEXCOM" && <DexcomEgvsScreen />}
          {tab === "GAME" && <GameCanvas />}
          {tab === "SHOP" && <ShopScreen />}{/* ← render the shop */}
        </View>
      </SkiaBootstrap>
    </SafeAreaView>
  );
}
