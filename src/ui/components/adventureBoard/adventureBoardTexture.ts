// ui/components/adventureBoard/adventureBoardTexture.ts
//
// Skia offscreen -> RGBA pixels -> a plain payload the in-world board plane
// (adventureBoard3D.ts) uploads into a THREE.DataTexture. Pure: no React, no
// Three. Callers memoize by `version` (serializeAdventureBoardState).
import { Skia, ColorType, AlphaType } from "@shopify/react-native-skia";
import { drawAdventureBoard, BoardDensity } from "./AdventureBoardDrawing";
import { AdventureBoardModel } from "../../../data/selectors/adventureBoard";
import {
  BOARD_OPENING_ASPECT,
  BOARD_TEXTURE_LONG_EDGE,
} from "../../../game/housing/render/adventureBoardLayout";

export interface AdventureBoardTexturePayload {
  /** RGBA8888, row order already flipped for THREE.DataTexture UVs. */
  pixels: Uint8Array;
  width: number;
  height: number;
}

export interface AdventureBoardTextureSet {
  compact: AdventureBoardTexturePayload;
  full: AdventureBoardTexturePayload;
  /** serializeAdventureBoardState(model) at generation time. */
  version: string;
}

function textureDims(density: BoardDensity) {
  const width = BOARD_TEXTURE_LONG_EDGE[density]; // aspect > 1 => width is long
  const height = Math.round(width / BOARD_OPENING_ASPECT);
  return { width, height };
}

export function renderAdventureBoardPayload(
  model: AdventureBoardModel,
  density: BoardDensity
): AdventureBoardTexturePayload | null {
  const { width, height } = textureDims(density);
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) return null;
  try {
    const canvas = surface.getCanvas();
    drawAdventureBoard(canvas, { model, density, width, height });
    surface.flush();
    const image = surface.makeImageSnapshot();
    const raw = image.readPixels(0, 0, {
      width,
      height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    if (!raw) return null;
    const src = raw instanceof Uint8Array ? raw : new Uint8Array(raw.buffer);
    // Skia rows run top->bottom; THREE.DataTexture samples bottom->top with
    // the default plane UVs -- flip rows here so geometry/UVs stay standard.
    const rowBytes = width * 4;
    const flipped = new Uint8Array(src.length);
    for (let y = 0; y < height; y++) {
      flipped.set(
        src.subarray(y * rowBytes, (y + 1) * rowBytes),
        (height - 1 - y) * rowBytes
      );
    }
    return { pixels: flipped, width, height };
  } catch {
    return null;
  }
}

export function renderAdventureBoardTextureSet(
  model: AdventureBoardModel,
  version: string
): AdventureBoardTextureSet | null {
  const compact = renderAdventureBoardPayload(model, "compact");
  const full = renderAdventureBoardPayload(model, "full");
  if (!compact || !full) return null;
  return { compact, full, version };
}
