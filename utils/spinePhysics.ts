// utils/spinePhysics.ts
import type { Skeleton, PhysicsConstraint } from '@esotericsoftware/spine-core';

// Set a constant wind for the whole skeleton (all constraints)
export function setGlobalWind(skeleton: Skeleton, windValue: number) {
  const pcs = (skeleton as any).physicsConstraints as PhysicsConstraint[] | undefined;
  if (!pcs) return;
  for (const c of pcs) c.wind = windValue;
}

// Optional: make the wind gusty / time-varying
export function applyWindGusts(skeleton: Skeleton, tSeconds: number, base = 25, gustAmp = 15) {
  const wind = base + Math.sin(tSeconds * 0.8) * gustAmp + Math.sin(tSeconds * 2.3) * (gustAmp * 0.25);
  setGlobalWind(skeleton, wind);
}
