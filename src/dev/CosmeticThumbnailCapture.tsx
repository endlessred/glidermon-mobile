// src/dev/CosmeticThumbnailCapture.tsx
//
// Dev-only screen that renders every purchasable cosmetic on the Spine
// character and captures a transparent-background PNG per item, using the
// exact same rendering path as the real game (createSpineCharacterController)
// so the generated thumbnails are guaranteed to match in-game appearance.
//
// Reached only via the `glidermon://dev/thumbnails` deep link (see App.tsx),
// __DEV__-gated. Not part of the normal tab bar.
//
// Driven by src/data/cosmeticThumbnails/generate_thumbnails.py, which
// triggers this screen, waits for the completion log line, then `adb pull`s
// the output directory and regenerates the require() manifest.
import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { GLView } from "expo-gl";
import * as FileSystem from "expo-file-system/legacy";
import * as THREE from "three";
import { Renderer } from "expo-three";
import { Physics } from "@esotericsoftware/spine-core";
import { createSpineCharacterController, SpineCharacterController } from "../spine/createSpineCharacterController";
import { useCosmeticsStore, CosmeticItem } from "../data/stores/cosmeticsStore";
import { OutfitSlot, CosmeticSocket } from "../data/types/outfitTypes";

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const OUTPUT_DIR = `${FileSystem.documentDirectory}cosmeticThumbnails/`;

// Same "brunette" default used by OutfitEditor.tsx's color picker when no
// color has been chosen yet -- hair catalog items carry no maskRecolor of
// their own (color is normally supplied at equip time), so a fixed default
// is needed to render a representative thumbnail at all.
const HAIR_DEFAULT_RECOLOR = { r: "#8b4513", g: "#a0522d", b: "#654321", a: "#d2691e" };

// Crop rect per socket, in GL framebuffer pixel space (origin top-left,
// matching CANVAS_WIDTH/HEIGHT above). These are tuned by eye against a test
// capture -- see the thumbnail-generator plan's verification step. Adjust
// here if the character rig, camera, or CANVAS_* constants ever change.
// Rects given here in normal top-left image coordinates (matching what the
// output PNG looks like, and how they were measured off a reference capture)
// -- converted to takeSnapshotAsync's actual rect coordinate space (GL's
// native bottom-left origin, confirmed empirically: it's passed straight
// through to glReadPixels, not a top-left image crop) via toGlRect below.
const SOCKET_CROP_TOPLEFT: Record<string, { x: number; y: number; width: number; height: number }> = {
  headTop: { x: 70, y: 0, width: 460, height: 300 },
  hair: { x: 70, y: 0, width: 460, height: 300 },
  jacket: { x: 50, y: 230, width: 500, height: 340 },
  shoes: { x: 130, y: 570, width: 340, height: 170 },
  skin: { x: 50, y: 0, width: 500, height: 770 },
};

function toGlRect(topLeft: { x: number; y: number; width: number; height: number }) {
  return {
    x: topLeft.x,
    y: CANVAS_HEIGHT - topLeft.y - topLeft.height,
    width: topLeft.width,
    height: topLeft.height,
  };
}

function makeBaseOutfit(): OutfitSlot {
  return {
    id: "thumbnail-capture",
    name: "thumbnail-capture",
    cosmetics: {},
    spineSettings: { currentSkin: "default", renderMode: "spine" },
    skinVariation: "default",
    eyeColor: "blue",
    shoeVariation: "brown",
    isDefault: false,
    isPublic: false,
    createdAt: new Date(),
    lastModified: new Date(),
  };
}

function buildOutfitForItem(item: CosmeticItem): OutfitSlot {
  const outfit = makeBaseOutfit();
  const socket = item.socket as CosmeticSocket;
  if (socket === "hair") {
    outfit.cosmetics.hair = {
      itemId: item.id,
      spineData: {
        skinName: "default",
        renderType: "spine",
        maskRecolor: HAIR_DEFAULT_RECOLOR,
      } as any,
    };
  } else {
    (outfit.cosmetics as any)[socket] = { itemId: item.id };
  }
  return outfit;
}

type CaptureStatus = { done: number; total: number; current?: string; failures: string[] };

