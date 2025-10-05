import { Vec2 } from "./coords";

export type IsoSlotType = "sofa"|"chair"|"table"|"rug"|"wall_art"|"lamp"|"plant"|"door";

export type Slot = {
  id: string;
  type: IsoSlotType;
  tile: Vec2;                    // base tile (feet point)
  facing?: "left"|"right";
  charAnchor?: { dx:number; dy:number };   // fine-tune sit/use alignment (px)
  frontMask?: string;            // optional mask sprite key for occlusion
};

export type ApartmentTemplate = {
  id: "room_s"|"room_m"|"room_l";
  cols: number;
  rows: number;
  floor: number[][];             // tile IDs (0 = empty, 1 = wood floor)
  wallsBack: number[][];         // back wall tile IDs
  wallsFront: number[][];        // front wall tile IDs (should be empty for visibility)
  slots: Slot[];
  staticColliders?: Vec2[];      // blocked tiles
};

export type ItemDef = {
  id: string;
  slotType: IsoSlotType;
  atlasKey: string;              // texture key
  w: number;
  h: number;          // draw size in px
  footprint?: Vec2[];            // tiles occupied wrt slot.tile
  seatPoint?: { dx:number; dy:number }; // pelvis landing offset
  frontMaskAtlasKey?: string;
};

export type EquippedItem = {
  slotId: string;
  itemId: string;
};

export type ApartmentState = {
  templateId: ApartmentTemplate["id"];
  equipped: EquippedItem[];
  inventory: string[];
};

export enum FloorTileType {
  Empty = 0,
  WoodFloor = 1,
  Carpet = 2,
  CheckeredFloor1 = 3,
  CheckeredFloor2 = 4,
  Pattern1 = 5,
  Pattern2 = 6,
  Pattern3 = 7,
  StripedFloor1 = 8,
  StripedFloor2 = 9,
  BlankFloor = 10
}

export enum WallTileType {
  Empty = 0,
  WoodWall = 1,
  BlankWall = 2,
  BrickWall = 3,
  StoneWall = 4,
  PatternWall1 = 5,
  PatternWall2 = 6,
  OldWall1 = 7,
  OldWall2 = 8
}