// Static-atlas billboard renderer for the chair/storage/lighting/rug/bed/
// tableDesk slot types (SLOT_TYPE_FOR_FURNITURE_ID) -- the "additive" path
// described in the furniture-atlas-migration plan. Unlike buildFurnitureSlotBillboard's
// existing layers/restPoseAsset path (one PNG per item, bottom-center
// pivot, per-item scale clamped to the slot's footprint), a static-atlas
// item is a single trimmed region of the shared ShadedFurniture.atlas,
// pixel-anchored to the slot's world origin via metadata baked by
// scripts/buildFurnitureAtlasMetadata.ts -- so radically different art
// dimensions never cause visible jumping, and every item shares one uniform
// world scale (STATIC_FURNITURE_WORLD_UNITS_PER_PIXEL below) instead of each
// being independently scaled to fill its tile.
import * as THREE from 'three';
import { getStaticFurnitureRegion, buildStaticFurnitureGeometry } from '../assets/shadedFurnitureAtlas';
import { makeHueIndexedRecolorMaterial } from '../../../spine/HueIndexedRecolor';
import { resolveCosmeticRecolor } from '../../../data/cosmetics/palette';
import { FurnitureVariant } from '../types/RoomConfig';
import { RoomSlotDef } from '../types/roomSlots';
import { RoomDims3D } from './grid3D';
import { buildLightGlow } from './lightGlow3D';
import {
  resolveSlotWorldPlacement,
  RENDER_ORDER_BEHIND_CHARACTER,
  RENDER_ORDER_IN_FRONT_OF_CHARACTER,
  RENDER_ORDER_FLOOR_DECAL,
  BuiltFurnitureBillboard,
} from './slotWorldPlacement3D';

// World units per source pixel, held uniform across every static-atlas item
// so trimming never changes an item's apparent size relative to another --
// the anchor system fixes *position*, this fixes *scale*, deliberately not
// clamped per-item the way the older layers/restPoseAsset path is.
// Calibrated (not just eyeballed) by directly comparing carved_wood_chair
// (this atlas's WoodChair region) against wood_chair_green -- the legacy
// quad-renderer's item for the *same* chair geometry, just a different
// export/color path -- placed in the same seating slot with the same fixed
// camera: legacy rendered 140px tall (screen), this atlas's WoodChair
// rendered only 120px tall at the old 1/240 scale. 1/240 * (140/120) = 7/1440
// closes that gap so the two match. See shadedFurnitureAtlas.ts's
// STATIC_FURNITURE_ANCHOR_Y_CORRECTION_PX for the matching position fix from
// the same calibration pass.
const STATIC_FURNITURE_WORLD_UNITS_PER_PIXEL = 7 / 1440;

// Dev-only visualization: draws a small marker at each static-atlas item's
// resolved anchor/slot origin (plus its 1x1 footprint diamond) so a
// migration/placement bug is obvious on-device instead of just "looks a
// little off". Must stay false outside of local debugging -- never flip this
// on in a shipped build.
export const DEBUG_FURNITURE_ANCHORS = false;

function buildDebugAnchorMarker(footprint: { w: number; h: number }): THREE.Object3D {
  const group = new THREE.Group();

  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false, depthWrite: false })
  );
  dot.renderOrder = 9999;
  group.add(dot);

  const hw = footprint.w / 2;
  const hh = footprint.h / 2;
  const diamond = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.01, -hh),
      new THREE.Vector3(hw, 0.01, 0),
      new THREE.Vector3(0, 0.01, hh),
      new THREE.Vector3(-hw, 0.01, 0),
    ]),
    new THREE.LineBasicMaterial({ color: 0x00ff00, depthTest: false, depthWrite: false })
  );
  diamond.renderOrder = 9999;
  group.add(diamond);

  return group;
}

