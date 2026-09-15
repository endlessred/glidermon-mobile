// Interactive hobby-slot Spine controller -- BoomBox / MushroomRecordPlayer /
// TarotTable / WitchyPotionStation. One shared Spine skeleton
// (src/assets/Apartment/Hobby/hobby.*) with a single `HobbyItem` slot whose
// attachment selects which of the four furniture pieces is shown; some
// attachments have a coordinated dance/tarot animation sequence.
//
// Follows the same conventions as the Daily Adventure Board
// (render/adventureBoard3D.ts), the other Spine object living directly in
// room CONTENT: loaded via spine/loaders.ts + spine/SpineThree.ts's
// SkeletonMesh, billboard-rotated via the shared quaternion, grounded at the
// slot's own world origin (render/slotWorldPlacement3D.ts), classified
// front/behind GliderMon by the same x+z isometric-depth formula furniture
// uses. Unlike the board (a frozen decorative object, animated once at
// build time and never updated again), this one is genuinely animated, so
// see `applyDepthBand` below for how its per-slot renderOrder survives that.
//
// Responsibility split (see src/game/housing/CLAUDE.md): this module owns
// "how does this Spine object animate/reset" only -- it has no idea *when*
// GliderMon chooses to interact with it. That's IsometricRoomView3D.tsx's job
// (via the room's existing character-slot/wander system), coordinating this
// controller's playDance()/playTarotSequence() with the idle driver's
// startInteraction('dance' | 'tarotThink', ...).
import * as THREE from 'three';
import {
  Slot,
  Animation,
  AttachmentTimeline,
  TrackEntry,
  Timeline,
} from '@esotericsoftware/spine-core';
import { loadSpineFromExpoAssets } from '../../../spine/loaders';
import { SkeletonMesh, normalizeMaterialForSlot } from '../../../spine/SpineThree';
import { makeHueIndexedRecolorMaterial } from '../../../spine/HueIndexedRecolor';
import { resolveCosmeticRecolor } from '../../../data/cosmetics/palette';
import { RoomDims3D, TILE_SIZE } from './grid3D';
import { RoomSlotDef } from '../types/roomSlots';
import {
  FurnitureVariant,
  HOBBY_ITEM_SLOT,
  HOBBY_ATTACHMENT,
  HOBBY_ANIM,
  TAROT_ATTACHMENTS,
  TarotCardId,
} from '../types/RoomConfig';
import {
  resolveSlotWorldPlacement,
  RENDER_ORDER_BEHIND_CHARACTER,
  RENDER_ORDER_IN_FRONT_OF_CHARACTER,
} from './slotWorldPlacement3D';

export { HOBBY_ITEM_SLOT, HOBBY_ANIM, TAROT_ATTACHMENTS };
export type { TarotCardId };

// --- Spine asset contract (Spine 4.3.26, src/assets/Apartment/Hobby) -------
// The catalog-shared names (slot/attachment/animation) live in RoomConfig.ts
// (re-exported above); the remaining names below are internal to this
// controller -- see this module's DEV validation (validateHobbySkeleton) for
// the one place that checks the live skeleton against the full list.
const SLOT_TAROT_CARD_BACK = 'TarotCardBack';
// The 4 supporting shuffle-only card backs -- hidden the instant the shuffle
// ends, distinct from SLOT_TAROT_CARD_BACK (the ONE drawn-card slot, see
// TAROT_ATTACHMENTS). "Tarot Card" (singular, with a space) is path/
// constraint infrastructure, not a visible card slot -- deliberately absent
// from every list in this file.
const SLOT_TAROT_CARD_BACK_EXTRAS = ['TarotCardBack2', 'TarotCardBack3', 'TarotCardBack4', 'TarotCardBack5'];
const SLOT_MUSIC_EFFECTS = ['singlenote', 'doublenote', 'burst1', 'burst2', 'burst3'];
const TAROT_CARD_BACK_BLANK_ATTACHMENT = 'Effects/TarotCardBack';

