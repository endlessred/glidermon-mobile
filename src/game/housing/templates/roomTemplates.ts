import { RoomTemplate, RoomLayoutConfig } from '../types/RoomConfig';

// Basic room with blue carpet and blue walls
export const basicBlueRoom: RoomTemplate = {
  id: 'basic-blue-room',
  name: 'Basic Blue Room',
  description: 'A simple room with blue carpet flooring and blue walls',
  layout: {
    name: 'Basic Blue Room',
    dimensions: { width: 6, height: 6 },
    defaultFloor: {
      set: 'BlueCarpet',
      variant: 'Sides2' // Will be overridden by determineFloorVariant
    },
    defaultWall: {
      set: 'BlueBlankWall',
      variant: 'Sides1' // No outlines for interior walls
    },
    floors: [], // All handled by default floor
    walls: [], // All handled by default wall
    furniture: []
  }
};

// Checkered floor room with wood walls
export const checkeredWoodRoom: RoomTemplate = {
  id: 'checkered-wood-room',
  name: 'Checkered Wood Room',
  description: 'A room with checkered flooring and wood paneling walls',
  layout: {
    name: 'Checkered Wood Room',
    dimensions: { width: 8, height: 6 },
    defaultFloor: {
      set: 'BlackWhiteCheckeredFloor1',
      variant: 'Sides2'
    },
    defaultWall: {
      set: 'Brown1WoodPaneling',
      variant: 'Sides1'
    },
    floors: [],
    walls: [],
    furniture: []
  }
};

// Mixed materials room with custom tile placements
export const mixedMaterialsRoom: RoomTemplate = {
  id: 'mixed-materials-room',
  name: 'Mixed Materials Room',
  description: 'A room showcasing different floor and wall materials',
  layout: {
    name: 'Mixed Materials Room',
    dimensions: { width: 8, height: 8 },
    defaultFloor: {
      set: 'GreyBlankFloor',
      variant: 'Sides2'
    },
    defaultWall: {
      set: 'GreyBlankWall',
      variant: 'Sides1'
    },
    floors: [
      // Create a carpet area in the center
      { tileId: 'C3', floor: { set: 'RedCarpet', variant: 'CornerTop' } },
      { tileId: 'C4', floor: { set: 'RedCarpet', variant: 'SideTopLeft' } },
      { tileId: 'C5', floor: { set: 'RedCarpet', variant: 'SideTopLeft' } },
      { tileId: 'C6', floor: { set: 'RedCarpet', variant: 'CornerRight' } },
      { tileId: 'D3', floor: { set: 'RedCarpet', variant: 'SideBottomLeft' } },
      { tileId: 'D4', floor: { set: 'RedCarpet', variant: 'Sides2' } },
      { tileId: 'D5', floor: { set: 'RedCarpet', variant: 'Sides2' } },
      { tileId: 'D6', floor: { set: 'RedCarpet', variant: 'SideTopRight' } },
      { tileId: 'E3', floor: { set: 'RedCarpet', variant: 'SideBottomLeft' } },
      { tileId: 'E4', floor: { set: 'RedCarpet', variant: 'Sides2' } },
      { tileId: 'E5', floor: { set: 'RedCarpet', variant: 'Sides2' } },
      { tileId: 'E6', floor: { set: 'RedCarpet', variant: 'SideTopRight' } },
      { tileId: 'F3', floor: { set: 'RedCarpet', variant: 'CornerLeft' } },
      { tileId: 'F4', floor: { set: 'RedCarpet', variant: 'SideBottomRight' } },
      { tileId: 'F5', floor: { set: 'RedCarpet', variant: 'SideBottomRight' } },
      { tileId: 'F6', floor: { set: 'RedCarpet', variant: 'CornerBottom' } },
    ],
    walls: [
      // Mix wall materials
      { wallId: 'LeftBack1', wall: { set: 'Brown1BrickWall', variant: 'Sides2' } },
      { wallId: 'LeftBack2', wall: { set: 'Brown1BrickWall', variant: 'Sides2' } },
      { wallId: 'RightBack1', wall: { set: 'DarkWoodPaneling', variant: 'Sides2' } },
      { wallId: 'RightBack2', wall: { set: 'DarkWoodPaneling', variant: 'Sides2' } },
    ],
    furniture: []
  }
};

// Elegant room with wood floors and white walls
export const elegantRoom: RoomTemplate = {
  id: 'elegant-room',
  name: 'Elegant Room',
  description: 'An elegant room with wood flooring and white brick walls',
  layout: {
    name: 'Elegant Room',
    dimensions: { width: 7, height: 5 },
    defaultFloor: {
      set: 'Brown1WoodFloor',
      variant: 'Sides2'
    },
    defaultWall: {
      set: 'WhiteBrickWall',
      variant: 'Sides1'
    },
    floors: [],
    walls: [],
    furniture: []
  }
};

// Small cozy room
export const cozyRoom: RoomTemplate = {
  id: 'cozy-room',
  name: 'Cozy Room',
  description: 'A small, cozy room perfect for intimate gatherings',
  layout: {
    name: 'Cozy Room',
    dimensions: { width: 4, height: 4 },
    defaultFloor: {
      set: 'YellowCarpet',
      variant: 'Sides2'
    },
    defaultWall: {
      set: 'Brown1OldWall1',
      variant: 'Sides1'
    },
    floors: [],
    walls: [],
    furniture: []
  }
};

// Export all templates
export const ROOM_TEMPLATES: RoomTemplate[] = [
  basicBlueRoom,
  checkeredWoodRoom,
  mixedMaterialsRoom,
  elegantRoom,
  cozyRoom
];

// Helper function to get template by ID
export function getRoomTemplate(id: string): RoomTemplate | undefined {
  return ROOM_TEMPLATES.find(template => template.id === id);
}

// Helper function to create a custom room configuration
export function createCustomRoom(
  name: string,
  dimensions: { width: number; height: number },
  floorSet: string,
  wallSet: string
): RoomLayoutConfig {
  return {
    name,
    dimensions,
    defaultFloor: {
      set: floorSet,
      variant: 'Sides2'
    },
    defaultWall: {
      set: wallSet,
      variant: 'Sides1'
    },
    floors: [],
    walls: [],
    furniture: []
  };
}