// ui/components/NestCraftPanel.tsx
import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { CraftPanel } from "./handcrafted";

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Crafted frame around the Nest/Glidermon 3D scene -- warm cream cardstock,
// dark handmade outline, subtle inner stitch, soft contact shadow. Kept
// plain otherwise (no extra decoration) so the room itself stays the focal
// point rather than competing with the frame.
export default function NestCraftPanel({ children, style }: Props) {
  return (
    <CraftPanel
      texture="paper"
      stitched
      shadow="panel"
      grainOpacity={0.1}
      inset={6}
      style={style}
      contentStyle={{ flex: 1, overflow: "hidden", borderRadius: 8 }}
    >
      {children}
    </CraftPanel>
  );
}
