// utils/spinePhysics.ts
import type { Skeleton, PhysicsConstraint } from '@esotericsoftware/spine-core';

// Set a constant wind for the whole skeleton (all constraints)
export function setGlobalWind(skeleton: Skeleton, windValue: number) {
  const pcs = (skeleton as any).physicsConstraints as PhysicsConstraint[] | undefined;
  if (!pcs) {
    console.warn('No physics constraints found on skeleton');
    return;
  }
  console.log(`Setting wind to ${windValue} on ${pcs.length} physics constraints`);
  for (const c of pcs) c.wind = windValue;
}

// Optional: make the wind gusty / time-varying
export function applyWindGusts(skeleton: Skeleton, tSeconds: number, base = 25, gustAmp = 15) {
  const wind = base + Math.sin(tSeconds * 0.8) * gustAmp + Math.sin(tSeconds * 2.3) * (gustAmp * 0.25);
  setGlobalWind(skeleton, wind);
}

// Subtle wind for wings and delicate movements
export function applySubtleWindGusts(skeleton: Skeleton, tSeconds: number, base = 8, gustAmp = 3) {
  // Much slower and more gentle oscillations
  const wind = base + Math.sin(tSeconds * 0.2) * gustAmp + Math.sin(tSeconds * 0.7) * (gustAmp * 0.3);
  setGlobalWind(skeleton, wind);
}
