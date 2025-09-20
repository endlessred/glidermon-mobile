# Asset Management System

Comprehensive asset management and resolution system handling sprites, images, audio, and other game resources with cross-platform support and performance optimization.

## Key Files

### `assetMap.ts`
- **Purpose**: Central registry mapping asset IDs to file paths
- **Structure**: Type-safe asset key system with categorization
- **Features**: Asset metadata, resolution variants, platform-specific assets
- **Usage**: Foundation for all asset loading throughout the app

### `assetResolver.ts`
- **Purpose**: Dynamic asset resolution and loading logic
- **Features**: Platform detection, resolution selection, fallback handling
- **Performance**: Caching, preloading, memory management
- **Cross-platform**: Handles native and web asset loading differences

### `cosmetics.ts`
- **Purpose**: Cosmetic item definitions and asset associations
- **Integration**: Links cosmetic items to their visual assets
- **Categories**: Hats, themes, effects, pets
- **Metadata**: Unlock conditions, pricing, rarity

### `nightscoutClient.ts`
- **Purpose**: Integration with Nightscout CGM data platform
- **Features**: API client, data synchronization, authentication
- **Usage**: Alternative data source for glucose monitoring
- **Cloud**: Remote glucose data access and sharing

## Asset Categories

### Game Sprites
- **Pet Characters**: Main pet sprites with animation frames
- **Cosmetic Items**: Hats, accessories, visual modifications
- **UI Elements**: Buttons, icons, decorative elements
- **Effects**: Particle textures, overlay graphics

### Images
- **Backgrounds**: Environment and skybox images
- **Thumbnails**: Preview images for items and features
- **Branding**: App icons, logos, marketing materials
- **Tutorial**: Instructional graphics and diagrams

### Audio (Future)
- **Sound Effects**: Button clicks, notifications, achievements
- **Ambient**: Background music, environmental sounds
- **Voice**: Accessibility audio descriptions

## Asset Resolution System

### Platform Adaptation
```typescript
// Different asset paths for different platforms
const getAssetPath = (assetKey: AssetKey): string => {
  if (Platform.OS === 'web') {
    return webAssets[assetKey];
  } else {
    return nativeAssets[assetKey];
  }
};
```

### Resolution Variants
```typescript
// Multiple resolutions for different screen densities
interface AssetVariants {
  '1x': string;    // Standard resolution
  '2x': string;    // High DPI
  '3x': string;    // Extra high DPI
}
```

### Dynamic Loading
```typescript
// Load assets on demand
const loadAsset = async (assetKey: AssetKey) => {
  const path = resolveAssetPath(assetKey);
  return await Image.prefetch(path);
};
```

## Performance Optimization

### Caching Strategy
- **Memory Cache**: Keep frequently used assets in memory
- **Disk Cache**: Persistent cache for downloaded assets
- **LRU Eviction**: Remove least recently used assets when memory full
- **Preloading**: Load critical assets during app startup

### Asset Compression
- **Image Optimization**: WebP, AVIF formats where supported
- **Sprite Atlasing**: Combine small images into larger textures
- **Progressive Loading**: Load base quality first, enhance later
- **Lossy Compression**: Balance quality vs. file size

### Lazy Loading
```typescript
// Load assets only when needed
const LazyImage = ({ assetKey, ...props }) => {
  const [source, setSource] = useState(null);

  useEffect(() => {
    loadAsset(assetKey).then(setSource);
  }, [assetKey]);

  return source ? <Image source={source} {...props} /> : <Placeholder />;
};
```

## Cross-Platform Support

### Native Platforms (iOS/Android)
- **Bundle Assets**: Assets included in app bundle
- **OTA Updates**: Update assets via over-the-air updates
- **Platform Optimization**: Native image formats and optimizations

### Web Platform
- **CDN Delivery**: Assets served from content delivery network
- **Progressive Loading**: Load assets as needed for faster initial load
- **Browser Caching**: Leverage browser cache for asset storage

