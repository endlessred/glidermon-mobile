# File Structure Documentation

This document explains the reorganized file structure for better engineering clarity and maintainability.

## Directory Structure

```
src/
├── engine/                    # Core game engine
│   ├── blePayload.ts
│   ├── buckets.ts
│   ├── economy.ts
│   ├── index.ts
│   ├── npc.ts
│   ├── resets.ts
│   ├── rng.ts
│   ├── scoring.ts
│   ├── simCgms.ts
│   ├── sprites.ts
│   └── state.ts
├── health/                    # Health monitoring services
│   ├── healthConnect.ts       # Android Health Connect integration
│   ├── healthKit.ts          # iOS HealthKit integration
│   └── healthService.ts      # Unified cross-platform service
├── bluetooth/                 # Bluetooth/BLE functionality
│   ├── bleClient.ts          # Main BLE client
│   └── bleClient.web.ts      # Web platform BLE client
├── ui/                        # User interface
│   ├── components/           # Reusable UI components
│   │   ├── AcornBadge.tsx
│   │   ├── CutsceneDisplay.tsx
│   │   ├── DailyCapBar.tsx
│   │   ├── DevDebugPanel.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── GlucoseWindTrail.tsx
│   │   ├── LevelBar.tsx
│   │   ├── LevelUpOverlay.tsx
│   │   ├── LevelUpTestButton.tsx
│   │   ├── TiltShiftEffect.tsx
│   │   ├── ToastHost.tsx
│   │   └── UnlockDisplay.tsx
│   ├── screens/              # Application screens
│   │   ├── DexcomEgvsScreen.tsx
│   │   ├── EquipScreen.tsx
│   │   ├── GameScreen.tsx
│   │   ├── HudScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── ShopScreen.tsx
│   └── navigation/           # Navigation components
│       └── AppNavigator.tsx
├── game/                      # Game-specific logic
│   ├── sprites/              # Sprite management
│   │   ├── rig.ts
│   │   ├── spriteCatalog.ts
│   │   └── spriteLoader.ts
│   ├── behaviors/            # Behavior system
│   │   ├── behaviorLoader.ts
│   │   ├── behaviors.ts
│   │   └── behaviorTest.ts
│   └── view/                 # Game view components
│       ├── AnimatedSprite.tsx
│       ├── BehaviorSprite.tsx
│       ├── GameCanvas.tsx
│       ├── GameCanvasWithBehaviors.tsx
│       ├── selectViewModel.ts
│       └── useGliderBehavior.ts
├── data/                      # Data management
│   ├── stores/               # Zustand stores
│   │   ├── cosmeticsStore.ts
│   │   ├── gameStore.ts
│   │   ├── levelUpStore.ts
│   │   ├── progressionStore.ts
│   │   ├── settingsStore.ts
│   │   ├── toastStore.ts
│   │   └── useAutoPruneToasts.ts
│   ├── hooks/                # React hooks
│   │   ├── useGlucoseHistory.ts
│   │   ├── useHealthKit.ts
│   │   ├── useHudVM.ts
│   │   └── useTheme.ts
│   └── dataSource.ts         # Data source configuration
├── assets/                    # Asset management
│   ├── assetMap.ts           # Asset mapping
│   ├── assetResolver.ts      # Asset resolution
│   ├── cosmetics.ts          # Cosmetic assets
│   ├── nightscoutClient.ts   # Nightscout integration
│   └── skybox/               # Skybox assets
├── styles/                    # Theming and styles
│   ├── theme.ts              # Main theme system
│   └── themeVariations.ts    # Theme variations
├── utils/                     # Utility functions
│   └── logger.ts
└── types/                     # Type definitions
    ├── base-64.d.ts
    └── zustand-augment.d.ts
```

## Architecture Principles

### 1. **Separation of Concerns**
- **Engine**: Core game logic, isolated from UI
- **Health**: Platform-specific health monitoring services
- **Bluetooth**: Device communication layer
- **UI**: All user interface components and screens
- **Game**: Game-specific rendering and behaviors
- **Data**: State management and data access

### 2. **Clear Dependencies**
- Engine has no dependencies on UI
- Health services are platform-abstracted
- UI components are reusable and modular
- Data layer provides clean interfaces

### 3. **Platform Abstraction**
- Health services work across iOS (HealthKit) and Android (Health Connect)
- Bluetooth clients support web and native platforms
- Theme system supports multiple variations

## Import Guidelines

### From Engine (`src/engine/`)
```typescript
// Other engine files
import { rng } from "./rng";

// External services
import { TrendCode } from "../bluetooth/bleClient";
```

### From UI Components (`src/ui/components/`)
```typescript
// Data layer
import { useGameStore } from "../../data/stores/gameStore";
import { useTheme } from "../../data/hooks/useTheme";

// Styles
import { colors } from "../../styles/theme";

// Other UI components
import { ErrorBoundary } from "./ErrorBoundary";
```

### From Game (`src/game/`)
```typescript
// Engine
import { scoring } from "../../engine/scoring";

// Data layer
import { useGameStore } from "../../data/stores/gameStore";

// UI
import { TiltShiftEffect } from "../../ui/components/TiltShiftEffect";

// Within game
import { behaviors } from "../behaviors/behaviors";
```

### From Data Layer (`src/data/`)
```typescript
// Engine
import { applyEgvsTick } from "../../engine/scoring";

// Styles
import { getTheme } from "../../styles/theme";

// Health services
import { unifiedHealthService } from "../../health/healthService";

// Within data layer
import { useGameStore } from "../stores/gameStore";
```

## Benefits

1. **Easier Navigation**: Engineers can quickly find files by domain
2. **Clear Dependencies**: Import paths make relationships obvious
3. **Better Testing**: Each domain can be tested in isolation
4. **Scalability**: New features fit naturally into existing structure
5. **Maintainability**: Changes are localized to relevant domains
6. **Onboarding**: New engineers understand the codebase structure quickly

## Migration Notes

All imports have been updated to reflect the new structure. The reorganization maintains functional compatibility while improving code organization and engineering clarity.