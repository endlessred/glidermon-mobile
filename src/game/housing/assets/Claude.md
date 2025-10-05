How to use analyze_iso_asset.py

CLI
# Basic (auto)
python analyze_iso_asset.py my_asset.png

# Floor tile mode (2:1 isometric top)
python analyze_iso_asset.py floor.png --mode floor --alpha-thresh 0

# Wall tile mode with explicit skirt override (if you know it)
python analyze_iso_asset.py wall.png --mode wall --override-skirt 16

# JSON output (for tooling)
python analyze_iso_asset.py *.png --mode floor --json


Tip: use --alpha-thresh 0 for anti-aliased edges so the bbox matches what you painted.

Your two files (measured)

Using the bbox method and the known 2:1 diamond for the floor:

Floor tile (/mnt/data/eeebf88b-d299-4c4b-bfe5-de352cb4bdfd.png)

Canvas: 500×500

Opaque bbox: x=49, y=2, w=404, h=271

Recommended constants:

TILE_W = 404

TILE_H = 202 (2:1)

TILE_SKIRT = 69 (271 - 202)

Pivot tip: if your sprite’s pivot is bottom-center of the whole PNG, place at isoY - TILE_SKIRT.

Wall tile (/mnt/data/e02d838f-1356-4e36-bbd3-fc698082cd81.png)

Canvas: 500×1000

Opaque bbox: x=22, y=24, w=235, h=601

Recommended constants (based on the art you showed):

WALL_W = 235

WALL_H = 585

WALL_SKIRT = 16 (floor contact line is 16 px above the bottom of the sprite)

The script also prints a heuristic contact_y_auto. Because stylized outlines can confuse pure signal-based detection, I included --override-skirt so you can enforce exactly 16 px for this wall and similarly for other assets that follow your style.

How to use the results in code (Three + Spine-TS)
// Floor placement (pivot = bottom-center of full PNG)
const p = isoToScreen(tileX, tileY);
floorMesh.position.set(p.x, p.y - TILE_SKIRT, zFromFeetScreenY(p.y));

// Wall placement (along an edge)
const e = isoToScreen(edgeX, edgeY);        // edge’s floor contact point
wallMesh.position.set(e.x, e.y - WALL_SKIRT, zFromFeetScreenY(e.y));

// Simple Z-depth
function zFromFeetScreenY(y:number){ return y * 0.001; }