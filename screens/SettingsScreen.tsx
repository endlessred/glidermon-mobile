// screens/SettingsScreen.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useSettingsStore } from "../stores/settingsStore";
import { useGameStore } from "../stores/gameStore";
import { useProgressionStore } from "../stores/progressionStore";
import { useToastStore } from "../stores/toastStore";

export default function SettingsScreen() {
  const useSimulator = useSettingsStore(s => s.useSimulator);
  const setUseSimulator = useSettingsStore(s => s.setUseSimulator);
  const simSpeed = useSettingsStore(s => s.simSpeed);
  const setSimSpeed = useSettingsStore(s => s.setSimSpeed);

  const onEgvs = useGameStore(s => s.onEgvs);
  const syncProgressionToEngine = useGameStore(s => s.syncProgressionToEngine);

  const resetProgression = useProgressionStore(s => s.resetProgression);
  const addToast = useToastStore(s => s.addToast);

  const section = (title: string, children: React.ReactNode) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: "#cfe6ff", fontWeight: "700", marginBottom: 8 }}>{title}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );

  const Button = ({ label, onPress }: { label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: "#233043",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#2f4661",
      }}
    >
      <Text style={{ color: "#ffecd1", fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );

  // --- Smoke test: push a fake tick through the pipeline.
  const fakeTick = () => {
    const now = Math.floor(Date.now() / 1000);
    // Generate a plausible mgdl near 110 ± 30
    const mgdl = Math.max(55, Math.min(250, Math.round(110 + (Math.random() - 0.5) * 60)));
    // Trend: 0=down, 1=flat, 2=up, 3=uncertain
    const trend = (Math.random() < 0.33 ? 0 : Math.random() < 0.5 ? 1 : 2) as 0 | 1 | 2;
    onEgvs(mgdl, trend, now);
    addToast(`Smoke tick: ${mgdl} mg/dL`);
  };

  // --- Reset progression & re-sync engine
  const doReset = () => {
    resetProgression();
    syncProgressionToEngine();
    addToast("Progression reset");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0d1117", padding: 16 }}>
      <Text style={{ color: "white", fontSize: 18, fontWeight: "700", marginBottom: 12 }}>
        Settings
      </Text>

      {section("Data Source", (
        <>
          <Text style={{ color: "#9aa6b2" }}>
            Simulator: {useSimulator ? "ON" : "OFF"} (speed {simSpeed}×)
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button label="Toggle Simulator" onPress={() => setUseSimulator(!useSimulator)} />
            <Button label="Speed ×1" onPress={() => setSimSpeed(1)} />
            <Button label="Speed ×6" onPress={() => setSimSpeed(6)} />
          </View>
        </>
      ))}

      {section("Debug / Smoke Tests", (
        <>
          <Button label="Fake +5m Tick" onPress={fakeTick} />
          <Button label="Reset Progression" onPress={doReset} />
          <Button label="Sync Engine ⇄ Progression" onPress={() => { syncProgressionToEngine(); addToast("Engine synced"); }} />
        </>
      ))}

      <Text style={{ color: "#7f93a8", marginTop: 16 }}>
        Dexcom sandbox auth remains blocked; simulator drives progression for now.
      </Text>
    </View>
  );
}
