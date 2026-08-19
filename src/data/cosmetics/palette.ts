// data/cosmetics/palette.ts
// Premade colorway system shared by cosmetics that support recoloring.
// Palettes are designer-authored only -- there is no free-form color
// picker anywhere in this pipeline, by design.

export type MaskRecolor = {
  r?: string;
  g?: string;
  b?: string;
  a?: string;
};

export type PaletteTier = "free" | "plus";

export type PaletteEffect =
  | {
      kind: "gradient";
      /** The "light end" color per channel -- `channelColors` above is the
       * "dark end". Blended using the shader's existing luma-derived shade
       * signal as the mix factor, so it works on already-painted art with
       * no new guide-color regions. Blue is excluded (same reason it's
       * excluded from shading today: it has no luma signal to repurpose,
       * since it already flat-blends to the target color). */
      channelColorsB: MaskRecolor;
    }
  | {
      kind: "shimmer";
      /** Sweep cycles per second across the recolored region. */
      speed?: number;
      /** How bright the highlight band gets, 0..1. */
      intensity?: number;
      /** Tint of the highlight itself; defaults to white. */
      tint?: string;
    };

export type CosmeticPalette = {
  id: string;
  name: string;
  /** 2-4 swatch colors for UI display, in the same order as the shader
   * channels below (primary, secondary, detail, accent). */
  colors: string[];
  /** Maps this palette onto the existing hue-indexed recolor shader's
   * r/g/b/a channels. All optional so a future cosmetic can classify its
   * art into only the channels it actually needs. */
  channelColors?: MaskRecolor;
  /** Omitted = "free". Every palette from the initial system predates this
   * field and is implicitly free -- backward compatible by construction. */
  tier?: PaletteTier;
  /** Omitted = flat/shaded (current behavior). Only meaningful when
   * tier === "plus" -- a free palette with an effect is a state the UI
   * should never produce, but the type doesn't need to forbid it. */
  effect?: PaletteEffect;
};

export const DEFAULT_PALETTE_ID = "original";

type RecolorableCosmetic = {
  id: string;
  maskRecolor?: MaskRecolor;
  recolorable?: boolean;
  palettes?: CosmeticPalette[];
};

function pickPalette(
  item: RecolorableCosmetic,
  selectedPaletteId?: string
): CosmeticPalette | undefined {
  const palettes = item.palettes;
  if (!palettes?.length) return undefined;
  return (
    palettes.find(p => p.id === selectedPaletteId) ??
    palettes.find(p => p.id === DEFAULT_PALETTE_ID) ??
    palettes[0]
  );
}

/**
 * Resolves the shader recolor to actually render for a cosmetic, given the
 * user's selected palette (if any). Non-recolorable items (or items that
 * predate this system) just pass their static maskRecolor through
 * unchanged, so nothing else has to special-case "does this item have
 * palettes?" -- callers can always run their maskRecolor through here.
 */
export function resolveCosmeticRecolor(
  item: RecolorableCosmetic | null | undefined,
  selectedPaletteId?: string
): MaskRecolor | undefined {
  if (!item) return undefined;
  if (!item.recolorable || !item.palettes?.length) return item.maskRecolor;
  const palette = pickPalette(item, selectedPaletteId);
  return palette?.channelColors ?? item.maskRecolor;
}

/** The palette to show as "active" for a cosmetic's card badge / sheet. */
export function resolveSelectedPalette(
  item: RecolorableCosmetic | null | undefined,
  selectedPaletteId?: string
): CosmeticPalette | undefined {
  if (!item) return undefined;
  return pickPalette(item, selectedPaletteId);
}

/** The gradient/shimmer effect (if any) for the cosmetic's active palette. */
export function resolvePaletteEffect(
  item: RecolorableCosmetic | null | undefined,
  selectedPaletteId?: string
): PaletteEffect | undefined {
  if (!item) return undefined;
  return pickPalette(item, selectedPaletteId)?.effect;
}

/** Whether a palette is a Plus-tier palette the user hasn't unlocked yet. */
export function isPaletteLocked(palette: CosmeticPalette | undefined, hasPlus: boolean): boolean {
  return palette?.tier === "plus" && !hasPlus;
}
