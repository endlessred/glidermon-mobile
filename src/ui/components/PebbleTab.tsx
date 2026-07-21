// ui/components/PebbleTab.tsx
import React, { useState } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { Canvas, RoundedRect, Group } from "@shopify/react-native-skia";
import { useUITokens } from "../theme/UIThemeProvider";
import { darken } from "../theme/color";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  width?: number;
  height?: number;
  LeftIcon?: React.ReactNode;
  disabled?: boolean;
  testID?: string;
};

export const PebbleTab: React.FC<Props> = ({
  label,
  selected = false,
  onPress,
  width = 112,
  height = 44,
  LeftIcon,
  disabled,
  testID,
}) => {
  const t = useUITokens();
  console.log("PebbleTab - useUITokens result:", t);
  console.log("PebbleTab - label:", label);

  const [pressed, setPressed] = useState(false);
  const r = t.radius || 8;
  const outline = t.outline || 2;
  const baseFill = selected ? (t.fillActive || "#e6f3ff") : (t.fill || "#ffffff");
  const fill = pressed ? darken(baseFill, 0.06) : baseFill;

  try {
    console.log("PebbleTab - About to render, fill:", fill);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        testID={testID}
        style={{
          opacity: disabled ? (t.disabledOpacity || 0.5) : 1,
          transform: pressed ? [{ translateY: 1 }] : undefined,
        }}
      >
        <View style={{
          width,
          height,
          backgroundColor: pressed ? darken(fill, 0.1) : fill,
          borderRadius: r,
          borderWidth: outline,
          borderColor: t.outlineColor || "#cccccc",
          ...styles.content,
          paddingHorizontal: t.padding || 10,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Inner highlight */}
          <View style={{
            position: 'absolute',
            top: 2,
            left: 2,
            right: 2,
            height: Math.max(10, height * 0.48),
            backgroundColor: t.highlight || "rgba(255,255,255,0.45)",
            borderRadius: Math.max(0, r - 2),
          }} />

          {/* Content */}
          <View style={[styles.content, { zIndex: 1, flex: 1 }]}>
            {LeftIcon ? <View style={styles.icon}>{LeftIcon}</View> : null}
            <Text
              style={[
                styles.label,
                { color: selected ? (t.text || "#000000") : (t.textMuted || "#666666"), fontWeight: selected ? "700" : "600" },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  } catch (error) {
    console.error("PebbleTab - Render error:", error);
    return (
      <View style={{ width, height, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  content: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  icon: { marginRight: 8 },
  label: { fontSize: 16 },
});