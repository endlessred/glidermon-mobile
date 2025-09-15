// view/AnimatedSprite.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { SpriteRig } from "../sprites/rig";

type Props = {
  Skia: any;
  rig: SpriteRig;
  tag?: string;

  // world placement of the sprite's pivot
  x: number;
  y: number;

  // rendering
  scale?: number;          // integer recommended for pixel art (2–3)
  flipX?: boolean;
  nudgeY?: number;         // pre-scale pixels to move whole sprite up/down
  clipTopPx?: number;      // crop N px from top to avoid neighbor-frame bleed

  // accessory (hat) — drawn at the frame's 'headTop' anchor
  hatTex?: string | number;
  hatPivot?: { x?: number; y?: number }; // pivot inside hat image (px from top-left)
  hatOffset?: { dx?: number; dy?: number };

  // blink support — alternate sheet with SAME grid as base
  blinkTex?: string | number;
  blinkEvery?: number;     // replace the ENTIRE loop every N loops (default 4)
};

export default function AnimatedSprite({
  Skia,
  rig,
  tag = "idle",
  x,
  y,
  scale = 2,
  flipX = false,
  nudgeY = 0,
  clipTopPx = 0,
  hatTex,
  hatPivot,
  hatOffset,
  blinkTex,
  blinkEvery = 4,
}: Props) {
  const { useImage, Image: SkImage, Group, rect } = Skia;

  // --- tag definition ---
  const tagDef = useMemo(
    () =>
      rig.tags.find((tg) => tg.name === tag) ?? {
        name: "idle",
        from: 0,
        to: rig.frames.length - 1,
        durationMs: 1000,
      },
    [rig, tag]
  );
  const frameCount = Math.max(1, tagDef.to - tagDef.from + 1);

  // --- images (hooks always called) ---
  const baseImg  = useImage(rig.tex as any);
  const blinkImg = useImage(blinkTex as any);
  const hatImg   = useImage(hatTex as any);

  // --- frame stepping at low FPS, with refs for exact loop boundaries ---
  const SPRITE_FPS = 8;

  // local frame index state (triggers render)
  const [frameIndex, setFrameIndex] = useState(tagDef.from);

  // refs track loop progress synchronously
  const localRef = useRef(0);        // 0..frameCount-1 within the loop
  const loopOrdRef = useRef(1);      // current loop ordinal (first loop = 1)

  // reset on tag/sheet change
  useEffect(() => {
    localRef.current = 0;
    loopOrdRef.current = 1;
    setFrameIndex(tagDef.from);
  }, [tagDef.from, frameCount]);

  useEffect(() => {
    const stepMs = Math.max(16, Math.round(1000 / SPRITE_FPS));
    const id = setInterval(() => {
      // compute next frame locally, bump loop counter BEFORE drawing frame 0
      const nextLocal = (localRef.current + 1) % frameCount;
      if (nextLocal === 0) {
        loopOrdRef.current += 1; // next loop starts now
      }
      localRef.current = nextLocal;
      setFrameIndex(tagDef.from + nextLocal);
    }, stepMs);
    return () => clearInterval(id);
  }, [SPRITE_FPS, frameCount, tagDef.from]);

  // decide which sheet to use for THIS loop
  const isBlinkLoop =
    !!blinkImg &&
    blinkEvery > 0 &&
    (loopOrdRef.current % blinkEvery === 0);

  const image = isBlinkLoop ? blinkImg : baseImg;

  const frame = rig.frames[frameIndex];
  if (!image || !frame) return null; // still loading

  // --- placement (snap to integers) ---
  const drawX = Math.round(x - (flipX ? (frame.w - frame.pivotX) : frame.pivotX) * scale);
  const drawY = Math.round(y - frame.pivotY * scale + nudgeY * scale);
  const dstW = frame.w * scale;
  const dstH = frame.h * scale;

  // crop a bit from the top of the clip to avoid neighbor-frame sampling
  const clipTop = (clipTopPx ?? 0) * scale;

  // --- anchor world coords & tilt for accessories ---
  const a = frame.anchors?.headTop;
  const ax = a ? Math.round(drawX + (flipX ? (frame.w - a.x) : a.x) * scale) : 0;
  const ay = a ? Math.round(drawY + a.y * scale) : 0;
  const aRotDeg = a?.rot ?? 0;
  const aRotRad = (flipX ? -aRotDeg : aRotDeg) * (Math.PI / 180);

  return (
    <Group
      // mirror around the sprite pivot when flipX is true
      transform={flipX ? [{ scaleX: -1 }, { translateX: -2 * (x - drawX) - dstW }] : undefined}
    >
      {/* draw the whole sheet offset, clipped to this frame's rect */}
      <Group clip={rect(drawX, drawY + clipTop, dstW, dstH - clipTop)}>
        <SkImage
          image={image}
          x={drawX - frame.x * scale}
          y={drawY - frame.y * scale}
          width={image.width() * scale}
          height={image.height() * scale}
        />
      </Group>

      {/* accessory on headTop (rotates with anchor tilt, mirrors on flipX) */}
      {a && hatImg && (
        <Group transform={[{ translateX: ax }, { translateY: ay }, ...(aRotRad ? [{ rotate: aRotRad }] as any : [])]}>
          {(() => {
            const hatWpx = hatImg.width();
            const hatHpx = hatImg.height();
            const pvx = (hatPivot?.x ?? hatWpx / 2) * scale;   // default bottom-center
            const pvy = (hatPivot?.y ?? hatHpx) * scale;
            const hx = Math.round(-pvx + (hatOffset?.dx ?? 0) * scale);
            const hy = Math.round(-pvy + (hatOffset?.dy ?? 0) * scale);
            return (
              <SkImage
                image={hatImg}
                x={hx}
                y={hy}
                width={hatWpx * scale}
                height={hatHpx * scale}
              />
            );
          })()}
        </Group>
      )}
    </Group>
  );
}
