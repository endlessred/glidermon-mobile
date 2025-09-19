MVP (2-week) plan & progress

Goal: playable, cozy demo: animated companion, live(ish) BG feed, points, shop, hats.

Week 1 (Core Loop & Look)

✅ Skia bootstrap (web + native).

✅ Character idle loop + random blink.

✅ Hat system (anchors, per-frame nudge).

✅ Scene: skybox + nest; simple “tilt-shift” overlay (box vignette); can be improved later.

✅ HUD wired to simulator (5-min cadence).

✅ Shop + Equip UIs (buy & equip hats; spend Acorns).

⏳ Progression math polish (see next).

Week 2 (Progression & Polish)

⏳ Earning from readings (per 5-min sample):
In-range flat = 1.0×, gentle = 0.7×, out-of-range floor = 0.2×; baseline ~10/7/2 Acorns (tunable).

⏳ Daily cap: recommend 2,000–2,500 Acorns/day for demo; overflow → “Rested bonus”.

⏳ Leveling (XP is lifetime, not spent), level bar on HUD.

⏳ “In-range idle” behavior wired from glucose state (happy idle while in range).

⏳ Basic analytics (privacy-safe): session count, ticks, in-range %, purchases.

⏳ Settings: toggle visual effects (vignette/blur), Reduce Motion, text scale.

⏳ Nice-to-have: device BLE toggle remains optional; focus on phone/web demo.

4) Next steps (priority order)

Lock progression math

Implement per-tick earn → useProgressionStore.onEgvsTick(mgdl, trendCode, ts); award Acorns + XP simultaneously.

Add daily cap (e.g., 2400) with simple clamp + “rested” bucket counter.

HUD: show Acorns and Level; toast on level-up.

Behavior system

Add behavior registry: inRangeIdle = idle loop with random blink; later add outOfRangeIdle (sweaty/sad variants).

Switch behavior from glucose state in the render VM.

Scene polish (low-risk)

Keep current skybox sliding (stable). Add subtle stepped vignette (already scaffolded).

If you try blur, do it via extra <Rect> passes (no SkSG/recorders).

Content

Add 1–2 more hats; price them; verify equip + anchor offsets.

Optional: simple “Backgrounds” category (not required for MVP).

Auth & data

When Dexcom sandbox unlocks, add a data source switcher (Simulator / Dexcom / HealthKit). For MVP demo, Simulator is enough.