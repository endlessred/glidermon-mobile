// game/housing/render/furnishMarkerTexture.ts
//
// Skia offscreen -> RGBA pixels -> THREE.DataTexture for Furnish Nest's 3D
// slot markers. Mirrors the proven pattern in
// ui/components/adventureBoard/adventureBoardTexture.ts, but simpler: marker
// content is static per (label, state) rather than driven by live game
// state, so this lives here in render/ (pure, no React) instead of ui/, and
// results are cached forever rather than regenerated on a version bump.
//
// Deliberately text-only (no baked-in emoji glyph): AdventureBoardDrawing.ts
// hand-draws vector icons (drawAcorn, drawCheck, ...) rather than asking
// Skia's matched "sans-serif" font to render an emoji character -- color-emoji
// glyph coverage in Skia's default font manager is inconsistent across
// platforms, and a blank/missing glyph would be worse than no icon. The
// slot-type emoji (SLOT_TYPE_ICONS) is used on the RN side (inventory panel
// header) where a plain <Text> renders emoji reliably.
//
// Marker hierarchy (selected > empty > occupied): an occupied slot's
// furniture is already tappable on its own, so its marker is deliberately
// just a small quiet dot -- no label, no chip -- to keep Furnish mode from
// reading as a debug overlay. Empty and selected slots still get the full
// chip + label since those are the states where the marker IS the primary
// affordance (there's no furniture to tap yet, or it's the thing actively
// being edited).
import * as THREE from 'three';
import { Skia, ColorType, AlphaType, PaintStyle, matchFont, type SkCanvas } from '@shopify/react-native-skia';

export type FurnishMarkerState = 'empty' | 'occupied' | 'selected';

// Kept in sync with src/ui/components/handcrafted/tokens.ts -- not imported
// directly to avoid a render/ -> ui/ dependency for a handful of hex values.
const INK = '#4A312C';
const INK_MUTED = '#7C5A4A';
const CREAM = '#F8EEDC';
const KRAFT_TAN = '#C9A06B';
const FELT_GREEN = '#8FBF82';
const FELT_GREEN_DARK = '#2E4B29';

const MARKER_TEXTURE_WIDTH = 200;
const MARKER_TEXTURE_HEIGHT = 76;

const FILL_BY_CHIP_STATE: Record<'empty' | 'selected', string> = {
  empty: CREAM,
  selected: FELT_GREEN,
};
const STROKE_BY_CHIP_STATE: Record<'empty' | 'selected', string> = {
  empty: INK,
  selected: FELT_GREEN_DARK,
};
const TEXT_BY_CHIP_STATE: Record<'empty' | 'selected', string> = {
  empty: INK,
  selected: '#FFFDF7',
};

const fontCache = new Map<number, ReturnType<typeof matchFont>>();
function labelFont(size: number) {
  let f = fontCache.get(size);
  if (!f) {
    f = matchFont({ fontFamily: 'sans-serif', fontSize: size, fontWeight: '800' });
    fontCache.set(size, f);
  }
  return f;
}

// Empty/selected: the full cream-or-green rounded chip with a readable
// label -- these are the two states where the marker is the primary way to
// discover/confirm a slot, so they stay clearly legible.
function drawChipMarker(canvas: SkCanvas, label: string, state: 'empty' | 'selected') {
  const w = MARKER_TEXTURE_WIDTH;
  const h = MARKER_TEXTURE_HEIGHT;
  const strokeW = state === 'selected' ? 6 : 4;
  const inset = strokeW / 2 + 2;
  const rect = Skia.XYWHRect(inset, inset, w - inset * 2, h - inset * 2);
  const rr = Skia.RRectXY(rect, h * 0.32, h * 0.32);

  const fillPaint = Skia.Paint();
  fillPaint.setAntiAlias(true);
  fillPaint.setColor(Skia.Color(FILL_BY_CHIP_STATE[state]));
  canvas.drawRRect(rr, fillPaint);

  const strokePaint = Skia.Paint();
  strokePaint.setAntiAlias(true);
  strokePaint.setStyle(PaintStyle.Stroke);
  strokePaint.setStrokeWidth(strokeW);
  strokePaint.setColor(Skia.Color(STROKE_BY_CHIP_STATE[state]));
  canvas.drawRRect(rr, strokePaint);

  const fontSize = h * 0.34;
  const f = labelFont(fontSize);
  const textPaint = Skia.Paint();
  textPaint.setAntiAlias(true);
  textPaint.setColor(Skia.Color(TEXT_BY_CHIP_STATE[state]));
  const measured = f.measureText(label);
  const textWidth = measured?.width ?? label.length * fontSize * 0.55;
  canvas.drawText(label, (w - textWidth) / 2, h / 2 + fontSize * 0.32, textPaint, f);
}

