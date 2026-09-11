// game/housing/types/surfaceStyleCatalog.ts
//
// Thin adapter joining the two existing surface catalogs into one
// player-facing browsing list per surface target -- no new asset paths, no
// duplicated ids. Furnish Nest's "Floor Styles"/"Wall Styles" grid is:
//   (a) every proceduralPatternCatalog.ts entry the player owns, plus
//   (b) every usable Nest Theme's matching piece (nestThemeCatalog.ts),
//       shown as an individual style (e.g. "Mossy Grove Floor") alongside
//       the plain patterns -- so a theme's look is choosable a la carte,
//       not only via the whole-theme "apply" action.
import {
  FLOOR_PATTERN_CATALOG,
  WALL_PATTERN_CATALOG,
  FloorPatternItem,
  WallPatternItem,
} from './proceduralPatternCatalog';
import {
  getUsableNestThemes,
  nestThemeFloorId,
  nestThemeWallLeftId,
  nestThemeWallRightId,
} from './nestThemeCatalog';

export interface SurfaceStyleItem {
  /** The exact id to draft+commit -- either a plain catalog id or a Nest
   * Theme piece id (see nestThemeCatalog.ts's id namespace). */
  id: string;
  displayName: string;
  preview:
    | { kind: 'pattern'; pattern: FloorPatternItem | WallPatternItem } // <PatternSwatch item={pattern} />
    | { kind: 'image'; source: any }; // <Image source={source} />
}

export function getIndividualFloorStyles(unlockedFloorPatternIds: string[]): SurfaceStyleItem[] {
  const owned: SurfaceStyleItem[] = FLOOR_PATTERN_CATALOG.filter((p) => unlockedFloorPatternIds.includes(p.id)).map(
    (p) => ({ id: p.id, displayName: p.name, preview: { kind: 'pattern', pattern: p } })
  );
  const themePieces: SurfaceStyleItem[] = getUsableNestThemes().map((theme) => ({
    id: nestThemeFloorId(theme.id),
    displayName: `${theme.name} Floor`,
    preview: { kind: 'image', source: theme.floor.texture },
  }));
  return [...owned, ...themePieces];
}

export function getIndividualWallStyles(side: 'left' | 'right', unlockedWallPatternIds: string[]): SurfaceStyleItem[] {
  const owned: SurfaceStyleItem[] = WALL_PATTERN_CATALOG.filter((p) => unlockedWallPatternIds.includes(p.id)).map(
    (p) => ({ id: p.id, displayName: p.name, preview: { kind: 'pattern', pattern: p } })
  );
  const themePieces: SurfaceStyleItem[] = getUsableNestThemes().map((theme) => ({
    id: side === 'left' ? nestThemeWallLeftId(theme.id) : nestThemeWallRightId(theme.id),
    displayName: `${theme.name} Wall`,
    preview: { kind: 'image', source: side === 'left' ? theme.walls.left : theme.walls.right },
  }));
  return [...owned, ...themePieces];
}
