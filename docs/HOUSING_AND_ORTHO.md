0) Goals (what this delivers)

Isometric room(s) rendered from a tileset + furniture sprites.

Spine character that walks, idles, and sits/uses items at defined slots.

Apartment templates (S/M/L) with slots (sofa, chair, rug, wall art…).

Catalog + inventory + loadout system to swap items at runtime.

Camera with smooth follow, dead-zone, and bounds.

Depth sorting so the character passes behind/in front of objects.

Collision + (tiny) pathfinding on a tile grid.

Clean separation of world logic (tiles/slots) from rendering (Three/Spine).

1) Tech & folder layout
/src
  /engine
    camera.ts
    coords.ts            // iso transforms
    depth.ts
    nav.ts               // simple grid A* or direct w/ sidestep
    picking.ts           // screen <-> world helpers
    sceneBuilder.ts      // build meshes from data
  /data
    templates/room_s.json
    templates/room_m.json
    templates/room_l.json
    catalog.json         // items: sprites, footprints, seat anchors
  /render
    three-bootstrap.ts   // renderer, scene, ortho camera
    tileSprite.ts        // a sprite plane factory
    spineLoader.ts       // load atlas/json -> Spine SkeletonMesh
    spineActor.ts        // animation state + helpers
  /state
    store.ts             // apartmentState, inventory, character VM
  /ui
    CustomizePanel.tsx   // optional: choose items per slot
  index.ts               // app entry, main loop
  GameCanvas.tsx         // if mounting inside React; otherwise plain index.html+ts

2) Coordinate system (isometric)

Keep game logic in tile space. Project to pixels for rendering.

// engine/coords.ts
export const TILE_W = 64;     // atlas width in px (diamond width)
export const TILE_H = 32;     // diamond height

export type Vec2 = { x: number; y: number };      // tile-space (floats ok)

export function isoToScreen(x: number, y: number) {
  return { x: (x - y) * (TILE_W / 2), y: (x + y) * (TILE_H / 2) };
}

export function screenToIso(px: number, py: number) {
  // inverse for picking; assumes same TILE_W/H
  const x = (px / (TILE_W / 2) + py / (TILE_H / 2)) / 2;
  const y = (py / (TILE_H / 2) - px / (TILE_W / 2)) / 2;
  return { x, y };
}

3) Three.js bootstrapping (orthographic 2D-on-3D)

Use an orthographic camera so 1 “pixel” in world units == 1 screen pixel.

// render/three-bootstrap.ts
import * as THREE from "three";

export function createThree(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();

  // Ortho camera centered at (0,0), units = pixels in our projected space
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.left = 0; camera.right = w; camera.top = 0; camera.bottom = h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();

  return { renderer, scene, camera, resize };
}


We’ll position everything in pixel space after applying isoToScreen().
Depth uses Z (or renderOrder) derived from tile Y.

4) Tile & furniture rendering

Floor/walls: use InstancedMesh if large, otherwise simple THREE.Mesh planes.
Furniture: textured planes (or Spine rigs if animated props).

// render/tileSprite.ts
import * as THREE from "three";

export function makeSpritePlane(tex: THREE.Texture, w: number, h: number) {
  const geom = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const mesh = new THREE.Mesh(geom, mat);
  // default plane is centered; we want "feet" at (x,y): shift origin
  mesh.position.set(0, 0, 0);
  mesh.geometry.translate(w / 2, h, 0); // pivot bottom-center
  return mesh;
}


For tiles, you can skip pivot shifting if you place by top-left—just be consistent.

5) Spine-TS integration (Three renderer)

Use the official spine-ts three runtime.

// render/spineLoader.ts
import { AssetManager, SkeletonJson, AtlasAttachmentLoader } from "@esotericsoftware/spine-core";
import { SkeletonMesh } from "@esotericsoftware/spine-threejs";

