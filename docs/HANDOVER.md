GliderMon – Handover Snapshot (updated)

1) Where we are (working)

Rendering stack
- RN + Expo (web) with Skia.  
- Web bootstraps safely: wait for CanvasKit → then require("@shopify/react-native-skia").  
- GameCanvas draws a **square “game box”** (full device width). We’ve now removed extra blank space above/below when embedding in HUD.  

Scene
- Background: 3-frame skybox slides horizontally at 1 fps → smooth looping.  
- Nest drawn in front of background.  
- Character: 64×64 idle animation at ~8fps, with random blink loop replacement using `idle8blink.png`.  
- Hats: Equipped via cosmetics store, positioned on `headTop` anchor using pivot+offset; auto-grid detection keeps them synced with base frames.  

UI
- Tabs: HUD / Dexcom / Shop / Equip / Settings (Game tab deprecated; canvas moved into HUD between progression and glucose sections).  
- Toasts + level-up overlay are global.  
- Shop + Equip wired to cosmetics store: Acorns spent from progression store, equip switches hat.  

Health data
- Dexcom sandbox auth still blocked.  
- Simulator provides 5-minute cadence BG readings, with adjustable simSpeed in Settings.  

State
- Progression store: Acorns (soft currency), XP, levels.  
- Daily reset logic in place (`resetDailyIfNeeded`).  
- Settings store: simulator toggles, simSpeed.  

2) Known pain points
- Skia on web: must avoid `makeSubset` / `PictureRecorder` APIs; we only use `<Image>` nodes with transforms.  
- Hooks must not be conditional (resolved by always calling `useImage`).  
- Dexcom sandbox gating continues; Simulator is fallback.  

3) MVP (2-week) plan & progress

Week 1 (done)  
✅ Skia bootstrap  
✅ Idle animation + blink  
✅ Hat overlay w/ anchors  
✅ Scene: sliding skybox + nest  
✅ HUD wired to simulator  
✅ Shop/Equip UI  
✅ GameCanvas embedded into HUD, no blank padding  

Week 2 (WIP)  
⏳ Progression math polish (earn/acorn rates, daily cap, rested bonus)  
⏳ Level bar + toast on level-up  
⏳ Behavior states (in-range happy idle, etc.)  
⏳ Analytics + settings polish  

4) Next steps
- Finalize progression math, daily cap, rested bucket.  
- Hook glucose state into behavior switching.  
- Polish scene (optional vignette).  
- Add 1–2 more hats; test equip offsets.  
- Data source switcher when Dexcom unlocks.  

5) Economy
- Currency = Acorns 🌰  
- XP lifetime; levels do not spend XP  

6) Files to keep checked-in

Docs  
- `docs/HANDOVER.md` (this file)  
- `docs/MVP-PLAN.md` (unchanged, still valid)  

Core game  
- `view/GameCanvas.tsx` ← working version, embedded into HUD, no blank padding  
- `view/AnimatedSprite.tsx` ← idle+blink loop, hat overlay  

Sprites  
- `sprites/rig.ts`  

Cosmetics & shop  
- `stores/cosmeticsStore.ts`  
- `screens/ShopScreen.tsx`  
- `screens/EquipScreen.tsx`  

Progression  
- `stores/progressionStore.ts`  
- `screens/HudScreen.tsx`  

Settings & data  
- `stores/settingsStore.ts`  
- `src/DexcomEgvsScreen.tsx`  
- `state/dataSource.ts` (simulator)  

Bootstrap  
- `SkiaBootstrap.tsx`  
- canvaskit.js/wasm assets  

Assets  
- `assets/idle8.png`, `assets/idle8blink.png`  
- `assets/GliderMonLeafHat.png`, `assets/GliderMonGreaterHat.png`  
- `assets/skybox/gliderNestSkybox.png`  
- `assets/nest.png`  
- `assets/ASSET_MANIFEST.md`  

7) Notes
- Always resolve assets with expo-asset on web.  
- Never gate hooks.  
- Hat offsets assume 64×64 base.  

8) Open issues
- Blur effects can still cause web crashes (stick with vignette).  
- Dexcom auth pending.  
- Daily reset must always run (AppState + interval guard).  