### Asset Bundling
```typescript
// Platform-specific asset imports
if (Platform.OS === 'web') {
  // Web assets from CDN
  const assetUrl = `https://cdn.example.com/assets/${assetKey}`;
} else {
  // Native assets from bundle
  const assetSource = require(`./images/${assetKey}.png`);
}
```

## Cosmetic Asset System

### Item Asset Structure
```typescript
interface CosmeticAsset {
  id: string;
  category: 'hat' | 'theme' | 'effect';
  thumbnail: AssetKey;     // Preview image
  assets: {
    sprite?: AssetKey;     // Main sprite asset
    overlay?: AssetKey;    // Overlay effects
    animation?: AssetKey;  // Animation data
  };
  metadata: {
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlockLevel: number;
    cost: number;
  };
}
```

### Theme Assets
```typescript
// Theme-specific asset variants
interface ThemeAssets {
  background: AssetKey;
  uiElements: AssetKey[];
  colorPalette: ColorPalette;
  effects: EffectAssets;
}
```

### Dynamic Asset Loading
```typescript
// Load cosmetic assets when equipped
const equipCosmetic = async (itemId: string) => {
  const item = getCosmeticItem(itemId);
  await Promise.all([
    loadAsset(item.thumbnail),
    loadAsset(item.assets.sprite),
    loadAsset(item.assets.overlay)
  ]);
  applyCosmetic(item);
};
```

## Asset Validation

### Integrity Checking
```typescript
// Verify asset integrity
const validateAsset = async (assetPath: string) => {
  try {
    const response = await fetch(assetPath);
    return response.ok;
  } catch {
    return false;
  }
};
```

### Fallback Assets
```typescript
// Provide fallback when assets fail to load
const getAssetWithFallback = (assetKey: AssetKey) => {
  const primaryAsset = getAssetPath(assetKey);
  const fallbackAsset = getAssetPath('default_placeholder');

  return validateAsset(primaryAsset) ? primaryAsset : fallbackAsset;
};
```

### Missing Asset Handling
```typescript
// Graceful degradation for missing assets
const SafeImage = ({ assetKey, fallback = 'default_image' }) => {
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      source={getAssetPath(hasError ? fallback : assetKey)}
      onError={() => setHasError(true)}
    />
  );
};
```

## Development Tools

### Asset Inspector
- **Asset Browser**: Visual catalog of all available assets
- **Usage Tracking**: See which assets are used where
- **Performance Metrics**: Load times, cache hit rates
- **Validation Reports**: Missing or corrupted assets

### Hot Reloading
```typescript
// Development asset hot reloading
if (__DEV__) {
  const reloadAssets = () => {
    clearAssetCache();
    reloadAllAssets();
  };
}
```

## Nightscout Integration

### API Client
```typescript
// Nightscout glucose data client
class NightscoutClient {
  async getGlucoseData(hours: number = 1) {
    const response = await fetch(`${baseUrl}/api/v1/entries.json?count=${hours * 12}`);
    return response.json();
  }

  async getProfile() {
    const response = await fetch(`${baseUrl}/api/v1/profile.json`);
    return response.json();
  }
}
```

### Data Synchronization
```typescript
// Sync Nightscout data with game engine
const syncNightscoutData = async () => {
  const client = new NightscoutClient(userSettings.nightscoutUrl);
  const entries = await client.getGlucoseData();

  entries.forEach(entry => {
    gameStore.onEgvs(entry.sgv, entry.direction, entry.date);
  });
};
```

### Authentication
```typescript
// Handle Nightscout authentication
const authenticateNightscout = async (url: string, token?: string) => {
  const client = new NightscoutClient(url, token);
  return await client.validateConnection();
};
```

## Asset Security

### Content Validation
- **File Type Verification**: Ensure assets are expected formats
- **Size Limits**: Prevent excessively large assets
- **Content Scanning**: Basic malware/virus checking

### Access Control
- **Asset Permissions**: Control which parts of app can access which assets
- **User-Generated Content**: Validate and sanitize user uploads
- **Secure Delivery**: Use HTTPS for all asset downloads

## Memory Management

### Asset Lifecycle
```typescript
// Automatic asset cleanup
class AssetManager {
  private cache = new Map<string, any>();
  private usage = new Map<string, number>();

  load(assetKey: string) {
    this.usage.set(assetKey, Date.now());
    return this.cache.get(assetKey) || this.loadFromDisk(assetKey);
  }

  cleanup() {
    const cutoff = Date.now() - (10 * 60 * 1000); // 10 minutes
    for (const [key, lastUsed] of this.usage) {
      if (lastUsed < cutoff) {
        this.cache.delete(key);
        this.usage.delete(key);
      }
    }
  }
}
```

### Memory Pressure Handling
```typescript
// React to low memory warnings
const handleMemoryPressure = () => {
  clearNonEssentialAssets();
  reduceAssetQuality();
  triggerGarbageCollection();
};
```

The asset management system ensures efficient, reliable, and performant handling of all game resources while providing flexibility for future expansion and platform-specific optimizations.