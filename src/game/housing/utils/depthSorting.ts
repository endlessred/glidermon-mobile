/**
 * Depth sorting utilities for isometric housing system
 * Handles furniture vs character depth ordering based on grid positions
 */

export interface GridPosition {
  row: number;  // 0-7 (A=0, B=1, etc.)
  col: number;  // 0-7 (1-8 converted to 0-based)
}

/**
 * Parse tile ID (like "C2") into grid position
 */
export function parseTileId(tileId: string): GridPosition | null {
  if (!tileId || tileId.length < 2) return null;

  const rowChar = tileId.charAt(0).toUpperCase();
  const colStr = tileId.slice(1);

  // Convert row letter to number (A=0, B=1, etc.)
  const row = rowChar.charCodeAt(0) - 65; // 'A'.charCodeAt(0) = 65
  const col = parseInt(colStr, 10) - 1; // Convert 1-based to 0-based

  if (row < 0 || row > 7 || col < 0 || col > 7 || isNaN(col)) {
    return null;
  }

  return { row, col };
}

/**
 * Calculate depth score for isometric sorting
 * Higher score = further back = renders first (behind)
 * Lower score = further front = renders later (in front)
 */
export function calculateDepthScore(gridPos: GridPosition): number {
  // In isometric view, objects that are:
  // - Higher row number (further down in grid) = visually in front
  // - Lower row number (closer to top) = visually behind
  //
  // We want LOWER scores for things in front, so invert the row
  return -gridPos.row * 1000 - gridPos.col;
}

/**
 * Compare two grid positions for depth sorting
 * Returns negative if pos1 should render behind pos2
 * Returns positive if pos1 should render in front of pos2
 */
export function compareDepth(pos1: GridPosition, pos2: GridPosition): number {
  const score1 = calculateDepthScore(pos1);
  const score2 = calculateDepthScore(pos2);
  return score2 - score1; // Higher score renders first (behind)
}

/**
 * Determine if furniture should render behind character
 */
export function shouldFurnitureRenderBehindCharacter(
  furnitureTileId: string,
  characterGridRow: number,
  characterGridCol: number
): boolean {
  const furniturePos = parseTileId(furnitureTileId);
  if (!furniturePos) return false; // Default to in front if we can't parse

  const characterPos: GridPosition = {
    row: characterGridRow,
    col: characterGridCol
  };

  // If furniture is in a "back" row (lower row number), it should render behind character
  return compareDepth(furniturePos, characterPos) > 0;
}

/**
 * Calculate appropriate render order base for furniture relative to character
 */
export function calculateFurnitureRenderOrderBase(
  furnitureTileId: string,
  characterGridRow: number,
  characterGridCol: number,
  characterRenderOrderBase: number = 2000,
  furnitureLayerBase: number = 2500,
  furnitureLayer: 'under' | 'mid' | 'over' = 'mid'
): number {
  // Special handling for "under" layer - always renders behind everything
  if (furnitureLayer === 'under') {
    return 1000; // Well below character and other furniture
  }

  // For "over" layer - always renders on top of everything
  if (furnitureLayer === 'over') {
    return 3500; // Well above character and other furniture
  }

  // For "mid" layer - use depth sorting based on position
  const shouldRenderBehind = shouldFurnitureRenderBehindCharacter(
    furnitureTileId,
    characterGridRow,
    characterGridCol
  );

  if (shouldRenderBehind) {
    // Render behind character but above room tiles and "under" furniture
    return characterRenderOrderBase - 500; // 1500
  } else {
    // Render in front of character but below "over" furniture
    return furnitureLayerBase; // 2500+
  }
}