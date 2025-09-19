// Enhanced AnimatedSprite that works with the new behavior system
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { BehaviorEngine, type BehaviorDefinition, type AnimationState } from "../core/behaviors";

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
  tags?: Array<{ name: string; from: number; to: number; durationMs: number }>;
};

type Props = {
  Skia: any;
  rig: SpriteRigLike;
  x: number;
  y: number;
  scale: number;
  flipX?: boolean;

  // New behavior system
  behavior?: BehaviorDefinition;

  // Legacy props for backward compatibility
  blinkTex?: any;
  blinkEveryMin?: number;
  blinkEveryMax?: number;

  // Hat (unchanged)
  hatTex?: any;
  hatPivot?: { x: number; y: number };
  hatOffset?: { dx: number; dy: number };

  anchorOverrides?: AnchorOverride[];

  // Callback for behavior state changes
  onBehaviorStateChange?: (state: AnimationState) => void;
};

function resolveForSkia(mod: any): any {
  if (Platform.OS === "web") {
    const { Asset } = require("expo-asset");
    return Asset.fromModule(mod).uri;
  }
  return mod;
}

export default function BehaviorSprite({
  Skia,
  rig,
  x,
  y,
  scale,
  flipX = false,
  behavior,
  blinkTex,
  blinkEveryMin = 4,
  blinkEveryMax = 7,
  hatTex,
  hatPivot = { x: 18, y: 20 },
  hatOffset = { dx: -15, dy: 5 },
  anchorOverrides = [],
  onBehaviorStateChange,
}: Props) {
  const { Image: SkImageNode, useImage, Group } = Skia;

  // ---- Behavior Engine ----
  const behaviorEngine = useMemo(() => {
    if (behavior) {
      return new BehaviorEngine(behavior);
    }
    return null;
  }, [behavior]);

  const [currentAnimationState, setCurrentAnimationState] = useState<AnimationState | null>(
    behaviorEngine?.getCurrentState() || null
  );

  // Set up behavior engine listeners
  useEffect(() => {
    if (!behaviorEngine) return;

    const unsubscribe = behaviorEngine.onStateChange((newState) => {
      setCurrentAnimationState(newState);
      onBehaviorStateChange?.(newState);
    });

    // Set initial state
    setCurrentAnimationState(behaviorEngine.getCurrentState());

    return unsubscribe;
  }, [behaviorEngine, onBehaviorStateChange]);

  // Update behavior engine periodically
  useEffect(() => {
    if (!behaviorEngine) return;

    const updateInterval = setInterval(() => {
      behaviorEngine.update();
    }, 100); // Check every 100ms

    return () => clearInterval(updateInterval);
  }, [behaviorEngine]);

  // ---- Animation properties (from behavior or legacy props) ----
  const animationTag = currentAnimationState?.tag || "idle";
  const fps = currentAnimationState?.fps || 8;
  const effectiveBlinkTex = currentAnimationState?.blinkTex || blinkTex;
  const effectiveBlinkMin = currentAnimationState?.blinkMinLoops || blinkEveryMin;
  const effectiveBlinkMax = currentAnimationState?.blinkMaxLoops || blinkEveryMax;

  // ---- Normalize rig ----
  const frameW = rig.w ?? rig.grid?.w ?? 64;
  const frameH = rig.h ?? rig.grid?.h ?? 64;
  const baseCols = rig.cols ?? rig.grid?.cols ?? 4;
  const baseRows = rig.rows ?? rig.grid?.rows ?? 2;

  // Find the animation tag in the rig
  const animationDef = rig.tags?.find(tag => tag.name === animationTag);
  const frameStart = animationDef?.from ?? 0;
  const frameEnd = animationDef?.to ?? (baseCols * baseRows - 1);
  const frameCount = frameEnd - frameStart + 1;
  const animationDuration = animationDef?.durationMs ?? 1000;

  const pivot = rig.pivot
    ? rig.pivot
    : { x: rig.pivotX ?? Math.floor(frameW / 2), y: rig.pivotY ?? Math.floor((frameH * 15) / 16) };

  const defaultHead: Anchor =
    rig.anchors?.headTop ?? rig.defaultAnchors?.headTop ?? { x: 34, y: 12, rot: 0 };

  // ---- Load images ----
  const baseSrc = resolveForSkia((rig as any).tex);
  const blinkSrc = resolveForSkia(effectiveBlinkTex ?? (rig as any).tex);
  const hatSrc = resolveForSkia(hatTex ?? (rig as any).tex);

  const baseImg = useImage(baseSrc);
  const blinkImg = useImage(blinkSrc);
  const hatImg = useImage(hatSrc);

  // ---- Frame animation ----
  const [frameIndex, setFrameIndex] = useState(frameStart);
  const [loopCount, setLoopCount] = useState(0);
  const [blinkLoop, setBlinkLoop] = useState<number | null>(null);
  const nextBlinkAtRef = useRef(randInt(effectiveBlinkMin, effectiveBlinkMax));

  // Calculate frame timing based on fps
  const frameInterval = 1000 / fps;

  useEffect(() => {
    const id = setInterval(() => {
      setFrameIndex(fi => {
        const next = fi + 1;
        if (next > frameEnd) {
          // Animation loop completed
          setLoopCount(lc => {
            const nlc = lc + 1;

            // Check for blink
            if (nlc >= nextBlinkAtRef.current && effectiveBlinkTex) {
              setBlinkLoop(nlc);
              nextBlinkAtRef.current = nlc + randInt(effectiveBlinkMin, effectiveBlinkMax);
            }

            // Notify behavior engine of loop completion
            if (behaviorEngine) {
              behaviorEngine.onAnimationLoop();
            }

            return nlc;
          });

          return frameStart; // Loop back to start
        }
        return next;
      });
    }, frameInterval);

    return () => clearInterval(id);
  }, [frameInterval, frameStart, frameEnd, effectiveBlinkMin, effectiveBlinkMax, effectiveBlinkTex, behaviorEngine]);

  // Clear blink after current loop
  useEffect(() => {
    if (blinkLoop !== null && loopCount > blinkLoop) {
      setBlinkLoop(null);
    }
  }, [loopCount, blinkLoop]);

  // ---- Render ----
  const currentFrame = frameIndex - frameStart;
  const row = Math.floor(currentFrame / baseCols);
  const col = currentFrame % baseCols;

  const srcX = col * frameW;
  const srcY = row * frameH;

  // Choose which image to render (base or blink)
  const sourceImg = (blinkLoop === loopCount && blinkImg) ? blinkImg : baseImg;

  // Use the same approach as AnimatedSprite
  const baseSrcRect = { sx: srcX, sy: srcY, sw: frameW, sh: frameH };

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
    () => subset(sourceImg, baseSrcRect.sx, baseSrcRect.sy, baseSrcRect.sw, baseSrcRect.sh),
    [sourceImg, baseSrcRect.sx, baseSrcRect.sy, baseSrcRect.sw, baseSrcRect.sh]
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

  // ---- HAT: crop correct frame ----
  const hatSub = useMemo(() => {
    if (!hatImg || !hatTex) return null;
    return subset(hatImg, hatSrcRect.sx, hatSrcRect.sy, hatSrcRect.sw, hatSrcRect.sh);
  }, [hatImg, hatTex, hatSrcRect.sx, hatSrcRect.sy, hatSrcRect.sw, hatSrcRect.sh]);

  if (!sourceImg) return null;

  return (
    <>
      {/* BASE - exact same logic as AnimatedSprite */}
      {baseSub ? (
        <SkImageNode
          image={baseSub}
          x={dst.left}
          y={dst.top}
          width={dst.w}
          height={dst.h}
          fit="fill"
          transform={flipX ? [{ scaleX: -1 }] : undefined}
        />
      ) : (
        <Group clip={Skia.Skia.XYWHRect(dst.left, dst.top, dst.w, dst.h)}>
          <SkImageNode
            image={sourceImg}
            x={dst.left - baseSrcRect.sx * scale}
            y={dst.top - baseSrcRect.sy * scale}
            width={frameW * baseCols * scale}
            height={frameH * baseRows * scale}
            fit="fill"
            transform={flipX ? [{ scaleX: -1 }] : undefined}
          />
        </Group>
      )}

      {/* HAT - exact same logic as AnimatedSprite */}
      {!!hatTex && !!hatImg && (
        (() => {
          return hatSub ? (
            <SkImageNode
              image={hatSub}
              x={hatDst.x}
              y={hatDst.y}
              width={hatDst.w}
              height={hatDst.h}
              fit="fill"
              transform={flipX ? [{ scaleX: -1 }] : undefined}
            />
          ) : (
            <Group clip={Skia.Skia.XYWHRect(hatDst.x, hatDst.y, hatDst.w, hatDst.h)}>
              <SkImageNode
                image={hatImg}
                x={hatDst.x - hatSrcRect.sx * scale}
                y={hatDst.y - hatSrcRect.sy * scale}
                width={frameW * hatCols * scale}
                height={frameH * hatRows * scale}
                fit="fill"
                transform={flipX ? [{ scaleX: -1 }] : undefined}
              />
            </Group>
          );
        })()
      )}
    </>
  );
}

// Helper function
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}