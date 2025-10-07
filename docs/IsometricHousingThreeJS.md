# IsometricHousingThreeJS Usage

`IsometricHousingThreeJS` renders the apartment scene and the Spine character using Three.js. This guide explains how to consume the component and how the positioning/scaling props behave.

## Import

```tsx
import { IsometricHousingThreeJS } from "../../game/housing";
```

The component is re-exported from `src/game/housing/index.ts`, so most screens can import it from the housing barrel (see `HudScreen` for an example).

## Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `width` | `number` | `300` | Canvas width in pixels. |
| `height` | `number` | `250` | Canvas height in pixels. |
| `characterX` | `number` | `3.5` | *Legacy* raw isometric X axis (south-east). Ignored when `gridColumn`/`gridRow` are provided. |
| `characterY` | `number` | `3.5` | *Legacy* raw isometric Y axis (south-west). Ignored when `gridColumn`/`gridRow` are provided. |
| `gridColumn` | `number` | `undefined` | Apartment column (0 = left wall, 7 = right wall). Preferred API. |
| `gridRow` | `number` | `undefined` | Apartment row (0 = front/open edge, 7 = back wall). Preferred API. |
| `characterScale` | `number` | `1` | Multiplier applied to the default character height (2.4 tile heights). |
| `animation` | `string` | `'idle'` | Spine animation track name. |
| `outfit` | `OutfitSlot \| null` | `undefined` | Outfit applied to the Spine skeleton. |

### Coordinate systems

- `gridColumn`/`gridRow` are the recommended inputs. They describe an 8×8 Cartesian grid. The component clamps them into range and converts them into the diagonal isometric axes internally.
- `characterX`/`characterY` remain for backwards compatibility. They directly map onto the two diagonals of the diamond (south-east and south-west). They are harder to reason about, so prefer the grid props where possible.
- When both sets are supplied, the grid props win. Omitting them preserves the old behaviour based on `characterX`/`characterY`.

### Scaling

Once the Spine mesh loads, the component measures its native height. `characterScale` multiplies the default target height of 2.4 tiles (`CHARACTER_DESIRED_TILE_HEIGHT`). For example, `characterScale={0.5}` renders the avatar at half of the default size.

## Example

```tsx
<IsometricHousingThreeJS
  width={300}
  height={250}
  gridColumn={6}
  gridRow={1}
  characterScale={0.75}
  animation="idle"
  outfit={localOutfit ?? undefined}
/>
```

This places the character near the front-right corner and scales them to 75?% of the baseline height.

## Debug logging

In development (`__DEV__`) the component emits one log when the resolved coordinates change:

```
Housing target iso { iso: { x, y }, grid: { column, row }, target: { x, y, feetY } }
```

The log resets when either the grid props or the legacy isometric props change.

---

See `docs/HOUSING_AND_ISO.md` and `src/game/housing/view/IsometricHousingThreeJS.tsx` for additional implementation details.
