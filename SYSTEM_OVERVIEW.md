# GliderMon System Overview

Complete documentation of the GliderMon mobile application architecture, systems, and codebase organization.

## 📱 Application Overview

GliderMon is a React Native mobile application that gamifies blood glucose monitoring through a virtual pet system. Users connect their glucose monitoring devices (CGMs) or health platforms to keep their virtual pet healthy and happy.

### Core Value Proposition
- **Health Motivation**: Encourages consistent glucose monitoring through gamification
- **Real-time Feedback**: Live glucose data visualization with trend analysis
- **Cross-platform**: Works on iOS, Android, and Web with platform-specific integrations
- **Accessibility**: Comprehensive accessibility features and customization options

## 🏗️ System Architecture

### High-Level Data Flow
```
Health Platforms → Unified Health Service → Game Engine → UI Components
       ↓                    ↓                   ↓           ↓
HealthKit/Health      Cross-platform      Scoring &    Interactive
Connect/Simulator         API             Progression    Pet Game
```

### Component Architecture
```
┌─ src/
├─ engine/          # Core game logic (scoring, state, economy)
├─ health/          # Health platform integrations (HealthKit, Health Connect)
├─ bluetooth/       # Direct device communication (CGMs)
├─ ui/              # User interface (components, screens, navigation)
├─ game/            # Visual game system (sprites, behaviors, canvas)
├─ data/            # State management (stores, hooks)
├─ assets/          # Asset management and resources
├─ styles/          # Theming and design system
├─ utils/           # Utilities and helpers
└─ types/           # TypeScript definitions
```

## 🎯 Key Systems

### 1. Health Monitoring System (`src/health/`)
**Purpose**: Cross-platform glucose data integration

**Capabilities**:
- iOS HealthKit integration via `react-native-health`
- Android Health Connect integration via `react-native-health-connect`
- Unified API that automatically detects platform
- Real-time monitoring with background updates
- Historical data access and analysis

**Data Sources**:
- Apple Health (iOS) - Dexcom, FreeStyle, etc.
- Health Connect (Android) - Google health ecosystem
- Bluetooth CGMs - Direct device connection
- Simulator - Development and offline mode

### 2. Game Engine (`src/engine/`)
**Purpose**: Core gameplay mechanics and progression

**Features**:
- Real-time glucose data processing
- XP and level progression system
- Time-in-range scoring algorithms
- Streak tracking and bonuses
- Economy system for virtual currency
- Deterministic simulation for testing

**Integration**: Processes health data into game rewards and progression

### 3. Visual Game System (`src/game/`)
**Purpose**: Interactive pet visualization and behaviors

**Components**:
- Sprite management and animation
- Behavior system with AI patterns
- React Native Skia-based rendering
- Real-time pet reactions to glucose data
- Gesture controls and interactions
- Visual effects and celebrations

### 4. User Interface (`src/ui/`)
**Purpose**: Complete mobile UI with navigation

**Screens**:
- **Home/HUD**: Main screen with glucose chart and pet
- **Shop**: Purchase cosmetics with earned currency
- **Equip**: Customize pet appearance and themes
- **Settings**: Health connections, accessibility, preferences

**Features**:
- Bottom tab navigation
- Real-time data visualization
- Accessibility support (screen readers, scaling, contrast)
- Cross-platform design consistency

### 5. Data Management (`src/data/`)
**Purpose**: Application state and reactive data flow

**Stores** (Zustand):
- `gameStore`: Game engine state and glucose data
- `progressionStore`: Player XP, levels, achievements
- `settingsStore`: User preferences and configuration
- `cosmeticsStore`: Cosmetic items and customization
- `toastStore`: Notifications and user feedback

**Hooks**: Reactive data access and computed values

### 6. Theme System (`src/styles/`)
**Purpose**: Comprehensive design system and customization

**Features**:
- Dark/light mode support
- 5 unlockable theme variations (Cute, Cyberpunk, Forest, Ocean, Sunset)
- Accessibility features (high contrast, motion reduction)
- Responsive typography with dynamic text scaling
- Consistent color palettes and design tokens

## 🔧 Technical Stack

### Core Technologies
- **React Native 0.81.4**: Cross-platform mobile framework
- **TypeScript 5.3.3**: Type safety and developer experience
- **Expo 54**: Development tools and platform services
- **React Native Skia**: High-performance graphics and animations
- **Zustand 5.0.8**: Lightweight state management

### Platform Integrations
- **iOS**: HealthKit via `react-native-health`
- **Android**: Health Connect via `react-native-health-connect`
- **Bluetooth**: CGM devices via `react-native-ble-plx`
- **Storage**: AsyncStorage for persistence

### Development Tools
- **pnpm**: Fast package management
- **ESLint**: Code linting and formatting
- **Metro**: React Native bundler
- **Flipper**: Development debugging

## 📊 Data Flow Architecture

### Real-time Health Data Processing
```
1. Health Platform/Device → 2. Health Service → 3. Game Store → 4. Engine Processing → 5. UI Updates
   (HealthKit/CGM)           (Unified API)      (onEgvs)       (Scoring/XP)        (Reactive)
```

### User Interaction Flow
```
1. UI Action → 2. Store Action → 3. State Update → 4. Engine Logic → 5. UI Reaction
   (Purchase)    (buy item)        (deduct coins)    (unlock check)    (show success)
```

### Theme and Customization
```
1. User Selection → 2. Settings Store → 3. Theme Computation → 4. Component Updates
   (choose theme)     (persist choice)    (apply variation)     (reactive styling)
```

## 🎮 Game Mechanics

