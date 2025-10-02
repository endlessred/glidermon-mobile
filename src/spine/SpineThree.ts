// src/spine/SpineThree.ts
import * as THREE from "three";
import {
  Skeleton,
  AnimationState,
  Slot,
  Attachment,
  RegionAttachment,
  MeshAttachment,
  ClippingAttachment,
  SkeletonClipping,
  Color,
  Physics,
} from "@esotericsoftware/spine-core";

/** Slots that should NOT use alphaTest (tiny/soft details) */
const PUPIL_SLOT_REGEX = /(^|[_-])(L|R)?_?Pupil$/i;

/** Default anti-halo threshold; trims fringes on most parts */
const DEFAULT_ALPHA_TEST = 0.0015;

/** Minimal cache with “material variants” keyed by (texture, alphaTest, pma) */
class MaterialCache {
  private map = new Map<string, THREE.MeshBasicMaterial>();

  private key(tex: THREE.Texture, alphaTest: number, pma: boolean) {
    return `${(tex as any).uuid}|${alphaTest}|${pma ? 1 : 0}`;
  }

  get(texture: THREE.Texture, premultipliedAlpha = true, alphaTest = DEFAULT_ALPHA_TEST) {
    // Anti-halo sampling: clamp edges, no mips, linear filtering
    if (texture) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      // Do NOT set texture.premultiplyAlpha (Expo GL warns on pixelStorei)
      texture.needsUpdate = true;
    }

    const k = this.key(texture, alphaTest, premultipliedAlpha);
    let mat = this.map.get(k);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        premultipliedAlpha,
        depthTest: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        alphaTest,
        blending: THREE.NormalBlending,
        toneMapped: false,
      });
      if (mat.map) mat.map.needsUpdate = true;
      this.map.set(k, mat);
    }
    return mat;
  }
}

/** One renderable per slot (geometry is rewritten each frame from Spine world vertices). */
class SlotRenderable {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  geom: THREE.BufferGeometry;
  pos: THREE.BufferAttribute;
  uv: THREE.BufferAttribute;
  color: THREE.Color = new THREE.Color(1, 1, 1);

  constructor() {
    this.geom = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(4 * 3), 3);
    this.uv  = new THREE.BufferAttribute(new Float32Array(4 * 2), 2);
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
    if (this.mesh.material !== mat) this.mesh.material = mat;
  }

  setVisible(v: boolean) {
    this.mesh.visible = v;
  }
}

/** Spine color (0..1) → premultiplied RGB */
function spineColorToPremultipliedRGB(c: Color, out: THREE.Color, alpha: number) {
  out.setRGB(c.r * alpha, c.g * alpha, c.b * alpha);
}

/** Provide textures by page name or filename used in the atlas. */
export type SpineTextureResolver = (pageOrFileName: string) => THREE.Texture | undefined;

export class SkeletonMesh extends THREE.Object3D {
  private skeleton: Skeleton;
  private state: AnimationState;
  private slotsRenderables: SlotRenderable[] = [];
  private materialCache = new MaterialCache();
  private resolveTexture: SpineTextureResolver;
  private premultipliedAlpha = true; // your outline-free baseline used PMA tinting
  private clipper = new SkeletonClipping();

  constructor(skeleton: Skeleton, state: AnimationState, resolveTexture: SpineTextureResolver) {
    super();
    this.skeleton = skeleton;
    this.state = state;
    this.resolveTexture = resolveTexture;

    for (let i = 0; i < skeleton.slots.length; i++) {
      const r = new SlotRenderable();
      r.mesh.renderOrder = i; // honor draw order
      this.slotsRenderables.push(r);
      this.add(r.mesh);
    }

    this.matrixAutoUpdate = false;
  }

  update(deltaSeconds: number) {
    this.state.update(deltaSeconds);
    this.skeleton.update(deltaSeconds); // physics/constraints
    this.state.apply(this.skeleton);
    this.skeleton.updateWorldTransform(Physics.update);
    this.refreshMeshes();
  }

  refreshMeshes() {
    const drawOrder = this.skeleton.drawOrder;
    const slots = this.skeleton.slots;

    this.clipper.clipEnd();

    for (let i = 0; i < drawOrder.length; i++) {
      const slot = drawOrder[i];
      const renderable = this.slotsRenderables[slots.indexOf(slot)];
      renderable.mesh.renderOrder = i;

      const attachment = slot.getAttachment();

      if (attachment instanceof ClippingAttachment) {
        this.clipper.clipStart(slot, attachment);
        renderable.setVisible(false);
        continue;
      }

      if (!attachment) {
        renderable.setVisible(false);
        this.clipper.clipEndWithSlot(slot);
        continue;
      }

      if (attachment instanceof RegionAttachment) {
        this.updateRegionAttachment(slot, attachment, renderable);
      } else if (attachment instanceof MeshAttachment) {
        this.updateMeshAttachment(slot, attachment, renderable);
      } else {
        renderable.setVisible(false);
      }

      this.clipper.clipEndWithSlot(slot);
    }

    this.clipper.clipEnd();
  }

