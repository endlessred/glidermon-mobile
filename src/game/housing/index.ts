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
