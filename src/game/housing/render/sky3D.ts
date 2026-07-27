// Sky backdrop for the 3D-primitive room shell. Rendered as a single
// `scene.background` texture rather than world geometry -- the room camera
// is a fixed-angle orthographic isometric rig (see IsometricRoomView3D.tsx),
// so a flat full-screen backdrop always fills the frame correctly regardless
// of zoom/pan, with none of the placement math true 3D sky geometry would
// need under that camera. Color, clouds, and stars are painted directly into
// a small pixel buffer (same DataTexture approach as proceduralTextures.ts --
// no DOM canvas available in this RN/expo-gl environment) and repainted in
// place as time of day changes.
import * as THREE from 'three';

interface RGB {
  r: number;
  g: number;
  b: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: RGB, b: RGB, t: number): RGB {
  return { r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) };
}

export function rgbToHex(c: RGB): number {
  return (Math.round(c.r) << 16) | (Math.round(c.g) << 8) | Math.round(c.b);
}

export interface SkyPalette {
  top: RGB;
  bottom: RGB;
  starAmount: number;
  cloudAmount: number;
  ambientColor: RGB;
  ambientIntensity: number;
  sunColor: RGB;
  sunIntensity: number;
}

interface Keyframe extends SkyPalette {
  hour: number;
}

const NIGHT_TOP: RGB = { r: 8, g: 12, b: 36 };
const NIGHT_BOTTOM: RGB = { r: 20, g: 26, b: 58 };
const TWILIGHT_TOP: RGB = { r: 70, g: 70, b: 120 };
const TWILIGHT_BOTTOM: RGB = { r: 210, g: 150, b: 130 };
const DAY_TOP: RGB = { r: 70, g: 150, b: 225 };
const DAY_BOTTOM: RGB = { r: 175, g: 220, b: 245 };

const NIGHT: Omit<Keyframe, 'hour'> = {
  top: NIGHT_TOP,
  bottom: NIGHT_BOTTOM,
  starAmount: 1,
  cloudAmount: 0,
  ambientColor: { r: 130, g: 150, b: 210 },
  ambientIntensity: 0.28,
  sunColor: { r: 140, g: 160, b: 220 },
  sunIntensity: 0.12,
};
const DAWN: Omit<Keyframe, 'hour'> = {
  top: TWILIGHT_TOP,
  bottom: TWILIGHT_BOTTOM,
  starAmount: 0.25,
  cloudAmount: 0.4,
  ambientColor: { r: 220, g: 180, b: 170 },
  ambientIntensity: 0.45,
  sunColor: { r: 255, g: 190, b: 150 },
  sunIntensity: 0.55,
};
const DUSK: Omit<Keyframe, 'hour'> = {
  ...DAWN,
  ambientColor: { r: 220, g: 170, b: 160 },
  ambientIntensity: 0.4,
  sunColor: { r: 255, g: 150, b: 110 },
  sunIntensity: 0.45,
};
const DAY: Omit<Keyframe, 'hour'> = {
  top: DAY_TOP,
  bottom: DAY_BOTTOM,
  starAmount: 0,
  cloudAmount: 1,
  ambientColor: { r: 255, g: 255, b: 255 },
  ambientIntensity: 0.6,
  sunColor: { r: 255, g: 255, b: 255 },
  sunIntensity: 0.8,
};

// Hour-of-day keyframes the palette interpolates between. Kept as one
// smooth night -> dawn -> day -> dusk -> night cycle rather than a hard cut,
// so the sky (and lights, which piggyback on the same palette) drift rather
// than snap.
const KEYFRAMES: Keyframe[] = [
  { hour: 0, ...NIGHT },
  { hour: 5, ...NIGHT },
  { hour: 6.5, ...DAWN },
  { hour: 8, ...DAY },
  { hour: 17, ...DAY },
  { hour: 19, ...DUSK },
  { hour: 21, ...NIGHT },
  { hour: 24, ...NIGHT },
];

export function getSkyPalette(date: Date = new Date()): SkyPalette {
  const hour = date.getHours() + date.getMinutes() / 60;

  let lower = KEYFRAMES[0];
  let upper = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (hour >= KEYFRAMES[i].hour && hour <= KEYFRAMES[i + 1].hour) {
      lower = KEYFRAMES[i];
      upper = KEYFRAMES[i + 1];
      break;
    }
  }

  const span = upper.hour - lower.hour;
  const t = span > 0 ? (hour - lower.hour) / span : 0;

  return {
    top: lerpColor(lower.top, upper.top, t),
    bottom: lerpColor(lower.bottom, upper.bottom, t),
    starAmount: lerp(lower.starAmount, upper.starAmount, t),
    cloudAmount: lerp(lower.cloudAmount, upper.cloudAmount, t),
    ambientColor: lerpColor(lower.ambientColor, upper.ambientColor, t),
    ambientIntensity: lerp(lower.ambientIntensity, upper.ambientIntensity, t),
    sunColor: lerpColor(lower.sunColor, upper.sunColor, t),
    sunIntensity: lerp(lower.sunIntensity, upper.sunIntensity, t),
  };
}

