import * as THREE from 'three';
import { Asset } from 'expo-asset';

export interface TextureAtlas {
  [key: string]: THREE.Texture;
}

export async function loadHousingTextureAtlas(): Promise<TextureAtlas> {
  console.log("🏠 Loading real isometric housing textures...");

  try {
    // Try to load real assets first
    return await loadRealAssets();
  } catch (error) {
    console.warn("⚠️ Failed to load real assets, falling back to placeholders:", error);
    return createPlaceholderAtlas();
  }
}

async function loadRealAssets(): Promise<TextureAtlas> {
  const atlas: TextureAtlas = {};

  // Asset requires - floor variants
  const floorWoodSides1 = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/FloorTiles/Brown1/WoodFloor_Sides1.png');
  const floorWoodSides2 = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/FloorTiles/Brown1/WoodFloor_Sides2.png');
  const floorWoodCornerBottom = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/FloorTiles/Brown1/WoodFloor_CornerBottom.png');
  const floorWoodCornerLeft = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/FloorTiles/Brown1/WoodFloor_CornerLeft.png');
  const floorWoodCornerRight = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/FloorTiles/Brown1/WoodFloor_CornerRight.png');
  const floorWoodCornerTop = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/FloorTiles/Brown1/WoodFloor_CornerTop.png');
  const floorWoodSideBottomLeft = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/FloorTiles/Brown1/WoodFloor_SideBottomLeft.png');
  const floorWoodSideBottomRight = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/FloorTiles/Brown1/WoodFloor_SideBottomRight.png');
  const floorWoodSideTopLeft = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/FloorTiles/Brown1/WoodFloor_SideTopLeft.png');
  const floorWoodSideTopRight = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/FloorTiles/Brown1/WoodFloor_SideTopRight.png');

  // Wall asset
  const wallWoodRequire = require('../../../assets/Isometric/Ultimate_Isometric_Interior/Exports/WallTiles/Brown1/WoodWall_Sides1.png');

  // Use expo-three's loadAsync for reliable texture loading
  const { loadAsync } = require('expo-three');

  // Helper function to load and configure floor texture
  const loadFloorTexture = async (require: any, key: string) => {
    const texture = await loadAsync(require);
    texture.flipY = false;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    atlas[key] = texture;
    return texture;
  };

  // Load all floor texture variants
  try {
    console.log('📦 Loading floor texture variants...');
    await loadFloorTexture(floorWoodSides1, "floor_wood_sides1");
    await loadFloorTexture(floorWoodSides2, "floor_wood_sides2");
    await loadFloorTexture(floorWoodCornerBottom, "floor_wood_corner_bottom");
    await loadFloorTexture(floorWoodCornerLeft, "floor_wood_corner_left");
    await loadFloorTexture(floorWoodCornerRight, "floor_wood_corner_right");
    await loadFloorTexture(floorWoodCornerTop, "floor_wood_corner_top");
    await loadFloorTexture(floorWoodSideBottomLeft, "floor_wood_side_bottom_left");
    await loadFloorTexture(floorWoodSideBottomRight, "floor_wood_side_bottom_right");
    await loadFloorTexture(floorWoodSideTopLeft, "floor_wood_side_top_left");
    await loadFloorTexture(floorWoodSideTopRight, "floor_wood_side_top_right");
    console.log('✅ All floor texture variants loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load floor textures:', error);
    throw error;
  }

  // Load wall texture
  try {
    console.log('📦 Loading wall texture...');
    const wallTexture = await loadAsync(wallWoodRequire);
    wallTexture.flipY = false;
    wallTexture.wrapS = THREE.ClampToEdgeWrapping;
    wallTexture.wrapT = THREE.ClampToEdgeWrapping;
    wallTexture.generateMipmaps = false;
    wallTexture.minFilter = THREE.LinearFilter;
    wallTexture.magFilter = THREE.LinearFilter;
    wallTexture.needsUpdate = true;
    console.log("🧩 wall image size:", wallTexture.image?.width, "x", wallTexture.image?.height);
    atlas["wall_wood_sides1"] = wallTexture;
    console.log('✅ Wall texture loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load wall texture:', error);
    throw error;
  }

  console.log('🎉 All real housing textures loaded successfully');
  return atlas;
}

function createPlaceholderAtlas(): TextureAtlas {
  const atlas: TextureAtlas = {};

  console.log('🔄 Creating placeholder textures for housing');

  // Brown floor placeholder - create a simple brown diamond shape
  const floorTexture = new THREE.DataTexture(
    new Uint8Array([139, 69, 19, 255]), // Brown color RGBA
    1, 1,
    THREE.RGBAFormat
  );
  floorTexture.needsUpdate = true;
  atlas["floor_wood_sides1"] = floorTexture;

  // Gray wall placeholder
  const wallTexture = new THREE.DataTexture(
    new Uint8Array([105, 105, 105, 255]), // Gray color RGBA
    1, 1,
    THREE.RGBAFormat
  );
  wallTexture.needsUpdate = true;
  atlas["wall_wood_sides1"] = wallTexture;

  return atlas;
}