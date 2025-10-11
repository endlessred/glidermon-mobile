import { Skeleton, Slot, Physics } from '@esotericsoftware/spine-core';
import { RoomLayoutConfig, AVAILABLE_FLOOR_SETS, AVAILABLE_WALL_SETS, FloorSetName, WallSetName, FloorVariant, WallVariant } from '../types/RoomConfig';

export class RoomBuilder {
  private skeleton: Skeleton;

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;
  }

  applyRoomLayout(config: RoomLayoutConfig): void {
    if (__DEV__ && false) {
      console.log('RoomBuilder: Applying room layout', config.name);
    }

    // First, hide all slots outside the room dimensions
    this.hideOutsideSlots(config.dimensions);

    // Apply floor configurations
    this.applyFloorLayout(config);

    // Apply wall configurations (but only for walls within room dimensions)
    this.applyWallLayout(config);

    // Hide wall slots that are outside the room dimensions
    this.hideWallsOutsideRoom(config.dimensions);

    // Apply furniture configurations
    if (config.furniture) {
      this.applyFurnitureLayout(config);
    }

    // Update skeleton to reflect changes
    const PHYSICS = (Physics as any);
    this.skeleton.updateWorldTransform(PHYSICS.update);

    if (__DEV__ && false) {
      console.log('RoomBuilder: Room layout applied successfully');
    }
  }

  private applyFloorLayout(config: RoomLayoutConfig): void {
    const { floors, defaultFloor, dimensions } = config;

    // First, apply default floor to all tiles if specified
    if (defaultFloor) {
      this.applyDefaultFloor(defaultFloor, dimensions);
    }

    // Then apply specific floor configurations
    floors.forEach(floorConfig => {
      if (floorConfig.floor) {
        this.setFloorTile(
          floorConfig.tileId,
          floorConfig.floor.set as FloorSetName,
          floorConfig.floor.variant as FloorVariant
        );
      }
    });
  }

  private applyWallLayout(config: RoomLayoutConfig): void {
    const { walls, defaultWall } = config;

    // Apply default wall to all wall slots if specified
    if (defaultWall) {
      this.applyDefaultWall(defaultWall);
    }

    // Apply specific wall configurations
    walls.forEach(wallConfig => {
      if (wallConfig.wall) {
        this.setWallSlot(
          wallConfig.wallId,
          wallConfig.wall.set as WallSetName,
          wallConfig.wall.variant as WallVariant
        );
      }
    });
  }

  private applyFurnitureLayout(config: RoomLayoutConfig): void {
    // Furniture implementation would go here
    // For now, just log the furniture items
    config.furniture?.forEach(furnitureConfig => {
      if (__DEV__) {
        // console.log(`RoomBuilder: Furniture ${furnitureConfig.furniture.asset} at ${furnitureConfig.tileId}`);
      }
    });
  }

  private applyDefaultFloor(defaultFloor: { set: string; variant: string }, dimensions: { width: number; height: number }): void {
    // Generate all tile IDs for the room dimensions
    const tileIds = this.generateTileIds(dimensions.width, dimensions.height);

    tileIds.forEach(tileId => {
      const variant = this.determineFloorVariant(tileId, dimensions);
      this.setFloorTile(tileId, defaultFloor.set as FloorSetName, variant);
    });
  }

  private applyDefaultWall(defaultWall: { set: string; variant: string }): void {
    // Apply to all wall slots with intelligent variant selection
    const wallSlots = this.getWallSlots();
    wallSlots.forEach(wallId => {
      const variant = this.determineWallVariant(wallId);
      this.setWallSlot(wallId, defaultWall.set as WallSetName, variant);
    });
  }

  private setFloorTile(tileId: string, floorSet: FloorSetName, variant: FloorVariant): void {
    const slot = this.skeleton.findSlot(tileId); // Slots are named directly as tile IDs (A1, B3, etc.)
    if (!slot) {
      if (__DEV__) {
        console.warn(`RoomBuilder: Floor slot not found for tile ${tileId}`);
      }
      return;
    }

    const attachmentPath = `ApartmentFloor/${floorSet}/${variant}`; // Use ApartmentFloor path
    this.setSlotAttachment(slot, attachmentPath);
  }

  private setWallSlot(wallId: string, wallSet: WallSetName, variant: WallVariant): void {
    const slot = this.skeleton.findSlot(wallId);
    if (!slot) {
      if (__DEV__) {
        console.warn(`RoomBuilder: Wall slot not found for ${wallId}`);
      }
      return;
    }

    const attachmentPath = `ApartmentWalls/${wallSet}/${variant}`; // Use ApartmentWalls path
    this.setSlotAttachment(slot, attachmentPath);
  }

  private setSlotAttachment(slot: Slot, attachmentPath: string): void {
    // Find the attachment by path in the skeleton data
    const skin = this.skeleton.data.defaultSkin || this.skeleton.data.skins[0];
    if (!skin) {
      console.error('RoomBuilder: No skin found in skeleton');
      return;
    }

    // Look for attachment with matching path
    const attachments = (skin as any).attachments;
    if (!attachments || !attachments[slot.data.index]) {
      if (__DEV__) {
        console.warn(`RoomBuilder: No attachments found for slot ${slot.data.name}`);
      }
      return;
    }

    const slotAttachments = attachments[slot.data.index];

    // Find attachment with matching path
    let targetAttachment = null;
    for (const [name, attachment] of Object.entries(slotAttachments)) {
      if ((attachment as any).path === attachmentPath) {
        targetAttachment = attachment;
        break;
      }
    }

    if (targetAttachment) {
      slot.setAttachment(targetAttachment as any);
      if (__DEV__) {
        // console.log(`RoomBuilder: Set ${slot.data.name} to ${attachmentPath}`);
      }
    } else {
      if (__DEV__) {
        console.warn(`RoomBuilder: Attachment not found for path ${attachmentPath} in slot ${slot.data.name}`);
      }
    }
  }

  private generateTileIds(width: number, height: number): string[] {
    const tileIds: string[] = [];
    const rows = 'ABCDEFGH'.slice(0, height);

    for (let row = 0; row < height; row++) {
      for (let col = 1; col <= width; col++) {
        tileIds.push(`${rows[row]}${col}`);
      }
    }

    return tileIds;
  }

  private determineFloorVariant(tileId: string, dimensions: { width: number; height: number }): FloorVariant {
    const row = tileId.charAt(0);
    const col = parseInt(tileId.slice(1));
    const maxRow = String.fromCharCode(65 + dimensions.height - 1); // A + height - 1
    const maxCol = dimensions.width;

    // Determine if tile is on edges/corners
    const isTopRow = row === 'A';
    const isBottomRow = row === maxRow;
    const isLeftCol = col === 1;
    const isRightCol = col === maxCol;

    // Corner tiles for isometric diamond view
    if (isTopRow && isLeftCol) return 'CornerTop';        // A1 - Top corner of diamond
    if (isTopRow && isRightCol) return 'CornerLeft';      // A4 - Left corner of diamond (from our view)
    if (isBottomRow && isRightCol) return 'CornerBottom'; // D4 - Bottom corner of diamond
    if (isBottomRow && isLeftCol) return 'CornerRight';   // D1 - Right corner of diamond (from our view)

    // Edge tiles for isometric diamond view
    if (isTopRow) return 'SideTopLeft';        // A2, A3 - Top-left edge
    if (isRightCol) return 'SideBottomLeft';   // B4, C4 - Left edge (from our view)
    if (isBottomRow) return 'SideBottomRight'; // D2, D3 - Bottom-right edge
    if (isLeftCol) return 'SideTopRight';      // B1, C1 - Right edge (from our view)

    // Interior tiles (completely surrounded by other tiles)
    return 'Sides2'; // No outlines - interior tile
  }

  private determineWallVariant(wallId: string): WallVariant {
    const match = wallId.match(/(\w+)(\d+)$/);
    if (!match) {
      return 'Sides2'; // Fallback
    }

    const wallType = match[1]; // e.g., "LeftBack", "RightBack"
    const wallIndex = parseInt(match[2]); // 1-8

    if (wallType === 'LeftBack') {
      // LeftBack5,6,7,8 for 4x4 room (from bottom to top in isometric view)
      switch (wallIndex) {
        case 5: return 'EndWallBottom'; // Bottom end
        case 6: return 'Sides2';        // Middle (no outlines)
        case 7: return 'Sides2';        // Middle (no outlines)
        case 8: return 'EndWallTop';    // Top end
        default: return 'Sides2';
      }
    } else if (wallType === 'RightBack') {
      // RightBack1,2,3,4 for 4x4 room (flipped horizontally, so 1 is top, 4 is bottom)
      switch (wallIndex) {
        case 1: return 'EndWallTop';    // Top end (flipped)
        case 2: return 'Sides2';        // Middle (no outlines)
        case 3: return 'Sides2';        // Middle (no outlines)
        case 4: return 'EndWallBottom'; // Bottom end (flipped)
        default: return 'Sides2';
      }
    }

    return 'Sides2'; // Fallback for other wall types
  }

  private hideOutsideSlots(dimensions: { width: number; height: number }): void {
    // Hide all floor and wall slots outside the specified dimensions
    const maxRow = String.fromCharCode(65 + dimensions.height - 1); // A + height - 1
    const maxCol = dimensions.width;

    // Generate all possible tile IDs (A1-H8) and hide those outside our dimensions
    for (let rowIndex = 0; rowIndex < 8; rowIndex++) {
      const row = String.fromCharCode(65 + rowIndex); // A, B, C, D, E, F, G, H
      for (let col = 1; col <= 8; col++) {
        const tileId = `${row}${col}`;

        // If this tile is outside our room dimensions, hide it
        if (rowIndex >= dimensions.height || col > dimensions.width) {
          const slot = this.skeleton.findSlot(tileId);
          if (slot) {
            const beforeAttachment = slot.getAttachment();
            // Multiple approaches to completely hide the slot
            slot.setAttachment(null); // Remove any attachment

            // Safely set transparency
            try {
              if ((slot as any).color) {
                (slot as any).color.a = 0; // Make it transparent
              }
              if ((slot as any).darkColor) {
                (slot as any).darkColor.a = 0; // Also hide dark color
              }
            } catch (error) {
              if (__DEV__) {
                console.warn(`Failed to set slot transparency for ${tileId}:`, error);
              }
            }

            const afterAttachment = slot.getAttachment();
            if (__DEV__ && false) {
              console.log(`RoomBuilder: Hiding slot ${tileId} (outside ${dimensions.width}x${dimensions.height})`, {
                hadAttachment: !!beforeAttachment,
                beforeName: beforeAttachment?.name || 'none',
                afterAttachment: !!afterAttachment,
                afterName: afterAttachment?.name || 'none',
                slotVisible: (slot as any).color?.a !== 0
              });
            }
          }
        }
      }
    }

  }

  private hideWallsOutsideRoom(dimensions: { width: number; height: number }): void {
    // Hide wall slots that don't correspond to the actual room dimensions
    // Wall naming convention: walls go from left to right
    // - LeftBack: higher numbers (5,6,7,8) are on the left
    // - RightBack: lower numbers (1,2,3,4) are on the right
    const wallSlots = this.getWallSlots();
    const roomSize = dimensions.width; // Assuming square rooms for now

    wallSlots.forEach(wallId => {
      let shouldHide = false;

      const match = wallId.match(/(\w+)(\d+)$/);
      if (match) {
        const wallType = match[1]; // e.g., "LeftBack", "RightBack"
        const wallIndex = parseInt(match[2]); // 1-8

        if (wallType === 'LeftBack') {
          // For LeftBack walls, show the rightmost walls for the room size
          // For 4x4 room: show LeftBack5, LeftBack6, LeftBack7, LeftBack8
          const minLeftIndex = 8 - roomSize + 1; // For 4x4: 8-4+1 = 5
          if (wallIndex < minLeftIndex) {
            shouldHide = true;
          }
        } else if (wallType === 'RightBack') {
          // For RightBack walls, show the leftmost walls for the room size
          // For 4x4 room: show RightBack1, RightBack2, RightBack3, RightBack4
          if (wallIndex > roomSize) {
            shouldHide = true;
          }
        }
      }

      if (shouldHide) {
        const slot = this.skeleton.findSlot(wallId);
        if (slot) {
          const beforeAttachment = slot.getAttachment();
          slot.setAttachment(null);

          // Safely set transparency
          try {
            if ((slot as any).color) {
              (slot as any).color.a = 0;
            }
            if ((slot as any).darkColor) {
              (slot as any).darkColor.a = 0;
            }
          } catch (error) {
            if (__DEV__) {
              console.warn(`Failed to set wall slot transparency for ${wallId}:`, error);
            }
          }

          if (__DEV__ && false) {
            console.log(`RoomBuilder: Hiding wall slot ${wallId} (outside ${dimensions.width}x${dimensions.height})`, {
              hadAttachment: !!beforeAttachment,
              beforeName: beforeAttachment?.name || 'none'
            });
          }
        }
      }
    });
  }

  private getWallSlots(): string[] {
    // Dynamically find all wall slots in the skeleton
    const wallSlots: string[] = [];

    for (let i = 0; i < this.skeleton.slots.length; i++) {
      const slot = this.skeleton.slots[i];
      const slotName = slot.data.name;

      // Check if this slot name looks like a wall slot
      // Wall slots typically contain "Wall", "Back", "Front", "Left", "Right", etc.
      if (slotName && (
        slotName.includes('Wall') ||
        slotName.includes('Back') ||
        slotName.includes('Front') ||
        slotName.includes('Left') ||
        slotName.includes('Right')
      )) {
        wallSlots.push(slotName);
      }
    }

    if (__DEV__) {
      // console.log('RoomBuilder: Found wall slots:', wallSlots);
    }

    return wallSlots;
  }

  // Utility method to validate room configuration
  static validateRoomConfig(config: RoomLayoutConfig): boolean {
    // Check if floor sets are valid
    for (const floor of config.floors) {
      if (floor.floor && !AVAILABLE_FLOOR_SETS.includes(floor.floor.set as any)) {
        console.error(`Invalid floor set: ${floor.floor.set}`);
        return false;
      }
    }

    // Check if wall sets are valid
    for (const wall of config.walls) {
      if (wall.wall && !AVAILABLE_WALL_SETS.includes(wall.wall.set as any)) {
        console.error(`Invalid wall set: ${wall.wall.set}`);
        return false;
      }
    }

    return true;
  }
}