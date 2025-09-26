# Acorn Hunt - Asset Requirements for Spine Integration

This document outlines all the assets needed to replace the current emoji-based placeholders with proper Spine animations and artwork.

## Character Animations (High Priority)

### Player Character - Sugar Glider
- **Current Placeholder**: 🐿️
- **Spine Requirements**:
  - Skeleton: ≤50 bones, idle/attack/support/special animations
  - Atlas: 1024px, optimized for mobile
  - Animations: `idle`, `attack`, `support`, `special`, `hit`, `death`
- **Design Notes**: Balanced, heroic appearance, distinctive from NPCs

### Sable - Goth Squirrel
- **Current Placeholder**: 🖤🐿️
- **Spine Requirements**:
  - Skeleton: ≤50 bones
  - Atlas: 1024px
  - Animations: `idle`, `acorn_toss`, `hatpin_stab`, `shadow_juggle`, `hit`, `death`
  - Special FX: Shadow/darkness effects for special move
- **Design Notes**: Dark clothing, hatpins, edgy/alternative aesthetic, high luck theme

### Luma - Tree Frog
- **Current Placeholder**: 🐸✨
- **Spine Requirements**:
  - Skeleton: ≤50 bones
  - Atlas: 1024px
  - Animations: `idle`, `sparkle_spit`, `petal_shield`, `glow_burst`, `hit`, `death`
  - Special FX: Sparkle/healing light effects, petal/nature magic
- **Design Notes**: Magical healer, nature-themed, vibrant colors, wise appearance

### Orvus - Engineering Owl
- **Current Placeholder**: 🦉📐
- **Spine Requirements**:
  - Skeleton: ≤50 bones
  - Atlas: 1024px
  - Animations: `idle`, `wing_slam`, `blueprint_guard`, `miscalculation`, `hit`, `death`
  - Props: Blueprints, engineering tools, mechanical elements
- **Design Notes**: Scholarly, mechanical/technical accessories, defensive specialist

### Juno - Treasure Parrot
- **Current Placeholder**: 🦜🪙
- **Spine Requirements**:
  - Skeleton: ≤50 bones
  - Atlas: 1024px
  - Animations: `idle`, `token_toss`, `echo_strike`, `squawk_of_glory`, `hit`, `death`
  - Props: Coins, tokens, treasure accessories
- **Design Notes**: Colorful, treasure-obsessed, quick/agile appearance

### Moss - Lazy Sloth
- **Current Placeholder**: 🦥💤
- **Spine Requirements**:
  - Skeleton: ≤50 bones (minimal for lazy character)
  - Atlas: 1024px
  - Animations: `idle` (very slow), `lazy_swipe`, `nap_time`, `sloth_smash`, `hit`, `death`
  - Special FX: Sleep effects, slow-motion emphasis
- **Design Notes**: Extremely slow movements, sleepy expressions, powerful when motivated

### Carmine - Dramatic Cardinal
- **Current Placeholder**: 🐦‍⬛✨
- **Spine Requirements**:
  - Skeleton: ≤50 bones
  - Atlas: 1024px
  - Animations: `idle`, `dramatic_peck`, `fashion_pose`, `encore_performance`, `hit`, `death`
  - Special FX: Dramatic flair, sparkle effects, theatrical elements
- **Design Notes**: Theatrical, fashionable, dramatic poses and expressions

### Zippa - Seasonal Character
- **Current Placeholder**: 🌟⚡
- **Spine Requirements**:
  - Skeleton: ≤50 bones
  - Atlas: 1024px
  - Animations: Basic set (TBD based on seasonal theme)
- **Design Notes**: Flexible design for seasonal events/updates

## Enemy Animations (Medium Priority)

### Bark Beetle
- **Current Placeholder**: 🪲🌳
- **Spine Requirements**:
  - Skeleton: ≤40 bones
  - Atlas: 512px
  - Animations: `idle`, `nibble`, `scurry`, `hit`, `death`
- **Design Notes**: Small, quick movements, tree bark coloring

### Branch Snake
- **Current Placeholder**: 🐍🌿
- **Spine Requirements**:
  - Skeleton: ≤40 bones
  - Atlas: 512px
  - Animations: `idle`, `constrict`, `venom_spit`, `hit`, `death`
  - Special FX: Venom effects, coiling animations
- **Design Notes**: Camouflaged, branch-like appearance, threatening

### Sap Slime
- **Current Placeholder**: 🟤💧
- **Spine Requirements**:
  - Skeleton: ≤30 bones (blob-like)
  - Atlas: 512px
  - Animations: `idle`, `sticky_slap`, `blob`, `hit`, `death`
  - Special FX: Sticky/goo effects, reformation animation
- **Design Notes**: Viscous, tree sap coloring, slow movements

