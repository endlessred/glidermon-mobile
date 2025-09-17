// view/AnimatedSprite.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

type Anchor = { x: number; y: number; rot?: number };
type AnchorOverride = { range: [number, number]; headTop?: { dx?: number; dy?: number; drot?: number } };

type SpriteRigLike = {
  tex: any;
  cols?: number; rows?: number; w?: number; h?: number;
  grid?: { cols: number; rows: number; w: number; h: number };
  pivot?: { x: number; y: number };
  pivotX?: number; pivotY?: number;
  anchors?: { headTop?: Anchor };
  defaultAnchors?: { headTop?: Anchor };
};

type Props = {
  Skia: any;
  rig: SpriteRigLike;
  x: number;
  y: number;
  scale: number;
  flipX?: boolean;

  // Blink: replace whole loop with blink sheet occasionally
  blinkTex?: any;
  blinkEveryMin?: number; // inclusive
  blinkEveryMax?: number; // inclusive

  // Hat
  hatTex?: any; // sprite-aligned, but can be 1×1 or any grid
  hatPivot?: { x: number; y: number };
  hatOffset?: { dx: number; dy: number };

  anchorOverrides?: AnchorOverride[];
};

function resolveForSkia(mod: any): any {
  if (Platform.OS === "web") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Asset } = require("expo-asset");
    return Asset.fromModule(mod).uri;
  }
  return mod;
}

