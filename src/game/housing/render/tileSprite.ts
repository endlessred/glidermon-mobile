import * as THREE from "three";

// Cutout threshold for opaqueCutout materials -- the source PNGs are already
// tightly trimmed with clamped/mipmap-free sampling (see loadFurnitureTexture),
// the same anti-halo setup documented for the Spine atlas in
// src/spine/CLAUDE.md, so a mid-range threshold discards the fully-transparent
// margin without visibly fringing the art's own antialiased edges.
const OPAQUE_CUTOUT_ALPHA_TEST = 0.5;

export function makeSpritePlane(tex: THREE.Texture, w: number, h: number, opts?: { depthTest?: boolean; opaqueCutout?: boolean }) {
  const geom = new THREE.PlaneGeometry(w, h);
  // Default (depthTest/depthWrite disabled): draw order is controlled
  // entirely via renderOrder (painter's algorithm), matching the proven
  // approach from the legacy Spine-based room renderer (see
  // FURNITURE-SYSTEM.md). Pass depthTest:true for scenes with a real depth
  // buffer (e.g. the 3D-primitive room shell), where occlusion against
  // opaque geometry should just work instead of needing manual ordering.
  const depthEnabled = opts?.depthTest ?? false;
  // opaqueCutout moves this plane into three.js's opaque render queue
  // (alpha-tested hard cutout instead of alpha-blended) rather than the
  // transparent queue -- three.js always renders the whole opaque queue
  // before the whole transparent queue, regardless of renderOrder, and the
  // Spine character's main body/skin slots are opaque-queue materials (see
  // normalizeMaterialForSlot in SpineThree.ts). A transparent-queue furniture
  // plane can never actually lose to that skin via renderOrder -- it always
  // draws in the later pass and wins -- so furniture that needs to render
  // *behind* the character has to join the opaque queue to compete on equal
  // terms.
  const opaqueCutout = opts?.opaqueCutout ?? false;
  const mat = opaqueCutout
    ? new THREE.MeshBasicMaterial({ map: tex, transparent: false, depthTest: true, depthWrite: true, alphaTest: OPAQUE_CUTOUT_ALPHA_TEST })
    : new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: depthEnabled, depthWrite: depthEnabled });
  const mesh = new THREE.Mesh(geom, mat);
  // default plane is centered; we want "feet" at (x,y): shift origin
  mesh.position.set(0, 0, 0);
  mesh.geometry.translate(w / 2, h, 0); // pivot bottom-center
  return mesh;
}

export function createTileTextureLoader() {
  const loader = new THREE.TextureLoader();

  // Cache for loaded textures
  const textureCache = new Map<string, THREE.Texture>();

  return {
    loadTexture: async (path: string): Promise<THREE.Texture> => {
      if (textureCache.has(path)) {
        return textureCache.get(path)!;
      }

      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(
          path,
          resolve,
          undefined,
          reject
        );
      });

      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      textureCache.set(path, texture);
      return texture;
    },

    getTexture: (path: string): THREE.Texture | undefined => {
      return textureCache.get(path);
    }
  };
}