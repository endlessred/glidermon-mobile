# Cosmetic Palette Tiers (Free / Plus) — Gradient & Shimmer Effects

**Date:** 2026-08-19
**Status:** Draft — pending approval, not yet implemented

---

## Overview

Split the premade-colorway system ([2026-08-19 palette feature](../../../src/data/cosmetics/palette.ts)) into a free tier and a paid "Plus" tier. Free keeps the flat/shaded designer palettes already shipped. Plus adds two new *effect types* — gradient and shimmer — that are visually a different class from "another flat color," not just more of the same. Scope here is the data model, shader work, and UI gating hooks; actual payment/entitlement plumbing (IAP, receipt validation, restore purchases) is explicitly out of scope and called out below.

**Why effect-type instead of more colors:** more flat palettes behind a paywall reads as "pay to unlock normal," which is a weak subscription pitch and mildly punitive to free users. A distinct visual behavior (motion, two-tone blend) reads as genuinely premium and doesn't make the free palettes look broken or incomplete by comparison — free users still get a fully finished-looking cosmetic, just not the animated one.

**Existing infra check (no conflicts found):** no subscription/IAP/entitlement code exists anywhere in the app today — no RevenueCat, `expo-in-app-purchases`, StoreKit, or Play Billing dependency, no "premium"/"plus"/"paywall" concept in `src/`. `docs/MVP-PLAN.md`'s monetization stub (❌, not built) describes a one-time real-money → Acorns pack model, not a recurring subscription — **this spec's "Plus subscription" framing doesn't match that document** and the two should be reconciled before real money is involved (see Open Questions). `CosmeticCard.tsx` already defines a `"locked"` state (dim + 🔒 overlay) but no caller currently uses it — it's the closest existing visual precedent and worth reusing for consistency, adapted to the craft aesthetic (see UI section).

---

## Design Decisions

