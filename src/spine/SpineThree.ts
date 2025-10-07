import * as THREE from "three";
import {
  Skeleton,
  AnimationState,
  Slot,
  RegionAttachment,
  MeshAttachment,
  ClippingAttachment,
  SkeletonClipping,
  Color,
  Physics,
} from "@esotericsoftware/spine-core";
import { setMaskRecolorOpaque } from "./MaskRecolor";
import { updateHueIndexedRecolorAlpha } from "./HueIndexedRecolor";

/** Slots that should NOT use alphaTest (tiny/soft details) */
const PUPIL_SLOT_REGEX = /(^|[_-])(L|R)?_?Pupil$/i;

/** Slots that use hue-indexed recolor (have "Shader" in name) */
const SHADER_SLOT_REGEX = /Shader$/i;

/** Soft slots that should stay in transparent pass for blending */
const SOFT_SLOT_REGEX = /^$/; // No slots need transparent pass - all can be hard cutouts

/** Default anti-halo threshold; trims fringes on most parts */
const DEFAULT_ALPHA_TEST = 0.0015;

/** Minimal cache with “material variants” keyed by (texture, alphaTest, pma) */
class MaterialCache {
  private map = new Map<string, THREE.MeshBasicMaterial>();

  private key(tex: THREE.Texture, alphaTest: number, pma: boolean) {
    return `${(tex as any).uuid}|${alphaTest}|${pma ? 1 : 0}`;
  }

