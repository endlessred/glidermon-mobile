// components/TiltShiftEffect.tsx
import React, { useMemo } from "react";

type TiltShiftProps = {
  Skia: any;
  children: React.ReactNode;
  width: number;
  height: number;
  focusCenter?: number; // 0-1, where 0 is top, 1 is bottom
  focusWidth?: number;  // 0-1, width of the focused area
  blurIntensity?: number; // blur strength
};

export default function TiltShiftEffect({
  Skia,
  children,
  width,
  height,
  focusCenter = 0.5,
  focusWidth = 0.3,
  blurIntensity = 8,
}: TiltShiftProps) {
  const {
    Group,
    Blur,
    Mask,
    Rect,
    LinearGradient,
    vec,
  } = Skia;

  // Calculate focus area
  const { focusStart, focusEnd } = useMemo(() => {
    const center = focusCenter * height;
    const halfWidth = (focusWidth / 2) * height;

    return {
      focusStart: Math.max(0, center - halfWidth),
      focusEnd: Math.min(height, center + halfWidth),
    };
  }, [focusCenter, focusWidth, height]);


  return (
    <Group>
      {/* Fake tilt-shift effect using darkened overlays with gradients */}

      {/* Top region - dark overlay that fades out toward focus area */}
      <Rect x={0} y={0} width={width} height={focusStart + 30}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, focusStart + 30)}
          colors={["rgba(20,20,40,0.6)", "rgba(20,20,40,0.3)", "rgba(20,20,40,0)"]}
          positions={[0, 0.7, 1]}
        />
      </Rect>

      {/* Bottom region - dark overlay that fades out toward focus area */}
      <Rect x={0} y={focusEnd - 30} width={width} height={height - focusEnd + 30}>
        <LinearGradient
          start={vec(0, focusEnd - 30)}
          end={vec(0, height)}
          colors={["rgba(20,20,40,0)", "rgba(20,20,40,0.3)", "rgba(20,20,40,0.6)"]}
          positions={[0, 0.3, 1]}
        />
      </Rect>
    </Group>
  );
}