export async function buildStaticFurnitureSlotBillboard(
  slot: RoomSlotDef,
  variant: FurnitureVariant,
  /** Selected colorway id (Furnish Nest's "Colors" action) -- resolved via
   * resolveCosmeticRecolor(variant, paletteId), the exact same helper Outfit
   * uses for cosmetics. Undefined/unknown id falls back to variant's default
   * palette (see palette.ts's pickPalette). */
  paletteId: string | undefined,
  dims: RoomDims3D,
  billboardQuaternion: THREE.Quaternion,
  characterWorldPos: { x: number; z: number },
  forceInFront = false,
  /** Mirrors FurnitureDef.floorDecal (furnitureBillboard3D.ts) for the
   * static-atlas rugs -- always renders behind every other CONTENT_LAYER
   * item, not just the character, and never depth-writes. See
   * RENDER_ORDER_FLOOR_DECAL's own comment for why draw order alone is
   * enough to guarantee that regardless of world position. */
  floorDecal = false,
  /** Whether this lamp's light-glow overlay (if it has one -- see
   * staticAtlas.lightSocket) starts visible. Ignored for a variant with no
   * lightSocket. Toggled later in place by IsometricRoomView3D.tsx's
   * lampOffBySlot effect (via the glow mesh's userData.isLightGlow tag
   * below), not by rebuilding this billboard. */
  lit = true
): Promise<BuiltFurnitureBillboard | null> {
  const staticAtlas = variant.staticAtlas;
  if (!staticAtlas) return null;
  const region = await getStaticFurnitureRegion(staticAtlas.atlasRegion);
  if (!region) {
    if (__DEV__) {
      console.warn(`[staticFurnitureBillboard3D] unresolved atlas region "${staticAtlas.atlasRegion}" for slot ${slot.slotId}`);
    }
    return null;
  }

  const { position: slotWorldPos, quaternion, mirrorX } = resolveSlotWorldPlacement(slot, dims, billboardQuaternion);

  // Same front/behind-the-character classification as
  // buildFurnitureSlotBillboard -- see that file for why renderOrder (not
  // depth-buffer occlusion alone) has to arbitrate against the character. A
  // floor decal (rug) always renders behind every other content item, never
  // just the character -- skip the depth-score comparison entirely (and
  // ignore forceInFront, which only makes sense for a seat), mirroring
  // buildFurnitureSlotBillboard's own floorDecal branch.
  const slotDepthScore = slotWorldPos.x + slotWorldPos.y + slotWorldPos.z;
  const characterDepthScore = characterWorldPos.x + characterWorldPos.z;
  const isBehindCharacter = floorDecal || (!forceInFront && slotDepthScore <= characterDepthScore);
  const renderOrder = floorDecal
    ? RENDER_ORDER_FLOOR_DECAL
    : isBehindCharacter
      ? RENDER_ORDER_BEHIND_CHARACTER
      : RENDER_ORDER_IN_FRONT_OF_CHARACTER;

  const geometry = buildStaticFurnitureGeometry(region);
  // Mirrors makeSpritePlane's opaqueCutout material split (tileSprite.ts):
  // a slot rendering behind the character has to join three.js's opaque
  // queue (hard alpha cutout) to have any chance of losing to his
  // depthTest:false opaque skin materials; three.js always draws the whole
  // opaque queue before the whole transparent queue regardless of
  // renderOrder. Both material variants below get the same treatment --
  // `transparent`/`depthWrite` are plain THREE.Material properties, so
  // overriding them post-construction on the shader material works exactly
  // like it does on the plain one.
  // Same duck-typed resolution Outfit uses for cosmetics (data/cosmetics/
  // palette.ts) -- FurnitureVariant structurally matches the
  // {id, recolorable?, palettes?, maskRecolor?} shape it expects, so no
  // furniture-specific adapter is needed.
  const recolor = resolveCosmeticRecolor(variant, paletteId);
  const material: THREE.Material = recolor
    ? makeHueIndexedRecolorMaterial(region.texture, {
        colors: {
          red: recolor.r,
          green: recolor.g,
          // Matches the character controller's own r/g/b -> red/green/blue
          // mapping (createSpineCharacterController.ts): blue falls back to
          // red, not a hardcoded default, when a palette only sets 1-2
          // channels (e.g. carved_wood_chair's palettes only ever populate
          // r meaningfully for that item's art).
          blue: recolor.b ?? recolor.r,
        },
        alphaTest: 0.0015,
        strength: 1.0,
        shadeMode: true,
        // 0, not the shader's usual 0.15 default: this art's outline pixels
        // are already near-black and get excluded by the classifier's own
        // maxComponent<=0.05 gate, so no separate luma-based guard is needed
        // here -- and the usual 0.15 was actively harmful on this art. Red's
        // luma WEIGHT is the lowest of the three channels (~0.299 vs green's
        // ~0.587), so a fully-saturated pure-red pixel only ever reaches
        // Y~0.3, and this item's own painted red-channel "shading" dips
        // below Y=0.15 well before it looks anywhere near black -- at 0.15
        // that mid-dark shading was getting misclassified as outline and
        // left literally red, unrecolored, while the same shading range on
        // green (higher luma weight) or blue (exempted from this guard
        // entirely, see the shader's "isBlueish" comment) recolored fine.
        // Confirmed via on-device A/B: Crescent Moon Chair's frame stayed
        // solid red at 0.15 and recolored correctly at 0.
        preserveDarkThreshold: 0,
        // This atlas's shared texture is already set up (colorSpace/wrap/
        // filtering/flipY=true) by shadedFurnitureAtlas.ts for the plain
        // MeshBasicMaterial path's hand-built UVs -- see the option's own
        // doc comment for why this shader must not flip it again.
        manageTexture: false,
      })
    : new THREE.MeshBasicMaterial({
        map: region.texture,
        transparent: !isBehindCharacter,
        depthTest: true,
        // A floor decal never depth-writes -- combined with
        // RENDER_ORDER_FLOOR_DECAL (drawn first in the opaque queue), nothing
        // it draws can ever block a later opaque object's depth test, so
        // every other item unconditionally paints over it. Mirrors
        // tileSprite.ts's `depthWrite: !floorDecal`.
        depthWrite: !floorDecal,
        ...(isBehindCharacter ? { alphaTest: 0.5 } : null),
      });
  if (recolor) {
    material.transparent = !isBehindCharacter;
    material.depthWrite = !floorDecal;
  }

  const scale = STATIC_FURNITURE_WORLD_UNITS_PER_PIXEL;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(mirrorX ? -scale : scale, scale, scale);
  mesh.renderOrder = renderOrder;

  const group = new THREE.Group();
  group.add(mesh);

  if (staticAtlas.lightSocket) {
    const glow = buildLightGlow(staticAtlas.lightSocket, region, scale, mirrorX);
    glow.visible = lit;
    // Lets the tap-to-toggle effect (IsometricRoomView3D.tsx) find this mesh
    // among the slot group's children without knowing anything else about
    // this billboard's structure -- see tryLampTap / the lampOffBySlot effect.
    glow.userData.isLightGlow = true;
    group.add(glow);
  }

  if (DEBUG_FURNITURE_ANCHORS && slot.kind === 'floor') {
    group.add(buildDebugAnchorMarker(slot.footprint ?? { w: 1, h: 1 }));
  }

  group.position.set(slotWorldPos.x, slotWorldPos.y, slotWorldPos.z);
  group.quaternion.copy(quaternion);
  group.userData.slotId = slot.slotId;

  return { group };
}
