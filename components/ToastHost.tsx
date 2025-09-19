import React from "react";
import { View, Text } from "react-native";
import { useToastStore } from "../stores/toastStore";
import useAutoPruneToasts from "../stores/useAutoPruneToasts";

export default function ToastHost() {
  const toasts = useToastStore(s => s.toasts);

  // Global TTL/cleanup
  useAutoPruneToasts(1600, 200);

  if (!toasts.length) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 16,
        left: 0,
        right: 0,
        alignItems: "center",
        gap: 8,
        // RNW deprecation fix
        pointerEvents: "none",
      }}
    >
      {toasts.map(t => (
        <View
          key={t.id}
          style={{
            backgroundColor: "#0b1220",
            borderColor: "#1e293b",
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            maxWidth: "90%",
            // RNW deprecation fix — use boxShadow instead of shadow*
            boxShadow: "0 6px 16px rgba(0,0,0,0.30)",
          }}
        >
          <Text style={{ color: "#cfe6ff", fontWeight: "700" }}>{t.text}</Text>
        </View>
      ))}
    </View>
  );
}
