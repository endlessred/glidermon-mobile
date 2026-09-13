// ui/components/adventureBoard/AdventureBoardCanvas.tsx
//
// On-screen Skia render of the board's dynamic content -- used by the
// Morning Check-In preview. Same drawing code (AdventureBoardDrawing) as the
// in-world 3D texture, so the two stay in visual parity. This one stays a
// normal RN element (inside DailyAdventureBoardPreview's wooden frame).
import React, { useMemo, useState } from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { Canvas, Picture } from "@shopify/react-native-skia";
import { createAdventureBoardPicture, BoardDensity } from "./AdventureBoardDrawing";
import { AdventureBoardModel } from "../../../data/selectors/adventureBoard";
import { BOARD_OPENING_ASPECT } from "../../../game/housing/render/adventureBoardLayout";

type Props = {
  model: AdventureBoardModel;
  density?: BoardDensity;
  /** Check-in staggered reveal cursor. */
  revealStep?: number;
  style?: StyleProp<ViewStyle>;
};

export default function AdventureBoardCanvas({
  model,
  density = "full",
  revealStep,
  style,
}: Props) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const picture = useMemo(() => {
    if (!size || size.w < 2 || size.h < 2) return null;
    return createAdventureBoardPicture({
      model,
      density,
      width: size.w,
      height: size.h,
      revealStep,
    });
  }, [model, density, revealStep, size]);

  return (
    <View
      style={[{ width: "100%", aspectRatio: BOARD_OPENING_ASPECT }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) =>
          prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1
            ? prev
            : { w: width, h: height }
        );
      }}
    >
      {picture && (
        <Canvas style={{ flex: 1 }}>
          <Picture picture={picture} />
        </Canvas>
      )}
    </View>
  );
}