const TAROT_CARD_IDS = Object.keys(TAROT_ATTACHMENTS) as TarotCardId[];

// Track 0: the item's own dance/shuffle/reveal clip. Track 1: the
// simultaneous Music/NotesRising loop for dance interactions only -- see
// spec section 7, "use separate Spine animation tracks because these clips
// operate on different parts of the skeleton".
const TRACK_ITEM = 0;
const TRACK_MUSIC = 1;

// Whole-skeleton-canvas scale, matching adventureBoard3D.ts's approach
// (skeleton.data.height as the one normalizing dimension) -- every
// HobbyItem attachment shares this same skeleton canvas/coordinate space, so
// one scale keeps their authored relative sizes intact. Tuned on-device
// (glidermon://home after DEBUG_FORCE_HOBBY_ITEM below); adjust here, not
// per-item, if the whole set reads too big/small next to other furniture.
// (Was 1.05 -- on-device review called the whole set ~25% too big.)
const HOBBY_DESIRED_WORLD_HEIGHT = 1.05 * 0.75;

// How far below the slot's own floor-level origin the whole item sits --
// on-device review called the default (grounded flush at y=0, same as
// every other floor slot) ~25% of a tile too high. Floor slots are the
// only kind this controller ever renders at (see roomSlots.ts's `hobby`
// entry), so a flat offset is fine -- no wall-slot case to account for.
const HOBBY_VERTICAL_OFFSET = -TILE_SIZE * 0.25;

// Fallback only -- used if `Cards/Tarot Card Reveal` is missing from the
// loaded skeleton (so revealSceneTimelines is null and there's no real
// Animation to read a duration from). Matches the authored clip's own
// duration (confirmed against the exported bone9 keyframes: 0 / 0.667 / 1.5 / 2.233s).
const FALLBACK_REVEAL_DURATION_SECONDS = 2.233;

function findSlotIndex(skeletonData: any, slotName: string): number {
  const slots = skeletonData?.slots ?? [];
  for (let i = 0; i < slots.length; i++) {
    const name = slots[i]?.name ?? slots[i]?.data?.name;
    if (name === slotName) return i;
  }
  return -1;
}

function randomTarotCard(): TarotCardId {
  return TAROT_CARD_IDS[(Math.random() * TAROT_CARD_IDS.length) | 0];
}

/** DEV-only sanity check that the loaded skeleton still matches the asset
 * contract this controller is written against -- warns (doesn't throw) so a
 * future re-export with a renamed slot/attachment/animation degrades to a
 * loud console warning instead of a red-boxed room. */
