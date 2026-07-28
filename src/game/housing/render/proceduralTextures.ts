// Procedural, tileable textures for the 3D-primitive room shell
// (sceneBuilder3D.ts). The purchased asset pack's floor/wall art is
// pre-rendered *isometric* sprites -- perspective is already baked into the
// pixels, so mapping it onto real 3D box faces (which get their own
// perspective from the true 3D camera) would double up the distortion.
// Generating flat, tileable patterns here sidesteps that entirely and keeps
// recoloring cheap (family/style -> texture, no new art per scheme).
//
// Patterns are looked up by catalog id (proceduralPatternCatalog.ts) rather
// than parsed from an asset-shaped set name -- that catalog is the single
// source of truth for family colors, shared with the shop preview
// (ui/components/PatternSwatch.tsx), so the two never drift apart.
import * as THREE from 'three';
import {
  FAMILY_COLORS,
  FamilyColors,
  FloorPatternStyle,
  WallPatternStyle,
  getFloorPatternById,
  getWallPatternById,
} from '../types/proceduralPatternCatalog';

const TEX_SIZE = 32;

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function familyRgb(colors: FamilyColors): { base: RGB; light: RGB; dark: RGB } {
  return { base: hexToRgb(colors.base), light: hexToRgb(colors.light), dark: hexToRgb(colors.dark) };
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
  const clamped = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * clamped),
    g: Math.round(a.g + (b.g - a.g) * clamped),
    b: Math.round(a.b + (b.b - a.b) * clamped),
  };
}

function paintPixel(
  style: FloorPatternStyle | WallPatternStyle,
  base: RGB,
  light: RGB,
  dark: RGB,
  x: number,
  y: number,
  size: number
): RGB {
  switch (style) {
    case 'Carpet': {
      const speckle = pseudoNoise(x, y);
      return lerp(base, light, speckle * 0.3);
    }
    case 'Checkered': {
      const checkSize = size / 4;
      const cx = Math.floor(x / checkSize);
      const cy = Math.floor(y / checkSize);
      return (cx + cy) % 2 === 0 ? base : dark;
    }
    case 'DiagonalCheckered': {
      const checkSize = size / 4;
      const u = x + y;
      const v = x - y + size;
      const cu = Math.floor(u / checkSize);
      const cv = Math.floor(v / checkSize);
      return (cu + cv) % 2 === 0 ? base : dark;
    }
    case 'Wood': {
      const plankHeight = size / 4;
      const plankIndex = Math.floor(y / plankHeight);
      const withinPlank = (y % plankHeight) / plankHeight;
      const bandTone = plankIndex % 2 === 0 ? base : lerp(base, dark, 0.15);
      const grain = pseudoNoise(x * 0.5, plankIndex * 3.1);
      return lerp(bandTone, dark, grain * 0.12 + (withinPlank < 0.08 ? 0.35 : 0));
    }
    case 'WoodPaneling': {
      const plankHeight = size / 4;
      const plankIndex = Math.floor(y / plankHeight);
      const withinPlank = (y % plankHeight) / plankHeight;
      const bandTone = plankIndex % 2 === 0 ? base : lerp(base, dark, 0.15);
      const grain = pseudoNoise(x * 0.5, plankIndex * 3.1);
      return lerp(bandTone, dark, grain * 0.12 + (withinPlank < 0.08 ? 0.35 : 0));
    }
    case 'VerticalPaneling': {
      const plankWidth = size / 4;
      const plankIndex = Math.floor(x / plankWidth);
      const withinPlank = (x % plankWidth) / plankWidth;
      const bandTone = plankIndex % 2 === 0 ? base : lerp(base, dark, 0.15);
      const grain = pseudoNoise(plankIndex * 3.1, y * 0.5);
      return lerp(bandTone, dark, grain * 0.12 + (withinPlank < 0.08 ? 0.35 : 0));
    }
    case 'Brick': {
      const courseHeight = size / 4;
      const brickWidth = size / 2;
      const course = Math.floor(y / courseHeight);
      const offset = course % 2 === 0 ? 0 : brickWidth / 2;
      const withinCourseY = (y % courseHeight) / courseHeight;
      const withinCourseX = ((x + offset) % brickWidth) / brickWidth;
      const isMortar = withinCourseY < 0.1 || withinCourseX < 0.06;
      return isMortar ? dark : lerp(base, light, pseudoNoise(x, y) * 0.2);
    }
    case 'SubwayTile': {
      const courseHeight = size / 6;
      const brickWidth = size / 3;
      const course = Math.floor(y / courseHeight);
      const offset = course % 2 === 0 ? 0 : brickWidth / 2;
      const withinCourseY = (y % courseHeight) / courseHeight;
      const withinCourseX = ((x + offset) % brickWidth) / brickWidth;
      const isMortar = withinCourseY < 0.06 || withinCourseX < 0.04;
      return isMortar ? base : lerp(light, base, pseudoNoise(x, y) * 0.08);
    }
    case 'Stripe': {
      const bandHeight = size / 8;
      const band = Math.floor(y / bandHeight);
      return band % 2 === 0 ? base : light;
    }
    case 'PolkaDot': {
      const cell = size / 4;
      const cx = (x % cell) - cell / 2;
      const cy = (y % cell) - cell / 2;
      const dist = Math.sqrt(cx * cx + cy * cy);
      return dist < cell * 0.28 ? dark : base;
    }
    case 'Gingham': {
      const stripe = size / 4;
      const xBand = Math.floor(x / stripe) % 2 === 0;
      const yBand = Math.floor(y / stripe) % 2 === 0;
      if (xBand && yBand) return lerp(base, dark, 0.35);
      if (xBand || yBand) return lerp(base, light, 0.4);
      return light;
    }
    case 'Terrazzo': {
      const cell = 6;
      const cx = Math.floor(x / cell);
      const cy = Math.floor(y / cell);
      const blobNoise = pseudoNoise(cx * 3.7, cy * 5.1);
      const tone = blobNoise > 0.85 ? dark : blobNoise > 0.7 ? light : base;
      const edgeNoise = pseudoNoise(x, y);
      return lerp(tone, edgeNoise > 0.5 ? light : base, 0.15);
    }
    case 'Herringbone': {
      const plankLen = size / 4;
      const diag1 = Math.floor((x + y) / plankLen);
      const useDiag1 = diag1 % 2 === 0;
      const diag2 = Math.floor((x - y + size) / plankLen);
      const bandIndex = useDiag1 ? diag1 : diag2;
      const within = useDiag1 ? ((x + y) % plankLen) / plankLen : ((x - y + size) % plankLen) / plankLen;
      const tone = bandIndex % 2 === 0 ? base : lerp(base, dark, 0.15);
      return within < 0.08 ? dark : tone;
    }
    case 'Basketweave': {
      const blockSize = size / 4;
      const bx = Math.floor(x / blockSize);
      const by = Math.floor(y / blockSize);
      const groupHorizontal = (bx + by) % 2 === 0;
      const withinX = (x % blockSize) / blockSize;
      const withinY = (y % blockSize) / blockSize;
      const grooveFrac = groupHorizontal ? withinY : withinX;
      const tone = (bx + by) % 4 < 2 ? base : lerp(base, dark, 0.12);
      return grooveFrac < 0.06 ? dark : tone;
    }
    case 'Hexagon': {
      const hexW = size / 4;
      const hexH = hexW * 0.87;
      const row = Math.floor(y / hexH);
      const offsetX = (row % 2) * (hexW / 2);
      const cellX = ((x + offsetX) % hexW) / hexW;
      const cellY = (y % hexH) / hexH;
      const dx = Math.abs(cellX - 0.5);
      const dy = Math.abs(cellY - 0.5);
      const edgeDist = Math.max(dx, dy * 0.8 + dx * 0.4);
      return edgeDist > 0.42 ? dark : lerp(base, light, pseudoNoise(x, y) * 0.15);
    }
    case 'Marble': {
      const vein = Math.sin(x * 0.3 + Math.sin(y * 0.2) * 3) * 0.5 + 0.5;
      const vein2 = Math.sin(y * 0.25 + Math.sin(x * 0.15) * 2) * 0.5 + 0.5;
      const veinValue = Math.max(vein, vein2);
      return veinValue > 0.85 ? lerp(light, dark, 0.4) : lerp(light, base, pseudoNoise(x, y) * 0.2);
    }
    case 'Beadboard': {
      const grooveSpacing = size / 8;
      const withinGroove = x % grooveSpacing;
      return withinGroove < 1.5 ? dark : lerp(base, light, pseudoNoise(x, y) * 0.05);
    }
    case 'Wainscoting': {
      const trimY = size * 0.65;
      if (Math.abs(y - trimY) < 1.2) return dark;
      if (y > trimY) return lerp(light, base, 0.3);
      const plankWidth = size / 4;
      const withinPlank = x % plankWidth;
      return withinPlank < 1.2 ? lerp(base, dark, 0.4) : base;
    }
    case 'Blank':
    default:
      return lerp(base, light, pseudoNoise(x, y) * 0.05);
  }
}

