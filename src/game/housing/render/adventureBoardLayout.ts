// Shared geometry for the Daily Adventure Board's writable cream surface.
// The single source of truth is the Spine asset's authored `Placeholder`
// attachment (measured in adventureBoard3D.ts); these constants map that
// local rectangle onto the visible wooden aperture and pick the texture
// resolution. No screen-space / projected values live here any more.

/** Outward expansion of the measured Placeholder local bounds (fractions of
 * its own size) so the cream reaches the inner wood lip. The wooden frame
 * always draws on top, so a small overscan is safe. */
export const BOARD_OPENING_OVERSCAN = {
  left: 0.06,
  right: 0.05,
  top: 0.02,
  bottom: 0.06,
};

/** width / height of the opening after the overscan above (Placeholder is
 * ~842 x 795 local units). Used so the Skia texture isn't stretched onto a
 * non-matching plane. */
export const BOARD_OPENING_ASPECT = 1.1;

/** Logical texture long-edge (px) per density. Full is used by the Goals
 * camera (readable); compact by Nest / Glidermon (glanceable at distance). */
export const BOARD_TEXTURE_LONG_EDGE: Record<"full" | "compact", number> = {
  full: 1024,
  compact: 512,
};

/** Local-Z offset recessing the writing surface behind the Spine frame plane
 * (group local +Z faces the camera, so behind = negative). Big enough that the
 * depth buffer never z-fights the near-coplanar frame art, small enough that
 * the surface doesn't visually detach under the orthographic camera (a Z shift
 * along the view axis produces no parallax, only depth ordering). */
export const BOARD_UI_LOCAL_DEPTH_OFFSET = -0.04;