export default function AnimatedSprite({
  Skia,
  rig,
  x,
  y,
  scale,
  flipX = false,
  blinkTex,
  blinkEveryMin = 4,
  blinkEveryMax = 7,
  hatTex,
  hatPivot = { x: 18, y: 20 },
  hatOffset = { dx: -15, dy: 5 },
  anchorOverrides = [],
}: Props) {
  const { Image: SkImageNode, useImage } = Skia;

  // ---- normalize rig (base sheet) ----
  const frameW = rig.w ?? rig.grid?.w ?? 64;
  const frameH = rig.h ?? rig.grid?.h ?? 64;
  const baseCols = rig.cols ?? rig.grid?.cols ?? 4;
  const baseRows = rig.rows ?? rig.grid?.rows ?? 2;
  const baseFrames = baseCols * baseRows;

  const pivot = rig.pivot
    ? rig.pivot
    : { x: rig.pivotX ?? Math.floor(frameW / 2), y: rig.pivotY ?? Math.floor((frameH * 15) / 16) };

  const defaultHead: Anchor =
    rig.anchors?.headTop ?? rig.defaultAnchors?.headTop ?? { x: 34, y: 12, rot: 0 };

  // ---- load images (always give useImage a source) ----
  const baseSrc  = resolveForSkia((rig as any).tex);
  const blinkSrc = resolveForSkia(blinkTex ?? (rig as any).tex);
  const hatSrc   = resolveForSkia(hatTex ?? (rig as any).tex);

  const baseImg  = useImage(baseSrc);
  const blinkImg = useImage(blinkSrc);
  const hatImg   = useImage(hatSrc);

  // ---- frame clock (8 fps) & blink loop selection ----
  const [frameIndex, setFrameIndex] = useState(0);
  const [loopCount, setLoopCount]   = useState(0);
  const [blinkLoop, setBlinkLoop]   = useState<number | null>(null);
  const nextBlinkAtRef = useRef(randInt(blinkEveryMin, blinkEveryMax));

  useEffect(() => {
    const id = setInterval(() => {
      setFrameIndex(fi => {
        const next = (fi + 1) % baseFrames;
        if (next === 0) {
          setLoopCount(lc => {
            const nlc = lc + 1;
            if (blinkLoop === null && nlc === nextBlinkAtRef.current) {
              setBlinkLoop(nlc);
            } else if (blinkLoop !== null && nlc > blinkLoop) {
              nextBlinkAtRef.current = nlc + randInt(blinkEveryMin, blinkEveryMax);
              setBlinkLoop(null);
            }
            return nlc;
          });
        }
        return next;
      });
    }, 1000 / 8);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFrames, blinkEveryMin, blinkEveryMax, blinkLoop]);

  const useBlinkSheet = !!blinkTex && !!blinkImg && blinkLoop !== null && loopCount === blinkLoop;

  // ---- base source rect (col,row inside base grid) ----
  const baseCol = frameIndex % baseCols;
  const baseRow = Math.floor(frameIndex / baseCols);
  const baseSrcRect = { sx: baseCol * frameW, sy: baseRow * frameH, sw: frameW, sh: frameH };

  // ---- destination rect (screen) ----
  const dst = useMemo(() => {
    const w = frameW * scale;
    const h = frameH * scale;
    const left = Math.round(x - pivot.x * scale);
    const top  = Math.round(y - pivot.y * scale);
    return { left, top, w, h };
  }, [x, y, pivot.x, pivot.y, frameW, frameH, scale]);

  // ---- animated headTop anchor (+ per-frame overrides) ----
  const headTop = useMemo(() => {
    let ax = defaultHead.x;
    let ay = defaultHead.y;
    let rot = defaultHead.rot ?? 0;
    for (const o of anchorOverrides) {
      const [a, b] = o.range;
      if (frameIndex >= a && frameIndex <= b) {
        if (o.headTop?.dx) ax += o.headTop.dx;
        if (o.headTop?.dy) ay += o.headTop.dy;
        if (o.headTop?.drot) rot += o.headTop.drot;
      }
    }
    if (flipX) { ax = frameW - ax; rot = -(rot ?? 0); }
    return { x: ax, y: ay, rot };
  }, [defaultHead.x, defaultHead.y, defaultHead.rot, anchorOverrides, frameIndex, flipX, frameW]);

  const headWorld = useMemo(
    () => ({ x: dst.left + Math.round(headTop.x * scale), y: dst.top + Math.round(headTop.y * scale) }),
    [dst.left, dst.top, headTop.x, headTop.y, scale]
  );

  // ---- helper: try makeSubset, else null ----
  const subset = (img: any, sx: number, sy: number, sw: number, sh: number) => {
    if (!img || !Skia?.Skia) return null;
    try {
      const r = Skia.Skia.XYWHRect(sx, sy, sw, sh);
      return img.makeSubset(r) ?? null;
    } catch {
      return null;
    }
  };

  // ---- BASE: crop current frame (with fallback) ----
  const baseSub = useMemo(
    () => subset(useBlinkSheet ? blinkImg : baseImg, baseSrcRect.sx, baseSrcRect.sy, baseSrcRect.sw, baseSrcRect.sh),
    [useBlinkSheet, blinkImg, baseImg, baseSrcRect.sx, baseSrcRect.sy, baseSrcRect.sw, baseSrcRect.sh]
  );

  // ---- HAT GRID AUTODETECT (important fix) ----
  // If your hat sheet is 1×1, hatCols/Rows become 1. If it's 4×2 (like base), they become 4×2.
  const hatCols = hatImg ? Math.max(1, Math.floor(hatImg.width()  / frameW)) : baseCols;
  const hatRows = hatImg ? Math.max(1, Math.floor(hatImg.height() / frameH)) : baseRows;
  const hatFrames = hatCols * hatRows;
  const hatFi = hatFrames > 1 ? (frameIndex % hatFrames) : 0;
  const hatCol = hatFi % hatCols;
  const hatRow = Math.floor(hatFi / hatCols);
  const hatSrcRect = { sx: hatCol * frameW, sy: hatRow * frameH, sw: frameW, sh: frameH };

  // ---- HAT dest rect: align hatPivot to headWorld, then add micro offset ----
  const hatDst = useMemo(() => {
    const hx = Math.round(headWorld.x - hatPivot.x * scale + (hatOffset?.dx ?? 0) * scale);
    const hy = Math.round(headWorld.y - hatPivot.y * scale + (hatOffset?.dy ?? 0) * scale);
    return { x: hx, y: hy, w: frameW * scale, h: frameH * scale };
  }, [headWorld.x, headWorld.y, hatPivot.x, hatPivot.y, hatOffset?.dx, hatOffset?.dy, frameW, scale]);

  if (!baseImg) return null;

  return (
    <>
      {/* BASE */}
      {baseSub ? (
        <SkImageNode image={baseSub} x={dst.left} y={dst.top} width={dst.w} height={dst.h} fit="fill" />
      ) : (
        <Skia.Group clip={Skia.Skia.XYWHRect(dst.left, dst.top, dst.w, dst.h)}>
          <SkImageNode
            image={useBlinkSheet ? blinkImg! : baseImg!}
            x={dst.left - baseSrcRect.sx * scale}
            y={dst.top  - baseSrcRect.sy * scale}
            width={frameW * baseCols * scale}
            height={frameH * baseRows * scale}
            fit="fill"
          />
        </Skia.Group>
      )}

      {/* HAT (only if provided) */}
      {!!hatTex && !!hatImg && (
        (() => {
          const hatSub = subset(hatImg, hatSrcRect.sx, hatSrcRect.sy, hatSrcRect.sw, hatSrcRect.sh);
          return hatSub ? (
            <SkImageNode image={hatSub} x={hatDst.x} y={hatDst.y} width={hatDst.w} height={hatDst.h} fit="fill" />
          ) : (
            <Skia.Group clip={Skia.Skia.XYWHRect(hatDst.x, hatDst.y, hatDst.w, hatDst.h)}>
              <SkImageNode
                image={hatImg}
                x={hatDst.x - hatSrcRect.sx * scale}
                y={hatDst.y - hatSrcRect.sy * scale}
                width={frameW * hatCols * scale}
                height={frameH * hatRows * scale}
                fit="fill"
              />
            </Skia.Group>
          );
        })()
      )}
    </>
  );
}

function randInt(a: number, b: number) {
  const min = Math.ceil(Math.min(a, b));
  const max = Math.floor(Math.max(a, b));
  return Math.floor(min + Math.random() * (max - min + 1));
}
