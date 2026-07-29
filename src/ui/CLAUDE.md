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

### Check-In Components (planned — see `docs/superpowers/specs/2026-07-19-checkin-system-design.md`)

#### `CheckInCard.tsx`
- **Purpose**: Glowing card that appears on the HUD home screen when a check-in slot is available
- **Behavior**: Shows for the active time window (Morning 6–11 AM, Midday 11 AM–4 PM, Evening 5 PM–midnight); dismisses after completion
- **Props**: `slot: 'morning' | 'midday' | 'evening'`, `onPress: () => void`
- **Integration**: Reads from checkInStore; drives navigation into CheckInFlowScreen

#### `CheckInFlowScreen.tsx`
- **Purpose**: Multi-step guided check-in flow driven by GliderMon dialogue and animations
- **Features**: 4–5 step sequence per slot; Spine animation per step; goal pickers; self-report taps
- **Props**: `slot`, `style: 'guided' | 'quick'` (quick = Approach 1 single-screen fallback for future setting)
- **Integration**: Writes to checkInStore on completion; triggers XP burst via progressionStore

#### `GoalPicker.tsx`
- **Purpose**: Reusable goal selection list for glucose goals, meal goals, and activity goals
- **Features**: Preset options + optional free-text custom goal; single-select with visual confirmation

### Feedback Components

#### `ToastHost.tsx`
- **Purpose**: Global notification system for user feedback
- **Features**: Auto-dismiss, queuing, different severity levels
- **Pattern**: Non-blocking notifications for actions/errors

#### `LevelUpOverlay.tsx`
- **Purpose**: Celebration screen when player levels up
- **Features**: Animations, unlock reveals, progression summary
- **Integration**: Triggered by progression store changes

#### `UnlockDisplay.tsx`
- **Purpose**: Shows newly unlocked cosmetics/features
- **Features**: Item preview, unlock conditions, call-to-action
- **Usage**: Embedded in level-up flow

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

#### `LevelUpTestButton.tsx`
- **Purpose**: Testing tool for triggering level-up scenarios
- **Usage**: Development and QA testing

### Utility Components

#### `ErrorBoundary.tsx`
- **Purpose**: React error boundary for graceful error handling
- **Features**: Crash prevention, error reporting, recovery options
- **Coverage**: Wraps critical UI sections

#### `TiltShiftEffect.tsx`
- **Purpose**: Visual effect for depth-of-field/focus effects
- **Usage**: Game canvas enhancements, visual polish

#### `CutsceneDisplay.tsx`
- **Purpose**: Narrative sequence display
- **Features**: Text animation, timing control, skip functionality
- **Usage**: Tutorial, story moments, level-up celebrations

## Screen Architecture

### `HudScreen.tsx` (Main/Home)
- **Purpose**: Primary gameplay screen with live glucose monitoring
- **Components**: Glucose chart, pet display, acorn badge, level bar, CheckInCard (when slot is available)
- **Real-time**: Updates with live health data
- **Layout**: CheckInCard appears between the progress section and game canvas when a check-in window is active

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

Also `streak/<started|continued|frozen|lost|commitment>` — jumps straight to a specific streak popup by forcing `streakStore` into that scenario (via `src/data/stores/streakTestScenarios.ts`, shared with `StreakTestButton.tsx`'s on-screen panel) and switching to HOME, e.g. `adb shell am start -a android.intent.action.VIEW -d "glidermon://streak/lost"`. Useful for screenshotting a specific splash without the on-screen test panel in the way (both the panel and the full-screen splash capture touch, so there's no way to toggle the panel off once a splash is showing).

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
{hasUnlocks && <UnlockDisplay items={newUnlocks} />}
```

The UI system provides a complete, accessible, and performant interface that seamlessly integrates with the game engine and health monitoring systems.