export async function loadSpine(resources: {
  atlasUrl: string; jsonUrl: string; scale?: number;
}) {
  const assets = new AssetManager();
  assets.loadTextureAtlas(resources.atlasUrl);
  assets.loadText(resources.jsonUrl);
  await new Promise<void>(res => {
    const tick = () => assets.isLoadingComplete() ? res() : requestAnimationFrame(tick);
    tick();
  });

  const atlas = assets.get(resources.atlasUrl);
  const jsonText = assets.get(resources.jsonUrl) as string;
  const atlasLoader = new AtlasAttachmentLoader(atlas);
  const json = new SkeletonJson(atlasLoader);
  json.scale = resources.scale ?? 1;

  const skeletonData = json.readSkeletonData(JSON.parse(jsonText));
  const mesh = new SkeletonMesh(skeletonData);
  mesh.state.setAnimation(0, "idle", true);   // default
  return mesh; // Three.js Object3D
}


Actor wrapper to control position, facing, and animations:

// render/spineActor.ts
import { SkeletonMesh } from "@esotericsoftware/spine-threejs";

export class SpineActor {
  constructor(public mesh: SkeletonMesh) {}

  setFeetScreen(x: number, y: number) { this.mesh.position.set(x, y, this.mesh.position.z); }
  setFacingLeft(left: boolean) { this.mesh.scale.x = left ? -Math.abs(this.mesh.scale.x) : Math.abs(this.mesh.scale.x); }

  play(name: string, loop = false, track = 0, mixDuration = 0.2) {
    this.mesh.state.setMix(this.mesh.state.tracks[track]?.animation?.name || "", name, mixDuration);
    this.mesh.state.setAnimation(track, name, loop);
  }
}

6) Apartment templates, slots & catalog
Types
// state/types.ts
import { Vec2 } from "@/engine/coords";

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
  cols: number; rows: number;
  floor: number[][];             // tile IDs
  wallsBack: number[][];
  wallsFront: number[][];
  slots: Slot[];
  staticColliders?: Vec2[];      // blocked tiles
};

export type ItemDef = {
  id: string;
  slotType: IsoSlotType;
  atlasKey: string;              // texture key
  w: number; h: number;          // draw size in px
  footprint?: Vec2[];            // tiles occupied wrt slot.tile
  seatPoint?: { dx:number; dy:number }; // pelvis landing offset
  frontMaskAtlasKey?: string;
};

export type EquippedItem = { slotId: string; itemId: string };

export type ApartmentState = {
  templateId: ApartmentTemplate["id"];
  equipped: EquippedItem[];
  inventory: string[];
};

Example JSON (data/templates/room_s.json)
{
  "id": "room_s",
  "cols": 12,
  "rows": 8,
  "floor": [[1,1,1,1,1,1,1,1,1,1,1,1], ...],
  "wallsBack": [[0,0,0,...]],
  "wallsFront": [[0,0,0,...]],
  "slots": [
    { "id": "sofa_main",   "type":"sofa",     "tile":{"x":6,"y":3}, "facing":"right", "charAnchor":{"dx":0,"dy":-8} },
    { "id": "rug_center",  "type":"rug",      "tile":{"x":6,"y":4} },
    { "id": "chair_side",  "type":"chair",    "tile":{"x":4,"y":5}, "facing":"left" },
    { "id": "art_back",    "type":"wall_art", "tile":{"x":7,"y":1} }
  ],
  "staticColliders": [{"x":0,"y":0}]
}

Item catalog (data/catalog.json)
[
  { "id":"sofa_green_1","slotType":"sofa","atlasKey":"sofa/green1","w":160,"h":120,
    "footprint":[{"x":0,"y":0},{"x":1,"y":0}],
    "seatPoint":{"dx":8,"dy":-12},
    "frontMaskAtlasKey":"sofa/green1_mask"
  },
  { "id":"rug_leaf_s","slotType":"rug","atlasKey":"rug/leaf_s","w":160,"h":100,
    "footprint":[{"x":0,"y":0},{"x":1,"y":0},{"x":0,"y":1},{"x":1,"y":1}]
  },
  { "id":"chair_wood_r","slotType":"chair","atlasKey":"chair/wood_r","w":80,"h":100,
    "seatPoint":{"dx":3,"dy":-6}
  }
]

