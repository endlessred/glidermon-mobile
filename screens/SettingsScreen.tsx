import React, { useEffect } from "react";
import { View, Text, Switch, Pressable, Platform } from "react-native";
import { useSettingsStore } from "../stores/settingsStore";
import { useProgressionStore } from "../stores/progressionStore";
import { useGameStore } from "../stores/gameStore";

export default function SettingsScreen() {
  // load settings on first view
  const loaded = useSettingsStore(s => s.loaded);
  const load    = useSettingsStore(s => (s as any).load);

  useEffect(() => { if (!loaded) load(); }, [loaded, load]);

  // simulator controls
  const useSimulator    = useSettingsStore(s => s.useSimulator);
  const setUseSimulator = useSettingsStore(s => (s as any).setUseSimulator);
  const simSpeed        = useSettingsStore(s => s.simSpeed);
  const setSimSpeed     = useSettingsStore(s => (s as any).setSimSpeed);

  // progression readouts
  const acorns    = useProgressionStore(s => s.acorns);
  const level     = useProgressionStore(s => s.level);
  const dailyEarn = useProgressionStore(s => s.dailyEarned);
  const dailyCap  = useProgressionStore(s => s.dailyCap);
  const rested    = useProgressionStore(s => s.restedBank);

  // actions
  const resetProgression     = useProgressionStore(s => s.resetProgression);
  const syncProgressionToEngine = useGameStore(s => s.syncProgressionToEngine);

  return (
    <View style={{ flex:1, backgroundColor:"#0e141b", padding:16, gap:16 }}>
      <Text style={{ color:"#cfe6ff", fontWeight:"800", fontSize:18 }}>Settings</Text>

      {/* Simulator card */}
      <View style={{
        backgroundColor:"#161b22", padding:12, borderRadius:12,
        borderWidth:1, borderColor:"#233043", gap:12
      }}>
        <Text style={{ color:"#cfe6ff", fontWeight:"700" }}>CGM Simulator</Text>

        <View style={{ flexDirection:"row", alignItems:"center", justifyContent:"space-between" }}>
          <Text style={{ color:"#9aa6b2" }}>
            Use Simulator {Platform.OS === "web" ? "(web default)" : ""}
          </Text>
          <Switch value={!!useSimulator} onValueChange={(v)=>setUseSimulator(v)} />
        </View>

        <View style={{ flexDirection:"row", alignItems:"center", justifyContent:"space-between" }}>
          <Text style={{ color:"#9aa6b2" }}>Speed</Text>
          <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
            <Pressable onPress={()=>setSimSpeed(simSpeed - 0.25)}>
              <Text style={{ color:"#60a5fa", fontSize:18 }}>–</Text>
            </Pressable>
            <Text style={{ color:"#cfe6ff", width:64, textAlign:"center" }}>
              {simSpeed.toFixed(2)}×
            </Text>
            <Pressable onPress={()=>setSimSpeed(simSpeed + 0.25)}>
              <Text style={{ color:"#60a5fa", fontSize:18 }}>+</Text>
            </Pressable>
          </View>
        </View>

        <Text style={{ color:"#768390", fontSize:12 }}>
          Emits a time-compressed "5-minute" reading every ~{Math.round(1500 / Math.max(0.25, simSpeed))}ms.
        </Text>
      </View>

      {/* Progression overview */}
      <View style={{
        backgroundColor:"#161b22", padding:12, borderRadius:12,
        borderWidth:1, borderColor:"#233043", gap:8
      }}>
        <Text style={{ color:"#cfe6ff", fontWeight:"700" }}>Progression</Text>
        <Text style={{ color:"#9aa6b2" }}>Acorns: <Text style={{ color:"#cfe6ff" }}>{acorns.toLocaleString()}</Text></Text>
        <Text style={{ color:"#9aa6b2" }}>Level: <Text style={{ color:"#cfe6ff" }}>{level}</Text></Text>
        <Text style={{ color:"#9aa6b2" }}>
          Today: <Text style={{ color:"#cfe6ff" }}>{Math.min(dailyEarn, dailyCap).toLocaleString()}</Text> / {dailyCap.toLocaleString()}  ·  Rested: <Text style={{ color:"#cfe6ff" }}>{rested.toLocaleString()}</Text>
        </Text>

        <Pressable
          onPress={() => { resetProgression(); syncProgressionToEngine(); }}
          style={{
            marginTop:8, alignSelf:"flex-start",
            backgroundColor:"#2a3a4b", paddingVertical:8, paddingHorizontal:12,
            borderRadius:10, borderWidth:1, borderColor:"#3b556e"
          }}
        >
          <Text style={{ color:"#ffecd1", fontWeight:"700" }}>Reset to Beginning</Text>
        </Pressable>

        <Text style={{ color:"#8aa1b1", fontSize:12, marginTop:6 }}>
          Resets Acorns, XP, and Level to 1. Daily counters are cleared. Use for demos or testing.
        </Text>
      </View>
    </View>
  );
}