  private uploadTriangles(
    r: SlotRenderable,
    positionsXY: Float32Array, // [x,y,...]
    uvs: Float32Array,         // [u,v,...]
    indices: Uint16Array | number[],
    slot: Slot
  ) {
    if (this.clipper.isClipping()) {
      // Use the length-based overload that worked for you.
      (this.clipper as any).clipTriangles(
        positionsXY,
        positionsXY.length,
        indices as any,
        (indices as any).length,
        uvs,
        2
      );

      const v = (this.clipper as any).clippedVertices as number[] | undefined;
      const t = (this.clipper as any).clippedTriangles as number[] | undefined;
      const u = (this.clipper as any).clippedUVs as number[] | undefined;

      if (!t || !v || !u || t.length === 0 || v.length === 0) {
        r.setVisible(false);
        return;
      }

      const vCount = (v.length / 2) | 0;
      r.ensureSize(vCount, t.length);

      const p = r.pos.array as Float32Array;
      for (let i = 0, j = 0; i < v.length; i += 2, j += 3) {
        p[j]   = v[i];
        p[j+1] = v[i + 1];
        p[j+2] = 0;
      }
      r.pos.needsUpdate = true;

      (r.uv.array as Float32Array).set(u, 0);
      r.uv.needsUpdate = true;

      r.geom.setIndex(new THREE.BufferAttribute(Uint16Array.from(t), 1));
    } else {
      const vCount = positionsXY.length / 2;
      r.ensureSize(vCount, (indices as any).length);

      const p = r.pos.array as Float32Array;
      for (let i = 0, j = 0; i < positionsXY.length; i += 2, j += 3) {
        p[j]   = positionsXY[i];
        p[j+1] = positionsXY[i + 1];
        p[j+2] = 0;
      }
      r.pos.needsUpdate = true;

      (r.uv.array as Float32Array).set(uvs, 0);
      r.uv.needsUpdate = true;

      const tris = indices as any;
      if (!r.geom.getIndex() || r.geom.getIndex()!.count !== tris.length) {
        r.geom.setIndex(new THREE.BufferAttribute(Uint16Array.from(tris), 1));
      } else {
        (r.geom.getIndex()!.array as Uint16Array).set(tris, 0);
        r.geom.getIndex()!.needsUpdate = true;
      }
    }

    // PMA-safe tint & visibility (outline-free baseline)
    const a = slot.color.a * this.skeleton.color.a;
    spineColorToPremultipliedRGB(slot.color, r.color, a);
    const mat = r.mesh.material as THREE.MeshBasicMaterial;
    mat.color.copy(r.color);
    mat.opacity = a;
    mat.transparent = a < 0.999;

    r.setVisible(a > 0.001);
    r.geom.computeBoundingSphere();
    r.mesh.matrix.identity();
  }

  private textureForRegionAttachment(att: RegionAttachment): THREE.Texture | undefined {
    const region: any = att.region as any;
    const candidates: Array<string | undefined> = [
      region?.page?.name,
      region?.rendererObject?.page?.name,
      region?.name,
      att.name ? `${att.name}.png` : undefined,
      "skeleton.png",
    ];

    for (const key of candidates) {
      if (!key) continue;
      const tex = this.resolveTexture(String(key));
      if (tex) return tex;
    }
    return undefined;
  }

  /** Choose the right material variant per slot (pupils get alphaTest=0) */
  private chooseMaterial(tex: THREE.Texture, slot: Slot) {
    const isPupil = PUPIL_SLOT_REGEX.test(slot.data?.name || "");
    const alphaTest = isPupil ? 0.0 : DEFAULT_ALPHA_TEST;
    return this.materialCache.get(tex, this.premultipliedAlpha, alphaTest);
  }

  private updateRegionAttachment(slot: Slot, attachment: RegionAttachment, r: SlotRenderable) {
    const world = new Float32Array(8); // 4 verts * (x,y)
    // Correct for 4.2.43: pass Slot (not slot.bone)
    attachment.computeWorldVertices(slot, world, 0, 2);

    const uvs = attachment.uvs as Float32Array;
    const tris = new Uint16Array([0, 1, 2, 2, 3, 0]);

    const tex = this.textureForRegionAttachment(attachment);
    if (!tex) { r.setVisible(false); return; }
    r.setMaterial(this.chooseMaterial(tex, slot));

    this.uploadTriangles(r, world, uvs, tris, slot);
  }

  private updateMeshAttachment(slot: Slot, attachment: MeshAttachment, r: SlotRenderable) {
    const numFloats = attachment.worldVerticesLength; // x,y pairs
    const verts2D = new Float32Array(numFloats);
    attachment.computeWorldVertices(slot, 0, numFloats, verts2D, 0, 2);

    const uvs = attachment.uvs as Float32Array;
    const tris = attachment.triangles as Uint16Array | number[];

    const region: any = (attachment as any).region;
    const candidates: Array<string | undefined> = [
      region?.page?.name,
      region?.rendererObject?.page?.name,
      region?.name,
      attachment.name ? `${attachment.name}.png` : undefined,
      "skeleton.png",
    ];
    let tex: THREE.Texture | undefined;
    for (const key of candidates) {
      if (!key) continue;
      const t = this.resolveTexture(String(key));
      if (t) { tex = t; break; }
    }
    if (!tex) { r.setVisible(false); return; }

    r.setMaterial(this.chooseMaterial(tex, slot));

    this.uploadTriangles(r, verts2D, uvs, tris, slot);
  }
}