  get(texture: THREE.Texture, premultipliedAlpha = true, alphaTest = DEFAULT_ALPHA_TEST) {
    if (texture) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
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

/** Normalize material render pass based on slot type to preserve draw order */
export function normalizeMaterialForSlot(slot: Slot, mat: THREE.Material) {
  const name = slot.data?.name || "";
  if (PUPIL_SLOT_REGEX.test(name)) return; // 🚫 do NOT touch pupils

  const m: any = mat;
  const isSoft = SOFT_SLOT_REGEX.test(name);

  // Check attachment name, not slot name for shader detection
  const attachment = slot.getAttachment?.();
  const attName = (attachment && attachment.name) ? String(attachment.name) : "";
  const isShaderAttachment = SHADER_SLOT_REGEX.test(attName);

  if (m.isShaderMaterial) {
    // Hue-indexed shader materials are always opaque cutouts (no mask recolor logic needed)
    if (isShaderAttachment) {
      m.transparent = false;  // ⬅️ render in opaque pass
      m.depthTest = true;
      m.depthWrite = false;
      // No setMaskRecolorOpaque call needed - hue-indexed materials handle this internally
      return;
    }

    // Legacy mask recolor shaders: hard parts should be opaque cutouts; soft parts stay transparent
    if (isSoft) {
      m.transparent = true;
      m.depthTest = false;
      m.depthWrite = false;
      setMaskRecolorOpaque(m, false); // Stay in transparent pass
    } else {
      m.transparent = false;  // ⬅️ render in opaque pass
      m.depthTest = true;
      m.depthWrite = false;
      setMaskRecolorOpaque(m, true); // Force alpha=1.0 for opaque cutout
    }
    return;
  }

  if (m.isMeshBasicMaterial) {
    // Basic textures: hard parts opaque, soft parts transparent painter's sort
    if (isSoft) {
      m.transparent = true;
      m.depthTest = false;
      m.depthWrite = false;
    } else {
      m.transparent = false;
      m.depthTest = true;
      m.depthWrite = false;
    }
  }
}

/** One renderable per slot (geometry is rewritten each frame from Spine world vertices). */
class SlotRenderable {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
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
    this.mesh.frustumCulled = false;
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

  setMaterial(mat: THREE.Material) {
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
  private premultipliedAlpha = true; // outline-free baseline uses PMA tinting
  private clipper = new SkeletonClipping();

  /** Hook: return a material for this slot+texture (or null to use default). */
  public materialOverride?: (slot: Slot, tex: THREE.Texture) => THREE.Material | null;

  constructor(skeleton: Skeleton, state: AnimationState, resolveTexture: SpineTextureResolver) {
    super();
    this.skeleton = skeleton;
    this.state = state;
    this.resolveTexture = resolveTexture;

    for (let i = 0; i < skeleton.slots.length; i++) {
      const r = new SlotRenderable();
      r.mesh.renderOrder = i; // honor draw order
      r.mesh.userData.slotName = skeleton.slots[i].data.name;
      this.slotsRenderables.push(r);
      this.add(r.mesh);
    }

    this.matrixAutoUpdate = false;
  }

  update(deltaSeconds: number) {
    this.state.update(deltaSeconds);
    this.skeleton.update(deltaSeconds); // physics/constraints
    this.state.apply(this.skeleton);
    {
      const physicsUpdate = (Physics as any)?.update;
      this.skeleton.updateWorldTransform(typeof physicsUpdate === "function" ? physicsUpdate : undefined);
    }
    this.refreshMeshes();
  }

  refreshMeshes() {
    const drawOrder = this.skeleton.drawOrder;
    const slots = this.skeleton.slots;

    this.clipper.clipEnd();

    for (let i = 0; i < drawOrder.length; i++) {
      const slot = drawOrder[i];
      const renderable = this.slotsRenderables[slots.indexOf(slot)];

      // Base renderOrder from Spine
      let ro = i;

      // If this is the hat, give it a tiny negative bias so it draws just before the next things,
      // and (if the hat uses a shader) make sure it's in the opaque pass so it doesn't get forced last.
      if ((slot.data?.name || "") === "Hat_Base") {
        ro = i - 0.5; // tiny, local bias (no huge hacks)
        const hatMat: any = renderable.mesh.material;
        if (hatMat?.isShaderMaterial) {
          // draw with opaque queue; alpha cutouts must be handled in the shader
          hatMat.transparent = false;
          hatMat.depthTest = true;
          hatMat.depthWrite = false;
        }
      }

      renderable.mesh.renderOrder = ro;

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
    positionsXY: Float32Array,
    uvs: Float32Array,
    indices: Uint16Array | number[],
    slot: Slot
  ) {
    if (this.clipper.isClipping()) {
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

    // ----- Tint / alpha handling (UNCHANGED pupil behavior) -----
    const a = slot.color.a * this.skeleton.color.a;
    const material: any = r.mesh.material;

    if (material?.isMeshBasicMaterial) {
      // Original PMA tint path (pupil-safe) — unchanged
      spineColorToPremultipliedRGB(slot.color, r.color, a);
      material.color.copy(r.color);
      material.opacity = a;
      material.transparent = a < 0.999;
    } else if (material?.isShaderMaterial && material.uniforms) {
      const slotName = slot.data?.name || "";
      const attachment = slot.getAttachment?.();
      const attName = (attachment && attachment.name) ? String(attachment.name) : "";
      const isShaderAttachment = SHADER_SLOT_REGEX.test(attName);

      if (isShaderAttachment) {
        // Hue-indexed shader materials only need global alpha
        updateHueIndexedRecolorAlpha(material, a);
      } else {
        // Legacy mask recolor shaders get slot*skeleton alpha
        if (material.uniforms && material.uniforms.uGlobalAlpha) {
          material.uniforms.uGlobalAlpha.value = a;
        }
        if (material.uniforms && material.uniforms.uSlotColor && material.uniforms.uSlotColor.value) {
          material.uniforms.uSlotColor.value.set(slot.color.r, slot.color.g, slot.color.b);
        }
      }
      // Do NOT touch depth flags here — hat opacity is handled above for Hat_Base only
    }

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

  /** Choose the right material variant per slot (pupils get alphaTest=0). */
  private chooseMaterial(tex: THREE.Texture, slot: Slot) {
    // First let the app override (used for recolor)
    if (this.materialOverride) {
      const override = this.materialOverride(slot, tex);
      if (override) return override;
    }
    const isPupil = PUPIL_SLOT_REGEX.test(slot.data?.name || "");
    const alphaTest = isPupil ? 0.0 : DEFAULT_ALPHA_TEST;
    return this.materialCache.get(tex, this.premultipliedAlpha, alphaTest);
  }

  private updateRegionAttachment(slot: Slot, attachment: RegionAttachment, r: SlotRenderable) {
    const world = new Float32Array(8);
    attachment.computeWorldVertices(slot, world, 0, 2);
    const uvs = attachment.uvs as Float32Array;
    const tris = new Uint16Array([0, 1, 2, 2, 3, 0]);

    const tex = this.textureForRegionAttachment(attachment);
    if (!tex) { r.setVisible(false); return; }
    r.setMaterial(this.chooseMaterial(tex, slot));
    normalizeMaterialForSlot(slot, r.mesh.material);
    this.uploadTriangles(r, world, uvs, tris, slot);
  }

  private updateMeshAttachment(slot: Slot, attachment: MeshAttachment, r: SlotRenderable) {
    const numFloats = attachment.worldVerticesLength;
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
    normalizeMaterialForSlot(slot, r.mesh.material);
    this.uploadTriangles(r, verts2D, uvs, tris, slot);
  }
}
