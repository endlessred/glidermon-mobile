// Shared helper for measuring a Spine character mesh's native (unscaled)
// height, used by both room renderers to compute a world-scale multiplier
// that makes Glidermon a sensible size relative to the room. Each renderer
// still applies its own scale formula since their world-unit conventions
// differ (the `quad` renderer works in scaled screen-pixel space; the 3D
// shell works in literal tile-size world units).
import * as THREE from 'three';

export function computeNativeCharacterHeight(mesh: THREE.Object3D): number | null {
  try {
    mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(mesh);
    const height = bounds.max.y - bounds.min.y;
    if (Number.isFinite(height) && height > 0) return height;
  } catch (error) {
    if (__DEV__) console.warn('Failed to compute character height', error);
  }
  return null;
}
