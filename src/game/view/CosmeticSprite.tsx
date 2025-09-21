// game/view/CosmeticSprite.tsx
import React, { useMemo } from "react";
import { Platform } from "react-native";
import { cosmeticSystem, CosmeticRenderInstruction } from "../cosmetics/cosmeticSystem";
import { AssetMap } from "../../assets/assetMap";

type CosmeticSpriteProps = {
  Skia: any;

  // Character info
  characterId: string;
  animationSet: string;
  currentFrame: number;
  characterPosition: { x: number; y: number };
  characterScale: number;
  flipX?: boolean;

  // Equipped cosmetics
  equippedCosmetics: string[];

  // Rendering control
  layerFilter?: "background" | "bodyBack" | "bodyFront" | "headBack" | "headFront" | "accessory" | "foreground";
};

function resolveForSkia(mod: any): any {
  if (Platform.OS === "web") {
    const { Asset } = require("expo-asset");
    return Asset.fromModule(mod).uri;
  }
  return mod;
}

export default function CosmeticSprite({
  Skia,
  characterId,
  animationSet,
  currentFrame,
  characterPosition,
  characterScale,
  flipX = false,
  equippedCosmetics,
  layerFilter
}: CosmeticSpriteProps) {
  const { Group, Image: SkImageNode, useImage } = Skia;

  // Calculate render instructions for all equipped cosmetics
  const renderInstructions = useMemo(() => {
    const instructions = cosmeticSystem.calculateRenderInstructions(
      characterId,
      animationSet,
      currentFrame,
      equippedCosmetics,
      characterPosition,
      characterScale
    );

    // Filter by layer if specified
    if (layerFilter) {
      return instructions.filter(inst => inst.cosmetic.renderLayer === layerFilter);
    }

    return instructions;
  }, [
    characterId,
    animationSet,
    currentFrame,
    equippedCosmetics,
    characterPosition,
    characterScale,
    layerFilter
  ]);

  // Load all required textures
  const textureMap = useMemo(() => {
    const map = new Map<string, any>();
    const uniqueTexKeys = [...new Set(renderInstructions.map(inst => inst.cosmetic.texKey))];

    // This would need to be enhanced to actually load the textures
    // For now, we'll use placeholder logic similar to your current system
    return map;
  }, [renderInstructions]);

  // Render individual cosmetic
  const renderCosmeticInstruction = (instruction: CosmeticRenderInstruction, index: number) => {
    const { cosmetic, worldPosition, scale, rotation, frameIndex, visible, srcRect, destRect } = instruction;

    if (!visible) return null;

    // Load texture using AssetMap
    const assetSource = AssetMap[cosmetic.texKey];
    if (!assetSource) {
      console.warn(`Asset not found for cosmetic: ${cosmetic.texKey}`);
      return null;
    }

    const texture = useImage(resolveForSkia(assetSource));
    if (!texture) return null;

    // Calculate transform based on flip and rotation
    const transform = [];

    if (flipX) {
      transform.push({ scaleX: -1 });
      // Adjust position for flip
      worldPosition.x = characterPosition.x + (characterPosition.x - worldPosition.x);
    }

    if (rotation !== 0) {
      transform.push({ rotate: `${rotation}deg` });
    }

    // For sprite sheet cosmetics, we need to crop the correct frame
    const frameW = 64; // This should come from cosmetic definition
    const frameH = 64;

    // Calculate frame position for sprite sheets like hat_pack_1
    let actualSrcRect = srcRect;
    if (cosmetic.frameMode === "static" && cosmetic.frameMapping) {
      // For static cosmetics from sprite sheets
      const cosmeticFrameIndex = frameIndex; // This would be the specific frame for this cosmetic
      const cols = 8; // hat_pack_1 has 8 frames horizontally
      const col = cosmeticFrameIndex % cols;

      actualSrcRect = {
        x: col * frameW,
        y: 0,
        w: frameW,
        h: frameH
      };
    }

    return (
      <Group key={`${cosmetic.id}-${index}`}>
        <SkImageNode
          image={texture}
          x={worldPosition.x - (cosmetic.anchor.pivot.x * scale)}
          y={worldPosition.y - (cosmetic.anchor.pivot.y * scale)}
          width={frameW * scale}
          height={frameH * scale}
          fit="fill"
          transform={transform.length > 0 ? transform : undefined}
          // For sprite sheet cropping, we'd need to implement subset functionality
        />
      </Group>
    );
  };

  return (
    <Group>
      {renderInstructions.map(renderCosmeticInstruction)}
    </Group>
  );
}

