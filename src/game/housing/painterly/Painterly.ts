import * as THREE from 'three';

export function applyPainterlyState(spineMesh: THREE.Object3D, baseOrder: number) {
  let drawIndex = 0;
  let meshCount = 0;

  // Also apply to the root mesh itself
  if ((spineMesh as any).isMesh) {
    (spineMesh as any).renderOrder = baseOrder;
    meshCount++;
  }

  spineMesh.traverse((obj: any) => {
    if (!obj.isMesh) return;
    meshCount++;

    // Stable per-slot micro offset (prevents z-fighting between attachments of the same skeleton)
    const slotIndex =
      obj.userData?.slotIndex ??
      obj.userData?.drawIndex ??
      (obj.userData.drawIndex = drawIndex++);

    obj.renderOrder = baseOrder + slotIndex * 0.01;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) if (m) {
      m.depthTest = false;
      m.depthWrite = false;
      m.transparent = true;
      m.blending = THREE.NormalBlending;
      m.side = THREE.DoubleSide;
      m.needsUpdate = true;
    }
  });

  if (__DEV__) {
    console.log(`Painterly: Applied renderOrder ${baseOrder} to ${meshCount} meshes`);
  }
}