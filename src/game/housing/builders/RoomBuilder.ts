import { Skeleton, Slot, Physics } from '@esotericsoftware/spine-core';
import { RoomLayoutConfig, AVAILABLE_FLOOR_SETS, AVAILABLE_WALL_SETS, FloorSetName, WallSetName, FloorVariant, WallVariant } from '../types/RoomConfig';

export class RoomBuilder {
  private skeleton: Skeleton;

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;
  }

  applyRoomLayout(config: RoomLayoutConfig): void {
    if (__DEV__) {
      console.log('RoomBuilder: Applying room layout', config.name);
    }

    // Apply floor configurations
    this.applyFloorLayout(config);

    // Apply wall configurations
    this.applyWallLayout(config);

    // Apply furniture configurations
    if (config.furniture) {
      this.applyFurnitureLayout(config);
    }

    // Update skeleton to reflect changes
    const physicsUpdate = (Physics as any)?.update;
    this.skeleton.updateWorldTransform(typeof physicsUpdate === "function" ? physicsUpdate : undefined);

    if (__DEV__) {
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
        console.log(`RoomBuilder: Furniture ${furnitureConfig.furniture.asset} at ${furnitureConfig.tileId}`);
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
    // Apply to all wall slots
    const wallSlots = this.getWallSlots();
    wallSlots.forEach(wallId => {
      this.setWallSlot(wallId, defaultWall.set as WallSetName, defaultWall.variant as WallVariant);
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
        console.log(`RoomBuilder: Set ${slot.data.name} to ${attachmentPath}`);
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

    // Corner tiles (dark outlines on outside edges of isometric diamond)
    if (isTopRow && isLeftCol) return 'CornerTop';      // Top corner of diamond
    if (isTopRow && isRightCol) return 'CornerRight';   // Right corner of diamond
    if (isBottomRow && isRightCol) return 'CornerBottom'; // Bottom corner of diamond
    if (isBottomRow && isLeftCol) return 'CornerLeft';  // Left corner of diamond

    // Edge tiles (dark outlines on the specified sides)
    if (isTopRow) return 'SideTopLeft';     // Top edge - outline on top-left
    if (isRightCol) return 'SideTopRight'; // Right edge - outline on top-right
    if (isBottomRow) return 'SideBottomRight'; // Bottom edge - outline on bottom-right
    if (isLeftCol) return 'SideBottomLeft'; // Left edge - outline on bottom-left

    // Interior tiles (completely surrounded by other tiles)
    return 'Sides2'; // No outlines - interior tile
  }

  private getWallSlots(): string[] {
    // Return common wall slot IDs - this could be made configurable
    return [
      'LeftBack1', 'LeftBack2', 'LeftBack3', 'LeftBack4',
      'RightBack1', 'RightBack2', 'RightBack3', 'RightBack4',
      'LeftFront1', 'LeftFront2', 'LeftFront3', 'LeftFront4',
      'RightFront1', 'RightFront2', 'RightFront3', 'RightFront4'
    ];
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