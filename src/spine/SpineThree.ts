// src/spine/SpineThree.ts
import * as THREE from "three";
import {
  Skeleton,
  AnimationState,
  Slot,
  Attachment,
  RegionAttachment,
  MeshAttachment,
  Color,
  Physics,
} from "@esotericsoftware/spine-core";

/**
 * Minimal cache so we don't recreate materials per frame.
 */
class MaterialCache {
  private map = new Map<THREE.Texture, THREE.MeshBasicMaterial>();
  get(texture: THREE.Texture, premultipliedAlpha = true) {
    let mat = this.map.get(texture);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        premultipliedAlpha,
        depthTest: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      mat.map && (mat.map.needsUpdate = true);
      this.map.set(texture, mat);
    }
    return mat;
  }
}

/**
 * A simple "renderable" per slot (one mesh per attachment).
 * Geometry is updated each frame from Spine world vertices.
 */
class SlotRenderable {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  geom: THREE.BufferGeometry;
  pos: THREE.BufferAttribute;
  uv: THREE.BufferAttribute;
  color: THREE.Color = new THREE.Color(1, 1, 1);
  attachmentRef: Attachment | null = null;

  constructor() {
    this.geom = new THREE.BufferGeometry();
    // Allocate for the largest common case (quad). We'll resize for meshes.
    this.pos = new THREE.BufferAttribute(new Float32Array(4 * 3), 3);
    this.uv = new THREE.BufferAttribute(new Float32Array(4 * 2), 2);
    this.geom.setAttribute("position", this.pos);
    this.geom.setAttribute("uv", this.uv);
    this.geom.setIndex([0, 1, 2, 2, 3, 0]);
    this.mesh = new THREE.Mesh(this.geom, new THREE.MeshBasicMaterial({ transparent: true }));
    this.mesh.matrixAutoUpdate = false;
  }

  ensureSize(vertexCount: number, indexCount?: number) {
    if (this.pos.count !== vertexCount) {
      this.pos = new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3);
      this.geom.setAttribute("position", this.pos);
    }
    if (this.uv.count !== vertexCount) {
      this.uv = new THREE.BufferAttribute(new Float32Array(vertexCount * 2), 2);
      this.geom.setAttribute("uv", this.uv);
    }
    if (indexCount && (!this.geom.getIndex() || this.geom.getIndex()!.count !== indexCount)) {
      this.geom.setIndex(new THREE.BufferAttribute(new Uint16Array(indexCount), 1));
    }
  }

  setMaterial(mat: THREE.MeshBasicMaterial) {
    if (this.mesh.material !== mat) {
      this.mesh.material = mat;
    }
  }

  setVisible(v: boolean) {
    this.mesh.visible = v;
  }
}

/**
 * Small helpers to convert Spine color (premultiplied alpha safe)
 */
function spineColorToPremultipliedRGB(c: Color, out: THREE.Color, alpha: number) {
  // spine Color components are 0..1
  out.setRGB(c.r * alpha, c.g * alpha, c.b * alpha);
}

/**
 * Provide textures by page name or filename used in the atlas.
 * For example: (name) => pageTextures[name] || pageTextures["glider.png"]
 */
export type SpineTextureResolver = (pageOrFileName: string) => THREE.Texture | undefined;

/**
 * SkeletonMesh
 * - Add to a THREE.Scene
 * - Call update(delta) each frame (or let your render loop call apply on state + skeleton then call refreshMeshes())
 */
export class SkeletonMesh extends THREE.Object3D {
  private skeleton: Skeleton;
  private state: AnimationState;
  private slotsRenderables: SlotRenderable[] = [];
  private materialCache = new MaterialCache();
  private resolveTexture: SpineTextureResolver;
  private premultipliedAlpha = true; // Spine uses PMA by default in many runtimes

  constructor(
    skeleton: Skeleton,
    state: AnimationState,
    resolveTexture: SpineTextureResolver
  ) {
    super();
    this.skeleton = skeleton;
    this.state = state;
    this.resolveTexture = resolveTexture;

    // Create one renderable per slot, in draw order
    for (let i = 0; i < skeleton.slots.length; i++) {
      const r = new SlotRenderable();
      r.mesh.renderOrder = i; // honor draw order
      this.slotsRenderables.push(r);
      this.add(r.mesh);
    }

    // Position handled by setting world vertices; we keep object at origin.
    this.matrixAutoUpdate = false;
  }

  /**
   * Typical per-frame call:
   *  state.update(delta); state.apply(skeleton); skeleton.updateWorldTransform(Physics.update); skeletonMesh.refreshMeshes();
   * If you call this method directly, it will also apply state & transform for you.
   */
  update(deltaSeconds: number) {
    this.state.update(deltaSeconds);
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform(Physics.update);
    this.refreshMeshes();
  }

