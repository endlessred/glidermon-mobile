// src/spine/spinePhysicsShim.ts
// Make updateWorldTransform tolerant to various argument shapes and missing symbols.

import { Skeleton, Physics } from '@esotericsoftware/spine-core';

// Keep original so we can call through
const _origUpdate = (Skeleton.prototype as any).updateWorldTransform as (
  physics: any
) => void;

// Create a standardized physics object that works across versions
const STANDARD_PHYSICS = {
  update: Physics.update || (() => {}),
  reset: Physics.reset || (() => {}),
  pose: Physics.pose || (() => {}),
  translate: Physics.translate || (() => {}),
  rotate: Physics.rotate || (() => {}),
};

// Replace with a tolerant wrapper
(Skeleton.prototype as any).updateWorldTransform = function patchedUpdateWorldTransform(arg?: any) {
  // Determine what physics object to use
  let physicsArg: any = STANDARD_PHYSICS;

  // If the caller passed Physics.update (function), wrap it in an object
  if (typeof arg === 'function') {
    physicsArg = {
      update: arg,
      reset: () => {},
      pose: () => {},
      translate: () => {},
      rotate: () => {},
    };
  }
  // If the caller passed a proper Physics object, use it
  else if (arg && typeof arg === 'object' && typeof arg.update === 'function') {
    physicsArg = arg;
  }
  // For undefined/null/other, use our standard physics object

  try {
    return _origUpdate.call(this, physicsArg);
  } catch (e) {
    // Fallback strategies for different Spine versions
    console.warn('Physics updateWorldTransform failed, trying fallbacks:', e);

    // Try with just the Physics object itself
    try {
      return _origUpdate.call(this, Physics);
    } catch (e2) {
      // Try with undefined (older versions)
      try {
        return _origUpdate.call(this, undefined);
      } catch (e3) {
        // Last resort: call without arguments if the method signature allows it
        try {
          return _origUpdate.call(this);
        } catch (e4) {
          console.error('All physics fallbacks failed:', { e, e2, e3, e4 });
          // Don't throw - just skip physics update to prevent crashes
        }
      }
    }
  }
};
