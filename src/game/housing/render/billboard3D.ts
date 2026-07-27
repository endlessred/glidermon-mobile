// Shared "face the camera" orientation for billboarded content (furniture,
// character) in the 3D-primitive room shell. The camera is a static,
// non-moving THREE.OrthographicCamera, so every billboard should share
// exactly ONE fixed rotation rather than each computing its own
// lookAt(camera.position) -- per-object lookAt would introduce inconsistent
// parallax between objects at different room positions, which doesn't match
// how an orthographic (parallel-projection) camera actually works. Computing
// the direction once from the world origin toward the camera and reusing
// that quaternion everywhere keeps every billboard visually parallel.
import * as THREE from 'three';

const dummy = new THREE.Object3D();

export function computeBillboardQuaternion(cameraPosition: THREE.Vector3): THREE.Quaternion {
  dummy.position.set(0, 0, 0);
  dummy.up.set(0, 1, 0);
  dummy.lookAt(cameraPosition);
  return dummy.quaternion.clone();
}
