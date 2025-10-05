import * as THREE from "three";

export function createThree(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();

  // Ortho camera centered at (0,0), units = pixels in our projected space
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1000, 1000);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.left = 0;
    camera.right = w;
    camera.top = 0;
    camera.bottom = h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();

  return { renderer, scene, camera, resize };
}