function generatePixels(style: FloorPatternStyle | WallPatternStyle, colors: FamilyColors): Uint8Array {
  const { base, light, dark } = familyRgb(colors);
  const size = TEX_SIZE;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const color = paintPixel(style, base, light, dark, x, y, size);
      setPixel(data, x, y, size, color);
    }
  }

  return data;
}

const textureCache = new Map<string, THREE.DataTexture>();

function buildTexture(patternId: string, style: FloorPatternStyle | WallPatternStyle, colors: FamilyColors): THREE.DataTexture {
  const cached = textureCache.get(patternId);
  if (cached) return cached;

  const pixels = generatePixels(style, colors);
  const texture = new THREE.DataTexture(pixels, TEX_SIZE, TEX_SIZE, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  (texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;

  textureCache.set(patternId, texture);
  return texture;
}

export function getFloorTexture(patternId: string): THREE.DataTexture {
  const item = getFloorPatternById(patternId);
  if (!item) {
    if (__DEV__) console.warn(`[housing3D] unknown floor pattern id "${patternId}", falling back to blank`);
    return buildTexture('__fallback_floor__', 'Blank', FAMILY_COLORS.Grey);
  }
  return buildTexture(item.id, item.style, FAMILY_COLORS[item.family]);
}

export function getWallTexture(patternId: string): THREE.DataTexture {
  const item = getWallPatternById(patternId);
  if (!item) {
    if (__DEV__) console.warn(`[housing3D] unknown wall pattern id "${patternId}", falling back to blank`);
    return buildTexture('__fallback_wall__', 'Blank', FAMILY_COLORS.Grey);
  }
  return buildTexture(item.id, item.style, FAMILY_COLORS[item.family]);
}
