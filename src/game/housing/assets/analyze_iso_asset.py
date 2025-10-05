#!/usr/bin/env python3
from PIL import Image
import numpy as np
import argparse
from dataclasses import dataclass, asdict
import json
from typing import Optional, Tuple

@dataclass
class BBox:
    x: int; y: int; w: int; h: int

@dataclass
class Result:
    path: str
    canvas_w: int; canvas_h: int
    bbox: BBox
    contact_y_auto: Optional[int]
    skirt_auto: Optional[int]
    constants: dict
    notes: str

def _mask(img: Image.Image, alpha_thresh: int) -> np.ndarray:
    arr = np.array(img.convert("RGBA"))
    return arr[...,3] > alpha_thresh

def _bbox(mask: np.ndarray) -> Optional[BBox]:
    ys, xs = np.where(mask)
    if ys.size == 0: return None
    y0, y1 = int(ys.min()), int(ys.max())
    x0, x1 = int(xs.min()), int(xs.max())
    return BBox(x=x0, y=y0, w=int(x1-x0+1), h=int(y1-y0+1))

def _smooth(v: np.ndarray, k: int = 5) -> np.ndarray:
    if k <= 1: return v
    pad = k // 2
    vp = np.pad(v, (pad, pad), mode='edge')
    kernel = np.ones(k) / k
    return np.convolve(vp, kernel, mode='valid')

def _auto_contact_line(mask: np.ndarray, bb: BBox) -> Optional[int]:
    # generic jump detector (works sometimes; verify visually)
    rows = mask[bb.y:bb.y+bb.h, bb.x:bb.x+bb.w]
    cover = rows.sum(axis=1).astype(np.int32)
    sm = _smooth(cover, 5)
    diffs = np.diff(sm)
    # search bottom 40% (at least 20px, at most 120px)
    h = len(diffs)
    search_len = min(120, max(20, int(0.4*h)))
    start = h - search_len
    if start < 0: start = 0
    seg = diffs[start:]
    if seg.size == 0: return None
    idx = int(np.argmax(seg))
    y_in_bb = start + idx + 1
    return int(bb.y + y_in_bb)

def analyze(path: str, mode: str, alpha_thresh: int, override_skirt: Optional[int]) -> Result:
    img = Image.open(path)
    m = _mask(img, alpha_thresh)
    bb = _bbox(m)
    if bb is None:
        return Result(path, img.width, img.height, BBox(0,0,0,0), None, None, {}, "No opaque pixels.")
    contact_auto = _auto_contact_line(m, bb)
    skirt_auto = None
    if contact_auto is not None:
        skirt_auto = (bb.y + bb.h - 1) - contact_auto + 1

    constants = {}
    notes = []
    if mode == "floor":
        TILE_W = bb.w
        TILE_H = round(TILE_W / 2)
        TILE_SKIRT = max(0, bb.h - TILE_H) if override_skirt is None else override_skirt
        constants.update(dict(TILE_W=TILE_W, TILE_H=TILE_H, TILE_SKIRT=TILE_SKIRT))
        notes.append("floor mode: TILE_H assumed = TILE_W/2 (2:1 iso).")
    elif mode == "wall":
        WALL_W = bb.w
        WALL_SKIRT = (skirt_auto if skirt_auto is not None else 0) if override_skirt is None else override_skirt
        WALL_H = max(0, bb.h - WALL_SKIRT)
        constants.update(dict(WALL_W=WALL_W, WALL_H=WALL_H, WALL_SKIRT=WALL_SKIRT))
        notes.append("wall mode: skirt from heuristic unless overridden.")
    else:  # auto
        notes.append("auto mode: providing bbox and a heuristic contact line; verify visually.")
        if override_skirt is not None:
            notes.append(f"override skirt={override_skirt}px applied to compute H constants.")
    return Result(path, img.width, img.height, bb, contact_auto, skirt_auto, constants, "; ".join(notes))

def main():
    ap = argparse.ArgumentParser(description="Analyze isometric PNG: opaque bbox + floor contact estimate.")
    ap.add_argument("paths", nargs="+", help="PNG(s) to analyze")
    ap.add_argument("--mode", choices=["auto","floor","wall"], default="auto",
                    help="Hint asset type for constants (default auto)")
    ap.add_argument("--alpha-thresh", type=int, default=0, help="Alpha threshold (default 0)")
    ap.add_argument("--override-skirt", type=int, default=None, help="Force skirt px (e.g., 16)")
    ap.add_argument("--json", action="store_true", help="Emit JSON")
    args = ap.parse_args()

    out = []
    for p in args.paths:
        r = analyze(p, args.mode, args.alpha_thresh, args.override_skirt)
        out.append(r)

    if args.json:
        def enc(o):
            if isinstance(o, BBox): return asdict(o)
            if isinstance(o, Result):
                d = asdict(o); d["bbox"] = asdict(o.bbox); return d
            raise TypeError()
        print(json.dumps(out, default=enc, indent=2))
    else:
        for r in out:
            print(f"\n[{r.path}]  canvas={r.canvas_w}x{r.canvas_h}")
            print(f"  opaque bbox: x={r.bbox.x}, y={r.bbox.y}, w={r.bbox.w}, h={r.bbox.h}")
            if r.contact_y_auto is not None:
                print(f"  contact_y_auto={r.contact_y_auto}  (skirt_auto={r.skirt_auto}px)")
            if r.constants:
                print(f"  constants: {r.constants}")
            if r.notes: print(f"  notes: {r.notes}")

if __name__ == "__main__":
    main()
