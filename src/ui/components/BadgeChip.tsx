// ui/components/BadgeChip.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Canvas, RoundedRect, LinearGradient, vec } from "@shopify/react-native-skia";
import { useUITokens } from "../theme/UIThemeProvider";
import { darken } from "../theme/color";

type Props = {
  text: string;
  width?: number;
  height?: number;
  tone?: "accent" | "muted";
  LeftIcon?: React.ReactNode;
  onPress?: () => void; // optional interactive
  disabled?: boolean;
};

export const BadgeChip: React.FC<Props> = ({
  text,
  width = 84,
  height = 32,
  tone = "accent",
  LeftIcon,
  onPress,
  disabled,
}) => {
  const t = useUITokens();
  const [pressed, setPressed] = useState(false);
  const outline = Math.max(2, t.outline - 1);
  const r = Math.min(t.radius, height / 2);
  const base = tone === "accent" ? t.accent : t.fillMuted;

  const content = (
    <View style={{ width, height }}>
      <Canvas style={StyleSheet.absoluteFillObject}>
        <RoundedRect
          x={0}
          y={0}
          width={width}
          height={height}
          r={r}
          color={pressed ? darken(base, 0.08) : base}
        />
        <RoundedRect
          x={outline / 2}
          y={outline / 2}
          width={width - outline}
          height={height - outline}
          r={r}
          color={t.outlineColor}
          style="stroke"
          strokeWidth={outline}
        />
        {pressed && <RoundedRect x={0} y={0} width={width} height={height} r={r} color={t.pressedOverlay} />}
      </Canvas>
      <View style={styles.row}>
        {LeftIcon ? <View style={{ marginRight: 6 }}>{LeftIcon}</View> : null}
        <Text style={[styles.text, { color: t.text }]} numberOfLines={1}>
          {text}
        </Text>
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{ opacity: disabled ? t.disabledOpacity : 1 }}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  text: { fontWeight: "700" },
});