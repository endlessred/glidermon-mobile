There was an issue in SpineThree.ts where the GliderMon character needed to use clipping for blinking, but once we turned it on there was an issue with the material outlines showing up in a thick chunky way. Here is an explanation of the fix:

Problem

You had two competing issues:

Clipping worked with the 6-argument clipTriangles overload, so blinking eyelids masked pupils correctly.

Outlines/halos appeared around all parts (caused by transparent padding pixels in the atlas and how Three.js samples them).

Fixing halos with a global alphaTest shaved away fringes, but also nuked small semi-transparent geometry like pupils.

Solution

We split the problem into two layers of control:

Texture sampling setup

Clamp to edge (ClampToEdgeWrapping)

Disable mipmaps (generateMipmaps = false)

Force linear filtering (LinearFilter)
→ These stop Three from sampling the transparent borders of your atlas, which are the root of halos.

Per-slot material variants

Most slots use a MeshBasicMaterial with a tiny alphaTest (≈ 0.0015). This discards 1-pixel fringe texels, killing halos without affecting solid shapes.

Pupil slots (or any delicate soft detail) get a variant with alphaTest = 0. That means “don’t discard any transparent pixels” → pupils stay visible, even if they’re mostly soft alpha.

How it works in code

We cache materials by texture + alphaTest + premultipliedAlpha. That way we can reuse the same atlas texture but with different discard settings.

When updating a slot, we check its name. If it matches PUPIL_SLOT_REGEX, we use the no-discard material. Otherwise, we use the discard material.

Example:

const isPupil = /Pupil/i.test(slot.data?.name || "");
const alphaTest = isPupil ? 0.0 : 0.0015;
const mat = materialCache.get(tex, premultipliedAlpha, alphaTest);
slotRenderable.setMaterial(mat);

Future checklist (when you see halos or missing parts)

Check clipping

If attachments vanish under masks, verify you’re using the clipTriangles overload that matches your Spine runtime.

In 4.2.43, the 6-arg overload (verts, vertsLen, tris, trisLen, uvs, stride) works.

Check texture sampling

Clamp edges, disable mipmaps, use linear filter.

Don’t set texture.premultiplyAlpha in Expo GL (it logs pixelStorei warnings).

Check materials per slot

If you see halos, use a small alphaTest.

If you lose tiny details (pupils, eyelashes), exempt those slots from alphaTest.

TL;DR

Halos → caused by transparent padding + mipmaps → fix with clamping + alphaTest.

Missing small details → caused by alphaTest discard → fix by giving those slots their own no-discard material.

Cache both variants so you can mix them in the same skeleton.