// Hook for easier cosmetic rendering integration
export function useCosmeticRenderer(
  characterId: string,
  animationSet: string,
  equippedCosmetics: string[]
) {
  return useMemo(() => ({
    renderBackgroundCosmetics: (Skia: any, characterPos: {x: number, y: number}, frame: number, scale: number, flipX = false) => (
      <CosmeticSprite
        Skia={Skia}
        characterId={characterId}
        animationSet={animationSet}
        currentFrame={frame}
        characterPosition={characterPos}
        characterScale={scale}
        flipX={flipX}
        equippedCosmetics={equippedCosmetics}
        layerFilter="background"
      />
    ),

    renderBodyBackCosmetics: (Skia: any, characterPos: {x: number, y: number}, frame: number, scale: number, flipX = false) => (
      <CosmeticSprite
        Skia={Skia}
        characterId={characterId}
        animationSet={animationSet}
        currentFrame={frame}
        characterPosition={characterPos}
        characterScale={scale}
        flipX={flipX}
        equippedCosmetics={equippedCosmetics}
        layerFilter="bodyBack"
      />
    ),

    renderBodyFrontCosmetics: (Skia: any, characterPos: {x: number, y: number}, frame: number, scale: number, flipX = false) => (
      <CosmeticSprite
        Skia={Skia}
        characterId={characterId}
        animationSet={animationSet}
        currentFrame={frame}
        characterPosition={characterPos}
        characterScale={scale}
        flipX={flipX}
        equippedCosmetics={equippedCosmetics}
        layerFilter="bodyFront"
      />
    ),

    renderHeadBackCosmetics: (Skia: any, characterPos: {x: number, y: number}, frame: number, scale: number, flipX = false) => (
      <CosmeticSprite
        Skia={Skia}
        characterId={characterId}
        animationSet={animationSet}
        currentFrame={frame}
        characterPosition={characterPos}
        characterScale={scale}
        flipX={flipX}
        equippedCosmetics={equippedCosmetics}
        layerFilter="headBack"
      />
    ),

    renderHeadFrontCosmetics: (Skia: any, characterPos: {x: number, y: number}, frame: number, scale: number, flipX = false) => (
      <CosmeticSprite
        Skia={Skia}
        characterId={characterId}
        animationSet={animationSet}
        currentFrame={frame}
        characterPosition={characterPos}
        characterScale={scale}
        flipX={flipX}
        equippedCosmetics={equippedCosmetics}
        layerFilter="headFront"
      />
    ),

    renderAccessoryCosmetics: (Skia: any, characterPos: {x: number, y: number}, frame: number, scale: number, flipX = false) => (
      <CosmeticSprite
        Skia={Skia}
        characterId={characterId}
        animationSet={animationSet}
        currentFrame={frame}
        characterPosition={characterPos}
        characterScale={scale}
        flipX={flipX}
        equippedCosmetics={equippedCosmetics}
        layerFilter="accessory"
      />
    ),

    renderForegroundCosmetics: (Skia: any, characterPos: {x: number, y: number}, frame: number, scale: number, flipX = false) => (
      <CosmeticSprite
        Skia={Skia}
        characterId={characterId}
        animationSet={animationSet}
        currentFrame={frame}
        characterPosition={characterPos}
        characterScale={scale}
        flipX={flipX}
        equippedCosmetics={equippedCosmetics}
        layerFilter="foreground"
      />
    )
  }), [characterId, animationSet, equippedCosmetics]);
}