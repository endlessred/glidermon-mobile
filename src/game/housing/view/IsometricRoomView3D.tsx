// Room shell rendered from real 3D primitives (see sceneBuilder3D.ts) with
// procedurally textured floor/walls, furniture billboards, and Glidermon
// himself. Only the character animates per frame -- the room shell and
// furniture are built once and never touched again, same principle as the
// `quad` renderer (see sceneBuilder.ts).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import * as THREE from 'three';
import { Physics } from '@esotericsoftware/spine-core';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import { useHousingStore, ROOM_SIZE_TIERS, GridTile } from '../../../data/stores/housingStore';
import { useCosmeticsStore } from '../../../data/stores/cosmeticsStore';
import { useCharacterReactionStore } from '../../../data/stores/characterReactionStore';
import { OutfitSlot } from '../../../data/types/outfitTypes';
import { createSpineCharacterController, SpineCharacterController } from '../../../spine/createSpineCharacterController';
import { buildRoomScene3D, WALL_HEIGHT } from '../render/sceneBuilder3D';
import { buildFurnitureSlotBillboard } from '../render/furnitureBillboard3D';
import { computeBillboardQuaternion } from '../render/billboard3D';
import { computeNativeCharacterHeight } from '../render/characterScale';
import { gridToWorld, TILE_SIZE } from '../render/grid3D';
import { createSkyTexture, getSkyPalette, paintSky, rgbToHex } from '../render/sky3D';
import { createTreetopBackdrop3D } from '../render/treetopBackdrop3D';
import { getSlotsForTier } from '../types/roomSlots';
import { getWalkableTiles } from '../render/walkableTiles';

interface IsometricRoomView3DProps {
  width?: number;
  height?: number;
  characterScale?: number;
  animation?: string;
  outfit?: OutfitSlot | null;
  /** Controlled camera mode: false = standard wide Nest overview, true =
   * close camera following Glidermon. Driven externally (e.g. by
   * CameraPresetTabs on the Home screen) rather than an internal toggle. */
  zoomedIn?: boolean;
}

// Glidermon teleports (Tamagotchi-style, no walk cycle) to a random empty
// floor tile at a random interval in this range.
const WANDER_INTERVAL_RANGE_MS: [number, number] = [30_000, 180_000];
// If a "big" idle behavior (reading, a body-composite fidget, a reaction) is
// mid-playback when the wander timer fires, teleporting would cut it off
// jarringly -- wait this long and check again instead of skipping the cycle.
const WANDER_RETRY_DELAY_MS = 5_000;

function randInMs([min, max]: [number, number]): number {
  return min + Math.random() * (max - min);
}

const DEFAULT_CHARACTER_SCALE = 1;
// NOTE: this constant is NOT comparable to the same-named constant in
// IsometricRoomView.tsx (quad renderer) or IsometricHousingThreeJS.tsx
// (legacy). Those renderers divide by a separate `roomScale` (fit-to-view)
// factor and apply extra empirically-tuned fudge multipliers on top, so
// their constants only make sense inside their own pixel-space chains. This
// renderer computes world-unit height directly with no such chain, so the
// constant here is tuned fresh against the `characterScale` value actually
// passed in from HudScreen.tsx (0.3) to land at a sensible size relative to
// TILE_SIZE/WALL_HEIGHT/furniture.
const CHARACTER_DESIRED_TILE_HEIGHT = 4.5;
const PHYSICS: any = Physics as any;

// Fixed camera offset from whatever point it's looking at -- the isometric
// *direction* never changes, only the look-at point does (overview: room
// origin; zoomed in: Glidermon). Translating position+target together by
// the same offset keeps the viewing angle identical in both modes.
const CAMERA_OFFSET = new THREE.Vector3(10, 10, 10);
// Fraction of extra breathing room added around the room's exact projected
// bounding box in overview mode -- big enough that walls don't touch the
// frame edge, small enough that the room still fills nearly all of it.
const OVERVIEW_MARGIN_RATIO = 0.06;
// Zoomed-in framing is computed from the character's actual world height
// (see characterHeightRef below) rather than a fixed guess, so it stays
// correctly framed regardless of characterScale. This ratio is how much of
// the vertical frustum the character's standing height should fill -- kept
// well under 1.0 to leave headroom for animations that extend past the base
// pose (wings raising, arms up, jumping).
const ZOOM_FRAME_FILL_RATIO = 0.55;
// How long the zoomed-in camera takes to pan from Glidermon's old spot to his
// new one after he wanders, instead of snapping instantly. Only applies while
// already zoomed in -- toggling into zoomed mode still frames on him
// immediately, since that's a deliberate user action, not a background move.
const CAMERA_PAN_DURATION_SECONDS = 2.5;

