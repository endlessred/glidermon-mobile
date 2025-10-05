import { ApartmentTemplate, FloorTileType, WallTileType } from "../types";

// 8x8 small apartment template with brown wood floor
export const roomSmallTemplate: ApartmentTemplate = {
  id: "room_s",
  cols: 8,
  rows: 8,

  // Floor layout - all brown wood floor tiles
  floor: [
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1]
  ],

  // Back walls - proper room enclosure with back and left walls
  wallsBack: [
    [0, 0, 0, 0, 0, 0, 0, 0], // No walls at front
    [1, 0, 0, 0, 0, 0, 0, 1], // Left and right walls
    [1, 0, 0, 0, 0, 0, 0, 1], // Left and right walls
    [1, 0, 0, 0, 0, 0, 0, 1], // Left and right walls
    [1, 0, 0, 0, 0, 0, 0, 1], // Left and right walls
    [1, 0, 0, 0, 0, 0, 0, 1], // Left and right walls
    [1, 0, 0, 0, 0, 0, 0, 1], // Left and right walls
    [1, 1, 1, 1, 1, 1, 1, 1]  // Back wall across entire width
  ],

  // No front walls to avoid obscuring the character
  wallsFront: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],

  // Placeholder slots for future furniture
  slots: [
    {
      id: "center_spot",
      type: "rug",
      tile: { x: 4, y: 4 }, // Center of the room
      charAnchor: { dx: 0, dy: 0 }
    }
  ],

  // Wall tiles are not walkable
  staticColliders: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }, { x: 6, y: 0 }, { x: 7, y: 0 },
    { x: 0, y: 1 }, { x: 7, y: 1 },
    { x: 0, y: 2 }, { x: 7, y: 2 },
    { x: 0, y: 3 }, { x: 7, y: 3 },
    { x: 0, y: 4 }, { x: 7, y: 4 },
    { x: 0, y: 5 }, { x: 7, y: 5 },
    { x: 0, y: 6 }, { x: 7, y: 6 }
  ]
};