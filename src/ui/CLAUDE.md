# User Interface System

Complete UI layer for the mobile application, organized into reusable components, screens, and navigation. Built with React Native and follows modern mobile design patterns.

## Directory Structure

### Components (`components/`)
Reusable UI building blocks used across multiple screens.

### Screens (`screens/`)
Full-screen views that represent major app sections.

### Navigation (`navigation/`)
Navigation structure and routing logic.

## Key Components

### Game UI Components

#### `AcornBadge.tsx`
- **Purpose**: Displays player's acorn (points) count with animations
- **Features**: Real-time updates, color coding, smooth transitions
- **Usage**: Header component in most screens

#### `LevelBar.tsx`
- **Purpose**: Visual XP progress bar showing level progression
- **Features**: Animated fill, level milestones, overflow handling
- **Integration**: Connected to progression store

#### `DailyCapBar.tsx`
- **Purpose**: Shows daily progress toward activity goals
- **Features**: Progress visualization, streak indicators
- **Mechanics**: Encourages daily engagement

### Daily Goals Components

#### `DailyGoalBoard.tsx`
- **Purpose**: Single handcrafted "Today's Goals" panel (kraft-paper `CraftPanel`) rendered on the Home screen, replacing the old stack of separate white app cards
- **Behavior**: Generates a fixed daily batch (`goalsStore.resetDailyIfNeeded`) once per day; renders only currently-visible goals (pending, not snoozed) as `DailyGoalRow`s inside the one board
- **Integration**: Reads `goalsStore`; renders one `DailyGoalRow` per visible goal

#### `DailyGoalRow.tsx`
- **Purpose**: One goal as a small paper strip inside `DailyGoalBoard` — icon, title, a plain reward amount, a material completion control (cream/outlined circle idle, green felt `CheckBadge` when completing), and a "⋯" button that swaps the completion segment for inline Skip/Snooze/Cancel
- **Props**: `goal: ActiveGoalWithDef` (a `goalsStore` active-goal instance joined with its catalog definition)
- **Completion flow**: on tap, plays a local pop/float animation (checkmark swaps to `CheckBadge`, reward text floats up and fades) for ~480ms, *then* calls `goalsStore.completeGoal` → `progressionStore.grantAcorns` → `useAcornSource().spawnFromRef` to fly acorns from the row to the balance badge — deferred just long enough for the animation to read as a beat before the row leaves the board (completing removes it from the visible list and refills the slot)
- **States**: `glucose_response` category goals get a gold left-edge accent (currently-actionable); mid-completion gets a pale-green tint (`PALE_GREEN` token) matching the rest of the handcrafted state language
- **Integration**: `goalsStore.completeGoal` / `skipGoal` / `snoozeGoal`

### Daily Adventure Board (`components/adventureBoard/`)

The dynamic goal content is drawn **once** by a pure Skia routine and reused two
ways: as a texture on an in-scene plane in the Home room (the real board), and as
an on-screen `<Canvas>` in the Morning Check-In reveal. There is no RN overlay
over the GL view any more — GliderMon and furniture depth-sort against the board
in-world (`render/adventureBoard3D.ts`, see `game/housing/CLAUDE.md`).