export default function CosmeticThumbnailCapture() {
  const catalog = useCosmeticsStore((s) => s.catalog);
  const [status, setStatus] = useState<CaptureStatus>({ done: 0, total: 0, failures: [] });
  const startedRef = useRef(false);

  const onContextCreate = async (gl: any) => {
    if (startedRef.current) return;
    startedRef.current = true;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(0, CANVAS_WIDTH, CANVAS_HEIGHT, 0, -1000, 1000);
      camera.position.z = 1;

      const renderer = new Renderer({ gl });
      renderer.sortObjects = true;
      renderer.setSize(CANVAS_WIDTH, CANVAS_HEIGHT);
      // Alpha 0 clear color -- matches SpineCharacterPreview.tsx, produces a
      // transparent background so shop/equip cards can composite cleanly.
      renderer.setClearColor(0x000000, 0);
      (renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? (THREE as any).sRGBEncoding;
      renderer.toneMapping = THREE.NoToneMapping;

      const items = catalog.filter((item) => item.socket !== "theme");
      const baseOutfit = makeBaseOutfit();

      const controller: SpineCharacterController = await createSpineCharacterController({
        animation: "idle",
        outfit: baseOutfit,
        catalog,
      });

      scene.add(controller.mesh);

      // Matches SpineCharacterPreview.tsx's convention: the ortho camera's
      // world-Y increases toward the top of the frame, so a *smaller*
      // fraction of CANVAS_HEIGHT anchors the character's feet near the
      // bottom, leaving headroom above for the head/hat.
      const scale = 0.5;
      controller.skeleton.scaleX = scale;
      controller.skeleton.scaleY = scale;
      controller.skeleton.x = CANVAS_WIDTH * 0.5;
      controller.skeleton.y = CANVAS_HEIGHT * 0.1;

      await FileSystem.makeDirectoryAsync(OUTPUT_DIR, { intermediates: true }).catch(() => {});

      const failures: string[] = [];
      setStatus({ done: 0, total: items.length, failures });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setStatus({ done: i, total: items.length, current: item.id, failures });

        try {
          // Full reset before each item -- applyOutfit()/applyOutfitInternal
          // only ever *adds or changes* a cosmetic in the real app (an
          // outfit is built up incrementally, never wiped between two
          // arbitrary single-item states), so it never resets skeleton.setSkin()
          // when a hat is absent, nor re-applies setup-pose slot attachments
          // to undo previous skin/hair shader-attachment switches. Looping
          // through many unrelated single-cosmetic outfits needs that full
          // reset explicitly, or e.g. a hat capture bleeds into every later
          // capture in the loop.
          const skeleton = controller.skeleton;
          skeleton.setSkin(skeleton.data.defaultSkin);
          skeleton.setupPose();
          skeleton.updateWorldTransform(Physics.update);

          controller.applyOutfit(buildOutfitForItem(item));
          controller.skeleton.updateWorldTransform(Physics.update);
          controller.update(0);

          // endFrameEXP() must run BEFORE the snapshot, not after -- for a
          // view-attached (non-headless) GLView, takeSnapshotAsync reads the
          // *presented* framebuffer, which only updates once a frame has been
          // ended. Snapshotting first (as an earlier version of this code
          // did) reads the previous iteration's presented frame, one item
          // behind -- confirmed empirically (every file contained the prior
          // catalog item's render).
          renderer.render(scene, camera);
          gl.endFrameEXP();

          const cropTopLeft = SOCKET_CROP_TOPLEFT[item.socket] ?? { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
          const snapshot = await GLView.takeSnapshotAsync(gl, {
            format: "png",
            compress: 1,
            rect: toGlRect(cropTopLeft),
          });

          const destPath = `${OUTPUT_DIR}${item.id}.png`;
          await FileSystem.copyAsync({ from: snapshot.localUri, to: destPath });
          console.log(`[thumbnail] captured ${item.id} -> ${destPath}`);
        } catch (err) {
          console.error(`[thumbnail] FAILED for ${item.id}:`, err);
          failures.push(item.id);
        }
      }

      setStatus({ done: items.length, total: items.length, failures });
      console.log(
        `✅ Cosmetic thumbnail capture complete: ${items.length - failures.length}/${items.length}` +
          (failures.length ? ` (failed: ${failures.join(", ")})` : "")
      );
    } catch (error) {
      console.error("Cosmetic thumbnail capture: fatal error", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cosmetic Thumbnail Capture</Text>
      <Text style={styles.status}>
        {status.total > 0
          ? `${status.done}/${status.total} captured${status.current ? ` — current: ${status.current}` : ""}`
          : "Starting…"}
      </Text>
      {status.failures.length > 0 && (
        <Text style={styles.failures}>Failed: {status.failures.join(", ")}</Text>
      )}
      <View style={styles.glWrap}>
        <GLView style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }} onContextCreate={onContextCreate} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111", alignItems: "center", paddingTop: 60 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  status: { color: "#ccc", fontSize: 14, marginBottom: 8 },
  failures: { color: "#f66", fontSize: 12, marginBottom: 8, paddingHorizontal: 16, textAlign: "center" },
  glWrap: { opacity: 0.35 },
});
