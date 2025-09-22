// PaletteSwappedBehaviorSprite.tsx
import React, { useMemo } from "react";
import { Platform } from "react-native";
import PaletteSwappedSprite from "./PaletteSwappedSprite";
import { BehaviorEngine, type BehaviorDefinition, type AnimationState } from "../behaviors/behaviors";
import type { SkinVariation, EyeColor, ShoeVariation } from "../../data/types/outfitTypes";

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

  // Palette settings
  skinVariation: SkinVariation;
  eyeColor: EyeColor;
  shoeVariation: ShoeVariation;

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
  hatFrameIndex?: number;

  anchorOverrides?: AnchorOverride[];

  // Callback for behavior state changes
  onBehaviorStateChange?: (state: AnimationState) => void;

  // Callback for frame changes
  onFrameChange?: (frameIndex: number) => void;
};

function resolveForSkia(mod: any): any {
  if (Platform.OS === "web") {
    const { Asset } = require("expo-asset");
    return Asset.fromModule(mod).uri;
  }
  return mod;
}

export default function PaletteSwappedBehaviorSprite({
  Skia,
  rig,
  x,
  y,
  scale,
  flipX = false,
  skinVariation,
  eyeColor,
  shoeVariation,
  behavior,
  blinkTex,
  blinkEveryMin = 4,
  blinkEveryMax = 7,
  hatTex,
  hatPivot = { x: 18, y: 20 },
  hatOffset = { dx: -15, dy: 5 },
  hatFrameIndex,
  anchorOverrides = [],
  onBehaviorStateChange,
  onFrameChange,
}: Props) {
  const { Image: SkImageNode, useImage, Group } = Skia;

  // ---- Behavior Engine ---- (simplified for this demo)
  const behaviorEngine = useMemo(() => {
    if (behavior) {
      return new BehaviorEngine(behavior);
    }
    return null;
  }, [behavior]);

  // For this initial implementation, we'll use a simple animation frame counter
  // In a full implementation, you'd integrate the full behavior engine logic
  const [frameIndex, setFrameIndex] = React.useState(0);
  const [animationFrame, setAnimationFrame] = React.useState(0);

  // Simple animation loop
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(frame => frame + 1);
      setFrameIndex(fi => (fi + 1) % 8); // 8 frame animation
    }, 125); // 8fps

    return () => clearInterval(interval);
  }, []);

  // ---- Normalize rig ----
  const frameW = rig.w ?? rig.grid?.w ?? 64;
  const frameH = rig.h ?? rig.grid?.h ?? 64;
  const baseCols = rig.cols ?? rig.grid?.cols ?? 8; // Updated for 1x8 layout
  const baseRows = rig.rows ?? rig.grid?.rows ?? 1; // Updated for 1x8 layout

  const pivot = rig.pivot
    ? rig.pivot
    : { x: rig.pivotX ?? Math.floor(frameW / 2), y: rig.pivotY ?? Math.floor((frameH * 15) / 16) };

  const defaultHead: Anchor =
    rig.anchors?.headTop ?? rig.defaultAnchors?.headTop ?? { x: 34, y: 12, rot: 0 };

  // ---- Load images ----
  const hatSrc = resolveForSkia(hatTex ?? (rig as any).tex);
  const hatImg = useImage(hatSrc);

  // ---- Calculate sprite sheet frame position ----
  const currentFrame = frameIndex;
  const row = Math.floor(currentFrame / baseCols);
  const col = currentFrame % baseCols;

  const srcRect = {
    x: col * frameW,
    y: row * frameH,
    w: frameW,
    h: frameH
  };

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

  // ---- HAT GRID AUTODETECT ----
  const hatCols = hatImg ? Math.max(1, Math.floor(hatImg.width()  / frameW)) : baseCols;
  const hatRows = hatImg ? Math.max(1, Math.floor(hatImg.height() / frameH)) : baseRows;
  const hatFrames = hatCols * hatRows;

  // Use hatFrameIndex if provided (for sprite sheet hats), otherwise follow character animation
  let hatFi: number;
  if (hatFrameIndex !== undefined) {
    hatFi = hatFrameIndex;
  } else {
    hatFi = hatFrames > 1 ? (frameIndex % hatFrames) : 0;
  }

  const hatCol = hatFi % hatCols;
  const hatRow = Math.floor(hatFi / hatCols);
  const hatSrcRect = { x: hatCol * frameW, y: hatRow * frameH, w: frameW, h: frameH };

  // ---- HAT dest rect ----
  const hatDst = useMemo(() => {
    const hx = Math.round(headWorld.x - hatPivot.x * scale + (hatOffset?.dx ?? 0) * scale);
    const hy = Math.round(headWorld.y - hatPivot.y * scale + (hatOffset?.dy ?? 0) * scale);
    return { x: hx, y: hy, w: frameW * scale, h: frameH * scale };
  }, [headWorld.x, headWorld.y, hatPivot.x, hatPivot.y, hatOffset?.dx, hatOffset?.dy, frameW, scale]);

  return (
    <>
      {/* CHARACTER - Palette Swapped */}
      <PaletteSwappedSprite
        Skia={Skia}
        imageSource={rig.tex}
        x={dst.left}
        y={dst.top}
        width={dst.w}
        height={dst.h}
        skinVariation={skinVariation}
        eyeColor={eyeColor}
        shoeVariation={shoeVariation}
        srcRect={srcRect}
        transform={flipX ? [{ scaleX: -1 }] : undefined}
      />

      {/* HAT - Traditional rendering for now */}
      {!!hatTex && !!hatImg && (
        <Group clip={Skia.Skia.XYWHRect(hatDst.x, hatDst.y, hatDst.w, hatDst.h)}>
          <SkImageNode
            image={hatImg}
            x={hatDst.x - hatSrcRect.x * scale}
            y={hatDst.y - hatSrcRect.y * scale}
            width={frameW * hatCols * scale}
            height={frameH * hatRows * scale}
            fit="fill"
            transform={flipX ? [{ scaleX: -1 }] : undefined}
          />
        </Group>
      )}
    </>
  );
}