// How often the sky/lighting palette is re-sampled from the clock. Time of
// day drifts slowly, so there's no need to recompute every frame.
const SKY_UPDATE_INTERVAL_MS = 30000;

// Disposes every mesh's geometry + material(s) under `group` and removes
// them, without touching `group` itself -- used to clear out the previous
// furniture set before rebuilding it in response to a store change.
function clearGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child);
    child.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
  }
}

// (Re)builds every occupied slot's billboard into `group` and returns the
// per-frame update callbacks for any animated layers -- shared between the
// initial scene build and the reactive rebuild-on-store-change effect below,
// so buying/applying furniture in the shop is reflected without requiring a
// full app reload (the GL context itself is only ever created once; see
// `handleContextCreate`'s `initializedRef` guard).
async function populateFurnitureGroup(
  group: THREE.Group,
  roomSizeTier: number,
  activeFurnitureBySlot: Record<string, { furnitureId: string; variantId: string }>,
  dims: { width: number; height: number },
  billboardQuaternion: THREE.Quaternion,
  characterWorldPos: { x: number; z: number }
): Promise<Array<(dt: number) => void>> {
  clearGroup(group);
  const updaters: Array<(dt: number) => void> = [];
  for (const slot of getSlotsForTier(roomSizeTier)) {
    const occupant = activeFurnitureBySlot[slot.slotId];
    if (!occupant) continue;
    const built3 = await buildFurnitureSlotBillboard(slot, occupant.furnitureId, occupant.variantId, dims, billboardQuaternion, characterWorldPos);
    if (built3) {
      group.add(built3.group);
      if (built3.update) updaters.push(built3.update);
    }
  }
  return updaters;
}