| Question | Decision |
|---|---|
| What distinguishes Plus palettes from Free? | Effect *type* (gradient, shimmer), not palette count. Free = flat/shaded (current system, unchanged). |
| Where does tier live? | Per-`CosmeticPalette`, not per-item — a hat can mix free and Plus palettes in the same sheet. |
| How many Plus effect types at launch? | Two: **gradient** (two-tone blend) and **shimmer** (animated highlight sweep). Pattern/texture overlays explicitly deferred (needs new art pipeline — see Overview of the prior chat discussion). |
| How is gradient blended without new art? | Reuses the *existing* per-pixel shading signal (the luma-derived `shadeFactor` the current shader already computes) as the mix parameter between two designer colors, instead of only scaling one color's brightness. No new guide-art painting required — works on every already-painted recolorable item. |
| How is shimmer implemented? | A time-driven highlight sweep added on top of the classified/recolored pixel, gated to only affect already-recolored regions. Needs a new `uTime` uniform (doesn't exist in the shader today). |
| Entitlement source for this spec | None — ships behind a local dev/QA flag (mirrors the existing `grant()`-style testing pattern in `cosmeticsStore`). Real subscription gating is a follow-up spec. |
| Locked-palette UI | Reuse the dormant `CosmeticCardState="locked"` visual language (dim, non-interactive body, small badge) but as a small gold "PLUS" ribbon rather than a padlock emoji, to stay in the craft/paper aesthetic rather than reading as a generic app paywall. |

---

## Architecture

### 1. Data model — `src/data/cosmetics/palette.ts`

```typescript
export type PaletteTier = "free" | "plus";

export type PaletteEffect =
  | {
      kind: "gradient";
      /** The second color per channel -- existing `channelColors` becomes
       * the "dark end" (colorA), this is the "light end" (colorB). Blended
       * using the shader's existing shade signal, not new UV geometry. */
      channelColorsB: MaskRecolor;
    }
  | {
      kind: "shimmer";
      /** Sweep cycles per second across the recolored region. Default ~0.4. */
      speed?: number;
      /** How bright the highlight band gets, 0..1. Default ~0.5. */
      intensity?: number;
      /** Tint of the highlight itself; defaults to white. */
      tint?: string;
    };

export type CosmeticPalette = {
  id: string;
  name: string;
  colors: string[];
  channelColors?: MaskRecolor;
  /** Omitted = "free", for backward compatibility with every palette
   * shipped in the initial system (none of which set this). */
  tier?: PaletteTier;
  /** Omitted = flat/shaded (current behavior). Only meaningful when
   * tier === "plus" -- a free palette with an effect is a contradiction
   * the UI should never produce, but the type doesn't need to forbid it. */
  effect?: PaletteEffect;
};
```

`resolveCosmeticRecolor()` keeps its current signature and behavior for the `channelColors`/flat case. Two new resolver exports:

```typescript
export function resolvePaletteEffect(
  item: RecolorableCosmetic | null | undefined,
  selectedPaletteId?: string
): PaletteEffect | undefined { /* same lookup as resolveSelectedPalette, .effect */ }

export function isPaletteLocked(
  palette: CosmeticPalette | undefined,
  hasPlus: boolean
): boolean {
  return palette?.tier === "plus" && !hasPlus;
}
```

### 2. Shader — `src/spine/HueIndexedRecolor.ts`

Two additive changes to `makeHueIndexedRecolorMaterial`, both gated behind new optional `opts` fields so every existing call site (all current flat palettes) is unaffected.

**Gradient mode** — reuse the shade signal as a mix factor instead of a brightness multiplier:

```glsl
// existing, per classified channel (id 0/1/3 -- red/green/yellow):
float refY = (id==0) ? 0.299 : (id==1) ? 0.587 : 0.886;
float shadeFactor = clamp(Y / max(refY, 1e-4), 0.4, 1.3);

// NEW: when this channel has a gradient target, use the *normalized*
// shadeFactor as a 0..1 blend between colorA (dark end) and colorB (light
// end) instead of scaling colorA's brightness. Same input data, different
// use -- no new art or UV-region plumbing needed.
if (uGradientEnabled) {
  float t = clamp((shadeFactor - 0.4) / (1.3 - 0.4), 0.0, 1.0);
  vec3 targetA = SRGBToLinear(target_srgb);        // existing color
  vec3 targetB = SRGBToLinear(uColRB /* or G/Y */); // new "light end" uniform
  vec3 shaded = mix(targetA, targetB, t);
  recolored = mix(texRGB, shaded, uStrength);
} else {
  // existing shadeFactor-multiply path, unchanged
}
```

New uniforms: `uColRB, uColGB, uColYB` (per-channel "B" colors; blue channel is excluded from gradient mode for the same reason it's excluded from shading today — it already flat-blends with no luma signal to repurpose). `uGradientEnabled` (bool/float flag).

**Shimmer mode** — a diagonal sweep in atlas UV space, added as a brightness boost on top of the already-recolored pixel:

```glsl
uniform float uTime, uShimmerEnabled, uShimmerSpeed, uShimmerIntensity;
uniform vec3 uShimmerTint;
...
if (uShimmerEnabled > 0.5 && id != -1) {
  // MVP simplification: sweeps in *atlas* UV space (vUv.x + vUv.y), not the
  // item's own local up/down -- still reads as a believable diagonal sweep
  // per-item empirically, but isn't orientation-aware. A precise version
  // needs each Spine region's UV bounding rect passed in as a uniform so
  // the sweep can be normalized to 0..1 within that specific attachment;
  // flagged as a follow-up if the MVP sweep looks off on some items.
  float phase = fract(vUv.x + vUv.y - uTime * uShimmerSpeed);
  float band = smoothstep(0.0, 0.08, phase) * (1.0 - smoothstep(0.08, 0.16, phase));
  outLinear = mix(outLinear, uShimmerTint, band * uShimmerIntensity);
}
```

**Cache key**: `RECOLOR_CACHE`'s key (currently `hue|texUuid|r|g|b|a|slotName|alphaTest` in both `SpineCharacterPreview.tsx` and `createSpineCharacterController.ts`) must extend to include effect kind + params, or a gradient/shimmer material will collide with and get silently replaced by a flat one using the same base r/g/b/a.

**Per-frame time updates**: materials are created once and cached — there's no existing per-frame uniform push. Cheapest fix: give every shimmer material's `uTime` uniform the *same shared* `THREE.Uniform` object reference (or a plain `{value: 0}` object shared by reference across all shimmer materials), and have each render loop (`SpineCharacterPreview`'s `renderLoop`, `createSpineCharacterController`'s `update()`) write `sharedTimeUniform.value = performance.now() / 1000` once per frame — updates every active shimmer material without iterating a material list.

### 3. Rendering call sites

`SpineCharacterPreview.tsx` and `createSpineCharacterController.ts` both need their `makeHueIndexedRecolorMaterial(...)` calls to also pass `resolvePaletteEffect(item, selectedPaletteId)` and translate it into the new `opts` fields (`gradientEnabled`/`colRB`/etc. or `shimmerEnabled`/`shimmerSpeed`/etc.). This is additive to the palette work already wired in — same call sites, same resolver pattern, no structural change to the equip/preview flow.

### 4. UI — gating and visuals

- **`PaletteCard`**: new `locked?: boolean` prop. When true: reduced opacity (matching `CosmeticCard`'s locked treatment), `onPress` disabled, small **"PLUS"** ribbon badge in the card's corner using `GOLD`/`KRAFT_TAN` tokens (not a padlock — a small fabric-tag-style ribbon fits the craft language better and reads as "special," not "broken/missing").
- **`ColorwaySheet`**: locked Plus palettes still render in the grid (so free users *see* what they're missing — standard soft-paywall pattern) but are non-selectable; tapping one surfaces an upsell affordance. For this spec, stub that as `addToast("Unlock Plus for animated colorways")` (matches the existing lightweight toast pattern used elsewhere) rather than building a real paywall screen, since there's no purchase flow to send them to yet.
- **`PaletteSwatch`**: gradient palettes should render their dots as a 2-stop blend rather than solid fills so the swatch itself hints at the effect; shimmer palettes get a small sparkle glyph accent. Exact rendering left to implementation — not a blocker for the rest of the spec.
- **Entitlement check**: a single `hasPlus: boolean` threaded down from wherever it's decided (see below) — no new store needed yet beyond a flag.

### 5. Content plan (first Plus batch)

Applied to the same items already made recolorable, so no new catalog entries or art are needed — just new `palettes[]` entries with `tier: "plus"`:

| Item | New Plus palette | Effect |
|---|---|---|
| `hat_crown` | "Aurora" | gradient, gold → violet |
| `hat_beret` | "Ember" | shimmer, warm red base + white sweep |
| `motorcycle_jacket_black_gold` | "Chrome" | gradient, near-black → silver |
| `windswept_short` / `windswept_long` | "Starlight" | shimmer, cool blonde base + cyan-tinted sweep |
| `shoe_cowboy_boots` | "Gilded" | gradient, brown → gold |

---

## Rollout Phases

1. **This spec**: data model + shader gradient/shimmer support + `PaletteCard`/`ColorwaySheet` locked-state UI, gated by a hardcoded/dev-toggle `hasPlus` (no real purchase flow). Ships the full visual system, testable end-to-end, sellable to nobody yet.
2. **Follow-up spec**: real entitlement layer — pick an IAP provider (RevenueCat is the common choice for Expo apps needing both App Store + Play Store subscriptions without hand-rolling receipt validation), reconcile with `docs/MVP-PLAN.md`'s existing one-time-pack monetization stub, decide if Plus is subscription, one-time unlock, or both.
3. **Future/deferred**: pattern/texture overlays as a third effect tier, once (2) proves the tier is worth the investment.

---

## Open Questions

- **Subscription vs. one-time purchase**: this spec assumes recurring "Plus," but `MVP-PLAN.md` only documents one-time currency packs. Worth deciding before phase 2, not after.
- **Pricing/quantity**: how many Plus palettes per item at launch, and does every recolorable item get a Plus option or only a curated subset?
- **Grandfathering**: the 6 items already shipped (hat_beret, hat_crown, shoe_cowboy_boots, motorcycle_jacket_black_gold, both hair styles) all currently have only free palettes — do they get Plus options added, or does Plus launch on a fresh set of items to avoid retroactively changing what free users already had access to?
- **Shimmer sweep orientation**: is the atlas-UV-space MVP sweep visually acceptable, or does it need the precise per-region UV-bounds version from day one?
