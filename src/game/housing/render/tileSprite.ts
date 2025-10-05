import * as THREE from "three";

export function makeSpritePlane(tex: THREE.Texture, w: number, h: number) {
  const geom = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
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