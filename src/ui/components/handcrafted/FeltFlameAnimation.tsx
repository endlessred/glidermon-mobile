// components/handcrafted/FeltFlameAnimation.tsx
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Canvas, Group, Image as SkImage, Skia, useImage, vec } from "@shopify/react-native-skia";
import { useTheme } from "../../../data/hooks/useTheme";

// FeltFlameExpandAndContract is a 15-frame raster flipbook (not a Spine
// skeleton -- there's no skeleton.json alongside it), packed into a single
// texture page by TexturePacker. We render it the same way the game's
// character sprites crop frames out of a packed sheet (see
// game/view/BehaviorSprite.tsx's fallback path): a clipped Skia `<Group>`
// with the full page image positioned behind it, swapped on an interval.
// Using Skia (already a dependency for the pet's sprite rendering) instead
// of pulling in a second animation runtime just for this one asset.
const PAGE_SOURCE = require("../../../assets/UI Assets/FeltFlame/FeltFlameExpandAndContract/FeltFlame.png");

// The atlas's untrimmed canvas size, constant across every frame (see
// FeltFlame.atlas's "offsets: ...,246,312" on every region). Each frame is
// tightly trimmed to a different bounding box, so frames are repositioned at
// their recorded offset within this fixed canvas -- otherwise the flame
// would jump around instead of visibly expanding/contracting from one place.
const CANVAS_W = 246;
const CANVAS_H = 312;

type FrameDef = {
  /** Physical top-left of this region on the page. */
  x: number;
  y: number;
  /** Logical (unrotated/display) size of the trimmed region. */
  w: number;
  h: number;
  /** Offset of the trimmed region within the untrimmed CANVAS_W x CANVAS_H box. */
  ox: number;
  oy: number;
  /** TexturePacker rotated this region 90deg to pack tighter -- its bounds
   * on the page are stored swapped (physical width/height = w/h swapped)
   * and need un-rotating back to upright when drawn. */
  rotated: boolean;
};

// One full expand-then-contract loop, frames 00 -> 14, hand-transcribed from
// FeltFlame.atlas.
const FRAMES: FrameDef[] = [
  { x: 2, y: 492, w: 231, h: 282, ox: 7, oy: 6, rotated: true }, // _00
  { x: 286, y: 491, w: 232, h: 286, ox: 7, oy: 5, rotated: true }, // _01
  { x: 863, y: 489, w: 234, h: 289, ox: 6, oy: 5, rotated: true }, // _02
  { x: 1154, y: 489, w: 234, h: 293, ox: 6, oy: 4, rotated: true }, // _03
  { x: 2, y: 253, w: 236, h: 297, ox: 5, oy: 3, rotated: true }, // _04
  { x: 595, y: 249, w: 238, h: 300, ox: 4, oy: 3, rotated: true }, // _05
  { x: 1196, y: 248, w: 239, h: 304, ox: 4, oy: 2, rotated: true }, // _06
  { x: 2, y: 9, w: 241, h: 306, ox: 3, oy: 2, rotated: true }, // _07
  { x: 614, y: 4, w: 243, h: 309, ox: 2, oy: 1, rotated: true }, // _08 (fullest bloom)
  { x: 1234, y: 2, w: 244, h: 310, ox: 2, oy: 1, rotated: true }, // _09
  { x: 925, y: 3, w: 243, h: 307, ox: 2, oy: 1, rotated: true }, // _10
  { x: 310, y: 6, w: 241, h: 302, ox: 3, oy: 2, rotated: true }, // _11
  { x: 897, y: 249, w: 238, h: 297, ox: 4, oy: 3, rotated: true }, // _12
  { x: 301, y: 252, w: 236, h: 292, ox: 5, oy: 4, rotated: true }, // _13
  { x: 574, y: 490, w: 233, h: 287, ox: 6, oy: 5, rotated: true }, // _14
];

// Fullest-bloom frame, used as the static pose when motion is reduced.
const STATIC_FRAME = 8;
const MS_PER_FRAME = 55; // 15 frames -> ~825ms per loop

type Props = {
  /** Rendered height in px; width follows the atlas's native aspect ratio. */
  size?: number;
};

// Primary hero graphic for streak/celebration modals -- loops while
// mounted, starts automatically, and stops cleanly on unmount (plain
// setInterval + cleanup, no persistent timers left running after the modal
// closes).
export default function FeltFlameAnimation({ size = 100 }: Props) {
  const { reduceMotion } = useTheme();
  const [frame, setFrame] = useState(reduceMotion ? STATIC_FRAME : 0);
  const page = useImage(PAGE_SOURCE);

  useEffect(() => {
    if (reduceMotion) {
      setFrame(STATIC_FRAME);
      return;
    }
    setFrame(0);
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % FRAMES.length);
    }, MS_PER_FRAME);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const scale = size / CANVAS_H;
  const width = Math.round(CANVAS_W * scale);
  const height = Math.round(CANVAS_H * scale);

  const def = FRAMES[frame];

  // Destination (upright, logical) rect for this frame within the canvas.
  const dx = def.ox * scale;
  const dy = def.oy * scale;
  const dw = def.w * scale;
  const dh = def.h * scale;

  const pageW = page ? page.width() * scale : 0;
  const pageH = page ? page.height() * scale : 0;

  // For a rotated region, its physical footprint on the page has
  // width/height swapped relative to the logical size (dw/dh).
  const physW = dh;
  const physH = dw;
  const physCx = def.x * scale + physW / 2;
  const physCy = def.y * scale + physH / 2;
  const destCx = dx + dw / 2;
  const destCy = dy + dh / 2;

  return (
    <View pointerEvents="none" style={{ width, height }}>
      <Canvas style={{ width, height }}>
        {page && def.rotated && (
          <Group clip={Skia.XYWHRect(dx, dy, dw, dh)}>
            <Group transform={[{ translateX: destCx - physCx }, { translateY: destCy - physCy }]}>
              <Group transform={[{ rotate: Math.PI / 2 }]} origin={vec(physCx, physCy)}>
                <SkImage image={page} x={0} y={0} width={pageW} height={pageH} fit="fill" />
              </Group>
            </Group>
          </Group>
        )}
        {page && !def.rotated && (
          <Group clip={Skia.XYWHRect(dx, dy, dw, dh)}>
            <SkImage image={page} x={dx - def.x * scale} y={dy - def.y * scale} width={pageW} height={pageH} fit="fill" />
          </Group>
        )}
      </Canvas>
    </View>
  );
}
