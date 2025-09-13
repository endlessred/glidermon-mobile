// screens/SettingsScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, Button, Alert } from "react-native";
import { useSettingsStore } from "../stores/settingsStore";

function NumInput({
  label,
  value,
  onChange,
}: { label: string; value: number; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  return (
    <View style={styles.inputRow}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={txt}
        onChangeText={(t) => setTxt(t.replace(/[^\d]/g, ""))}
        onBlur={() => onChange(Number(txt || 0))}
        placeholder="0"
        placeholderTextColor="#6b7280"
      />
    </View>
  );
}

export default function SettingsScreen() {
  const loaded = useSettingsStore((s) => s.loaded);
  const low = useSettingsStore((s) => s.low);
  const high = useSettingsStore((s) => s.high);
  const veryHigh = useSettingsStore((s) => s.veryHigh);
  const load = useSettingsStore((s) => s.load);
  const setThresholds = useSettingsStore((s) => s.setThresholds);

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <NumInput label="Low (mg/dL)" value={low} onChange={(n) => setThresholds({ low: n })} />
        <NumInput label="High (mg/dL)" value={high} onChange={(n) => setThresholds({ high: n })} />
        <NumInput
          label="Very High (mg/dL)"
          value={veryHigh}
          onChange={(n) => setThresholds({ veryHigh: n })}
        />

        <View style={{ height: 8 }} />

        <Button
          title="Reset to defaults"
          onPress={() => {
            setThresholds({ low: 80, high: 180, veryHigh: 250 });
            Alert.alert("Reset", "Thresholds reset to defaults.");
          }}
          color="#10b981"
        />
      </View>

      <Text style={styles.subtle}>
        These thresholds affect phone UI. The device uses its own settings file; we can add a BLE write later to sync them.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d1117", padding: 16, gap: 12 },
  title: { color: "white", fontSize: 18, fontWeight: "700" },
  subtle: { color: "#9ca3af" },
  card: { backgroundColor: "#111827", borderRadius: 12, padding: 16, gap: 12 },
  inputRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: "#e5e7eb", fontSize: 16 },
  input: {
    color: "white",
    backgroundColor: "#1f2937",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
    textAlign: "right",
  },
});
