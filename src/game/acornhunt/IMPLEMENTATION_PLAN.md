# Acorn Hunt Implementation Plan

## Step-by-Step Implementation Tasks

### Phase 1: Core Data Foundation
1. ✅ **Create base types** (`types.ts`)
   - Character, Move, Relic, RunState interfaces
   - Battle system types
   - UI state types

2. **Create character definitions** (`characters.ts`)
   - All 7 NPCs + player with emojis
   - Base stats per spec
   - Move assignments
   - Passive abilities

3. **Create move definitions** (`moves.ts`)
   - All 21+ moves with descriptions
   - Damage formulas and effects
   - Target specifications

4. **Create relic system** (`relics.ts`)
   - 15 starter relics by rarity
   - Effect functions
   - Requirements and descriptions

### Phase 2: Game Systems
5. **Create enemy definitions** (`enemies.ts`)
   - 4 enemy types (Bark Beetle, Branch Snake, Sap Slime, Hollow Acorn)
   - Stats and AI behaviors
   - Move sets

6. **Implement RNG system** (`rng.ts`)
   - Seeded random number generator
   - Utility functions for weighted choices

7. **Create map generation** (`mapGenerator.ts`)
   - Node graph generation
   - Seeded map creation
   - Path validation

8. **Implement battle system** (`battleSystem.ts`)
   - Turn order calculation
   - Damage formula
   - Status effects
   - Battle resolution

### Phase 3: Game Logic
9. **Create event system** (`events.ts`)
   - 3-4 random events with choices
   - Outcome effects on run state

10. **Implement run manager** (`runManager.ts`)
    - Run state management
    - Node progression
    - Reward calculation

11. **Create AI system** (`ai.ts`)
    - Enemy move selection
    - Simple behavior patterns

### Phase 4: UI Components
12. **Create main screen** (`AcornHuntScreen.tsx`)
    - Entry point and navigation
    - Screen state management

13. **Party selection UI** (`PartySelectScreen.tsx`)
    - Character picker with emojis
    - Stats display
    - Team composition

14. **Map screen** (`MapScreen.tsx`)
    - Node visualization
    - Path selection
    - Progress tracking

15. **Battle screen** (`BattleScreen.tsx`)
    - Combatant display with emojis
    - Battle log
    - Speed controls

16. **Event/Treasure screens** (`EventScreen.tsx`, `TreasureScreen.tsx`)
    - Choice cards
    - Outcome display

17. **Results screen** (`ResultsScreen.tsx`)
    - Run summary
    - Rewards breakdown

### Phase 5: Integration
18. **Store integration** (`acornHuntStore.ts`)
    - Zustand store for game state
    - Persistence if needed

19. **Navigation integration**
    - Add to main app navigator
    - Entry point from arcade/Juno

20. **Progression integration**
    - Connect to existing progressionStore
    - Acorn and XP rewards

### Phase 6: Polish
21. **Asset requirements list**
    - Document needed Spine animations
    - Texture requirements
    - Audio needs

22. **Error handling**
    - Graceful failures
    - Save state recovery

23. **Testing utilities**
    - Debug controls
    - Quick test scenarios

## Current Status
- ✅ Phase 1, Task 1 Complete (types.ts created)
- 🔄 Phase 1, Task 2 In Progress (character definitions)

## Next Immediate Task
Complete `characters.ts` with all character definitions including:
- Emoji representations for all NPCs
- Base stats matching the spec
- Move assignments
- Simple placeholder passive effects

This creates a solid foundation to build the rest of the system on top of.