#### `AdventureBoardDrawing.ts`
- **Purpose**: The ONE drawing layer — pure `@shopify/react-native-skia` imperative calls (`drawAdventureBoard(canvas, {model, density, width, height, revealStep?})`), no RN `View`/`Text`. `createAdventureBoardPicture(...)` wraps it in an `SkPicture` for on-screen use; `adventureBoardTexture.ts` runs it offscreen for the in-world plane. Draws `model` only — never touches goal/CGM/reward logic.
- **Contents** (`density="full"`, Goals camera / check-in preview): a quiet cream sheet full-bleeding the frame opening — no stitched border, no per-item cards, one hairline divider. `not-planned` → "Plan today's adventures!" + a "Start Check-In" pill; `active`/`complete` → primary glucose row (big actual in-range % / count · short label + `Target: N%` · `On track`/`Off track` while the 5h window is open, `Done`/`Missed` after — **never a checkmark before the window ends**), then 2 minor-goal rows (completed first — ○ / green check), then `🌰 N today · +M more`, `DONE` stamp when complete. No title — the wooden plaque already says "Today's Adventures".
- **`density="compact"`** (the small in-room texture when the Goals camera isn't active): one glance only — `Plan / today`, or the primary metric + `N left`, or `DONE!` in green. No goal rows.
- **Reveal**: `revealStep` gates the full layout (primary → minor 1 → minor 2 → summary) for the check-in's staggered reveal; `undefined` shows everything.

#### `adventureBoardTexture.ts` + `useAdventureBoardTextureSet.ts`
- **Purpose**: `renderAdventureBoardTextureSet(model, version)` renders the compact + full boards to `Skia.Surface.MakeOffscreen`, reads the RGBA pixels back, and flips the rows (Skia is top-left origin, `THREE.DataTexture` samples bottom-left). The hook memoizes by `serializeAdventureBoardState(model)` — so the GPU texture regenerates **only** on a real board-state change (goal set, goal completed, acorns earned, window ended), never on GliderMon movement / camera pans / unrelated Home re-renders — defers the render off the commit path, and keeps the previous set until the new one is ready (no blank board).
- Consumed by `HudScreen` → `IsometricRoomView3D`'s `boardTextures` prop → `adventureBoard3D.ts`'s `setTextures`.

#### `AdventureBoardCanvas.tsx`
- **Purpose**: On-screen `<Canvas><Picture>` of the same drawing, sized to the opening aspect via `onLayout`. Used only by the Morning Check-In reveal step (inside `DailyAdventureBoardPreview`'s wooden frame), so the ritual and the house board read as the same object.

#### `AdventureBoardA11y.tsx`
- **Purpose**: Non-visual (1×1, clipped) screen-reader summary of the board, mounted by `HudScreen` while the Goals camera is active — the in-scene texture carries no accessible text of its own. `accessibilityRole` "button" (opens Check-In) when a plan can still be made, else "summary".

#### `useAdventureBoardModel()` (`data/selectors/adventureBoard.ts`)
- A memoized projection of `goalsStore` + `checkInStore` + `progressionStore` + `gameStore` (no new store). CGM math stays in `checkInStore.evaluateGlucoseGoal`. `computeAcornsEarnedToday()` / `useDailyAcorns()` is the centralized "acorns earned today" value: `progressionStore.dailyEarned` (CGM ticks) **plus** each completed daily goal's reward **plus** `CHECK_IN_ACORNS` per completed slot — because `grantAcorns` / `grantCheckInXp` credit the balance but not `dailyEarned`. `serializeAdventureBoardState(m)` is the render-only version key (glucose % bucketed to 2% so CGM wobble doesn't churn the texture).

#### `DailyAdventureBoardPreview.tsx`
- **Purpose**: Craft "wooden frame + easel + plaque" wrapper for off-world use (check-in reveal today). The frame's own padding is the wooden border; `AdventureBoardCanvas` full-bleeds the opening inside it. The seam where a real render-target of the Spine frame could later drop in.

### Check-In Components (see `docs/superpowers/specs/2026-07-19-checkin-system-design.md`)

#### `CheckInCard.tsx`
- **Purpose**: A deliberate, special-feeling interaction on the Home screen when a check-in slot is available — styled as a pale-lavender paper note (one restrained tape accent, purple CTA) rather than a generic banner
- **Behavior**: Shows for the active time window (Morning 6–11 AM, Midday 11 AM–4 PM, Evening 5 PM–midnight). Each slot's availability only depends on its own window/null-ness now — a missed slot no longer blocks later ones that day.
- **Props**: `{ onPress: () => void }` — reads which slot is available itself via `checkInStore.availableSlot()`, doesn't take one as a prop
- **Integration**: Reads from `checkInStore`; `onPress` opens `CheckInFlowModal`

#### `CheckInFlowModal.tsx`
- **Purpose**: Multi-step guided check-in flow driven by GliderMon dialogue and animations, presented as a page-sheet modal. Rebuilt on the hand-crafted `components/checkin/` kit (see below) — warm cream paper full-screen surface, dark-brown ink, felt CTAs — so the ritual matches Home/Outfit/Shop rather than the old white-surface/purple-button look.
- **Features**: Whichever check-in happens first that day runs `GoalSettingFlow` (3 stops: greeting → one grouped goal surface [glucose goal, grouped Time-in-range/Highs/Lows, + optional meal/activity] → completion); later check-ins run `GradingFlow` (greeting → glucose recap bar → per-goal Yes/Partly/No self-report → completion). Both end on the shared `CheckInCompleteStep` (`CheckInDialogueCard` + `CheckInRewardCard` + "Done"), dismissed explicitly. XP is no longer shown here (leveling is being phased out — same call as Home); the store still grants it. `completeCheckIn` / acorn-spawn / session-freeze timing are unchanged from the pre-redesign flow.
- **Props**: `{ visible: boolean; slot: CheckInSlot | null; onClose: () => void }`
- **Integration**: Calls `checkInStore.completeCheckIn(slot, payload)` on submit; triggers the acorn-flight animation via `useAcornSource`; hero shows the player's own `useActiveLocalOutfit()` character
- **Dev deep links**: `glidermon://checkin` clears today's check-ins (so the card reappears and the next check-in runs goal-setting); `glidermon://checkin/grade` seeds a goal so the next check-in runs the grading flow regardless of time of day (`checkInStore.devClearToday` / `devSeedGrading`).

#### `components/checkin/` — reusable daily-ritual kit
- **Purpose**: The shared visual system for GliderMon's guided rituals (Morning check-in today; Midday/Evening reflection and future rituals reuse it). Sits on top of `components/handcrafted/` (CraftPanel, CraftActionButton, tokens) and adds only a small "morning" accent set (`checkin/tokens.ts`) — not a second design system.
- **Components**: `CheckInFlowShell` (cream paper surface + fixed header/progress + a GliderMon hero kept mounted & stable across steps + a 180ms fade/slide step transition; `centered` for short steps, `scroll` for the goal picker; `heroSize` `"large"`/`"medium"`), `CheckInHeader` (cardstock strip, small SVG sunrise, quiet outlined close), `CheckInProgress` (dot/thread "N of M" marker — not a bar; done+current dots muted-green, future dots kraft), `GlidermonCheckInHero` (one centered `SpineCharacter` stage, transparent, memoised, `ambientIdle={false}` so the character plays only the step's animation — no fidgets/reading mixing into a cheer; `size` only changes the character scale, never the GL frame, so the canvas is never resized mid-flow), `CheckInDialogueCard` (GliderMon's line — cream or lavender note; `compact`/`popIn`/`popDelay`), `CheckInChoiceCard` (full-row-tappable goal option ≥52px, thin ink outline vs the panels' heavier one, cream idle / pale-green felt selected, quick press push + 1.015 select pop; `hideControl` for immediate-answer rows), `CheckInChoiceGroup` (uppercase section heading), `CheckInRewardCard` (kraft card, stitched star, felt acorn, big `+N` primary line + quiet `★ Daily acorn cap +0.17` secondary; card pop then acorn pop), `CheckInCompleteStep`, `CraftPrimaryButton` (semantic wrapper over `CraftActionButton`; `size="lg"` for a step's single CTA).
- **Size hierarchy**: intro/completion = large hero + `size="lg"` CTA; goal picker / grading recap+report = `heroSize="medium"` so the choices lead. `CraftActionButton` gained a `size` prop (`"md"` default, `"lg"` = taller + bigger label) used app-wide-safely.
- **Reward value**: `CheckInRewardCard`'s cap line shows the real `CHECK_IN_CAP_BONUS` (0.17) exported from `checkInStore` and used by `computeCapMultiplier` — not a hardcoded string. XP is not shown (leveling phased out); the store still grants it.
- **Hero animations per step**: intro `Idle/IdleWave`, glucose/recap/self-report `Idle/Idle`, completion `CheckIn/Cheer`; grading intro is adherence-driven (`CheckIn/Cheer` / `Idle/IdleWave` / `High/HighWorriedFace`, evening `ReadBook/ReadBook`). With `ambientIdle={false}` these play clean on track 0 (looping) — `SpineCharacter` forwards the flag to `controller.idleDriver.setAmbientBehaviorsEnabled()`.

#### `GoalPicker.tsx`
- **Purpose**: Older reusable goal selection list (single-select rows). No longer used by `CheckInFlowModal` after the redesign (replaced by `checkin/CheckInChoiceCard` + `CheckInChoiceGroup`); kept for any other caller.
- **Features**: Preset options + optional free-text custom goal; single-select with visual confirmation

### Feedback Components

#### `ToastHost.tsx`
- **Purpose**: Global notification system for user feedback
- **Features**: Auto-dismiss, queuing, different severity levels
- **Pattern**: Non-blocking notifications for actions/errors

### Data Visualization

#### `GlucoseWindTrail.tsx`
- **Purpose**: Real-time glucose chart with trend visualization
- **Features**: Scrolling timeline, color-coded ranges, trend arrows
- **Data Source**: Live glucose readings from health services or simulator
- **Integration**: Core gameplay element

### Developer Tools

#### `DevDebugPanel.tsx`
- **Purpose**: Development-only debugging interface
- **Features**: State inspection, action triggers, performance metrics
- **Visibility**: Only shown in development builds

### Utility Components

#### `ErrorBoundary.tsx`
- **Purpose**: React error boundary for graceful error handling
- **Features**: Crash prevention, error reporting, recovery options
- **Coverage**: Wraps critical UI sections

#### `TiltShiftEffect.tsx`
- **Purpose**: Visual effect for depth-of-field/focus effects
- **Usage**: Game canvas enhancements, visual polish

## Screen Architecture

### `HudScreen.tsx` (Main/Home)
- **Purpose**: Primary gameplay screen, redesigned to share the handcrafted/paper-craft visual language established on `EquipScreen.tsx` (see `handcrafted/` below), kept calmer/less decorated since it holds the daily health ritual
- **Components** (fixed, non-scrolling top region): `HomeHeader` (compact kraft-cardstock name/acorn/streak strip), `NestCraftPanel` wrapping the room/pet 3D view, `CameraPresetTabs` (Nest / Glidermon / Goals presets, attached directly under the frame). Scrollable region below: `CheckInCard` (when a slot is available, shown above the goal board per the hierarchy), `DailyGoalBoard`. The Adventure Board's goal content is a texture inside the GL scene now (no RN overlay); `HudScreen` feeds it via `boardTextures` (`useAdventureBoardTextureSet`) and mounts a non-visual `AdventureBoardA11y` while the Goals camera is active.
- **Layout**: Hierarchy is Glidermon/Nest first, then the check-in ritual, then Today's Goals, then currency/streak (in the compact header), then decoration — roughly 70% clean paper surfaces / 20% texture / 10% decorative accents, deliberately less busy than Equip. No glucose display or level/XP bars on Home — glucose monitoring was moved off Home, and leveling is being phased out in favor of goal-based progression (`DailyGoalBoard` is the first concrete piece of that).
- **Camera presets**: `cameraMode` (`"nest" | "glidermon" | "goals"`) is local `HudScreen` state, only changed by an explicit tab press (never by incidental manual camera movement) — passed to `IsometricRoomView3D` as the controlled `cameraMode` prop. "Nest" = wide overview; "Glidermon" = the existing close/follow character camera (untouched); "Goals" smoothly frames the Daily Adventure Board (`getAdventureBoardSlot` → `adventureBoard3D` frame center) close enough to read the in-scene goal texture while keeping room context — it does *not* open a separate screen, and swaps the board texture to `full` density. See `src/game/housing/CLAUDE.md` for `updateCameraForZoom` / the board-surface plane.

### `ShopScreen.tsx`
- **Purpose**: Entry point for the Shaded Shop -- keeps `ShadedShopViewport` (Luma/Sable in their 3D scene) visible full-bleed at all times; tapping either character opens that merchant's `components/shop/NpcStorePanel` as a bottom overlay (~62% of screen height) without hiding the scene above it
- **Data**: Reads generated stock from `data/stores/shopStockStore.ts` (persisted six-item batches per shop, natural-restock timer, daily free-restock tracking) and resolves each stock slot's display info via `data/shop/shopCatalog.ts`'s `getShopCatalogItem` -- purchase logic here just picks the matching ownership-store action (`cosmeticsStore.buy` / `housingStore.unlock*`) by the resolved item's `sourceKind`, then `progressionStore.spend` + `shopStockStore.markSlotSold`
- **Components** (`components/shop/`): `NpcStorePanel` (the one reusable store surface, configured per shop via props -- do not fork per-merchant), `ShopHeader` (name + "New stock in Xh Ym"), `ShopTabs` (Luma/Sable switcher, reuses `handcrafted/CraftTab`'s `selectedColor` override for per-shop tone), `ShopStockGrid` (3x2 `ShopStockCard`s with a fade/pop transition keyed off the stock record's `generatedAt`), `ShopPurchaseSheet` (bottom buy sheet, not a per-card button), `RestockControl` (wraps a `RestockOptions`/`DailyFreeRestockOption` pair so future subscriber/ad restock sources can be added as siblings), `ShopItemThumbnail` (picks the right underlying thumbnail renderer -- `CosmeticThumbnail`/furniture image/`PatternSwatch` -- by the item's `sourceKind`)
- **Personality tokens**: `handcrafted/tokens.ts`'s `LUMA_PEACH`/`LUMA_PALE_YELLOW` and `SABLE_PLUM`/`SABLE_DUSTY_PURPLE`/`SABLE_FELT_DARK` are used sparingly (tab accent, card backing tint, name pill) -- assigned by each character's *personality* (cheery vs. goth), not by item category; the shared cream/kraft/stitched-border craft language stays identical between the two shops

### `EquipScreen.tsx`
- **Purpose**: Cosmetic customization and inventory management
- **Features**: Item preview, outfit saving, unlock status
- **Organization**: Categorized by item type
- **Preview**: Real-time cosmetic application

### `SettingsScreen.tsx`
- **Purpose**: App configuration and preferences
- **Sections**:
  - **Data Source**: Health service connections, simulator settings
  - **Accessibility**: Text size, motion reduction, contrast
  - **Visual Effects**: Animations, particles, blur
  - **Theme**: Color scheme selection
- **Platform Awareness**: Shows appropriate health service (HealthKit/Health Connect)

### `GameScreen.tsx`
- **Purpose**: Full-screen game canvas view
- **Usage**: Immersive pet interaction mode
- **Features**: Gesture controls, behavior triggers

### `DexcomEgvsScreen.tsx`
- **Purpose**: Direct CGM device connection interface
- **Features**: Device pairing, connection status, manual readings
- **Integration**: Bluetooth system interface
- **Usage**: Alternative to health service integration

## Navigation Structure

There is no router (`@react-navigation/*` is not wired up — a dead `AppNavigator.tsx`/`PebbleTabBar.tsx` pair existed briefly and was removed). Navigation is a plain `tab` `useState` in [`App.tsx`](../../App.tsx) at the project root, rendered via `TABS.map(...)` as a row of `Pressable`s and `{tab === "X" && <XScreen />}` conditionals. Screens are plain components with no `navigation`/`route` props — pass data in as regular React props instead.

### Deep links
`App.tsx` also listens for `glidermon://` URLs (via `Linking.getInitialURL`/`addEventListener` + `parseGlidermonUrl`) and maps them onto that same `tab` state, purely for local dev/testing — jump straight to a surface instead of tapping through the app after every reload:
```bash
adb shell am start -a android.intent.action.VIEW -d "glidermon://shop/luma"
```
Supported today: `home`, `shop` (optionally `shop/luma|sable`, which opens straight to that merchant's `NpcStorePanel` and skips the Shaded Shop walk-up), `outfit`, `gallery`, `settings`. Arcade is deliberately excluded.

Also `checkin` (clears today's check-ins so the Home check-in card reappears and the next check-in runs goal-setting) and `checkin/grade` (seeds a goal so the next check-in runs the grading flow regardless of time of day) — both land on HOME; see `checkInStore.devClearToday` / `devSeedGrading`.

Also `streak/<started|continued|frozen|lost|commitment|milestone7|milestone30|milestone100|milestone365>` — jumps straight to a specific streak popup by forcing `streakStore` into that scenario (via `src/data/stores/streakTestScenarios.ts`, shared with `StreakTestButton.tsx`'s on-screen panel) and switching to HOME, e.g. `adb shell am start -a android.intent.action.VIEW -d "glidermon://streak/lost"`. Useful for screenshotting a specific splash without the on-screen test panel in the way (both the panel and the full-screen splash capture touch, so there's no way to toggle the panel off once a splash is showing).

**Adding a link for a new surface:** add an entry to the `DEEP_LINK_TABS` map in `App.tsx` (path segment → `Tab` value); if the surface takes a sub-parameter like shop's category, follow the same pattern as `shopCategory`/`shopLinkNonce` — parse it in `parseGlidermonUrl`, hold it in state, and pass it into the screen as a prop (with a `key` bump if the screen only reads its initial value once). This only requires a JS change — no native rebuild — *unless* `android/app/src/main/java/com/kevin/glidermon/MainActivity.kt`'s `onNewIntent` override is ever lost (e.g. a `pnpm expo prebuild` regenerating the file), in which case links stop working while the app is already running (cold-start links still work without it) and the override needs to be re-added.

## Design System Integration

### Theme Support
All components use the centralized theme system:
```typescript
const { colors, typography, spacing, borderRadius } = useTheme();
```

### Responsive Design
- **Adaptive Layouts**: Adjust to different screen sizes
- **Safe Areas**: Proper handling of notches and device-specific layouts
- **Accessibility**: Support for larger text sizes, screen readers

### Animation System
- **Consistent Timing**: Standardized animation durations
- **Performance**: Optimized for 60fps on mobile devices
- **Reduced Motion**: Respects accessibility preferences

## State Management Integration

### Data Binding
Components connect to stores for reactive updates:
```typescript
// Real-time data binding
const acorns = useProgressionStore(s => s.acorns);
const level = useProgressionStore(s => s.level);
const glucoseData = useGameStore(s => s.engine.trail);
```

### Action Dispatching
```typescript
// User actions trigger store updates
const purchaseItem = useCosmeticsStore(s => s.purchase);
const equipItem = useCosmeticsStore(s => s.equip);
```

## Accessibility Features

### Screen Reader Support
- **Semantic Labels**: All interactive elements have descriptive labels
- **Navigation**: Logical tab order and focus management
- **Announcements**: Important state changes announced

### Visual Accessibility
- **High Contrast**: Theme variations for better visibility
- **Text Scaling**: Supports dynamic type sizing
- **Color Independence**: Information not conveyed by color alone

### Motor Accessibility
- **Large Touch Targets**: Minimum 44pt touch areas
- **Gesture Alternatives**: Button alternatives for gesture controls

## Performance Optimization

### Rendering Efficiency
- **Memoization**: Heavy components use React.memo()
- **Lazy Loading**: Non-critical components loaded on demand
- **List Virtualization**: Large lists use efficient rendering

### Memory Management
- **Cleanup**: Proper useEffect cleanup for subscriptions
- **Image Optimization**: Appropriate sizing and caching
- **Animation Cleanup**: Stopped animations release resources

## Testing Strategy

### Component Testing
```typescript
// Example component test
import { render, fireEvent } from '@testing-library/react-native';
import AcornBadge from './AcornBadge';

test('displays correct acorn count', () => {
  const { getByText } = render(<AcornBadge count={150} />);
  expect(getByText('150')).toBeTruthy();
});
```

### Integration Testing
- **Screen Navigation**: Test tab switching and deep linking
- **Data Flow**: Verify store updates reflect in UI
- **User Workflows**: Complete user journeys (purchase, equip, etc.)

### Visual Testing
- **Screenshot Tests**: Capture component appearances
- **Cross-Platform**: Verify consistency across iOS/Android
- **Theme Testing**: Verify all theme variations render correctly

## Common Patterns

### Loading States
```typescript
const [loading, setLoading] = useState(false);

if (loading) {
  return <LoadingSpinner />;
}
```

### Error Handling
```typescript
try {
  await performAction();
} catch (error) {
  addToast('Action failed: ' + error.message);
}
```

### Conditional Rendering
```typescript
{isAuthorized && <HealthKitControls />}
{hasCheckIn && <CheckInCard onPress={openCheckIn} />}
```

The UI system provides a complete, accessible, and performant interface that seamlessly integrates with the game engine and health monitoring systems.