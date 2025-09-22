// Skia-based palette swapping component for indexed color sprites
import React, { useMemo } from "react";
import { Platform } from "react-native";
import { createCompletePalette, paletteToSkiaColorMap } from "../cosmetics/paletteSystem";
import type { SkinVariation, EyeColor, ShoeVariation } from "../../data/types/outfitTypes";

type PaletteSwappedSpriteProps = {
  Skia: any;

  // Sprite properties
  imageSource: any;
  x: number;
  y: number;
  width: number;
  height: number;

  // Palette configuration
  skinVariation: SkinVariation;
  eyeColor: EyeColor;
  shoeVariation: ShoeVariation;

  // Optional sprite sheet cropping (for animation frames)
  srcRect?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };

  // Optional transforms
  transform?: any[];
  fit?: "fill" | "contain" | "cover" | "fitWidth" | "fitHeight" | "scaleDown";
};

function resolveForSkia(mod: any): any {
  if (Platform.OS === "web") {
    const { Asset } = require("expo-asset");
    return Asset.fromModule(mod).uri;
  }
  return mod;
}

export default function PaletteSwappedSprite({
  Skia,
  imageSource,
  x,
  y,
  width,
  height,
  skinVariation,
  eyeColor,
  shoeVariation,
  srcRect,
  transform,
  fit = "fill"
}: PaletteSwappedSpriteProps) {
  const { Image: SkImageNode, useImage, ColorFilter, RuntimeEffect } = Skia;

  // Load the sprite image
  const image = useImage(resolveForSkia(imageSource));

  // Create the complete palette for current selections
  const palette = useMemo(() => {
    return createCompletePalette(skinVariation, eyeColor, shoeVariation);
  }, [skinVariation, eyeColor, shoeVariation]);

  // Convert palette to Skia color map
  const colorMap = useMemo(() => {
    return paletteToSkiaColorMap(palette);
  }, [palette]);

  // Create Skia ColorFilter for palette mapping
  const colorFilter = useMemo(() => {
    if (!Skia || !ColorFilter) return null;

    // For indexed color images, we need to use a runtime effect
    // that maps each pixel's index to the corresponding color
    const sksl = `
      uniform float[256] colorMap;

      half4 main(vec2 coord) {
        half4 pixel = sample(source, coord);

        // Extract the index from the red channel (assuming indexed color format)
        int index = int(pixel.r * 255.0);

        // Look up the color in our map
        // Note: SKSL doesn't support array indexing with variables directly,
        // so we'll use a simpler approach for now
        if (index < 256) {
          float colorValue = colorMap[index];
          float r = floor(colorValue / 65536.0) / 255.0;
          float g = floor(mod(colorValue, 65536.0) / 256.0) / 255.0;
          float b = mod(colorValue, 256.0) / 255.0;
          return half4(r, g, b, pixel.a);
        }

        return pixel;
      }
    `;

    try {
      const effect = RuntimeEffect?.MakeForColorFilter(sksl);
      if (effect) {
        return effect.makeColorFilter([colorMap]);
      }
    } catch (error) {
      console.warn("Failed to create palette swap effect:", error);
    }

    // Fallback: simple color matrix (won't work perfectly for indexed colors)
    return null;
  }, [Skia, ColorFilter, RuntimeEffect, colorMap]);

  if (!image) {
    return null;
  }

  // If we have a source rectangle, we need to handle sprite sheet cropping
  if (srcRect) {
    return (
      <SkImageNode
        image={image}
        x={x}
        y={y}
        width={width}
        height={height}
        fit={fit}
        transform={transform}
        colorFilter={colorFilter}
        rect={{
          x: srcRect.x,
          y: srcRect.y,
          width: srcRect.w,
          height: srcRect.h
        }}
      />
    );
  }

  // Standard full image rendering
  return (
    <SkImageNode
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      fit={fit}
      transform={transform}
      colorFilter={colorFilter}
    />
  );
}

// Hook for easier integration with animated sprites
export function usePaletteSwappedSprite(
  Skia: any,
  imageSource: any,
  skinVariation: SkinVariation,
  eyeColor: EyeColor,
  shoeVariation: ShoeVariation
) {
  return useMemo(() => ({
    renderFrame: (
      x: number,
      y: number,
      width: number,
      height: number,
      frameIndex: number,
      frameWidth: number,
      frameHeight: number,
      cols: number,
      rows: number = 1,
      transform?: any[]
    ) => {
      // Calculate source rectangle for the frame
      const col = frameIndex % cols;
      const row = Math.floor(frameIndex / cols);
      const srcRect = {
        x: col * frameWidth,
        y: row * frameHeight,
        w: frameWidth,
        h: frameHeight
      };

      return (
        <PaletteSwappedSprite
          Skia={Skia}
          imageSource={imageSource}
          x={x}
          y={y}
          width={width}
          height={height}
          skinVariation={skinVariation}
          eyeColor={eyeColor}
          shoeVariation={shoeVariation}
          srcRect={srcRect}
          transform={transform}
        />
      );
    },

    renderFullSprite: (
      x: number,
      y: number,
      width: number,
      height: number,
      transform?: any[]
    ) => (
      <PaletteSwappedSprite
        Skia={Skia}
        imageSource={imageSource}
        x={x}
        y={y}
        width={width}
        height={height}
        skinVariation={skinVariation}
        eyeColor={eyeColor}
        shoeVariation={shoeVariation}
        transform={transform}
      />
    )
  }), [Skia, imageSource, skinVariation, eyeColor, shoeVariation]);
}