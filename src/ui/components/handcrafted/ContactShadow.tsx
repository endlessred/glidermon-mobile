// components/handcrafted/ContactShadow.tsx
import React, { useState } from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Ellipse } from "react-native-svg";

type ContactShadowProps = {
  width?: number;
  height?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

// Soft blurred ambient shadow to visually ground a character/object --
// enough to read as "sitting on the surface", not a game-sprite drop
// shadow. A radial gradient fading to transparent stands in for blur since
// RN has no native blur filter.
export default function ContactShadow({ width = 110, height = 26, opacity = 0.13, style }: ContactShadowProps) {
  const [gradId] = useState(() => `cs-${Math.random().toString(36).slice(2)}`);

  return (
    <Svg width={width} height={height} style={style} pointerEvents="none">
      <Defs>
        <RadialGradient id={gradId} cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0%" stopColor="#2A1C16" stopOpacity={opacity} />
          <Stop offset="70%" stopColor="#2A1C16" stopOpacity={opacity * 0.5} />
          <Stop offset="100%" stopColor="#2A1C16" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={`url(#${gradId})`} />
    </Svg>
  );
}