### Progression System
- **XP Gain**: Earned from time-in-range glucose readings
- **Levels**: Unlock new cosmetics and features
- **Streaks**: Bonus multipliers for consistent monitoring
- **Currency**: Acorns earned through gameplay for purchases

### Pet Behavior System
- **Mood States**: Happy, concerned, alert based on glucose levels
- **Animations**: Dynamic pet reactions to real-time health data
- **Interactions**: Touch gestures trigger pet responses
- **Customization**: Unlockable hats, themes, and visual effects

### Reward Mechanics
- **Immediate Feedback**: Visual celebrations for good readings
- **Long-term Goals**: Level progression and cosmetic unlocks
- **Social Elements**: Achievement sharing (future feature)
- **Accessibility**: Multiple reward types (visual, haptic, audio)

## 🛡️ Security & Privacy

### Health Data Protection
- **Local Processing**: Health data processed on-device only
- **No Cloud Storage**: Sensitive health information never transmitted
- **Platform Compliance**: Follows HealthKit and Health Connect guidelines
- **User Control**: Easy permission management and data access control

### Data Minimization
- **Rolling Window**: Only stores 1-hour of glucose history
- **Selective Access**: Only requests necessary health permissions
- **Transparent Usage**: Clear explanations of how data is used

## ♿ Accessibility Features

### Visual Accessibility
- **High Contrast**: Enhanced visibility mode
- **Dynamic Text**: Supports 50%-200% text scaling
- **Color Independence**: Information conveyed through multiple channels
- **Screen Reader**: Full VoiceOver/TalkBack support

### Motor Accessibility
- **Large Touch Targets**: Minimum 44pt interactive areas
- **Gesture Alternatives**: Button options for gesture controls
- **Simplified Navigation**: Clear, logical navigation paths

### Cognitive Accessibility
- **Consistent UI**: Predictable interface patterns
- **Clear Language**: Simple, direct communication
- **Visual Hierarchy**: Clear information organization
- **Reduced Motion**: Respects motion sensitivity preferences

## 🚀 Performance Optimization

### Rendering Performance
- **60fps Target**: Smooth animations and interactions
- **GPU Acceleration**: Hardware-accelerated graphics via Skia
- **Efficient Updates**: Selective component re-rendering
- **Memory Management**: Automatic cleanup and garbage collection

### Data Efficiency
- **Lazy Loading**: Load components and assets on demand
- **Caching Strategy**: Intelligent caching of computed values
- **Batch Updates**: Group state changes for efficiency
- **Background Processing**: Efficient handling of background tasks

## 🧪 Testing Strategy

### Development Testing
- **Simulator Mode**: Realistic glucose patterns for development
- **Mock Services**: Test health integrations without real devices
- **Debug Tools**: Comprehensive debugging interfaces
- **Hot Reloading**: Fast development iteration

### Quality Assurance
- **Cross-platform Testing**: iOS, Android, and Web compatibility
- **Device Testing**: Real CGM device integration testing
- **Accessibility Testing**: Screen reader and scaling validation
- **Performance Testing**: Memory usage and rendering performance

## 📱 Platform-Specific Features

### iOS Integration
- **HealthKit**: Native Apple Health integration
- **Dynamic Type**: iOS accessibility text scaling
- **Haptic Feedback**: iOS-style tactile feedback
- **Metal Rendering**: Optimized graphics performance

### Android Integration
- **Health Connect**: Google health platform integration
- **Material Design**: Android design language adherence
- **Edge-to-Edge**: Modern Android navigation support
- **Vulkan Graphics**: Advanced graphics API where available

### Web Platform
- **Progressive Web App**: Web-based access
- **WebGL Graphics**: Browser-compatible rendering
- **Responsive Design**: Adapts to various screen sizes
- **Offline Support**: Core functionality without network

## 📋 System Documentation

Each major system has detailed documentation in its respective `CLAUDE.md` file:

- [`src/engine/CLAUDE.md`](src/engine/CLAUDE.md) - Game engine and mechanics
- [`src/health/CLAUDE.md`](src/health/CLAUDE.md) - Health monitoring integration
- [`src/bluetooth/CLAUDE.md`](src/bluetooth/CLAUDE.md) - Bluetooth device communication
- [`src/ui/CLAUDE.md`](src/ui/CLAUDE.md) - User interface components and screens
- [`src/game/CLAUDE.md`](src/game/CLAUDE.md) - Visual game system and behaviors
- [`src/data/CLAUDE.md`](src/data/CLAUDE.md) - State management and data flow
- [`src/assets/CLAUDE.md`](src/assets/CLAUDE.md) - Asset management and resources
- [`src/styles/CLAUDE.md`](src/styles/CLAUDE.md) - Theme system and design tokens
- [`src/utils/CLAUDE.md`](src/utils/CLAUDE.md) - Utilities and helper functions
- [`src/types/CLAUDE.md`](src/types/CLAUDE.md) - TypeScript type definitions

## 🎯 Future Roadmap

### Planned Features
- **Social Features**: Friend connections and leaderboards
- **Advanced Analytics**: Detailed glucose pattern analysis
- **More Pet Types**: Additional virtual companions
- **Wearable Integration**: Smartwatch complications
- **AI Insights**: Personalized health recommendations

### Technical Improvements
- **Performance Optimization**: Further rendering improvements
- **Offline Capabilities**: Enhanced offline functionality
- **Platform Expansion**: Additional platform support
- **Accessibility Enhancements**: Continued accessibility improvements

---

This system overview provides a comprehensive understanding of the GliderMon application architecture, enabling efficient development, maintenance, and future enhancements.