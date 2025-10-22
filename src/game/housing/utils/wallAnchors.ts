/**
 * Wall anchor system for placing wall-mounted furniture and art
 */

export interface WallAnchor {
  id: string;
  wallType: 'LeftBack' | 'RightBack';
  wallNumber: number; // 1-8
  // Position where wall furniture should be placed (center of wall segment)
  spineX: number;
  spineY: number;
  sceneX: number;
  sceneY: number;
  // Whether this wall supports flipping (right walls get flipped)
  needsFlip: boolean;
}

export type WallAnchorMap = Map<string, WallAnchor>;

/**
 * Generate wall anchor positions based on room skeleton wall coordinates
 * This data comes from the Room skeleton.json wall attachment positions
 */
export function generateWallAnchors(): WallAnchorMap {
  const wallAnchors = new Map<string, WallAnchor>();

  // LeftBack wall coordinates (calculated from Room skeleton.json bone hierarchy)
  // Base: Attachments (-29.03, 3.07) + BackWallLeft1 (-1587.77, 981.83) = (-1616.8, 984.9)
  // Then each subsequent wall adds relative offsets
  const leftBackWalls = [
    { num: 1, x: -1616.8, y: 984.9 },        // BackWallLeft1 base position
    { num: 2, x: -1415.96, y: 1097.79 },     // + (200.84, 112.89)
    { num: 3, x: -1218.58, y: 1207.91 },     // + (197.38, 110.12)
    { num: 4, x: -1019.82, y: 1323.57 },     // + (198.76, 115.66)
    { num: 5, x: -820.95, y: 1441.4 },       // + (198.87, 117.83)
    { num: 6, x: -623.25, y: 1550.38 },      // + (197.7, 108.98)
    { num: 7, x: -422.06, y: 1666.34 },      // + (201.19, 115.96)
    { num: 8, x: -220.87, y: 1780.21 }       // + (201.19, 113.87)
  ];

  // RightBack wall coordinates (calculated from Room skeleton.json bone hierarchy)
  // Base: Attachments (-29.03, 3.07) + BackWallRight1 (5.59, 1892.44) = (-23.44, 1895.51)
  const rightBackWalls = [
    { num: 1, x: -23.44, y: 1895.51 },       // BackWallRight1 base position
    { num: 2, x: 173.1, y: 1780.13 },        // + (196.54, -115.38)
    { num: 3, x: 370.33, y: 1666.53 },       // + (197.23, -113.6)
    { num: 4, x: 573.06, y: 1552.25 },       // + (202.73, -114.28)
    { num: 5, x: 775.34, y: 1434.18 },       // + (202.28, -118.07)
    { num: 6, x: 973.72, y: 1322.26 },       // + (198.38, -111.92)
    { num: 7, x: 1171.48, y: 1210.28 },      // + (197.76, -111.98)
    { num: 8, x: 1370.55, y: 1095.03 }       // + (199.07, -115.25)
  ];

  // Create anchors for LeftBack walls
  leftBackWalls.forEach(wall => {
    const id = `LeftBack${wall.num}`;
    wallAnchors.set(id, {
      id,
      wallType: 'LeftBack',
      wallNumber: wall.num,
      spineX: wall.x,
      spineY: wall.y,
      sceneX: wall.x, // For now, same as spine coords
      sceneY: wall.y,
      needsFlip: false // LeftBack walls don't need flipping
    });
  });

  // Create anchors for RightBack walls
  rightBackWalls.forEach(wall => {
    const id = `RightBack${wall.num}`;
    wallAnchors.set(id, {
      id,
      wallType: 'RightBack',
      wallNumber: wall.num,
      spineX: wall.x,
      spineY: wall.y,
      sceneX: wall.x, // For now, same as spine coords
      sceneY: wall.y,
      needsFlip: true // RightBack walls need horizontal flipping
    });
  });

  return wallAnchors;
}

/**
 * Get visible wall segments for a given room size
 */
export function getVisibleWallsForRoom(roomWidth: number, roomHeight: number): string[] {
  const visibleWalls: string[] = [];

  // For LeftBack: show the rightmost walls for the room size
  // For 4x4 room: show LeftBack5, LeftBack6, LeftBack7, LeftBack8
  const minLeftIndex = 8 - roomWidth + 1;
  for (let i = minLeftIndex; i <= 8; i++) {
    visibleWalls.push(`LeftBack${i}`);
  }

  // For RightBack: show the leftmost walls for the room size
  // For 4x4 room: show RightBack1, RightBack2, RightBack3, RightBack4
  for (let i = 1; i <= roomWidth; i++) {
    visibleWalls.push(`RightBack${i}`);
  }

  return visibleWalls;
}

/**
 * Check if a wall ID is valid for the given room dimensions
 */
export function isValidWallForRoom(wallId: string, roomWidth: number, roomHeight: number): boolean {
  const visibleWalls = getVisibleWallsForRoom(roomWidth, roomHeight);
  return visibleWalls.includes(wallId);
}

/**
 * Get the center position of a wall segment for furniture placement
 */
export function getWallCenterForFurniture(wallAnchor: WallAnchor): { x: number; y: number } {
  // Wall furniture is positioned at the center of the wall segment
  // Adjust Y to be at the "floor level" where furniture would sit
  const furnitureOffsetY = -50; // Offset from wall attachment point to floor level

  return {
    x: wallAnchor.spineX,
    y: wallAnchor.spineY + furnitureOffsetY
  };
}

/**
 * Get the position for wall art (mounted higher on the wall)
 */
export function getWallArtPosition(wallAnchor: WallAnchor): { x: number; y: number } {
  // Wall art is positioned higher up on the wall
  const artOffsetY = 100; // Offset upward from wall attachment point

  return {
    x: wallAnchor.spineX,
    y: wallAnchor.spineY + artOffsetY
  };
}