// Occupied: a small quiet dot, no text -- the furniture itself is already
// the tappable, discoverable thing here, so the marker only needs to hint
// "this slot has a filed-away edit affordance" without competing with the
// art for attention. Centered in the same canvas (rather than a
// differently-shaped/sized one) so the existing plane-scale knob
// (SCALE_BY_STATE in furnishSlotMarkers3D.ts) shrinks both the drawn dot AND
// its tappable plane bounds together -- no separately-sized geometry to
// keep in sync.
function drawOccupiedDot(canvas: SkCanvas) {
  const w = MARKER_TEXTURE_WIDTH;
  const h = MARKER_TEXTURE_HEIGHT;
  const cx = w / 2;
  const cy = h / 2;
  const r = h * 0.26;

  const fillPaint = Skia.Paint();
  fillPaint.setAntiAlias(true);
  fillPaint.setColor(Skia.Color(KRAFT_TAN));
  canvas.drawCircle(cx, cy, r, fillPaint);

  const strokePaint = Skia.Paint();
  strokePaint.setAntiAlias(true);
  strokePaint.setStyle(PaintStyle.Stroke);
  strokePaint.setStrokeWidth(2.5);
  strokePaint.setColor(Skia.Color(INK_MUTED));
  canvas.drawCircle(cx, cy, r, strokePaint);
}

const textureCache = new Map<string, THREE.DataTexture>();

function buildTexture(draw: (canvas: SkCanvas) => void): THREE.DataTexture | null {
  const surface = Skia.Surface.MakeOffscreen(MARKER_TEXTURE_WIDTH, MARKER_TEXTURE_HEIGHT);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('rgba(0,0,0,0)'));
  draw(canvas);
  surface.flush();

  const image = surface.makeImageSnapshot();
  const raw = image.readPixels(0, 0, {
    width: MARKER_TEXTURE_WIDTH,
    height: MARKER_TEXTURE_HEIGHT,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (!raw) return null;
  const src = raw instanceof Uint8Array ? raw : new Uint8Array(raw.buffer);

  // Skia rows run top->bottom; THREE.DataTexture samples bottom->top with
  // the default plane UVs -- flip rows here so geometry/UVs stay standard
  // (same fix as adventureBoardTexture.ts).
  const rowBytes = MARKER_TEXTURE_WIDTH * 4;
  const flipped = new Uint8Array(src.length);
  for (let y = 0; y < MARKER_TEXTURE_HEIGHT; y++) {
    flipped.set(src.subarray(y * rowBytes, (y + 1) * rowBytes), (MARKER_TEXTURE_HEIGHT - 1 - y) * rowBytes);
  }

  const texture = new THREE.DataTexture(flipped, MARKER_TEXTURE_WIDTH, MARKER_TEXTURE_HEIGHT, THREE.RGBAFormat, THREE.UnsignedByteType);
  (texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

/** Cached forever -- at most a few dozen (label, state) combinations for
 * this room's slot types, so there's no need to ever evict. Every occupied
 * marker shares one texture (the dot has no label-dependent content). */
export function getFurnishMarkerTexture(label: string, state: FurnishMarkerState): THREE.DataTexture | null {
  const key = state === 'occupied' ? 'occupied' : `${label}|${state}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const texture =
    state === 'occupied'
      ? buildTexture((canvas) => drawOccupiedDot(canvas))
      : buildTexture((canvas) => drawChipMarker(canvas, label, state));
  if (!texture) return null;
  textureCache.set(key, texture);
  return texture;
}