function validateHobbySkeleton(skeletonData: any) {
  const missing: string[] = [];
  const slotNames = [HOBBY_ITEM_SLOT, SLOT_TAROT_CARD_BACK, ...SLOT_TAROT_CARD_BACK_EXTRAS];
  for (const name of slotNames) {
    if (findSlotIndex(skeletonData, name) < 0) missing.push(`slot "${name}"`);
  }
  const attachmentNames = [
    ...Object.values(HOBBY_ATTACHMENT),
    ...Object.values(TAROT_ATTACHMENTS),
    TAROT_CARD_BACK_BLANK_ATTACHMENT,
  ];
  const skins = skeletonData?.skins ?? [];
  for (const name of attachmentNames) {
    let found = false;
    // spine-core's Skin stores attachments as slotIndex -> {name: Attachment}.
    for (const skin of skins) {
      const attachments = (skin as any)?.attachments ?? [];
      for (const bucket of attachments) {
        if (bucket && Object.prototype.hasOwnProperty.call(bucket, name)) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) missing.push(`attachment "${name}"`);
  }
  for (const name of Object.values(HOBBY_ANIM)) {
    if (!skeletonData?.findAnimation?.(name)) missing.push(`animation "${name}"`);
  }
  if (missing.length > 0) {
    console.warn(`[interactiveHobbyItem3D] hobby.json is missing expected: ${missing.join(', ')}`);
  }
}

export interface InteractiveHobbyItem3D {
  group: THREE.Group;
  /** Play a dance interaction: the item's own dance loop + Music/NotesRising,
   * simultaneously, on separate tracks, for `durationSeconds`. Calls
   * `onComplete` once that shared duration elapses (via stopAndReset()) --
   * NOT tied to the clips' own (looping, so never-completing) duration. */
  playDance(durationSeconds: number, onComplete?: () => void): void;
  /** Play the tarot shuffle -> reveal sequence. `onRevealStart` fires the
   * instant the randomly-chosen card is attached (right as the reveal motion
   * begins), passing the reveal clip's own real duration in seconds so the
   * caller can size GliderMon's celebration to end together with it instead
   * of guessing -- see spec section 12, "reveal complete -> reset furniture,
   * return GliderMon to idle" (both together, not independently timed).
   * `onComplete` fires once the reveal animation finishes. Both transitions
   * are driven by Spine TrackEntry completion listeners, not timers. */
  playTarotSequence(callbacks?: {
    onRevealStart?: (card: TarotCardId, revealDurationSeconds: number) => void;
    onComplete?: () => void;
  }): void;
  /** Clear all tracks, hide every temporary effect/card, restore setup pose,
   * and reapply the currently-selected HobbyItem attachment. Cancels any
   * pending completion timer/listener so it can't fire afterward. Safe to
   * call at any time, including when already idle. */
  stopAndReset(): void;
  /** Advance the skeleton + any pending interaction timer. Call every frame
   * from the room's existing render loop (furnitureUpdatersRef), same as
   * every other animated furniture layer -- never a separate rAF/timer. */
  update(dt: number): void;
  /** Reclassify this item in front of / behind GliderMon by isometric depth.
   * Cheap -- doesn't rebuild anything, just changes what update() applies
   * next frame. Call whenever the character moves. */
  setDepthClass(front: boolean): void;
  /** True while a dance or tarot sequence is actively playing (i.e. it's
   * unsafe to start another one without stopAndReset() first). */
  isBusy(): boolean;
  dispose(): void;
}

export async function buildInteractiveHobbyItem3D(
  slot: RoomSlotDef,
  variant: FurnitureVariant,
  dims: RoomDims3D,
  billboardQuaternion: THREE.Quaternion,
  characterWorldPos: { x: number; z: number },
  paletteId: string | undefined,
  forceInFront = false
): Promise<InteractiveHobbyItem3D | null> {
  if (!variant.interactiveHobbySpine) return null;
  // Re-bound to a fresh const right after the narrowing check -- TS doesn't
  // carry the non-null narrowing of `variant.interactiveHobbySpine` into the
  // function declarations below (narrowing doesn't cross function
  // boundaries), so every nested function closes over this instead.
  const descriptor = variant.interactiveHobbySpine;

  const atlasModule = require('../../../assets/Apartment/Hobby/hobby.atlas');
  const jsonModule = require('../../../assets/Apartment/Hobby/hobby.json');
  const png = require('../../../assets/Apartment/Hobby/hobby.png');
  const png2 = require('../../../assets/Apartment/Hobby/hobby_2.png');
  const png3 = require('../../../assets/Apartment/Hobby/hobby_3.png');
  const png4 = require('../../../assets/Apartment/Hobby/hobby_4.png');
  const png5 = require('../../../assets/Apartment/Hobby/hobby_5.png');

  const { skeleton, state, resolveTexture } = await loadSpineFromExpoAssets({
    atlasModule,
    jsonModule,
    textureModules: [png, png2, png3, png4, png5],
    defaultMix: 0,
  });

  if (__DEV__) validateHobbySkeleton(skeleton.data);

  const data: any = skeleton.data;
  const skW: number = data.width || 1536;
  const skH: number = data.height || 1024;
  const skX: number = data.x ?? 0;
  const skY: number = data.y ?? 0;
  const scale = HOBBY_DESIRED_WORLD_HEIGHT / skH;
  skeleton.scaleX = scale;
  skeleton.scaleY = scale;
  skeleton.x = -(skX + skW / 2) * scale;
  skeleton.y = -skY * scale;

  // Derive the reveal's non-attachment timelines (the bone9 scale motion)
  // once at load time, dropping the authored AttachmentTimeline that hard-
  // codes TarotCardBack -> Effects/GliderTarotCard -- see spec section 11.
  // A fresh AttachmentTimeline for whichever card was actually drawn is
  // built per-reveal (in onShuffleComplete) and appended to this array
  // rather than setting the attachment by direct mutation outside the
  // timeline system: AnimationState.apply() has a built-in "unkeyed
  // attachment" safety sweep (see spine-core's AnimationState.js) that
  // resets any slot NOT keyed by the currently-applying track's own
  // timelines back to its setup-pose attachment (null, here) -- confirmed
  // on-device: a directly-assigned attachment with no matching timeline in
  // the playing animation reverted to invisible one frame after being set.
  // Keeping a real (if dynamically-built) AttachmentTimeline in the track
  // is what keeps Spine treating the slot as "keyed", so it leaves it alone.
  // Built fresh from the loaded (not shared/cached) skeleton data this call
  // just created, and never registered back into skeleton.data.animations,
  // so it can't affect any other skeleton instance and the original
  // Animation object is never mutated.
  let revealSceneTimelines: Timeline[] | null = null;
  let revealDurationSeconds = FALLBACK_REVEAL_DURATION_SECONDS;
  const cardBackSlotIndex = findSlotIndex(skeleton.data, SLOT_TAROT_CARD_BACK);
  const revealOriginal = skeleton.data.findAnimation(HOBBY_ANIM.tarotReveal);
  if (revealOriginal) {
    revealSceneTimelines = revealOriginal.timelines.filter(
      (t) => !(t instanceof AttachmentTimeline && (t as any).slotIndex === cardBackSlotIndex)
    );
    revealDurationSeconds = revealOriginal.duration;
  } else if (__DEV__) {
    console.warn(`[interactiveHobbyItem3D] missing animation "${HOBBY_ANIM.tarotReveal}"`);
  }

  const mesh = new SkeletonMesh(skeleton, state, resolveTexture);
  mesh.frustumCulled = false;

  // --- RGB recolor, scoped to ONLY the HobbyItem slot ----------------------
  // Same hue-indexed convention as the rest of ShadedFurniture (see
  // RoomConfig.ts's StaticFurnitureVisual doc comment) -- pure red/green/blue
  // channel classification. Every other slot (notes, bursts, tarot cards,
  // the four Effects/*TarotCard faces) must keep its authored appearance, so
  // materialOverride only intervenes for the HobbyItem slot and returns null
  // (default material) for everything else -- see SkeletonMesh.chooseMaterial
  // in spine/SpineThree.ts for how that hook is consulted per slot.
  const recolor = resolveCosmeticRecolor(variant, paletteId);
  if (recolor) {
    const recolorCache = new Map<string, THREE.ShaderMaterial>();
    mesh.materialOverride = (slotObj: Slot, baseTex: THREE.Texture) => {
      if ((slotObj.data?.name ?? '') !== HOBBY_ITEM_SLOT) return null;
      const key = `${(baseTex as any).uuid}|${recolor.r}|${recolor.g}|${recolor.b}`;
      let material = recolorCache.get(key);
      if (!material) {
        material = makeHueIndexedRecolorMaterial(baseTex, {
          alphaTest: 0.0015,
          strength: 1,
          shadeMode: true,
          colors: {
            red: recolor.r ?? '#ff0000',
            green: recolor.g ?? '#00ff00',
            // Matches the character/static-furniture convention: blue falls
            // back to red, not a hardcoded default, when a palette only sets
            // 1-2 channels.
            blue: recolor.b ?? recolor.r ?? '#ff0000',
          },
        });
        recolorCache.set(key, material);
      }
      normalizeMaterialForSlot(slotObj, material);
      return material;
    };
  }

  const { position, quaternion } = resolveSlotWorldPlacement(slot, dims, billboardQuaternion);
  const group = new THREE.Group();
  group.quaternion.copy(quaternion);
  group.position.set(position.x, position.y + HOBBY_VERTICAL_OFFSET, position.z);
  group.add(mesh);
  group.userData.slotId = slot.slotId;

  // --- state -----------------------------------------------------------
  let disposed = false;
  let depthFront =
    forceInFront || position.x + position.y + position.z > characterWorldPos.x + characterWorldPos.z;
  let pendingTimer: { remaining: number; onComplete?: () => void } | null = null;
  let busy = false;
  // Bumped on every stopAndReset()/dispose() so a TrackEntry.listener whose
  // closure captured an older token can recognize it's stale and no-op --
  // guards spec section 12/15's "listeners cannot fire after the object has
  // been disposed/replaced".
  let generation = 0;

  function resetToSelectedItem() {
    state.clearTrack(TRACK_ITEM);
    state.clearTrack(TRACK_MUSIC);
    // Setup pose defaults HobbyItem to TarotTable (see spec section 3) --
    // every reset must reapply the currently selected attachment right after,
    // or stopping e.g. a boombox animation would visually turn the furniture
    // back into the tarot table.
    skeleton.setupPose();
    skeleton.setAttachment(HOBBY_ITEM_SLOT, descriptor.attachment);
    // Explicit belt-and-suspenders hide -- setup pose already has no
    // attachment on any of these (confirmed against hobby.json), but state
    // this outright rather than relying on that silently staying true.
    skeleton.setAttachment(SLOT_TAROT_CARD_BACK, null);
    for (const s of SLOT_TAROT_CARD_BACK_EXTRAS) skeleton.setAttachment(s, null);
    for (const s of SLOT_MUSIC_EFFECTS) skeleton.setAttachment(s, null);
    // mesh.update(0) (SkeletonMesh's own update, spine/SpineThree.ts) applies
    // the (now-cleared) tracks and refreshes world transform + geometry in
    // one call -- same as every other Spine object in this codebase, rather
    // than duplicating its internals here.
    mesh.update(0);
    applyDepthBand();
  }

  function applyDepthBand() {
    const bandBase = depthFront ? RENDER_ORDER_IN_FRONT_OF_CHARACTER : RENDER_ORDER_BEHIND_CHARACTER;
    for (const child of mesh.children as THREE.Object3D[]) {
      if (child.userData?.slotName === undefined) continue;
      // refreshMeshes() (inside mesh.update()) just stamped a small 0..N
      // intra-skeleton draw-order index onto renderOrder -- fold that into
      // this band as a sub-order so relative draw order survives the shift,
      // same idea as adventureBoard3D.ts's __slotIdx bias, recomputed every
      // frame instead of cached once (this object, unlike the board, is
      // actually animated -- see this file's header comment).
      child.renderOrder = bandBase + child.renderOrder * 0.0001;
    }
  }

  resetToSelectedItem();

  function finishPendingTimer() {
    const p = pendingTimer;
    pendingTimer = null;
    stopAndReset();
    p?.onComplete?.();
  }

  function playDance(durationSeconds: number, onComplete?: () => void) {
    const itemAnimation = descriptor.itemAnimation;
    if (disposed || descriptor.interactionKind !== 'dance' || !itemAnimation) {
      if (__DEV__) console.warn('[interactiveHobbyItem3D] playDance() called on a non-dance item');
      return;
    }
    resetToSelectedItem();
    busy = true;
    state.setAnimation(TRACK_ITEM, itemAnimation, true);
    state.setAnimation(TRACK_MUSIC, HOBBY_ANIM.notesRising, true);
    pendingTimer = { remaining: Math.max(0, durationSeconds), onComplete };
  }

  function playTarotSequence(callbacks?: {
    onRevealStart?: (card: TarotCardId, revealDurationSeconds: number) => void;
    onComplete?: () => void;
  }) {
    if (disposed || descriptor.interactionKind !== 'tarot') {
      if (__DEV__) console.warn('[interactiveHobbyItem3D] playTarotSequence() called on a non-tarot item');
      return;
    }
    resetToSelectedItem();
    busy = true;
    const myGeneration = ++generation;

    const shuffleEntry: TrackEntry = state.setAnimation(TRACK_ITEM, HOBBY_ANIM.tarotShuffle, false);
    shuffleEntry.listener = {
      complete: (entry) => {
        entry.listener = null;
        if (disposed || myGeneration !== generation) return;
        onShuffleComplete(myGeneration, callbacks);
      },
    };
  }

  function onShuffleComplete(
    myGeneration: number,
    callbacks?: {
      onRevealStart?: (card: TarotCardId, revealDurationSeconds: number) => void;
      onComplete?: () => void;
    }
  ) {
    for (const s of SLOT_TAROT_CARD_BACK_EXTRAS) skeleton.setAttachment(s, null);
    const card = randomTarotCard();
    if (__DEV__) console.log(`[interactiveHobbyItem3D] tarot card chosen: ${card} (${TAROT_ATTACHMENTS[card]})`);
    // The real clip duration (not a guess) -- lets the caller size GliderMon's
    // celebration to end together with the reveal instead of running its own
    // independently-timed hold.
    callbacks?.onRevealStart?.(card, revealDurationSeconds);

    if (!revealSceneTimelines) {
      // No safe filtered reveal to play (missing source animation) -- still
      // resolve the sequence rather than leaving GliderMon/furniture stuck.
      stopAndReset();
      callbacks?.onComplete?.();
      return;
    }

    // A dynamically-built AttachmentTimeline, not a direct skeleton.setAttachment()
    // call: AnimationState.apply()'s "unkeyed attachment" sweep (spine-core's
    // AnimationState.js) resets any slot NOT keyed by a timeline in the
    // currently-applying track back to its setup-pose attachment (null, here)
    // -- confirmed on-device, a directly-assigned attachment reverted to
    // invisible one frame after being set. Two keyframes make the slot's
    // visibility an intrinsic property of the reveal clip itself: the chosen
    // card at time 0, hidden again at the clip's own end.
    const cardTimeline = new AttachmentTimeline(2, cardBackSlotIndex);
    cardTimeline.setFrame(0, 0, TAROT_ATTACHMENTS[card]);
    cardTimeline.setFrame(1, revealDurationSeconds, null);
    const revealAnim = new Animation(
      `${HOBBY_ANIM.tarotReveal}::${card}`,
      [...revealSceneTimelines, cardTimeline],
      revealDurationSeconds
    );

    const revealEntry: TrackEntry = state.setAnimation(TRACK_ITEM, revealAnim, false);
    revealEntry.listener = {
      complete: (entry) => {
        entry.listener = null;
        if (disposed || myGeneration !== generation) return;
        stopAndReset();
        callbacks?.onComplete?.();
      },
    };
  }

  function stopAndReset() {
    generation++; // invalidate any in-flight shuffle/reveal listener
    pendingTimer = null;
    busy = false;
    resetToSelectedItem();
  }

  function update(dt: number) {
    if (disposed) return;
    if (pendingTimer) {
      pendingTimer.remaining -= dt;
      if (pendingTimer.remaining <= 0) {
        finishPendingTimer();
        return;
      }
    }
    mesh.update(dt);
    applyDepthBand();
  }

  function setDepthClass(front: boolean) {
    depthFront = front;
  }

  function isBusy() {
    return busy;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    generation++;
    pendingTimer = null;
    busy = false;
    state.clearTracks();
    // Same manual traversal adventureBoard3D.dispose() uses -- SkeletonMesh
    // has no dispose() of its own (its per-slot materials are cached/shared,
    // see spine/SpineThree.ts's MaterialCache), so geometry/material for
    // each SlotRenderable mesh child must be freed here explicitly.
    group.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
  }

  return { group, playDance, playTarotSequence, stopAndReset, update, setDepthClass, isBusy, dispose };
}
