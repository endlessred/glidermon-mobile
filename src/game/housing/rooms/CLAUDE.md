# Room Configuration System

This directory contains JSON configuration files that define room layouts for the isometric housing system. Each JSON file describes a complete room with floors, walls, and furniture.

## Room JSON Structure

```json
{
  "name": "Display name for the room",
  "dimensions": {
    "width": 4,
    "height": 4
  },
  "defaultFloor": {
    "set": "FloorSetName",
    "variant": "FloorVariantName"
  },
  "defaultWall": {
    "set": "WallSetName",
    "variant": "WallVariantName"
  },
  "floors": [
    {
      "tileId": "B2",
      "floor": {
        "set": "FloorSetName",
        "variant": "FloorVariantName"
      }
    }
  ],
  "walls": [
    {
      "wallId": "LeftBack5",
      "wall": {
        "set": "WallSetName",
        "variant": "WallVariantName"
      }
    }
  ],
  "furniture": [
    {
      "tileId": "C3",
      "furniture": {
        "asset": "FurnitureAssetName"
      }
    }
  ]
}
```

## Room Dimensions

Rooms are defined on an 8x8 grid (A1-H8) but you can create smaller rooms by specifying dimensions:

- **3x3 room**: Uses tiles A1-C3
- **4x4 room**: Uses tiles A1-D4
- **6x6 room**: Uses tiles A1-F6
- **8x8 room**: Uses the full A1-H8 grid

Tiles outside the specified dimensions are automatically hidden.

## Tile Naming Convention

Tiles are named using Excel-style coordinates:
- **Rows**: A (top) through H (bottom)
- **Columns**: 1 (left) through 8 (right)

Examples: `A1` (top-left), `D4` (middle), `H8` (bottom-right)

## Floor Configuration

### Available Floor Sets
- `YellowCarpet`
- `RedCarpet`
- `StripedFloor2`
- (See `RoomConfig.ts` for complete list)

### Floor Variants (Isometric Perspective)
The system automatically determines appropriate variants based on tile position, but you can override:

- **Corners**: `CornerTop`, `CornerLeft`, `CornerRight`, `CornerBottom`
- **Edges**: `SideTopLeft`, `SideTopRight`, `SideBottomLeft`, `SideBottomRight`
- **Interior**: `Sides2` (no outlines)

### Default vs Specific Floors
- **defaultFloor**: Applied to all tiles in the room dimensions
- **floors array**: Overrides specific tiles with different floor types

Example:
```json
{
  "defaultFloor": { "set": "YellowCarpet", "variant": "Sides2" },
  "floors": [
    { "tileId": "B2", "floor": { "set": "RedCarpet", "variant": "Sides2" } }
  ]
}
```
Result: Entire room is YellowCarpet except B2 which is RedCarpet.

## Wall Configuration

### Available Wall Sets
- `Brown1WoodPaneling`
- (See `RoomConfig.ts` for complete list)

### Wall Slots and Naming
Walls use a different naming convention based on position:
- **LeftBack1-8**: Left wall (5,6,7,8 visible for 4x4 room)
- **RightBack1-8**: Right wall (1,2,3,4 visible for 4x4 room)

### Wall Variants
- **EndWallTop**: Top end of wall with outline
- **EndWallBottom**: Bottom end of wall with outline
- **Sides2**: Middle sections with no outlines

### Automatic Wall Variants
The system automatically applies correct variants:
- **LeftBack5**: `EndWallBottom`, **LeftBack6-7**: `Sides2`, **LeftBack8**: `EndWallTop`
- **RightBack1**: `EndWallTop` (flipped), **RightBack2-3**: `Sides2`, **RightBack4**: `EndWallBottom` (flipped)

### Default vs Specific Walls
- **defaultWall**: Applied to all visible wall slots
- **walls array**: Override specific wall slots (rarely needed due to auto-variants)

## Furniture Configuration

```json
{
  "furniture": [
    {
      "tileId": "C3",
      "furniture": {
        "asset": "ChairWood"
      }
    }
  ]
}
```

Furniture is placed on specific floor tiles using their tile IDs.

## Creating a New Room

1. **Create JSON file** in this directory (e.g., `myroom.json`)

2. **Add to RoomLoader.ts**:
   ```typescript
   case 'myroom':
     return require('./myroom.json');
   ```

3. **Use in component**:
   ```tsx
   <IsometricHousingThreeJS roomConfig="myroom" />
   ```

## Example Configurations

### Minimal 3x3 Room
```json
{
  "name": "Simple 3x3",
  "dimensions": { "width": 3, "height": 3 },
  "defaultFloor": { "set": "StripedFloor2", "variant": "Sides2" },
  "defaultWall": { "set": "Brown1WoodPaneling", "variant": "Sides1" },
  "floors": [],
  "walls": [],
  "furniture": []
}
```

### 4x4 Room with Pattern
```json
{
  "name": "Patterned 4x4",
  "dimensions": { "width": 4, "height": 4 },
  "defaultFloor": { "set": "YellowCarpet", "variant": "Sides2" },
  "defaultWall": { "set": "Brown1WoodPaneling", "variant": "Sides1" },
  "floors": [
    { "tileId": "B2", "floor": { "set": "RedCarpet", "variant": "Sides2" } },
    { "tileId": "C2", "floor": { "set": "RedCarpet", "variant": "Sides2" } },
    { "tileId": "B3", "floor": { "set": "RedCarpet", "variant": "Sides2" } },
    { "tileId": "C3", "floor": { "set": "RedCarpet", "variant": "Sides2" } }
  ],
  "walls": [],
  "furniture": []
}
```

## Tips

- **Start simple**: Begin with defaultFloor and defaultWall, add specific overrides later
- **Test dimensions**: Try 3x3 or 4x4 first before creating larger rooms
- **Variants are automatic**: The system handles floor and wall variants based on position
- **Visual feedback**: Check logs for tile placement confirmation
- **Fallback handling**: Invalid configurations fall back to `cozy4x4.json`

## Troubleshooting

- **Room not loading**: Check JSON syntax and ensure it's added to RoomLoader.ts
- **Missing tiles**: Verify tile IDs match the coordinate system (A1-H8)
- **Wrong variants**: Let the system auto-determine variants rather than specifying them
- **Walls not showing**: Ensure room dimensions allow for wall visibility (walls 5-8 for left, 1-4 for right in 4x4)