  /**
   * Builds/updates meshes for the current pose.
   * Call after you've applied animations to the skeleton.
   */
  refreshMeshes() {
    const drawOrder = this.skeleton.drawOrder;
    const slots = this.skeleton.slots;

    for (let i = 0; i < drawOrder.length; i++) {
      const slot = drawOrder[i];
      const renderable = this.slotsRenderables[slots.indexOf(slot)];
      renderable.mesh.renderOrder = i;

      const attachment = slot.getAttachment();
      if (!attachment) {
        renderable.setVisible(false);
        continue;
      }

      if (attachment instanceof RegionAttachment) {
        this.updateRegionAttachment(slot, attachment, renderable);
      } else if (attachment instanceof MeshAttachment) {
        this.updateMeshAttachment(slot, attachment, renderable);
      } else {
        // Unsupported attachment types (Clipping, Point, Path, etc.)
        renderable.setVisible(false);
      }
    }
  }

  private updateRegionAttachment(slot: Slot, attachment: RegionAttachment, r: SlotRenderable) {
    const worldVertices = new Float32Array(8); // 4 verts * (x,y)
    attachment.computeWorldVertices(slot.bone, worldVertices, 0, 2);

    // Ensure attributes for a quad
    r.ensureSize(4, 6);

    // Position buffer (xyz), z=0
    const p = r.pos.array as Float32Array;
    p[0] = worldVertices[0];  p[1] = worldVertices[1];  p[2] = 0;
    p[3] = worldVertices[2];  p[4] = worldVertices[3];  p[5] = 0;
    p[6] = worldVertices[4];  p[7] = worldVertices[5];  p[8] = 0;
    p[9] = worldVertices[6];  p[10] = worldVertices[7]; p[11] = 0;
    r.pos.needsUpdate = true;

    // UVs from the region
    const uvs = attachment.uvs; // [u0,v0, u1,v1, u2,v2, u3,v3]
    const uv = r.uv.array as Float32Array;
    uv.set(uvs, 0);
    r.uv.needsUpdate = true;

    // Triangles (two)
    r.geom.setIndex([0, 1, 2, 2, 3, 0]);

    // Material/texture: use page name or image path that the atlas assigned to this region
    // RegionAttachment has region?.rendererObject?.page?.name in some runtimes; in TS core, use region?.page?.name if present
    const pageName =
      (attachment.region && (attachment.region.page?.name || attachment.region.page?.rendererObject)) ||
      // fallback: try to guess from attachment name + ".png"
      `${attachment.name}.png`;

    const tex = this.resolveTexture(String(pageName));
    if (!tex) {
      r.setVisible(false);
      return;
    }
    const mat = this.materialCache.get(tex, this.premultipliedAlpha);
    // per-slot tint (premultiplied)
    const a = slot.color.a * this.skeleton.color.a;
    spineColorToPremultipliedRGB(slot.color, r.color, a);
    mat.color.copy(r.color);
    mat.opacity = a;
    r.setMaterial(mat);

    r.setVisible(slot.getAttachment() === attachment && slot.color.a > 0.001);
    r.geom.computeBoundingSphere();
    r.mesh.matrix.identity(); // we already baked world vertices; keep identity
  }

  private updateMeshAttachment(slot: Slot, attachment: MeshAttachment, r: SlotRenderable) {
    const numFloats = attachment.worldVerticesLength; // x,y pairs
    const numVerts = numFloats / 2;
    const worldVertices = new Float32Array(numFloats);
    attachment.computeWorldVertices(slot, 0, numFloats, worldVertices, 0, 2);

    r.ensureSize(numVerts);

    // Positions
    const p = r.pos.array as Float32Array;
    for (let i = 0, j = 0; i < numFloats; i += 2, j += 3) {
      p[j] = worldVertices[i];
      p[j + 1] = worldVertices[i + 1];
      p[j + 2] = 0;
    }
    r.pos.needsUpdate = true;

    // UVs
    const uvs = attachment.uvs;
    if (r.uv.count !== numVerts) {
      r.uv = new THREE.BufferAttribute(new Float32Array(numVerts * 2), 2);
      r.geom.setAttribute("uv", r.uv);
    }
    (r.uv.array as Float32Array).set(uvs, 0);
    r.uv.needsUpdate = true;

    // Indices
    const tris = attachment.triangles; // Uint16Array / number[]
    if (!r.geom.getIndex() || r.geom.getIndex()!.count !== tris.length) {
      r.geom.setIndex(new THREE.BufferAttribute(new Uint16Array(tris), 1));
    } else {
      (r.geom.getIndex()!.array as Uint16Array).set(tris, 0);
      r.geom.getIndex()!.needsUpdate = true;
    }

    // Material/texture
    const pageName =
      (attachment.region && (attachment.region.page?.name || attachment.region.page?.rendererObject)) ||
      `${attachment.name}.png`;

    const tex = this.resolveTexture(String(pageName));
    if (!tex) {
      r.setVisible(false);
      return;
    }
    const mat = this.materialCache.get(tex, this.premultipliedAlpha);

    const a = slot.color.a * this.skeleton.color.a;
    spineColorToPremultipliedRGB(slot.color, r.color, a);
    mat.color.copy(r.color);
    mat.opacity = a;
    r.setMaterial(mat);

    r.setVisible(slot.getAttachment() === attachment && slot.color.a > 0.001);
    r.geom.computeBoundingSphere();
    r.mesh.matrix.identity();
  }
}