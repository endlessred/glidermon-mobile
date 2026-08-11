// Loads real photographic diffuse maps for the 'material'-kind floor/wall
// products (see types/proceduralPatternCatalog.ts) -- the counterpart to
// render/proceduralTextures.ts's DataTexture generator for 'procedural'-kind
// products. Mirrors quadTextures.ts's expo-three loadAsync + cache pattern,
// but with RepeatWrapping instead of ClampToEdge since these tile across the
// whole floor/wall surface rather than sitting as a single sprite.
//
// generateMipmaps=false + LinearFilter matches the same setting
// quadTextures.ts already applies to furniture textures loaded the same way.
// Callers (sceneBuilder3D.ts) MUST use the returned texture directly and
// never .clone() it -- confirmed by device testing that cloning silently
// breaks whatever native path expo-gl uses to upload pixels for a texture
// whose .image is an Asset-uri wrapper (not a plain bitmap), rendering solid
// black despite the clone reporting a valid width/height.
import * as THREE from 'three';
import { materialCatalogManifest, MaterialCatalogEntry } from './generated/materialCatalogManifest';

const manifestById = new Map<string, MaterialCatalogEntry>(
  materialCatalogManifest.map((entry) => [entry.id, entry])
);

const textureCache = new Map<string, Promise<THREE.Texture>>();

async function loadDiffuseTexture(entry: MaterialCatalogEntry): Promise<THREE.Texture> {
  const { loadAsync } = require('expo-three');
  const texture: THREE.Texture = await loadAsync(entry.diffuseRequirePath);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  (texture as any).colorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
  texture.needsUpdate = true;
  return texture;
}

function loadById(materialId: string): Promise<THREE.Texture> | null {
  const entry = manifestById.get(materialId);
  if (!entry) {
    if (__DEV__) console.warn(`[housing3D] unknown material id "${materialId}"`);
    return null;
  }
  if (!textureCache.has(materialId)) {
    textureCache.set(materialId, loadDiffuseTexture(entry));
  }
  return textureCache.get(materialId)!;
}

export function loadFloorMaterialTexture(materialId: string): Promise<THREE.Texture> | null {
  return loadById(materialId);
}

export function loadWallMaterialTexture(materialId: string): Promise<THREE.Texture> | null {
  return loadById(materialId);
}
