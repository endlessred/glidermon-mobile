// Main housing system exports
export { default as IsometricHousing } from './view/IsometricHousing';
export { default as IsometricHousingThreeJS } from './view/IsometricHousingThreeJS';

// Core types and utilities
export * from './types';
export * from './coords';

// Templates
export { roomSmallTemplate } from './templates/room_s';

// Asset loading
export { DEFAULT_HOUSING_ROOM_ID, loadHousingTextureAtlas } from './assets/textureAtlas';
export type { HousingRoomId, LoadHousingTextureAtlasOptions, TextureAtlas } from './assets/textureAtlas';

// Room building system
export { loadRoomSkeleton } from './rooms/RoomLoader';
export type { LoadedRoom } from './rooms/RoomLoader';

// Room configuration types
export type {
  RoomTileConfig,
  RoomWallConfig,
  RoomFurnitureConfig,
  RoomLayoutConfig,
  RoomTemplate,
  FloorSetName,
  WallSetName,
  FloorVariant,
  WallVariant
} from './types/RoomConfig';

export {
  AVAILABLE_FLOOR_SETS,
  AVAILABLE_WALL_SETS,
  FLOOR_VARIANTS,
  WALL_VARIANTS
} from './types/RoomConfig';

// Room builder functionality
export { RoomBuilder, useRoomBuilder } from './builders';
export type { UseRoomBuilderReturn } from './builders';

// Room templates
export {
  ROOM_TEMPLATES,
  getRoomTemplate,
  createCustomRoom,
  basicBlueRoom,
  checkeredWoodRoom,
  mixedMaterialsRoom,
  elegantRoom,
  cozyRoom
} from './templates';

// Demo component (commented out due to import issues)
// export { RoomBuilderDemo } from './demo/RoomBuilderDemo';
