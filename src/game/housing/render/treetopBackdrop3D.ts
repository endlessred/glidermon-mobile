// Tree backdrop for the 3D-primitive room shell -- reads as the housing
// sitting nestled in a tree instead of floating in open sky. Built as a real
// world-space billboard (same depth-tested, camera-facing approach as
// furniture -- see furnitureBillboard3D.ts) rather than a camera-attached
// HUD overlay: it needs to share the room's depth so it pans/scales
// correctly relative to the housing when the view zooms in on the
// character, instead of staying pinned to a fixed screen position.
import * as THREE from 'three';
import { WALL_HEIGHT } from './sceneBuilder3D';

const SOURCE_IMAGE_WIDTH = 1024;
const SOURCE_IMAGE_HEIGHT = 612;
const SOURCE_ASPECT = SOURCE_IMAGE_WIDTH / SOURCE_IMAGE_HEIGHT;

// World-unit size of the billboard, tuned empirically against the overview
// camera framing (see IsometricRoomView3D.tsx) so the canopy peeks in
// behind the walls at a pleasing height. Not derivable in closed form here
// because the overview frustum's size depends on the room's tier/dimensions
// too. Pivoted at the image's own bottom edge (the trunk's base), so the
// whole tree scales from there -- see geometry.translate below.
const TREE_WORLD_HEIGHT = WALL_HEIGHT * 5.6;
const TREE_WORLD_WIDTH = TREE_WORLD_HEIGHT * SOURCE_ASPECT;

// Pure "into the screen" depth push, expressed along the fixed isometric
// camera's own view direction rather than the room's x/z axes. That
// direction is mathematically orthogonal to the camera's right/up axes, so
// shifting the billboard along it changes only its depth-test ordering,
// never its on-screen position or size (unlike shifting along -x/-z, which
// was the original bug here: it also drags the billboard's apparent screen
// position around, and worse, a flat always-camera-facing billboard shares
// ONE depth value across its whole face, while a real 3D wall's surface
// depth varies across its own face -- so a single-axis offset that looked
// "behind" the wall's near corner could still land in front of farther
// parts of that same wall, showing the tree clipping through it instead of
// being cleanly hidden behind it).
const CAMERA_FORWARD = new THREE.Vector3(-1, -1, -1).normalize();
// Safety margin (multiplier) over the room's own farthest extent along that
// axis, so the billboard sits behind every point of the room geometry
// regardless of room size tier.
const DEPTH_SAFETY_MARGIN = 1.6;

export async function createTreetopBackdrop3D(
  halfWidth: number,
  halfDepth: number,
  billboardQuaternion: THREE.Quaternion
): Promise<THREE.Group> {
  const { loadAsync } = require('expo-three');
  const texture: THREE.Texture = await loadAsync(require('../../../assets/Room/Treetop.png'));
  (texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const geometry = new THREE.PlaneGeometry(TREE_WORLD_WIDTH, TREE_WORLD_HEIGHT);
  // Pivot at bottom-center (ground level) instead of the default center, to
  // match the "feet at the group origin" convention furniture/character use
  // -- the image's bottom edge is the trunk's base.
  geometry.translate(0, TREE_WORLD_HEIGHT / 2, 0);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);

  const group = new THREE.Group();
  group.quaternion.copy(billboardQuaternion);
  // Farthest point of the room's own geometry along the camera's view axis
  // is its back-bottom corner (halfWidth, 0, halfDepth) from the origin --
  // push well past that so the whole billboard is guaranteed to lose the
  // depth test against every wall/floor piece.
  const roomFarthestDepth = (halfWidth + halfDepth) / Math.sqrt(3);
  group.position.copy(CAMERA_FORWARD).multiplyScalar(roomFarthestDepth * DEPTH_SAFETY_MARGIN);
  group.add(mesh);

  return group;
}