const SKY_WIDTH = 64;
const SKY_HEIGHT = 96;
const STAR_COUNT = 40;
const CLOUD_COUNT = 5;

function pseudoRandom(seed: number): number {
  const v = Math.sin(seed * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

interface Star {
  x: number;
  y: number;
  brightness: number;
}
interface Cloud {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

// Fixed, deterministic layouts -- stars and clouds don't reshuffle every
// repaint, only their opacity (via the palette) changes over time.
const STARS: Star[] = Array.from({ length: STAR_COUNT }, (_, i) => ({
  x: pseudoRandom(i * 2.13) * SKY_WIDTH,
  y: pseudoRandom(i * 7.91) * SKY_HEIGHT * 0.7,
  brightness: 0.4 + pseudoRandom(i * 3.71) * 0.6,
}));

const CLOUDS: Cloud[] = Array.from({ length: CLOUD_COUNT }, (_, i) => ({
  x: pseudoRandom(i * 5.31 + 1) * SKY_WIDTH,
  y: pseudoRandom(i * 9.17 + 1) * SKY_HEIGHT * 0.5,
  rx: 8 + pseudoRandom(i * 4.11) * 6,
  ry: 3 + pseudoRandom(i * 6.61) * 2,
}));

function setPixel(data: Uint8Array, x: number, y: number, color: RGB) {
  if (x < 0 || x >= SKY_WIDTH || y < 0 || y >= SKY_HEIGHT) return;
  const i = (y * SKY_WIDTH + x) * 4;
  data[i] = color.r;
  data[i + 1] = color.g;
  data[i + 2] = color.b;
  data[i + 3] = 255;
}

function getPixel(data: Uint8Array, x: number, y: number): RGB {
  const i = (y * SKY_WIDTH + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

export function paintSky(data: Uint8Array, palette: SkyPalette) {
  for (let y = 0; y < SKY_HEIGHT; y++) {
    const t = y / (SKY_HEIGHT - 1);
    const rowColor = lerpColor(palette.top, palette.bottom, t);
    for (let x = 0; x < SKY_WIDTH; x++) {
      setPixel(data, x, y, rowColor);
    }
  }

  if (palette.cloudAmount > 0.02) {
    for (const cloud of CLOUDS) {
      const minX = Math.max(0, Math.floor(cloud.x - cloud.rx));
      const maxX = Math.min(SKY_WIDTH - 1, Math.ceil(cloud.x + cloud.rx));
      const minY = Math.max(0, Math.floor(cloud.y - cloud.ry));
      const maxY = Math.min(SKY_HEIGHT - 1, Math.ceil(cloud.y + cloud.ry));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - cloud.x;
          const dy = y - cloud.y;
          const dist = (dx * dx) / (cloud.rx * cloud.rx) + (dy * dy) / (cloud.ry * cloud.ry);
          if (dist > 1) continue;
          const falloff = Math.min((1 - dist) * palette.cloudAmount, 0.85);
          setPixel(data, x, y, lerpColor(getPixel(data, x, y), { r: 255, g: 255, b: 255 }, falloff));
        }
      }
    }
  }

  if (palette.starAmount > 0.02) {
    for (const star of STARS) {
      const x = Math.max(0, Math.min(SKY_WIDTH - 1, Math.round(star.x)));
      const y = Math.max(0, Math.min(SKY_HEIGHT - 1, Math.round(star.y)));
      const brightness = star.brightness * palette.starAmount;
      setPixel(data, x, y, lerpColor(getPixel(data, x, y), { r: 255, g: 255, b: 255 }, brightness));
    }
  }
}

export function createSkyTexture(): { texture: THREE.DataTexture; data: Uint8Array } {
  const data = new Uint8Array(SKY_WIDTH * SKY_HEIGHT * 4);
  paintSky(data, getSkyPalette());

  const texture = new THREE.DataTexture(data, SKY_WIDTH, SKY_HEIGHT, THREE.RGBAFormat);
  // Non-power-of-two (96) height -- disable mipmaps so this stays valid
  // under WebGL1's NPOT restrictions, same reasoning as the clamp wrap below.
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  (texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;

  return { texture, data };
}