### Hollow Acorn Boss
- **Current Placeholder**: 🌰👹
- **Spine Requirements**:
  - Skeleton: ≤40 bones
  - Atlas: 1024px (boss priority)
  - Animations: `idle`, `acorn_slam`, `armor_up`, `dark_spores`, `hit`, `death`
  - Special FX: Dark energy, spore clouds, screen shake effects
- **Design Notes**: Large, intimidating, corrupted acorn with evil energy

## Relic Icons (Medium Priority)

### Common Relics (4 items)
- **Acorn Sneakers**: 👟🌰 → Sneakers made from acorn shells
- **Acorn Shell Shield**: 🛡️🌰 → Shield crafted from large acorn shell
- **Four-Leaf Moss**: 🍀🌿 → Lucky moss clover
- **Hummingbird Feather**: 🪶💨 → Delicate, speed-enhancing feather

### Uncommon Relics (4 items)
- **Broken Nutcracker**: 🔨💔 → Cracked but functional tool
- **Runed Acorn**: 🌰📜 → Acorn with magical inscriptions
- **Rusty Branch Armor**: 🛡️🌿 → Armor made from forest branches
- **Orvus's Sketchbook**: 📓🦉 → Engineering notebook with blueprints

### Rare Relics (4 items)
- **Pillow Fort Plans**: 🏰🛏️ → Architectural drawings for fort
- **Luma's Sparkle Ribbon**: 🎀✨ → Magical ribbon with healing properties
- **Moss's Hammock Rope**: 🪢🦥 → Sturdy rope for rest and power
- **Sable's Hatpin**: 📍🖤 → Sharp, dark pin with crit enhancement

### Legendary Relics (3 items)
- **Carmine's Feather Boa**: 🪶👑 → Extravagant performance accessory
- **Juno's Lucky Token**: 🪙🍀 → Magical coin that grants extra turns
- **Perfect Sketchbook**: 📖⭐ → Flawless engineering manual

## UI Elements (Low Priority)

### Node Icons
- **Battle Node**: ⚔️ → Crossed swords or combat symbol
- **Treasure Node**: 📦 → Treasure chest or cache
- **Event Node**: ❓ → Question mark or mystical symbol
- **Boss Node**: 👹 → Intimidating boss marker

### Status Effects
- Various buff/debuff icons for battle system
- Health bar designs
- Damage number styling

### Battle Interface
- Speed control buttons (1×, 2×, 4×)
- Turn order indicators
- Action queues

## Audio Assets (Future Consideration)

### Music Tracks
- Main theme for Acorn Hunt
- Battle music (normal and boss variants)
- Treasure/event ambient music
- Victory/defeat stingers

### Sound Effects
- Character attack sounds (unique per character)
- Impact/damage sounds
- Relic pickup sounds
- UI interaction sounds

## Technical Specifications

### Spine Version
- Target: Spine 4.1+ for latest features
- Compatibility: Ensure React Native Spine bridge support

### Performance Targets
- **Mobile Optimization**: All atlases optimized for mobile GPUs
- **Memory Budget**: Total texture memory ≤ 64MB
- **Animation Complexity**: Prioritize smooth 60fps on mid-range devices
- **LOD System**: Implement detail reduction at 2×/4× battle speed

### Atlas Organization
- **Characters**: Individual 1024px atlases per character
- **Enemies**: Shared 512px atlas for common enemies, separate 1024px for boss
- **UI Elements**: Shared 512px atlas for all UI elements
- **Effects**: Separate atlas for particle effects and VFX

## Implementation Priority

### Phase 1 (MVP)
1. Player character animation
2. 2-3 companion characters (Sable, Luma, Orvus)
3. Basic enemy animations (Bark Beetle, Sap Slime)
4. Boss animation (Hollow Acorn)
5. Common/Uncommon relic icons

### Phase 2 (Full Release)
1. Remaining companion characters
2. Branch Snake enemy
3. Rare/Legendary relic icons
4. Enhanced VFX and polish
5. UI element artwork

### Phase 3 (Polish)
1. Audio integration
2. Advanced particle effects
3. Seasonal character variants
4. Additional enemy variants

## Asset Delivery Format

### Required Deliverables per Character/Enemy
- `.skel` - Spine skeleton data
- `.atlas` - Texture atlas definition
- `.png` - Texture atlas image(s)
- Animation documentation with frame timings

### Quality Assurance
- All assets tested in Spine editor
- Mobile performance validation
- Cross-platform compatibility testing
- Integration testing with React Native Spine bridge

---

**Total Estimated Assets**:
- 8 Character rigs (1024px atlases)
- 4 Enemy rigs (512-1024px atlases)
- 15 Relic icons
- UI elements and effects
- Audio assets (future)

**Priority Order**: Characters → Enemies → Relics → UI → Audio