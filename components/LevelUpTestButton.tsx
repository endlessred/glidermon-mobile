import React from "react";
import { View, Text, Pressable } from "react-native";
import { useLevelUpStore } from "../stores/levelUpStore";
import { useSettingsStore } from "../stores/settingsStore";

export default function LevelUpTestButton() {
  const enqueueTestLevelUp = useLevelUpStore((s) => s.enqueueTestLevelUp);
  const showLevelUpTest = useSettingsStore((s) => s.showLevelUpTest);

  // Don't render if setting is disabled
  if (!showLevelUpTest) {
    return null;
  }

  return (
    <View style={{
      position: "absolute",
      top: 60,
      right: 20,
      backgroundColor: "#2d4356",
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#4a90e2",
    }}>
      <Text style={{
        color: "#cfe6ff",
        fontWeight: "600",
        fontSize: 12,
        marginBottom: 8,
        textAlign: "center",
      }}>
        Test Level Up System
      </Text>

      <Pressable
        onPress={() => enqueueTestLevelUp(5)}
        style={{
          paddingVertical: 8,
          paddingHorizontal: 12,
          backgroundColor: "#4a90e2",
          borderRadius: 6,
          marginBottom: 6,
        }}
      >
        <Text style={{
          color: "#ffffff",
          fontWeight: "600",
          fontSize: 14,
          textAlign: "center",
        }}>
          Level 5 (Full Flow)
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          const testEvent = {
            id: Math.random().toString(36).slice(2),
            fromLevel: 2,
            toLevel: 3,
            rewards: { acorns: 150 },
          };
          useLevelUpStore.getState().enqueue(testEvent);
        }}
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          backgroundColor: "#233043",
          borderRadius: 6,
        }}
      >
        <Text style={{
          color: "#9cc4e4",
          fontWeight: "500",
          fontSize: 12,
          textAlign: "center",
        }}>
          Level 3 (Animation Only)
        </Text>
      </Pressable>
    </View>
  );
}