import * as THREE from "three";
import { isoToScreen, zFromFeetScreenY } from "../coords";
import { makeSpritePlane } from "./tileSprite";
import { ApartmentTemplate, FloorTileType, WallTileType } from "../types";

type TextureAtlas = Record<string, THREE.Texture>;

export interface SceneBuilderOptions {
  scene: THREE.Scene;
  textureAtlas: TextureAtlas;
  template: ApartmentTemplate;
}

export function buildApartmentScene({ scene, textureAtlas, template }: SceneBuilderOptions) {
  // Clear existing apartment objects (if any)
  const apartmentObjects = scene.children.filter(child =>
    (child as any).__apartmentObject === true
  );
  apartmentObjects.forEach(obj => scene.remove(obj));

  // Build floor tiles
  for (let row = 0; row < template.rows; row++) {
    for (let col = 0; col < template.cols; col++) {
      const tileType = template.floor[row][col];
      if (tileType === FloorTileType.Empty) continue;

      const floorTexture = getFloorTexture(tileType, textureAtlas);
      if (!floorTexture) continue;

      const mesh = makeSpritePlane(floorTexture, 64, 32);
      const screenPos = isoToScreen(col, row);
      mesh.position.set(screenPos.x, screenPos.y, zFromFeetScreenY(screenPos.y) - 0.001); // Floor is lowest

      // Mark as apartment object for cleanup
      (mesh as any).__apartmentObject = true;
      scene.add(mesh);
    }
  }

  // Build back walls
  for (let row = 0; row < template.rows; row++) {
    for (let col = 0; col < template.cols; col++) {
      const wallType = template.wallsBack[row][col];
      if (wallType === WallTileType.Empty) continue;

      const wallTexture = getWallTexture(wallType, textureAtlas);
      if (!wallTexture) continue;

      const mesh = makeSpritePlane(wallTexture, 64, 64); // Walls are taller
      const screenPos = isoToScreen(col, row);
      mesh.position.set(screenPos.x, screenPos.y - 16, zFromFeetScreenY(screenPos.y)); // Offset up for wall height

      // Mark as apartment object for cleanup
      (mesh as any).__apartmentObject = true;
      scene.add(mesh);
    }
  }

  // Calculate room bounds for camera positioning
  const roomBounds = {
    minX: 0,
    maxX: template.cols * 32, // Half tile width
    minY: 0,
    maxY: template.rows * 16  // Half tile height
  };

  return { roomBounds };
}

function getFloorTexture(tileType: FloorTileType, atlas: TextureAtlas): THREE.Texture | null {
  const tileMap: Record<FloorTileType, string> = {
    [FloorTileType.Empty]: "",
    [FloorTileType.WoodFloor]: "floor_wood_sides1",
    [FloorTileType.Carpet]: "floor_carpet_sides1",
    [FloorTileType.CheckeredFloor1]: "floor_checkered1_sides1",
    [FloorTileType.CheckeredFloor2]: "floor_checkered2_sides1",
    [FloorTileType.Pattern1]: "floor_pattern1_sides1",
    [FloorTileType.Pattern2]: "floor_pattern2_sides1",
    [FloorTileType.Pattern3]: "floor_pattern3_sides1",
    [FloorTileType.StripedFloor1]: "floor_striped1_sides1",
    [FloorTileType.StripedFloor2]: "floor_striped2_sides1",
    [FloorTileType.BlankFloor]: "floor_blank_sides1"
  };

  const key = tileMap[tileType];
  return key ? atlas[key] || null : null;
}

function getWallTexture(wallType: WallTileType, atlas: TextureAtlas): THREE.Texture | null {
  const wallMap: Record<WallTileType, string> = {
    [WallTileType.Empty]: "",
    [WallTileType.WoodWall]: "wall_wood_sides1",
    [WallTileType.BlankWall]: "wall_blank_sides1",
    [WallTileType.BrickWall]: "wall_brick_sides1",
    [WallTileType.StoneWall]: "wall_stone_sides1",
    [WallTileType.PatternWall1]: "wall_pattern1_sides1",
    [WallTileType.PatternWall2]: "wall_pattern2_sides1",
    [WallTileType.OldWall1]: "wall_old1_sides1",
    [WallTileType.OldWall2]: "wall_old2_sides1"
  };

  const key = wallMap[wallType];
  return key ? atlas[key] || null : null;
}