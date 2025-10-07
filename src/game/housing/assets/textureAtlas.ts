import * as THREE from 'three';
import { startingApartmentAtlasManifest, RoomAtlasEntry } from './generated/startingApartmentAtlasManifest';

type RoomDefinition = {
  id: string;
  theme?: string | null;
  assets: string[];
};

const startingApartmentRoom = require('./rooms/startingApartment.json') as RoomDefinition;

type RoomRegistryEntry = {
  definition: RoomDefinition;
  manifest: RoomAtlasEntry[];
};

const ROOM_REGISTRY = {
  [startingApartmentRoom.id]: {
    definition: startingApartmentRoom,
    manifest: startingApartmentAtlasManifest,
  },
} satisfies Record<string, RoomRegistryEntry>;

export type HousingRoomId = keyof typeof ROOM_REGISTRY;

export interface LoadHousingTextureAtlasOptions {
  roomId?: HousingRoomId;
}

export const DEFAULT_HOUSING_ROOM_ID = startingApartmentRoom.id as HousingRoomId;

export interface TextureAtlas {
  [key: string]: THREE.Texture;
}

export async function loadHousingTextureAtlas(
  options: LoadHousingTextureAtlasOptions = {}
): Promise<TextureAtlas> {
  const roomId = options.roomId ?? DEFAULT_HOUSING_ROOM_ID;
  const record = ROOM_REGISTRY[roomId];

  if (!record) {
    console.warn(`[housing] unknown room "${roomId}", using placeholders`);
    return createPlaceholderAtlas();
  }

  console.log(`[housing] loading isometric textures for room "${roomId}"`);

  try {
    return await loadRealAssets(roomId, record);
  } catch (error) {
    console.warn(
      `[housing] failed to load real assets for room "${roomId}", using placeholders`,
      error,
    );
    return createPlaceholderAtlas();
  }
}

async function loadRealAssets(roomId: HousingRoomId, record: RoomRegistryEntry): Promise<TextureAtlas> {
  const atlas: TextureAtlas = {};
  const { loadAsync } = require('expo-three');

  const assetKeys = new Set(record.definition.assets.map(normalizeAssetPath));
  if (assetKeys.size === 0) {
    throw new Error(`room "${roomId}" has no declared assets`);
  }

  const entriesToLoad = record.manifest.filter((entry) => {
    const key = extractRoomAssetKey(entry);
    return key != null && assetKeys.has(key);
  });

  if (entriesToLoad.length === 0) {
    throw new Error(`room "${roomId}" did not match any manifest entries`);
  }

  for (const entry of entriesToLoad) {
    try {
      const texture = await loadAsync(entry.requirePath);
      configureTexture(texture, entry);
      registerTexture(atlas, entry, texture);
    } catch (error) {
      console.warn('[housing] failed to load texture', entry.id, error);
    }
  }

  if (Object.keys(atlas).length === 0) {
    throw new Error(`no textures loaded for room "${roomId}"`);
  }

  return atlas;
}

function configureTexture(texture: THREE.Texture, entry: RoomAtlasEntry) {
  texture.flipY = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  texture.userData = {
    ...(texture.userData || {}),
    atlasEntry: entry,
  };
}

function registerTexture(atlas: TextureAtlas, entry: RoomAtlasEntry, texture: THREE.Texture) {
  atlas[entry.id] = texture;

  // Surface ids in code use snake_case variants of the manifest ids; add aliases.
  const alias = buildAliasKey(entry);
  if (alias && !atlas[alias]) {
    atlas[alias] = texture;
  }
}

// Create predictable snake_case keys like floor_wood_side_bottom_left.
function buildAliasKey(entry: RoomAtlasEntry): string | null {
  const category = entry.category.toLowerCase();
  const prefix = category.includes('floor') ? 'floor' : category.includes('wall') ? 'wall' : null;
  if (!prefix) {
    return null;
  }

  const [surfaceRaw, ...restParts] = entry.name.split('_');
  if (!surfaceRaw) {
    return null;
  }

  const material = surfaceRaw.replace(/(Floor|Wall)$/i, '').toLowerCase();
  const suffix = restParts
    .map((part) => part.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase())
    .join('_');

  const segments = [prefix];
  if (material) segments.push(material);
  if (suffix) segments.push(suffix);

  return segments.join('_');
}

function extractRoomAssetKey(entry: RoomAtlasEntry): string | null {
  const sourcePath = entry.metadata?.sourcePath;
  if (typeof sourcePath !== 'string') {
    return null;
  }

  // Generated metadata stores absolute export paths; trim them down to manifest-relative ids.
  const normalized = normalizeAssetPath(sourcePath);
  const markers = ['/exports/', '/processed/'];
  for (const marker of markers) {
    const idx = normalized.indexOf(marker);
    if (idx >= 0) {
      return normalized.slice(idx + marker.length);
    }
  }

  return normalized;
}

function normalizeAssetPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\/+/, '').toLowerCase();
}

function createPlaceholderAtlas(): TextureAtlas {
  const atlas: TextureAtlas = {};

  const makeSolid = (r: number, g: number, b: number, key: string) => {
    const texture = new THREE.DataTexture(new Uint8Array([r, g, b, 255]), 1, 1, THREE.RGBAFormat);
    texture.needsUpdate = true;
    atlas[key] = texture;
  };

  makeSolid(139, 69, 19, 'floor_wood_sides1');
  makeSolid(105, 105, 105, 'wall_wood_sides1');

  return atlas;
}
