// Procedural, tileable textures for the 3D-primitive room shell
// (sceneBuilder3D.ts). The purchased asset pack's floor/wall art is
// pre-rendered *isometric* sprites -- perspective is already baked into the
// pixels, so mapping it onto real 3D box faces (which get their own
// perspective from the true 3D camera) would double up the distortion.
// Generating flat, tileable patterns here sidesteps that entirely and keeps
// recoloring cheap (family/style -> texture, no new art per scheme).
import * as THREE from 'three';
import { FloorSetName, WallSetName } from '../types/RoomConfig';

const TEX_SIZE = 32;

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hex(r: number, g: number, b: number): RGB {
  return { r, g, b };
}

// Color families, matching the family prefixes already used in
// AVAILABLE_FLOOR_SETS / AVAILABLE_WALL_SETS.
const FAMILY_COLORS: Record<string, { base: RGB; light: RGB; dark: RGB }> = {
  BlackWhite: { base: hex(210, 210, 210), light: hex(240, 240, 240), dark: hex(40, 40, 40) },
  Blue: { base: hex(90, 130, 200), light: hex(130, 165, 225), dark: hex(50, 80, 140) },
  Brown1: { base: hex(169, 120, 76), light: hex(196, 150, 105), dark: hex(110, 74, 42) },
  Dark: { base: hex(70, 68, 75), light: hex(95, 92, 100), dark: hex(35, 34, 38) },
  Grey: { base: hex(140, 140, 145), light: hex(170, 170, 175), dark: hex(95, 95, 100) },
  Red: { base: hex(180, 70, 65), light: hex(205, 105, 95), dark: hex(120, 40, 38) },
  Yellow: { base: hex(232, 184, 75), light: hex(245, 210, 120), dark: hex(180, 135, 45) },
};

const FAMILY_NAMES = Object.keys(FAMILY_COLORS);
const STYLE_SUFFIXES = [
  'CheckeredFloor1',
  'WoodPaneling',
  'BlankFloor',
  'BlankWall',
  'OldWall1',
  'Carpet',
  'WoodFloor',
  'BrickWall',
];

function parseSetName(setName: string): { family: string; style: string } {
  const family = FAMILY_NAMES.find((f) => setName.startsWith(f)) ?? 'Grey';
  const style = STYLE_SUFFIXES.find((s) => setName.endsWith(s)) ?? 'Blank';
  return { family, style };
}

// Simple deterministic pseudo-random noise (no seeded RNG dependency needed
// for a one-time, memoized generation).
function pseudoNoise(x: number, y: number): number {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function setPixel(data: Uint8Array, x: number, y: number, size: number, color: RGB) {
  const i = (y * size + x) * 4;
  data[i] = color.r;
  data[i + 1] = color.g;
  data[i + 2] = color.b;
  data[i + 3] = 255;
}

function lerp(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function generatePixels(family: string, style: string): Uint8Array {
  const { base, light, dark } = FAMILY_COLORS[family] ?? FAMILY_COLORS.Grey;
  const size = TEX_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color: RGB = base;

      switch (style) {
        case 'Carpet': {
          const speckle = pseudoNoise(x, y);
          color = lerp(base, light, speckle * 0.3);
          break;
        }
        case 'CheckeredFloor1': {
          const checkSize = size / 4;
          const cx = Math.floor(x / checkSize);
          const cy = Math.floor(y / checkSize);
          color = (cx + cy) % 2 === 0 ? base : dark;
          break;
        }
        case 'WoodFloor':
        case 'WoodPaneling': {
          const plankHeight = size / 4;
          const plankIndex = Math.floor(y / plankHeight);
          const withinPlank = (y % plankHeight) / plankHeight;
          const bandTone = plankIndex % 2 === 0 ? base : lerp(base, dark, 0.15);
          const grain = pseudoNoise(x * 0.5, plankIndex * 3.1);
          color = lerp(bandTone, dark, grain * 0.12 + (withinPlank < 0.08 ? 0.35 : 0));
          break;
        }
        case 'BrickWall':
        case 'OldWall1': {
          const courseHeight = size / 4;
          const brickWidth = size / 2;
          const course = Math.floor(y / courseHeight);
          const offset = course % 2 === 0 ? 0 : brickWidth / 2;
          const withinCourseY = (y % courseHeight) / courseHeight;
          const withinCourseX = ((x + offset) % brickWidth) / brickWidth;
          const isMortar = withinCourseY < 0.1 || withinCourseX < 0.06;
          color = isMortar ? dark : lerp(base, light, pseudoNoise(x, y) * 0.2);
          break;
        }
        case 'BlankFloor':
        case 'BlankWall':
        default: {
          color = lerp(base, light, pseudoNoise(x, y) * 0.05);
          break;
        }
      }

      setPixel(data, x, y, size, color);
    }
  }

  return data;
}

const textureCache = new Map<string, THREE.DataTexture>();

function getTexture(setName: string): THREE.DataTexture {
  const cached = textureCache.get(setName);
  if (cached) return cached;

  const { family, style } = parseSetName(setName);
  const pixels = generatePixels(family, style);
  const texture = new THREE.DataTexture(pixels, TEX_SIZE, TEX_SIZE, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  (texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;

  textureCache.set(setName, texture);
  return texture;
}

export function getFloorTexture(setName: FloorSetName): THREE.DataTexture {
  return getTexture(setName);
}

export function getWallTexture(setName: WallSetName): THREE.DataTexture {
  return getTexture(setName);
}
