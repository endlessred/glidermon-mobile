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

#### `GoalsList.tsx`
- **Purpose**: Vertical stack of small auto-generated diabetes-management goal cards, rendered on the HUD home screen (one goal per row, not a horizontal scroller)
- **Behavior**: Generates a fixed daily batch (`goalsStore.resetDailyIfNeeded`) once per day; renders only currently-visible goals (pending, not snoozed)
- **Integration**: Reads `goalsStore`; renders one `GoalCard` per visible goal

#### `GoalCard.tsx`
- **Purpose**: Single goal row — icon on the left, title, an acorn reward chip, a circular checkmark button, and a "⋯" button that swaps the checkmark+⋯ segment for inline Skip/Snooze actions
- **Props**: `goal: ActiveGoalWithDef` (a `goalsStore` active-goal instance joined with its catalog definition)
- **Reward flow**: on checkmark tap, calls `progressionStore.grantAcorns` then `useAcornSource().spawnFromRef` to fly acorns from the row to the balance badge (same reusable pattern as `CheckInFlowModal`)
- **Integration**: `goalsStore.completeGoal` / `skipGoal` / `snoozeGoal`

### Check-In Components (see `docs/superpowers/specs/2026-07-19-checkin-system-design.md`)

#### `CheckInCard.tsx`
- **Purpose**: Glowing card that appears on the HUD home screen when a check-in slot is available
- **Behavior**: Shows for the active time window (Morning 6–11 AM, Midday 11 AM–4 PM, Evening 5 PM–midnight). Each slot's availability only depends on its own window/null-ness now — a missed slot no longer blocks later ones that day.
- **Props**: `{ onPress: () => void }` — reads which slot is available itself via `checkInStore.availableSlot()`, doesn't take one as a prop
- **Integration**: Reads from `checkInStore`; `onPress` opens `CheckInFlowModal`

#### `CheckInFlowModal.tsx`
- **Purpose**: Multi-step guided check-in flow driven by GliderMon dialogue and animations, presented as a page-sheet modal
- **Features**: Whichever check-in happens first that day runs `GoalSettingFlow` (set a glucose goal for the next 5 hours + optional meal/activity goals); later check-ins that day run `GradingFlow` (glucose recap + 3-way self-report: Yes/Partly/No). Both end on a shared `RewardStep` showing the real XP+acorns for that slot, dismissed explicitly (doesn't auto-close).
- **Props**: `{ visible: boolean; slot: CheckInSlot | null; onClose: () => void }`
- **Integration**: Calls `checkInStore.completeCheckIn(slot, payload)` on submit; triggers the acorn-flight animation via `useAcornSource`

#### `GoalPicker.tsx`
- **Purpose**: Reusable goal selection list for glucose goals, meal goals, and activity goals
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
- **Purpose**: Primary gameplay screen, styled as a tamagotchi-like device
- **Components**: Room/pet 3D view with a reserved status strip (name, acorn badge, streak badge) above the canvas, GoalsList, CheckInCard (when a slot is available)
- **Layout**: The room card occupies the top third of the screen; below it in the scrollable area is GoalsList, then CheckInCard when active. No glucose display or level/XP bars on Home — glucose monitoring was moved off Home, and leveling is being phased out in favor of goal-based progression (GoalsList is the first concrete piece of that).

### `ShopScreen.tsx`
- **Purpose**: In-game store for cosmetic purchases
- **Features**: Item catalog, purchase flow, currency display
- **Categories**: Hats, themes, effects
- **Economy**: Integrates with progression system

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
adb shell am start -a android.intent.action.VIEW -d "glidermon://shop/floors"
```
Supported today: `home`, `shop` (optionally `shop/cosmetics|floors|walls`, which also skips ShopScreen's walk-up intro), `outfit`, `gallery`, `settings`. Arcade is deliberately excluded.

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