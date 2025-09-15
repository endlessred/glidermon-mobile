// view/AnimatedSprite.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Image as RNImage } from "react-native"; // ← add this import
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
  fps?: number;            // sprite frame fps (default 8)

  // accessory (hat) — drawn at the frame's 'headTop' anchor
  hatTex?: string | number;
  hatPivot?: { x?: number; y?: number }; // pivot inside hat image (px from top-left)
  hatOffset?: { dx?: number; dy?: number };

  // blink support — alternate sheet with SAME grid as base
  // Option A: periodic blinking
  blinkTex?: string | number;
  blinkEvery?: number;     // replace the ENTIRE loop every N loops
  // Option B: randomized blinking between min..max loops
  blinkMinLoops?: number;
  blinkMaxLoops?: number;
  debugAnchors?: boolean;
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
  fps = 8,
  hatTex,
  hatPivot,
  hatOffset,
  blinkTex,
  blinkEvery,
  blinkMinLoops,
  blinkMaxLoops,
  debugAnchors
}: Props) {
  const { useImage, Image: SkImage, Group, rect } = Skia;

  // Converts Metro image modules to URI strings on web; pass-through elsewhere.
  const toSkiaSrc = (src: any) => {
    if (Platform.OS !== "web" || src == null) return src;
    // On RN-web, require(...) may be a number or an object; resolve to {uri}
    const resolver: any = (RNImage as any)?.resolveAssetSource;
    if (resolver) {
      // numeric module id OR object → { uri, width, height, ...}
      const out = resolver(src);
      return out?.uri ?? src;
    }
    // Fallback: if it already looks like {uri}, use that
    if (typeof src === "object" && typeof src.uri === "string") return src.uri;
    return src; // last resort
  };

  const baseSrc  = useMemo(() => toSkiaSrc(rig.tex), [rig.tex]);
  const blinkSrc = useMemo(() => toSkiaSrc(blinkTex), [blinkTex]);
  const hatSrc   = useMemo(() => toSkiaSrc(hatTex), [hatTex]);

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
  const baseImg  = useImage(baseSrc as any);
  const blinkImg = useImage(blinkSrc as any);
  const hatImg   = useImage(hatSrc as any);

  useEffect(() => {
  if (hatImg) {
    try {
      console.log("[AnimatedSprite] hat loaded", hatImg.width(), hatImg.height());
    } catch {}
  }
}, [hatImg]);

  // --- frame stepping at low FPS, with refs for exact loop boundaries ---
  const [frameIndex, setFrameIndex] = useState(tagDef.from);
  const localRef = useRef(0);        // 0..frameCount-1 within the loop
  const loopOrdRef = useRef(1);      // current loop ordinal (first loop = 1)

  // Blink scheduler refs
  const nextBlinkAtRef = useRef<number | null>(null);  // target loop ordinal
  const activeBlinkLoopRef = useRef<number | null>(null); // loop ordinal currently blinking

  const randInt = (min: number, max: number) =>
    min + Math.floor(Math.random() * (max - min + 1));

  const scheduleFirstBlink = () => {
    // precedence: periodic (blinkEvery) over randomized range
    if (blinkEvery && blinkEvery > 0) {
      nextBlinkAtRef.current = blinkEvery; // first blink on loop 'blinkEvery'
    } else if (
      blinkMinLoops != null &&
      blinkMaxLoops != null &&
      blinkMaxLoops >= blinkMinLoops
    ) {
      // after 1..N initial loops
      nextBlinkAtRef.current = 1 + randInt(blinkMinLoops, blinkMaxLoops);
    } else {
      nextBlinkAtRef.current = null;
    }
    activeBlinkLoopRef.current = null;
  };

  const scheduleNextAfter = (currentLoop: number) => {
    if (blinkEvery && blinkEvery > 0) {
      nextBlinkAtRef.current = currentLoop + blinkEvery;
    } else if (
      blinkMinLoops != null &&
      blinkMaxLoops != null &&
      blinkMaxLoops >= blinkMinLoops
    ) {
      nextBlinkAtRef.current = currentLoop + randInt(blinkMinLoops, blinkMaxLoops);
    } else {
      nextBlinkAtRef.current = null;
    }
  };

  // reset on tag/grid change or when blink config changes
  useEffect(() => {
    localRef.current = 0;
    loopOrdRef.current = 1;
    setFrameIndex(tagDef.from);
    scheduleFirstBlink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagDef.from, frameCount, blinkEvery, blinkMinLoops, blinkMaxLoops]);

  useEffect(() => {
    const stepMs = Math.max(16, Math.round(1000 / (fps || 8)));
    const id = setInterval(() => {
      // compute next frame locally
      const nextLocal = (localRef.current + 1) % frameCount;

      // when we wrap to 0, a NEW loop begins; bump loop counter first
      if (nextLocal === 0) {
        loopOrdRef.current += 1;

        // if this new loop hits the target, activate blink and schedule the next one
        if (
          nextBlinkAtRef.current != null &&
          loopOrdRef.current === nextBlinkAtRef.current
        ) {
          activeBlinkLoopRef.current = loopOrdRef.current;
          scheduleNextAfter(loopOrdRef.current);
        }
      }

      localRef.current = nextLocal;
      setFrameIndex(tagDef.from + nextLocal);
    }, stepMs);
    return () => clearInterval(id);
  }, [frameCount, tagDef.from, fps]);

  // decide which sheet to use for THIS loop
  const isBlinkLoop =
    !!blinkImg &&
    activeBlinkLoopRef.current != null &&
    loopOrdRef.current === activeBlinkLoopRef.current;

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

        {debugAnchors && a && (
        <Group>
            {/* 3x3 crosshair at the anchor */}
            <SkImage
            image={image} // any image just to access Canvas; we can also draw a rect
            x={ax - 1}
            y={ay - 1}
            width={2}
            height={2}
            />
        </Group>
        )}

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