7) Building the scene from data
// engine/sceneBuilder.ts
import * as THREE from "three";
import { isoToScreen } from "./coords";
import { makeSpritePlane } from "@/render/tileSprite";
import { ItemDef, ApartmentTemplate, ApartmentState } from "@/state/types";

type Atlas = Record<string, THREE.Texture>;

export function buildApartment({
  scene, atlas, template, state, itemsById
}: {
  scene: THREE.Scene;
  atlas: Atlas;
  template: ApartmentTemplate;
  state: ApartmentState;
  itemsById: Record<string, ItemDef>;
}) {
  // 1) Floor & walls (iterate arrays, create meshes, push to scene)
  //    Derive z from depth key (see §9) or set renderOrder.

  // 2) Equipped items -> meshes
  const slotById = Object.fromEntries(template.slots.map(s => [s.id, s]));
  for (const eq of state.equipped) {
    const slot = slotById[eq.slotId]; if (!slot) continue;
    const def = itemsById[eq.itemId]; if (!def) continue;
    const tex = atlas[def.atlasKey];
    const m = makeSpritePlane(tex, def.w, def.h);
    const p = isoToScreen(slot.tile.x, slot.tile.y);
    m.position.set(p.x, p.y, 0);
    // store metadata for interaction
    (m as any).__glider = { slot, def };
    scene.add(m);

    if (def.frontMaskAtlasKey) {
      const mask = makeSpritePlane(atlas[def.frontMaskAtlasKey], def.w, def.h);
      mask.position.set(p.x, p.y, 0);
      (mask as any).__maskFor = m;
      scene.add(mask);
    }
  }
}

8) Camera follow, bounds, and dead-zone

We’ll keep camera in pixel space and move the Three OrthoCamera by setting its position and an opposite scene offset, or simpler: offset every object by -camera.pos. The latter is easiest:

// engine/camera.ts
import { Vec2 } from "./coords";

export class Camera2D {
  pos: Vec2 = { x: 0, y: 0 };  // pixel-space
  view: { w: number; h: number } = { w: 800, h: 600 };
  room: { w: number; h: number } = { w: 2000, h: 1400 };
  zoom = 1;

  setView(w: number, h: number) { this.view = { w, h }; }
  setRoom(w: number, h: number) { this.room = { w, h }; }

  clamp() {
    const halfW = this.view.w / 2, halfH = this.view.h / 2;
    this.pos.x = Math.max(halfW, Math.min(this.room.w - halfW, this.pos.x));
    this.pos.y = Math.max(halfH, Math.min(this.room.h - halfH, this.pos.y));
  }
}

export function followWithDeadzone(cam: Camera2D, target: Vec2, dt: number) {
  const dzX = cam.view.w * 0.2, dzY = cam.view.h * 0.15;
  const dx = target.x - cam.pos.x, dy = target.y - cam.pos.y;
  const clamp = (v:number, lim:number)=> Math.abs(v) < lim ? 0 : (v>0? v-lim : v+lim);
  cam.pos.x += clamp(dx, dzX) * Math.min(1, dt * 6);
  cam.pos.y += clamp(dy, dzY) * Math.min(1, dt * 6);
  cam.clamp();
}


During render, apply scene.position.set(-cam.pos.x + cam.view.w/2, -cam.pos.y + cam.view.h/2, 0) so the camera’s center aligns with the screen center.

9) Depth sorting (character vs furniture)

Use Y-sort (by screen Y of the “feet”) mapped to Z:

// engine/depth.ts
export function zFromFeetScreenY(screenY: number): number {
  // invert so larger y (closer to camera) draws in front
  return screenY * 0.001; // tiny scaling into [-1,1] range is fine
}


When you place a mesh:

const feet = isoToScreen(tile.x, tile.y);
mesh.position.set(feet.x, feet.y, zFromFeetScreenY(feet.y));


Spine actor: set its Z the same way whenever you move it.

If you prefer renderOrder, set mesh.renderOrder = feet.y and enable renderer.sortObjects = true.

