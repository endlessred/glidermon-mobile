// ui/components/adventureBoard/HouseBoardOverlay.tsx
//
// The dynamic goal UI for the in-room Daily Adventure Board: an absolutely
// positioned RN layer aligned (by IsometricRoomView3D's projection callback)
// to the Spine board's placeholder interior. Isolated in its own component so
// live goal/acorn/CGM updates re-render only this overlay, not the whole
// HudScreen / GL view.
//
// Geometry (two independent concepts):
//   - `boardSurfaceRect`: the calibrated *visible wood-frame aperture*. The
//     authored Spine `Placeholder` attachment is smaller than the real opening,
//     so its projected rect is overscanned outward to reach the wood. Only a
//     hair of safety inset so the cream can't spill onto the frame.
//   - content padding lives inside `DailyAdventureBoard` / `BoardSurface`.
import React from "react";
import { View } from "react-native";
import DailyAdventureBoard from "./DailyAdventureBoard";
import { useAdventureBoardModel } from "../../../data/selectors/adventureBoard";

export type BoardRect = { x: number; y: number; w: number; h: number };

// Overscan (fractions of the projected Placeholder rect) that maps the authored
// Placeholder bounds onto the visible wooden aperture. The wood frame always
// reads as ON TOP (it's the physical frame), so the cream surface must stop AT
// the inner lip of the opening -- never spill over the wood or its leaves /
// pennant / sticky notes. These reach the aperture edge and no further; the
// safety inset keeps a projection wobble from creeping onto the wood.
// Tuned on device at Goals-camera scale (`glidermon://home` -> Goals tab).
const SURFACE_OVERSCAN_LEFT = 0.05;
const SURFACE_OVERSCAN_RIGHT = 0.035;
const SURFACE_OVERSCAN_TOP = 0.0;
const SURFACE_OVERSCAN_BOTTOM = 0.035;
const SURFACE_SAFETY = 0.006;

// Below this calibrated surface width the full layout can't be read -- show the
// one-glance compact status instead (the Goals camera always clears it).
const COMPACT_BELOW_WIDTH = 220;

type Props = {
  rect: BoardRect | null;
  /** true while the Goals camera preset is active -- enables touch (Start
   * Check-In button); otherwise gestures pass through to the room. */
  interactive: boolean;
  /** Provided only when a check-in slot is currently available. */
  onStartCheckIn?: () => void;
};

/** Expand a projected rect outward by per-edge fractions of its own size. */
function expandRect(r: BoardRect, l: number, right: number, t: number, b: number): BoardRect {
  return {
    x: r.x - r.w * l,
    y: r.y - r.h * t,
    w: r.w * (1 + l + right),
    h: r.h * (1 + t + b),
  };
}

function HouseBoardOverlay({ rect, interactive, onStartCheckIn }: Props) {
  const model = useAdventureBoardModel();
  if (!rect || rect.w < 8 || rect.h < 8) return null;

  const surface = expandRect(
    rect,
    SURFACE_OVERSCAN_LEFT - SURFACE_SAFETY,
    SURFACE_OVERSCAN_RIGHT - SURFACE_SAFETY,
    SURFACE_OVERSCAN_TOP - SURFACE_SAFETY,
    SURFACE_OVERSCAN_BOTTOM - SURFACE_SAFETY
  );

  const density: "full" | "compact" =
    interactive || surface.w >= COMPACT_BELOW_WIDTH ? "full" : "compact";

  return (
    <View
      pointerEvents={interactive ? "auto" : "box-none"}
      style={{
        position: "absolute",
        left: surface.x,
        top: surface.y,
        width: Math.max(0, surface.w),
        height: Math.max(0, surface.h),
      }}
    >
      <DailyAdventureBoard
        variant="house"
        model={model}
        onStartCheckIn={onStartCheckIn}
        fill
        density={density}
      />
    </View>
  );
}

export default React.memo(HouseBoardOverlay);
