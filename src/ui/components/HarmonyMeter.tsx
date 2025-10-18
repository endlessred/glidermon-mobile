import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  Canvas,
  RoundedRect,
  LinearGradient,
  Circle,
  vec,
} from "@shopify/react-native-skia";
import { useTheme } from "../../data/hooks/useTheme";
import { HarmonyColors } from "../../theme/harmonyPalette";

interface HarmonyMeterProps {
  harmony: number;
  baselineHarmony: number;
  harmonyPointer: number;
  baselinePointer: number;
  meterWidth: number;
  meterHeight: number;
  zeroBandY: number;
}

export const HarmonyMeter: React.FC<HarmonyMeterProps> = ({
  harmony,
  baselineHarmony,
  harmonyPointer,
  baselinePointer,
  meterWidth,
  meterHeight,
  zeroBandY,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.meterColumn}>
      <Canvas style={{ width: meterWidth, height: meterHeight }}>
        {/* Main gradient background */}
        <RoundedRect x={0} y={0} width={meterWidth} height={meterHeight} r={24}>
          <LinearGradient
            start={vec(meterWidth / 2, 0)}
            end={vec(meterWidth / 2, meterHeight)}
            colors={["#2563eb", "#34d399", "#f59e0b"]}
            positions={[0, 0.52, 1]}
          />
        </RoundedRect>

        {/* Outer border */}
        <RoundedRect
          x={5}
          y={5}
          width={meterWidth - 10}
          height={meterHeight - 10}
          r={20}
          style="stroke"
          strokeWidth={1.2}
          color="rgba(255,255,255,0.35)"
        />

        {/* Zero band highlight */}
        <RoundedRect
          x={9}
          y={zeroBandY - 11}
          width={meterWidth - 18}
          height={22}
          r={11}
          color="rgba(255,255,255,0.15)"
        />

        {/* Baseline pointer (smaller green circle) */}
        <Circle
          cx={meterWidth / 2}
          cy={baselinePointer}
          r={6}
          color="rgba(34,197,94,0.85)"
        />

        {/* Current harmony pointer (main pointer) */}
        <Circle
          cx={meterWidth / 2}
          cy={harmonyPointer}
          r={13}
          color="#f8fafc"
        />
        <Circle
          cx={meterWidth / 2}
          cy={harmonyPointer}
          r={8}
          color="#0f172a"
        />
      </Canvas>

      {/* Value display */}
      <Text style={[styles.meterValue, { color: colors.text?.primary || HarmonyColors.text.primary }]}>
        {harmony.toFixed(1)}
      </Text>

      {/* Label */}
      <Text style={[styles.meterLabel, { color: colors.text?.tertiary || HarmonyColors.text.tertiary }]}>
        Drift
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  meterColumn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  meterValue: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  meterLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});