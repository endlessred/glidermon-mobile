// UnifiedCharacterSprite.tsx - Combines CharacterPreview approach with behavior system
import React, { useEffect, useState, useMemo } from "react";
import { Platform } from "react-native";
import PaletteSwappedSprite from "./PaletteSwappedSprite";
import { BehaviorEngine, type BehaviorDefinition, type AnimationState } from "../behaviors/behaviors";
import type { SkinVariation, EyeColor, ShoeVariation, OutfitSlot, CosmeticSocket } from "../../data/types/outfitTypes";
import { glidermonIdleAnchors, cosmeticDefinitions } from "../cosmetics/cosmeticDefinitions";
import { AssetMap } from "../../assets/assetMap";

// Import the sprite frame data
const idle8FrameData = require("../../assets/glidermonnew/idle8_new.json");

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

  // Complete outfit for cosmetics
  outfit: OutfitSlot;

  // Behavior system
  behavior?: BehaviorDefinition;

  // Legacy props for backward compatibility
  blinkTex?: any;
  blinkEveryMin?: number;
  blinkEveryMax?: number;

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

export default function UnifiedCharacterSprite({
  Skia,
  rig,
  x,
  y,
  scale,
  flipX = false,
  skinVariation,
  eyeColor,
  shoeVariation,
  outfit,
  behavior,
  blinkTex,
  blinkEveryMin = 4,
  blinkEveryMax = 7,
  anchorOverrides = [],
  onBehaviorStateChange,
  onFrameChange,
}: Props) {
  const { Image: SkImageNode, useImage, Group } = Skia;

  // ---- Behavior Engine ----
  const behaviorEngine = useMemo(() => {
    if (behavior) {
      return new BehaviorEngine(behavior);
    }
    return null;
  }, [behavior]);

  const [frameIndex, setFrameIndex] = React.useState(0);
  const [animationFrame, setAnimationFrame] = React.useState(0);
  const [isBlinking, setIsBlinking] = React.useState(false);
  const [lastBlinkTime, setLastBlinkTime] = React.useState(Date.now());

  // Enhanced animation with blinking behavior
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(frame => frame + 1);

      // Check if it's time to blink
      const now = Date.now();
      const timeSinceLastBlink = now - lastBlinkTime;
      const blinkInterval = (blinkEveryMin + Math.random() * (blinkEveryMax - blinkEveryMin)) * 1000;

      if (timeSinceLastBlink > blinkInterval && !isBlinking) {
        setIsBlinking(true);
        setLastBlinkTime(now);
        setFrameIndex(0); // Start blink animation from frame 0
      } else if (isBlinking) {
        // Continue blink animation
        setFrameIndex(fi => {
          const nextFrame = fi + 1;
          if (nextFrame >= 8) {
            // Blink animation complete, return to idle
            setIsBlinking(false);
            return 0;
          }
          return nextFrame;
        });
      } else {
        // Normal idle animation
        setFrameIndex(fi => (fi + 1) % 8);
      }
    }, 125); // 8fps

    return () => clearInterval(interval);
  }, [isBlinking, lastBlinkTime, blinkEveryMin, blinkEveryMax]);

  // ---- Normalize rig ----
  const frameW = rig.w ?? rig.grid?.w ?? 64;
  const frameH = rig.h ?? rig.grid?.h ?? 64;
  const baseCols = rig.cols ?? rig.grid?.cols ?? 8;
  const baseRows = rig.rows ?? rig.grid?.rows ?? 1;

  const pivot = rig.pivot
    ? rig.pivot
    : { x: rig.pivotX ?? Math.floor(frameW / 2), y: rig.pivotY ?? Math.floor((frameH * 15) / 16) };

  // Get the current frame data and sprite sheet
  const getCurrentFrameData = () => {
    const currentFrameIndex = frameIndex % 8;
    const frameKeys = Object.keys(idle8FrameData.frames);
    const frameKey = frameKeys[currentFrameIndex];
    if (frameKey && idle8FrameData.frames[frameKey]) {
      return idle8FrameData.frames[frameKey].frame;
    }
    // Fallback to manual calculation if JSON is missing
    return {
      x: currentFrameIndex * 64,
      y: 0,
      w: 64,
      h: 64
    };
  };

  // Get the current sprite sheet (idle or blink)
  const getCurrentSpriteSheet = () => {
    return isBlinking ? blinkTex : rig.tex;
  };

  const currentFrame = getCurrentFrameData();

  // ---- destination rect (screen) ----
  const dst = useMemo(() => {
    const w = frameW * scale;
    const h = frameH * scale;
    const left = Math.round(x - pivot.x * scale);
    const top  = Math.round(y - pivot.y * scale);
    return { left, top, w, h };
  }, [x, y, pivot.x, pivot.y, frameW, frameH, scale]);

  // ---- Cosmetic rendering using CharacterPreview approach ----
  const renderCosmeticLayer = (socket: CosmeticSocket) => {
    const equippedItem = outfit.cosmetics[socket];
    if (!equippedItem?.itemId) return null;

    const customization = equippedItem.customization;

    // Apply adjustments
    const offset = customization?.adjustments.offset || { x: 0, y: 0 };
    const rotation = customization?.adjustments.rotation || 0;
    const itemScale = customization?.adjustments.scale || 1;
    const layer = customization?.adjustments.layer || 0;

    // Character scale factor - use the GameCanvas scale directly
    const characterScale = scale;

    // Base position using actual glidermon anchor positions
    const getSocketPosition = (socket: CosmeticSocket) => {
      // Skip palette and pose sockets - they don't have physical positions
      if (["skinVariation", "eyeColor", "shoeVariation", "pose"].includes(socket)) {
        return { x: 0, y: 0, rotation: 0 };
      }

      const anchor = glidermonIdleAnchors.anchors[socket];

      if (!anchor) {
        return { x: 0, y: 0 };
      }

      // Convert from sprite coordinates (32,32 center) to our coordinate system
      const spriteCenter = 32;
      const scaledX = (anchor.x - spriteCenter) * characterScale;
      const scaledY = (anchor.y - spriteCenter) * characterScale;

      return { x: scaledX, y: scaledY };
    };

    const basePos = getSocketPosition(socket);

    // Find the cosmetic definition for this item
    const cosmeticDef = cosmeticDefinitions.find(def => def.id === equippedItem.itemId);

    if (!cosmeticDef) {
      return null;
    }

    // Check if this is a hat_pack_1 item that needs sprite sheet cropping
    const HAT_PACK_CONFIGS: Record<string, { frameIndex: number }> = {
      frog_hat: { frameIndex: 0 },
      black_headphones: { frameIndex: 1 },
      white_headphones: { frameIndex: 2 },
      pink_headphones: { frameIndex: 3 },
      pink_aniphones: { frameIndex: 4 },
      feather_cap: { frameIndex: 5 },
      viking_hat: { frameIndex: 6 },
      adventurer_fedora: { frameIndex: 7 },
    };

    const isHatPackItem = HAT_PACK_CONFIGS[equippedItem.itemId];

    // Adjusted offsets for our anchor-based positioning system
    const getGameCanvasOffset = (itemId: string) => {
      const gameCanvasOffsets: Record<string, { dx?: number; dy?: number }> = {
        // Adjusted default offset for most hats
        leaf_hat: { dx: -2, dy: 5 },
        greater_hat: { dx: -2, dy: 5 },
        // Hat pack specific offsets
        frog_hat: { dx: -2, dy: 8 },
        black_headphones: { dx: -2, dy: 5 },
        white_headphones: { dx: -2, dy: 5 },
        pink_headphones: { dx: -2, dy: 5 },
        pink_aniphones: { dx: -2, dy: 5 },
        feather_cap: { dx: -2, dy: 5 },
        viking_hat: { dx: -2, dy: 5 },
        adventurer_fedora: { dx: -2, dy: 5 },
      };
      return gameCanvasOffsets[itemId] || { dx: -2, dy: 5 };
    };

    const gameCanvasOffset = getGameCanvasOffset(equippedItem.itemId);

    // For GameCanvas, cosmetics should be static relative to character (no extra bounce)
    // The character itself handles any movement/animation
    const idleOffset = {
      x: 0,
      y: 0
    };

    // Apply GameCanvas hatOffset scaled to our character size
    const scaledHatOffset = {
      x: (gameCanvasOffset.dx || 0) * characterScale,
      y: (gameCanvasOffset.dy || 0) * characterScale
    };

    // Scale user adjustments with character size
    const scaledUserOffset = {
      x: offset.x * characterScale,
      y: offset.y * characterScale
    };

    // Final position
    const finalX = dst.left + basePos.x + scaledUserOffset.x + idleOffset.x + scaledHatOffset.x;
    const finalY = dst.top + basePos.y + scaledUserOffset.y + idleOffset.y + scaledHatOffset.y;

    // Match GameCanvas scaling - cosmetics should be proportional to character sprite
    const cosmeticSize = frameW * scale; // Use actual character frame size with GameCanvas scale

    // Render actual cosmetic sprite
    const assetSource = AssetMap[cosmeticDef.texKey as keyof typeof AssetMap];
    if (!assetSource) {
      return null;
    }

    const cosmeticImg = useImage(resolveForSkia(assetSource));
    if (!cosmeticImg) return null;

    // For hat pack items, implement sprite sheet cropping
    if (isHatPackItem) {
      const frameIndex = isHatPackItem.frameIndex;

      const frameData = {
        x: frameIndex * 64,
        y: 0,
        w: 64,
        h: 64
      };

      const spriteSheetWidth = 512;
      const spriteSheetHeight = 64;

      const frameScale = cosmeticSize / frameData.w;

      return (
        <Group clip={Skia.Skia.XYWHRect(finalX, finalY, cosmeticSize, cosmeticSize)}>
          <SkImageNode
            image={cosmeticImg}
            x={finalX - frameData.x * frameScale}
            y={finalY - frameData.y * frameScale}
            width={spriteSheetWidth * frameScale}
            height={spriteSheetHeight * frameScale}
            fit="fill"
            transform={flipX ? [{ scaleX: -1 }] : undefined}
          />
        </Group>
      );
    }

    // For non-hat-pack items, render normally
    return (
      <SkImageNode
        image={cosmeticImg}
        x={finalX}
        y={finalY}
        width={cosmeticSize}
        height={cosmeticSize}
        fit="contain"
        transform={flipX ? [{ scaleX: -1 }] : undefined}
      />
    );
  };

  return (
    <>
      {/* Background cosmetics */}
      {Object.keys(outfit.cosmetics)
        .filter(socket => socket === "background")
        .map(socket => <React.Fragment key={socket}>{renderCosmeticLayer(socket as CosmeticSocket)}</React.Fragment>)}

      {/* CHARACTER - Palette Swapped (works on native, fallback on web) */}
      {Skia && Platform.OS !== "web" ? (
        // Full palette swapping when Skia is available
        <PaletteSwappedSprite
          Skia={Skia}
          imageSource={getCurrentSpriteSheet()}
          x={dst.left}
          y={dst.top}
          width={dst.w}
          height={dst.h}
          skinVariation={skinVariation}
          eyeColor={eyeColor}
          shoeVariation={shoeVariation}
          srcRect={currentFrame}
          transform={flipX ? [{ scaleX: -1 }] : undefined}
        />
      ) : (
        // Web fallback with sprite sheet clipping (no palette swapping)
        Skia ? (
          <Group clip={Skia.Skia.XYWHRect(dst.left, dst.top, dst.w, dst.h)}>
            <SkImageNode
              image={useImage(resolveForSkia(getCurrentSpriteSheet()))}
              x={dst.left - currentFrame.x * (dst.w / frameW)}
              y={dst.top - currentFrame.y * (dst.h / frameH)}
              width={(frameW * baseCols) * (dst.w / frameW)}
              height={(frameH * baseRows) * (dst.h / frameH)}
              fit="fill"
              transform={flipX ? [{ scaleX: -1 }] : undefined}
            />
          </Group>
        ) : null
      )}

      {/* Body cosmetics */}
      {Object.keys(outfit.cosmetics)
        .filter(socket => !["background", "foreground", "pose"].includes(socket))
        .map(socket => <React.Fragment key={socket}>{renderCosmeticLayer(socket as CosmeticSocket)}</React.Fragment>)}

      {/* Foreground cosmetics */}
      {Object.keys(outfit.cosmetics)
        .filter(socket => socket === "foreground")
        .map(socket => <React.Fragment key={socket}>{renderCosmeticLayer(socket as CosmeticSocket)}</React.Fragment>)}
    </>
  );
}