10) Character control, sitting, and hotspots

Pathing: rooms are small—start with straight-line; add 4-dir A* if needed.

// engine/nav.ts
export function planPath(start: Vec2, goal: Vec2, blocked: boolean[][]): Vec2[] {
  // TODO: real A*. For now, return [goal].
  return [goal];
}


Arrival + sit/use:

Each slot has facing, charAnchor.

Each item has seatPoint.

On tap:

Convert screen→tile. If near a slot, use its tile as goal (or an approach tile).

Move Spine actor’s feet toward that tile (tween in tile space).

On arrival:

Flip facing.

Compute final pixel offset:
finalX = feet.x + (slot.charAnchor?.dx ?? 0) + (item.seatPoint?.dx ?? 0)
finalY = feet.y + (slot.charAnchor?.dy ?? 0) + (item.seatPoint?.dy ?? 0)

Snap actor to (finalX, finalY).

actor.play("sit_chair_front", true) (or the correct animation).

If the item has a frontMask, ensure its Z/renderOrder is just in front of the actor.

11) Input & picking

Convert mouse/touch to world pixels (account for canvas bounds + devicePixelRatio), then to iso tiles:

// engine/picking.ts
export function getCanvasPointer(evt: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const clientX = "touches" in evt ? evt.touches[0].clientX : (evt as MouseEvent).clientX;
  const clientY = "touches" in evt ? evt.touches[0].clientY : (evt as MouseEvent).clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}


Then screenToIso(px, py) → choose nearest tile.

12) Apartment customization flow

Inventory UI filters by slotType.

On selection: update ApartmentState.equipped for that slot.

Rebuild scene nodes for that slot:

Remove old mesh(es), add new item mesh, re-compute collisions (add/remove footprints).

If the character is currently “using” that slot, stop the animation and re-align to the new seat anchor.

Persistence:

Serialize ApartmentState to local storage/backend.

Keep slot IDs consistent across templates so upgrades/downgrades migrate cleanly.

13) Performance tips

Atlas your tiles/furniture; reuse Materials.

Use InstancedMesh for large tile layers.

Pause Spine animation updates when actor is idle and offscreen.

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) to cap GPU cost.

Debounce customization changes (don’t rebuild scene on every hover).

14) Main loop sketch
// index.ts
import { createThree } from "@/render/three-bootstrap";
import { createApartmentRuntime } from "@/engine/runtime"; // glue all parts
import { followWithDeadzone } from "@/engine/camera";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const { renderer, scene, camera } = createThree(canvas);
const rt = await createApartmentRuntime(scene); // loads template, catalog, spine actor, etc.

let last = performance.now();
function frame(now: number) {
  const dt = (now - last) / 1000; last = now;

  // update actor pathing, animations
  rt.update(dt);

  // camera follow actor
  followWithDeadzone(rt.camera, rt.actorFeetPx(), dt);
  scene.position.set(-rt.camera.pos.x + rt.camera.view.w/2, -rt.camera.pos.y + rt.camera.view.h/2, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

15) “Gotchas” & alignment checklist

Spine pivot: ensure your feet are the reference point. Place the actor by feet.

Flipping: flip by mesh.scale.x *= -1 (or set sign) rather than rotating 180°.

Seat alignment: verify once per furniture style; store seatPoint in catalog, not code.

Z fighting: keep a tiny Z offset step (e.g., 0.001) between layers if needed.

Tile footprints: update the collision grid when swapping items.

16) Minimal “first run” order of operations

Boot Three (renderer, scene, camera).

Load atlas textures (floor, walls, items).

Load catalog.json → itemsById.

Load room_s.json → template; compute room pixel size.

Create ApartmentState (defaults or saved).

Build floor/walls + equipped furniture (meshes).

Load Spine character, place at a safe tile, play idle.

Hook input: on tap → compute target tile or slot → path → walk → sit/use.

Start main loop: update pathing, follow camera, render.

Add customization UI: changing a slot re-builds that item’s mesh & colliders.