export default function IsometricRoomView3D({
  width = 300,
  height = 250,
  characterScale = DEFAULT_CHARACTER_SCALE,
  animation = 'idle',
  outfit,
  zoomedIn = false,
}: IsometricRoomView3DProps) {
  const catalog = useCosmeticsStore((state) => state.catalog);
  const selectedPaletteByCosmeticId = useCosmeticsStore((state) => state.selectedPaletteByCosmeticId);
  const roomSizeTier = useHousingStore((s) => s.roomSizeTier);
  const activeFloorPatternId = useHousingStore((s) => s.activeFloorPatternId);
  const activeWallPatternId = useHousingStore((s) => s.activeWallPatternId);
  const activeFurnitureBySlot = useHousingStore((s) => s.activeFurnitureBySlot);
  const characterTile = useHousingStore((s) => s.characterTile);

  const [isLoaded, setIsLoaded] = useState(false);
  const initializedRef = useRef(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const spineRef = useRef<SpineCharacterController | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const glSizeRef = useRef({ w: width, h: height });
  const roomBoundsRef = useRef({ halfWidth: 2, halfDepth: 2, wallHeight: WALL_HEIGHT });
  // Where the zoomed-in camera should end up -- updated immediately whenever
  // Glidermon's tile changes.
  const characterTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  // Where the zoomed-in camera actually looks right now -- eases toward
  // characterTargetRef over CAMERA_PAN_DURATION_SECONDS rather than jumping
  // straight to it (see the characterTile effect and render loop below).
  const cameraLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraPanFromRef = useRef(new THREE.Vector3(0, 0, 0));
  const cameraPanElapsedRef = useRef(0);
  const characterHeightRef = useRef(TILE_SIZE * CHARACTER_DESIRED_TILE_HEIGHT * DEFAULT_CHARACTER_SCALE);
  const isZoomedInRef = useRef(false);
  const skyTextureRef = useRef<THREE.DataTexture | null>(null);
  const skyDataRef = useRef<Uint8Array | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const lastSkyUpdateRef = useRef<number | null>(null);
  const treetopGroupRef = useRef<THREE.Group | null>(null);
  const furnitureUpdatersRef = useRef<Array<(dt: number) => void>>([]);
  // Dedicated sub-group for furniture billboards, added to the room group
  // once at initial build -- lets furniture be torn down/rebuilt in
  // response to store changes (buy/apply in the shop) without needing to
  // recreate the whole GL scene, which `handleContextCreate`'s
  // `initializedRef` guard only ever runs once per mount.
  const furnitureGroupRef = useRef<THREE.Group | null>(null);
  const roomGroupRef = useRef<THREE.Group | null>(null);
  const billboardQuaternionRef = useRef<THREE.Quaternion | null>(null);
  const roomDimsRef = useRef<{ width: number; height: number } | null>(null);
  // Reused by every furniture rebuild for front/behind renderOrder
  // classification -- see buildFurnitureSlotBillboard. Updated whenever
  // Glidermon wanders to a new tile (see the characterTile effect below).
  const characterWorldPosRef = useRef<{ x: number; z: number } | null>(null);
  // The wrapping group whose position places Glidermon in the room -- held
  // in a ref (not just a local var in handleContextCreate) so the
  // characterTile effect can move it after the initial scene build.
  const characterGroupRef = useRef<THREE.Group | null>(null);

  const scaleRef = useRef(characterScale);
  useEffect(() => {
    scaleRef.current = characterScale;
  }, [characterScale]);

  // Rebuilds just the furniture layer when the store changes (buy/apply in
  // the shop) -- skips the very first render, since the initial scene build
  // in handleContextCreate already populates it from the same state.
  const skipInitialFurnitureEffect = useRef(true);
  useEffect(() => {
    if (__DEV__) console.log(`[housing3D DEBUG] furniture effect fired, skip=${skipInitialFurnitureEffect.current}, hasGroup=${!!furnitureGroupRef.current}`);
    if (skipInitialFurnitureEffect.current) {
      skipInitialFurnitureEffect.current = false;
      return;
    }
    const group = furnitureGroupRef.current;
    const dims = roomDimsRef.current;
    const billboardQuaternion = billboardQuaternionRef.current;
    const characterWorldPos = characterWorldPosRef.current;
    if (!group || !dims || !billboardQuaternion || !characterWorldPos) return;
    let cancelled = false;
    populateFurnitureGroup(group, roomSizeTier, activeFurnitureBySlot, dims, billboardQuaternion, characterWorldPos).then((updaters) => {
      if (__DEV__) console.log(`[housing3D DEBUG] rebuilt furniture layer, ${updaters.length} updater(s)`);
      if (!cancelled) furnitureUpdatersRef.current = updaters;
    });
    return () => {
      cancelled = true;
    };
  }, [activeFurnitureBySlot, roomSizeTier]);

  // Moves Glidermon to his current tile whenever it changes after the
  // initial mount (the wander scheduler below writes to housingStore's
  // characterTile) -- teleports instantly (Tamagotchi-style, no walk cycle),
  // then re-baked furniture renderOrder against the new position so he
  // still layers correctly in front of/behind furniture on his new tile.
  const skipInitialTileEffect = useRef(true);
  useEffect(() => {
    if (skipInitialTileEffect.current) {
      skipInitialTileEffect.current = false;
      return;
    }
    const characterGroup = characterGroupRef.current;
    const furnitureGroup = furnitureGroupRef.current;
    const dims = roomDimsRef.current;
    const billboardQuaternion = billboardQuaternionRef.current;
    if (!characterGroup || !furnitureGroup || !dims || !billboardQuaternion) return;

    const { x: charX, z: charZ } = gridToWorld(characterTile.row, characterTile.col, dims);
    characterGroup.position.set(charX, 0, charZ);
    characterWorldPosRef.current = { x: charX, z: charZ };
    characterTargetRef.current.set(charX, characterHeightRef.current / 2, charZ);

    // Kick off a camera pan toward the new target if zoomed in and visible;
    // otherwise there's nothing to animate, so just snap the (unseen)
    // look-at point to match -- avoids a jarring jump if the user zooms in
    // later mid-"pan".
    if (isZoomedInRef.current) {
      cameraPanFromRef.current.copy(cameraLookAtRef.current);
      cameraPanElapsedRef.current = 0;
    } else {
      cameraLookAtRef.current.copy(characterTargetRef.current);
    }

    let cancelled = false;
    populateFurnitureGroup(furnitureGroup, roomSizeTier, activeFurnitureBySlot, dims, billboardQuaternion, { x: charX, z: charZ }).then((updaters) => {
      if (!cancelled) furnitureUpdatersRef.current = updaters;
    });
    return () => {
      cancelled = true;
    };
  }, [characterTile, roomSizeTier, activeFurnitureBySlot]);

  // Wander scheduler: every 30s-180s, if Glidermon isn't mid-way through a
  // "big" idle behavior, teleport him to a random empty floor tile. Runs on
  // a plain setTimeout chain (not the rAF render loop) since this cadence
  // doesn't need per-frame precision.
  useEffect(() => {
    if (!isLoaded) return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const attemptWander = () => {
      if (cancelled) return;
      const idleDriver = spineRef.current?.idleDriver;
      if (idleDriver && idleDriver.getCurrentBehavior() !== 'idle') {
        timeoutId = setTimeout(attemptWander, WANDER_RETRY_DELAY_MS);
        return;
      }
      const { roomSizeTier: tier, activeFurnitureBySlot: occupied, characterTile: current, setCharacterTile } =
        useHousingStore.getState();
      const candidates = getWalkableTiles(tier, occupied).filter((t) => t.row !== current.row || t.col !== current.col);
      if (candidates.length > 0) {
        const next: GridTile = candidates[(Math.random() * candidates.length) | 0];
        setCharacterTile(next);
      }
      timeoutId = setTimeout(attemptWander, randInMs(WANDER_INTERVAL_RANGE_MS));
    };

    timeoutId = setTimeout(attemptWander, randInMs(WANDER_INTERVAL_RANGE_MS));
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoaded]);

  const animationRef = useRef(animation);
  useEffect(() => {
    animationRef.current = animation;
    if (spineRef.current) spineRef.current.setAnimation(animation, true);
  }, [animation]);

  const outfitRef = useRef<OutfitSlot | undefined>(outfit ?? undefined);
  useEffect(() => {
    outfitRef.current = outfit ?? undefined;
    if (spineRef.current) spineRef.current.applyOutfit(outfitRef.current);
  }, [outfit]);

  // Re-applies the currently-equipped outfit so an equipped recolorable
  // cosmetic (e.g. a hat) picks up a new colorway chosen on the Outfit
  // screen without needing to re-equip it.
  useEffect(() => {
    if (spineRef.current) spineRef.current.setSelectedPalettes(selectedPaletteByCosmeticId);
  }, [selectedPaletteByCosmeticId]);

  const updateCameraForZoom = useCallback((camera: THREE.OrthographicCamera, zoomedIn: boolean) => {
    const { w: glW, h: glH } = glSizeRef.current;
    const aspect = glW / glH;

    const target = zoomedIn ? cameraLookAtRef.current : new THREE.Vector3(0, 0, 0);
    camera.position.copy(target).add(CAMERA_OFFSET);
    camera.lookAt(target);

    if (zoomedIn) {
      const halfExtent = characterHeightRef.current / (2 * ZOOM_FRAME_FILL_RATIO);
      camera.left = -halfExtent * aspect;
      camera.right = halfExtent * aspect;
      camera.top = halfExtent;
      camera.bottom = -halfExtent;
      camera.updateProjectionMatrix();
      return;
    }

    // Overview mode: fit the frustum to the room's exact projected bounding
    // box instead of a fixed/guessed extent. The isometric angle foreshortens
    // the floor footprint (X/Z) and the wall height (Y) by different amounts,
    // so a fixed extent either clips the walls or leaves a lot of dead space
    // -- projecting the actual room corners into camera space and fitting to
    // that gets the tightest frame that still shows the whole room. Camera
    // space is used directly (not world space) since OrthographicCamera's
    // left/right/top/bottom are defined in that space.
    camera.updateMatrixWorld(true);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const { halfWidth, halfDepth, wallHeight } = roomBoundsRef.current;

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    const corner = new THREE.Vector3();
    for (const x of [-halfWidth, halfWidth]) {
      for (const y of [0, wallHeight]) {
        for (const z of [-halfDepth, halfDepth]) {
          corner.set(x, y, z).sub(camera.position);
          const u = corner.dot(right);
          const v = corner.dot(up);
          minU = Math.min(minU, u);
          maxU = Math.max(maxU, u);
          minV = Math.min(minV, v);
          maxV = Math.max(maxV, v);
        }
      }
    }

    const contentWidth = (maxU - minU) * (1 + OVERVIEW_MARGIN_RATIO);
    const contentHeight = (maxV - minV) * (1 + OVERVIEW_MARGIN_RATIO);
    const centerU = (minU + maxU) / 2;
    const centerV = (minV + maxV) / 2;

    // Whichever dimension is aspect-starved dictates the final span, so the
    // frustum keeps the viewport's aspect ratio (otherwise the room would
    // render stretched) while still fully containing the other dimension.
    const finalHeight = Math.max(contentHeight, contentWidth / aspect);
    const finalWidth = finalHeight * aspect;

    camera.left = centerU - finalWidth / 2;
    camera.right = centerU + finalWidth / 2;
    camera.bottom = centerV - finalHeight / 2;
    camera.top = centerV + finalHeight / 2;
    camera.updateProjectionMatrix();
  }, []);

  // Rebuilds just the floor/wall shell when the store changes (buy/apply a
  // material or procedural pattern in the shop) -- skips the very first
  // render for the same reason as the furniture effect above. The shell
  // group holds only the floor tiles + 2 walls (furniture/character/treetop
  // are separate scene children, not nested under it -- see
  // handleContextCreate), so it can be torn down and replaced wholesale
  // without touching anything else in the scene.
  const skipInitialShellEffect = useRef(true);
  useEffect(() => {
    if (skipInitialShellEffect.current) {
      skipInitialShellEffect.current = false;
      return;
    }
    const scene = sceneRef.current;
    const oldGroup = roomGroupRef.current;
    const dims = roomDimsRef.current;
    const camera = cameraRef.current;
    if (!scene || !oldGroup || !dims || !camera) return;
    let cancelled = false;
    const grid = {
      width: dims.width,
      height: dims.height,
      floorPatternId: activeFloorPatternId,
      wallPatternId: activeWallPatternId,
    };
    buildRoomScene3D(grid).then((built) => {
      if (cancelled) return;
      scene.remove(oldGroup);
      clearGroup(oldGroup);
      scene.add(built.group);
      roomGroupRef.current = built.group;
      roomBoundsRef.current = { halfWidth: built.halfWidth, halfDepth: built.halfDepth, wallHeight: built.wallHeight };
      updateCameraForZoom(camera, isZoomedInRef.current);
    });
    return () => {
      cancelled = true;
    };
  }, [activeFloorPatternId, activeWallPatternId, updateCameraForZoom]);

  useEffect(() => {
    isZoomedInRef.current = zoomedIn;
    // Toggling into zoomed mode is a deliberate user action, not a
    // background wander -- frame on Glidermon immediately rather than
    // starting a multi-second pan from wherever the (unseen) look-at point
    // last was.
    if (zoomedIn) {
      cameraLookAtRef.current.copy(characterTargetRef.current);
    }
    const camera = cameraRef.current;
    if (camera) updateCameraForZoom(camera, zoomedIn);
  }, [zoomedIn, updateCameraForZoom]);

  // Plays a one-shot positive reaction whenever something outside this
  // component (e.g. completing a Home-screen goal) fires
  // characterReactionStore -- a decoupled trigger bus, same pattern as
  // acornFxStore, since nothing outside this component holds a ref to the
  // Spine controller. No-ops harmlessly if the controller isn't ready yet.
  const reactionNonce = useCharacterReactionStore((s) => s.nonce);
  const reactionName = useCharacterReactionStore((s) => s.reaction);
  const lastReactionNonceRef = useRef(0);
  useEffect(() => {
    if (reactionNonce === lastReactionNonceRef.current) return;
    lastReactionNonceRef.current = reactionNonce;
    if (reactionName) spineRef.current?.playReaction(reactionName);
  }, [reactionNonce, reactionName]);

  useEffect(
    () => () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      rendererRef.current?.dispose();
      skyTextureRef.current?.dispose();
      const treetopMesh = treetopGroupRef.current?.children[0] as THREE.Mesh | undefined;
      if (treetopMesh) {
        treetopMesh.geometry.dispose();
        (treetopMesh.material as THREE.MeshBasicMaterial).map?.dispose();
        (treetopMesh.material as THREE.MeshBasicMaterial).dispose();
      }
    },
    []
  );

  const handleContextCreate = useCallback(async (gl: any) => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      glSizeRef.current = { w, h };
      gl.viewport(0, 0, w, h);

      const renderer = new Renderer({ gl });
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      renderer.setViewport(0, 0, w, h);
      renderer.setClearColor(0x1a1c2c, 1);

      const scene = new THREE.Scene();
      sceneRef.current = scene;
      const initialSkyPalette = getSkyPalette();
      const { texture: skyTexture, data: skyData } = createSkyTexture();
      scene.background = skyTexture;
      skyTextureRef.current = skyTexture;
      skyDataRef.current = skyData;
      lastSkyUpdateRef.current = performance.now();

      const dims = ROOM_SIZE_TIERS[roomSizeTier] ?? ROOM_SIZE_TIERS[0];
      const grid = {
        width: dims.width,
        height: dims.height,
        floorPatternId: activeFloorPatternId,
        wallPatternId: activeWallPatternId,
      };
      const built = await buildRoomScene3D(grid);
      scene.add(built.group);
      roomBoundsRef.current = { halfWidth: built.halfWidth, halfDepth: built.halfDepth, wallHeight: built.wallHeight };

      const ambient = new THREE.AmbientLight(
        rgbToHex(initialSkyPalette.ambientColor),
        initialSkyPalette.ambientIntensity
      );
      scene.add(ambient);
      ambientLightRef.current = ambient;

      const sun = new THREE.DirectionalLight(rgbToHex(initialSkyPalette.sunColor), initialSkyPalette.sunIntensity);
      sun.position.set(3, 5, 2);
      scene.add(sun);
      sunLightRef.current = sun;

      // True isometric camera: equal offset on all three axes + lookAt the
      // origin. No hand-derived projection math -- Three.js's own camera
      // matrix does the isometric projection for us. Bounds are placeholder
      // here -- updateCameraForZoom sets the real framing once the room and
      // character are both built below.
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      cameraRef.current = camera;

      // Every billboard (furniture, character, treetop) shares this one
      // fixed rotation instead of each computing its own lookAt -- see
      // billboard3D.ts for why that matters under an orthographic camera.
      // Uses the fixed CAMERA_OFFSET direction rather than the live
      // camera.position, since that position now pans during zoom -- the
      // viewing *direction* (and therefore correct billboard facing) never
      // changes, only where it's centered.
      const billboardQuaternion = computeBillboardQuaternion(CAMERA_OFFSET);
      const treetopPromise = createTreetopBackdrop3D(built.halfWidth, built.halfDepth, billboardQuaternion);

      roomGroupRef.current = built.group;
      billboardQuaternionRef.current = billboardQuaternion;
      roomDimsRef.current = dims;

      // Computed here (before furniture/character are built) so both can
      // share it -- furniture uses it to classify itself as in front of or
      // behind the character for renderOrder (see buildFurnitureSlotBillboard).
      const characterWorldPos = gridToWorld(characterTile.row, characterTile.col, dims);
      characterWorldPosRef.current = characterWorldPos;

      const furnitureGroup = new THREE.Group();
      scene.add(furnitureGroup);
      furnitureGroupRef.current = furnitureGroup;
      furnitureUpdatersRef.current = await populateFurnitureGroup(
        furnitureGroup,
        roomSizeTier,
        activeFurnitureBySlot,
        dims,
        billboardQuaternion,
        characterWorldPos
      );

      const controller = await createSpineCharacterController({
        animation: animationRef.current,
        outfit: outfitRef.current,
        catalog,
        selectedPaletteByCosmeticId,
      });
      controller.mesh.frustumCulled = false;

      const characterGroup = new THREE.Group();
      characterGroup.quaternion.copy(billboardQuaternion);

      let characterWorldHeight = TILE_SIZE * CHARACTER_DESIRED_TILE_HEIGHT * DEFAULT_CHARACTER_SCALE;
      const nativeHeight = computeNativeCharacterHeight(controller.mesh);
      if (nativeHeight && nativeHeight > 0) {
        const scaleMultiplier = scaleRef.current > 0 ? scaleRef.current : DEFAULT_CHARACTER_SCALE;
        const desiredWorldHeight = TILE_SIZE * CHARACTER_DESIRED_TILE_HEIGHT * scaleMultiplier;
        characterWorldHeight = desiredWorldHeight;
        const finalScale = desiredWorldHeight / nativeHeight;

        if (Number.isFinite(finalScale)) {
          const sk = controller.skeleton;
          sk.scaleX = finalScale;
          sk.scaleY = finalScale;

          // Feet land at the group's local origin -- world placement is
          // handled entirely by characterGroup.position below.
          const feet = controller.getFeetLocalPosition();
          sk.x = -feet.x * finalScale;
          sk.y = -feet.y * finalScale;

          sk.updateWorldTransform(PHYSICS.update);
          controller.mesh.refreshMeshes();
        }
      }

      characterGroup.add(controller.mesh);
      const { x: charX, z: charZ } = characterWorldPos;
      characterGroup.position.set(charX, 0, charZ);
      scene.add(characterGroup);
      characterGroupRef.current = characterGroup;

      // Zoomed-in framing centers on the character's mid-height, not their
      // feet, so the camera doesn't look like it's aimed at the floor.
      characterTargetRef.current.set(charX, characterWorldHeight / 2, charZ);
      cameraLookAtRef.current.copy(characterTargetRef.current);
      cameraPanFromRef.current.copy(characterTargetRef.current);
      characterHeightRef.current = characterWorldHeight;

      // Real world-space billboard (not screen-locked), so it naturally
      // pans/scales with the room when the camera zooms in on the character
      // -- same depth-tested approach as furniture (treetopBackdrop3D.ts).
      const treetopGroup = await treetopPromise;
      scene.add(treetopGroup);
      treetopGroupRef.current = treetopGroup;

      updateCameraForZoom(camera, isZoomedInRef.current);

      rendererRef.current = renderer;
      spineRef.current = controller;
      lastTimeRef.current = null;

      const render = () => {
        try {
          const now = performance.now();
          const last = lastTimeRef.current ?? now;
          const deltaSeconds = Math.min((now - last) / 1000, 1 / 15);
          lastTimeRef.current = now;

          // Only the character skeleton and any animated furniture (e.g. a
          // campfire flicker, a chest opening) update per frame -- everything
          // else in the room shell was built once above.
          controller.update(deltaSeconds);
          for (const update of furnitureUpdatersRef.current) update(deltaSeconds);

          // Re-aim every frame while zoomed in (not just on toggle) so the
          // camera tracks Glidermon live -- this is what makes the zoomed-in
          // view follow him if/when his position in the room changes, rather
          // than only framing where he was when zoom was switched on. The
          // look-at point eases toward characterTargetRef.current (see the
          // characterTile effect above) instead of jumping straight there,
          // so a wander pans the view smoothly rather than snapping.
          if (isZoomedInRef.current) {
            cameraPanElapsedRef.current += deltaSeconds;
            const t = Math.min(cameraPanElapsedRef.current / CAMERA_PAN_DURATION_SECONDS, 1);
            const eased = t * t * (3 - 2 * t); // smoothstep ease-in-out
            cameraLookAtRef.current.lerpVectors(cameraPanFromRef.current, characterTargetRef.current, eased);
            updateCameraForZoom(camera, true);
          }

          if (now - (lastSkyUpdateRef.current ?? 0) > SKY_UPDATE_INTERVAL_MS) {
            lastSkyUpdateRef.current = now;
            const palette = getSkyPalette();
            if (skyDataRef.current && skyTextureRef.current) {
              paintSky(skyDataRef.current, palette);
              skyTextureRef.current.needsUpdate = true;
            }
            if (ambientLightRef.current) {
              ambientLightRef.current.color.setHex(rgbToHex(palette.ambientColor));
              ambientLightRef.current.intensity = palette.ambientIntensity;
            }
            if (sunLightRef.current) {
              sunLightRef.current.color.setHex(rgbToHex(palette.sunColor));
              sunLightRef.current.intensity = palette.sunIntensity;
            }
          }

          renderer.render(scene, camera);
          gl.endFrameEXP();
          rafRef.current = requestAnimationFrame(render);
        } catch (err) {
          console.error('IsometricRoomView3D render error', err);
        }
      };

      render();
    } catch (error) {
      console.error('Failed to initialize 3D room view:', error);
    } finally {
      setIsLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSizeTier, activeFloorPatternId, activeWallPatternId, activeFurnitureBySlot, catalog]);

  return (
    <View style={{ width, height, backgroundColor: 'transparent' }}>
      <GLView style={{ flex: 1 }} onContextCreate={handleContextCreate} />
      {!isLoaded && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(26, 28, 44, 0.4)',
          }}
        />
      )}
    </View>
  );
}
