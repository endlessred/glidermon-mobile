// Two-pass room rendering.
//
// The fixed isometric camera's real 3D shell (floor + walls, BoxGeometry with
// a shared depth buffer) used to depth-test against every billboarded room
// object -- furniture, GliderMon, the Adventure Board -- because they all sat
// in one scene rendered in a single pass. A billboard is a flat plane with
// ONE depth value across its whole face, while the shell's wall/floor surface
// depth varies continuously across its own face; at the angles this fixed
// camera favors, that mismatch let a wall's near corner "win" the depth test
// against part of a tall object while losing against another part of the
// same object, i.e. the wall visibly slices through it (the Adventure Board's
// frame, tall furniture, ...). See treetopBackdrop3D.ts for the same failure
// mode worked around one object at a time before this existed.
//
// The fix is architectural, not another per-object depthTest/renderOrder
// hack: render the shell in its own pass with its own depth buffer, clear
// depth, then render every room CONTENT object in a second pass against a
// fresh buffer. The shell can never clip contents because contents no longer
// share a depth buffer with it at all. Contents still all share ONE depth
// buffer with each other in pass 2, so GliderMon/furniture/board occlusion
// (renderOrder-based -- see adventureBoard3D.ts / furnitureBillboard3D.ts) is
// unaffected.
//
// ROOM_SHELL: floor, the two back walls, and the treetop backdrop (it
// deliberately depth-tests against the walls -- see treetopBackdrop3D.ts --
// so it must render in the same pass/buffer as them, not with contents).
// CONTENT: GliderMon, furniture (floor + wall-mounted), the Adventure Board
// (frame + writing surface), and any future interactive prop.
import * as THREE from 'three';

export const ROOM_SHELL_LAYER = 1;
export const CONTENT_LAYER = 2;

/** Puts `root` and every descendant Object3D on `layer` (and only that layer). */
export function assignLayer(root: THREE.Object3D, layer: number) {
  root.traverse((o) => o.layers.set(layer));
}
