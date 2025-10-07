# IsometricHousingThreeJS Usage

IsometricHousingThreeJS is the Three.js-backed housing scene that renders the isometric apartment, the Spine character, and handles the per-frame updates required to keep them synchronised. This document explains how to consume the component and how its positioning/scaling props work.

## Importing the component

`	sx
import { IsometricHousingThreeJS } from "../../game/housing";
`

IsometricHousingThreeJS is exported from src/game/housing/index.ts, so the index barrel can be used from most React components (for example, HudScreen).

## Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| width | 
umber | 300 | Canvas width in pixels. |
| height | 
umber | 250 | Canvas height in pixels. |
| characterX | 
umber | 3.5 | **Optional** raw isometric X coordinate (see below). Ignored if gridColumn/gridRow are provided. |
| characterY | 
umber | 3.5 | **Optional** raw isometric Y coordinate (see below). Ignored if gridColumn/gridRow are provided. |
| gridColumn | 
umber | undefined | Column index in the housing grid (0 == left wall, 7 == right wall). When set together with gridRow, the component converts the pair into isometric coordinates for you. |
| gridRow | 
umber | undefined | Row index in the housing grid (0 == front / open edge, 7 == back wall). |
| characterScale | 
umber | 1 | Multiplier applied on top of the default character height (which is configured as 2.4 tile heights). |
| nimation | string | 'idle' | Name of the Spine animation to play. |
| outfit | OutfitSlot \| null | undefined | Outfit data applied to the Spine character. |

### Choosing between coordinates

- **Grid coordinates** (gridColumn, gridRow) are the recommended API. Think of them as (column, row) inside an 8×8 room: column increases as you move from the left wall to the right wall, row increases as you move from the open front edge towards the back wall. The component clamps values to [0, 7] before projecting them into the isometric plane.
- **Raw isometric coordinates** (characterX, characterY) remain for legacy support. They describe the two diagonal axes of the diamond (south-east and south-west). These are harder to reason about, so prefer the grid props whenever possible.
- When both sets are supplied, gridColumn/gridRow win. Leaving them undefined makes the component fall back to the raw isometric values, preserving previous behaviour.

### Scaling

The component measures the Spine mesh once it has loaded to determine the character’s native height. characterScale multiplies the default target height of 2.4 tiles (defined as CHARACTER_DESIRED_TILE_HEIGHT). For example, characterScale={0.5} renders the avatar at half the usual size.

## Example

`	sx
<IsometricHousingThreeJS
  width={300}
  height={250}
  gridColumn={6}
  gridRow={1}
  characterScale={0.75}
  animation="idle"
  outfit={localOutfit ?? undefined}
/>
`

This positions the character near the front-right of the apartment and renders them at 75?% of the default height.

## Debug logging

In development (__DEV__), the component logs coordinate changes once per update:

`
Housing target iso { iso: { x, y }, grid: { column, row }, target: { x, y, feetY } }
`

This helps confirm the resolved grid/iso values. The log resets when the grid props or fallback isometric props change.

---

For additional implementation notes, see the inline comments in src/game/housing/view/IsometricHousingThreeJS.tsx and the broader system overview in docs/HOUSING_AND_ISO.md.
