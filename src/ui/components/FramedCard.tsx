// ui/components/FramedCard.tsx
import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Canvas, RoundedRect, Group, LinearGradient, vec } from "@shopify/react-native-skia";
import { useUITokens } from "../theme/UIThemeProvider";

type Props = {
  width: number;
  height: number;
  style?: ViewStyle;
  children?: React.ReactNode;
  muted?: boolean; // lighter fill
};

export const FramedCard: React.FC<Props> = ({ width, height, style, children, muted }) => {
  const t = useUITokens();
  const outline = t.outline + 1; // a little chunkier for cards
  const r = t.radius * 1.25;
  const fill = muted ? t.fillMuted : t.fill;

  return (
    <View style={[{ width, height }, style]}>
      <Canvas style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Group>
          {/* Base */}
          <RoundedRect x={0} y={0} width={width} height={height} r={r} color={fill} />
          {/* Inner lip */}
          <RoundedRect
            x={6}
            y={6}
            width={width - 12}
            height={height * 0.45}
            r={r - 8}
            color={t.highlight}
          />
          {/* Outline */}
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
        </Group>
      </Canvas>

      {/* Content */}
      <View style={{ flex: 1, padding: t.padding * 1.2 }}>{children}</View>
    </View>
  );
};