// src/spine/spinePhysicsShim.ts
// Make updateWorldTransform tolerant to various argument shapes and missing symbols.

import { Skeleton, Physics } from '@esotericsoftware/spine-core';

// Keep original so we can call through
const _origUpdate = (Skeleton.prototype as any).updateWorldTransform as (
  physics: any
) => void;

// Replace with a tolerant wrapper
(Skeleton.prototype as any).updateWorldTransform = function patchedUpdateWorldTransform(arg?: any) {
  // Preferred default: the Physics object exported by the runtime.
  let phys: any = Physics as any;

  // If the caller passed something that looks like a Physics object (has an .update fn), trust it.
  if (arg && typeof arg === 'object' && typeof arg.update === 'function') {
    phys = arg;
  }

  // If the caller passed the *function* (Physics.update), ignore it and use the object.
  // If they passed undefined or nothing, we still use the object above.

  try {
    return _origUpdate.call(this, phys);
  } catch (e) {
    // As a last resort, attempt calling with undefined (older runtimes tolerate it)
    try {
      return _origUpdate.call(this, undefined);
    } catch {
      // swallow — prevents hard crash during early init
    }
  }
};
