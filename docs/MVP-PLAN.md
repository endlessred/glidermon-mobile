Core Game Loop

✅ EGV→Event pipeline: ingest (Dexcom/HealthKit/Simulator) → normalize → applyEgvsTick → compute rewards + events (in-range, recover, streaks, unicorns).

✅ Idle progression: award Acorns + XP on each 5-min sample (sim-speed aware), with daily cap and rested bonus overflow bucket.

✅ Behavior switching: state machine mapping glucose state → animation set (in-range idle, low/high variants later), with ambience FX hooks.

✅ Toasts & moment feedback: per-tick deltas, streaks, unicorns, cap reached; throttling + global host.


Progression & Economy

✅ Currencies: Acorns (soft), XP (lifetime), Level (derived from XP).

✅ Level curve: XP/level table or function; pacing tuned to typical daily EGV counts.

✅ Daily systems: daily reset, cap, rested bonus carryover; server-safe timestamps.

✅ Purchasing: spend Acorns, inventory flags, ownership checks, UI error states (insufficient funds, already owned).

✅ Rewards design: per-event modifiers (in-range, soft window, deviation bonus, streak bonus, focus buff window).


Content Systems

✅ Cosmetics catalog: item defs (id, name, cost, socket, texKey, pivot/offset, zBias), versioned manifest + migration.

✅ Sockets & anchors: headTop today; architecture ready for future sockets (back, foreground pet, etc.).

✅ Animation rigs: grid metadata, blink sheet support, anchor overrides per-frame; flipX, scale, subset fallback.

✅ Scenes: skybox variants, optional backgrounds; safe web rendering (no SkSG).


Health Data & Integrations

❌ HealthKit (iOS): permission flow, background delivery

❌ Health Connect (Android): permission flow, background delivery

✅ Simulator: deterministic-ish curves, jitter, seeds, speed multiplier; dev/test hooks.


Data Model & Persistence

✅ Stores (Zustand + persist): progression, cosmetics, settings, game/engine view model.

✅ Storage: platform-aware async storage wrapper (web/localStorage async + RN AsyncStorage).

✅ Schema versioning: migrations for store shape changes; integrity checks (e.g., non-negative balances).

✅ Cold start sync: syncProgressionToEngine() after rehydrate; daily reset on app foreground/interval.


UI/UX & Accessibility

✅ HUD: Acorn badge, Level bar, daily cap bar, rested bank, glucose card with trend/last update, ❌ line chart of glucose readings for past hour, drawn to look like a wind trail behind a gliding sugar glider

✅ GameCanvas embedded: square, responsive, no blank bands; overflow-hidden clipping.

✅ Level-up overlay: animated bump out/in, queued if multiple, skippable; hooks for reward scenes.

✅ Shop/Equip: price/owned/equipped states, confirmations, error toasts.

✅ Settings: simulator toggle/speed, ❌ visual effects (vignette/blur off on web), ❌ reduce motion, ❌ text scale.

❌ A11y: screen reader labels, dynamic type scaling, color-blind safe palette.


Live-Ops & Content Delivery

❌ Remote config: tweak cap, reward multipliers, feature flags without redeploy.

❌ Catalog updates: manifest fetch with signature/version; graceful fallback to bundled assets.

❌ Announcements: lightweight in-app message system (e.g., "new hat available").

Analytics & Telemetry (privacy-safe)

❌ Gameplay: sessions, ticks processed, in-range %, deltas awarded, levels gained, purchases.

❌ UX: overlay views, shop open rate, equip events.

❌ Health: only aggregate stats (no raw PHI in analytics), differential privacy where feasible.

❌ Error reporting: boundary logs (Skia bootstrap, asset failures, token errors).


Security, Privacy, Compliance

❌ Consent & disclosures: clear in-app consent for data sources; privacy policy.

❌ PHI handling: minimize/partition; secure storage; transport TLS; token encryption.

❌ Data retention: only what's necessary for gameplay and aggregates; user reset/export.

❌ HIPAA-readiness (if required): vendor/BAA considerations, audit trails, breach procedures.


Testing & Quality

❌ Smoke tests: startup, rehydrate, sync to engine, simulator tick loop, purchase/equip, level-up queue.

❌ Deterministic sim seeds for CI.

❌ Regression pack: web Skia bootstrap timing, hook order invariants, async storage persistence.

❌ Performance: low-end devices (JS budget, canvas redraws), memory (image reuse), battery.


Platform & Build

✅ Bootstrap: CanvasKit wait-gate; module load after ready; expo-asset for URIs on web.

❌ Asset pipeline: hashed assets, size checks, preloading.

✅ Versioning: semantic app versions; store migrations; compat matrix for configs.


Monetization (optional/future)

❌ Cosmetics only: real-money packs → Acorns (no pay-to-win).

❌ Offers: seasonal cosmetics, bundles; live-ops hooks to rotate catalog.

❌ Ads: occasional banner ads, watch video ads for additional acorns


Queues & Edge Cases to Handle

✅ Multi-level queue: buffer consecutive level-ups on app open; drain with skip/next.

❌ Offline/late data: process backfilled EGVs in order; prevent double awards (idempotency keys per tick).

❌ Time changes: timezone/daylight shifts; daily reset based on user's local midnight with guard.

❌ Duplicates: dedupe ticks by (source, timestamp); clamp negative or absurd values.


"Definition of Done" per major system

❌ EGV scoring: deterministic unit tests, idempotent, handles out-of-order and missing ticks.

✅ Progression: persists across reloads, daily reset verified via AppState + interval, cap + rested bonus observed in UI.

✅ Economy: purchase/equip guarded; ❌ analytics emitted; no negative balances; catalog migrations pass.

✅ Canvas: web + native parity; no SkSG/recorders on web; frame rate steady; hats align across frames.

✅ Level-up overlay: animated, queued, skippable; ❌ emits analytics; resilient to rapid state changes.

❌ Integrations: Dexcom auth loop reliable; ✅ simulator selectable; clear source indicators in HUD.


Minimal Launch Checklist

✅ Scoring + cap + rested bonus tuned and locked.

✅ Level curve set; level bar + overlay + queue implemented.

❌ Shop/Equip stable with at least 3–5 hats; catalog manifest versioned. (only 2 hats currently)

✅ HUD embeds canvas (no padding), glucose card accurate.

✅ Persistence + daily reset verified; migration path tested.

❌ Telemetry wired (privacy-safe); error reporting enabled.

❌ A11y pass; reduce motion honored; text scale OK.

✅ Crash-free boot with CanvasKit wait-gate on web.

❌ Smoke tests green on web + iOS + Android.