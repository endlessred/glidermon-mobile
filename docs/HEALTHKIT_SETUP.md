# Cross-Platform Health Integration Setup

This document explains the health monitoring integration for live blood glucose monitoring on both iOS (HealthKit) and Android (Health Connect).

> **Note**: For Android-specific Health Connect setup, see [HEALTHCONNECT_SETUP.md](./HEALTHCONNECT_SETUP.md)

## Overview

The cross-platform health integration is designed to:
- Read blood glucose data from health platforms (Apple Health on iOS, Health Connect on Android)
- Monitor live readings from connected glucose monitors (like Dexcom, FreeStyle, etc.)
- Integrate seamlessly with the existing glucose chart and pet health system
- Provide real-time notifications for new readings

## Current Status

✅ **Completed:**
- HealthKit service architecture (`src/healthKit.ts`)
- React hook integration (`hooks/useHealthKit.ts`)
- Settings UI for HealthKit controls
- Data flow integration with existing glucose system
- Real HealthKit native dependency (react-native-health)
- Actual HealthKit API calls with callback-to-promise conversion
- iOS permissions configuration in app.json
- Background monitoring with polling fallback

## Required Dependencies

### Option 1: react-native-health (Recommended)

```bash
npm install react-native-health
```

This is the most mature HealthKit library for React Native.

### Option 2: expo-health (If available)

```bash
npx expo install expo-health
```

Expo's official HealthKit integration (if available in your Expo SDK version).

## Implementation Steps

### 1. Install HealthKit Dependency

Choose one of the options above and install the appropriate package.

### 2. Update src/healthKit.ts

Replace the mock implementations with actual HealthKit calls:

```typescript
// Example for react-native-health
import { HealthKit, HealthValue, HealthPermission } from 'react-native-health';

// In requestPermissions():
const permissions = {
  permissions: {
    read: [HealthPermission.BloodGlucose],
    write: [],
  },
};
const result = await HealthKit.initHealthKit(permissions);

// In getLatestBloodGlucose():
const results = await HealthKit.getSamples({
  type: HealthPermission.BloodGlucose,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  limit: 1,
});

// In observeBloodGlucose():
const unsubscribe = HealthKit.observeQuery({
  type: HealthPermission.BloodGlucose,
}, (results) => {
  // Handle new readings
});
```

### 3. iOS Configuration

Add HealthKit usage description to `app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSHealthShareUsageDescription": "This app reads blood glucose data to monitor your virtual pet's health.",
        "NSHealthUpdateUsageDescription": "This app may write health data for tracking purposes."
      }
    }
  }
}
```

If using a bare React Native project, add to `Info.plist`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>This app reads blood glucose data to monitor your virtual pet's health.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>This app may write health data for tracking purposes.</string>
```

### 4. Add HealthKit Capability

For bare React Native projects, add HealthKit capability to your Xcode project:
1. Open `ios/YourApp.xcworkspace` in Xcode
2. Select your target
3. Go to "Signing & Capabilities"
4. Click "+ Capability"
5. Add "HealthKit"

For Expo managed projects, add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

### 5. Test the Integration

1. Build and run on a physical iOS device (HealthKit doesn't work in simulator)
2. Go to Settings > Data Source
3. Tap "Connect HealthKit"
4. Grant permissions in the iOS Health app
5. Tap "Start Monitoring" to begin live monitoring
6. Add test blood glucose data in the iOS Health app to verify integration

## Usage Flow

1. **Initial Setup**: User taps "Connect HealthKit" in settings
2. **Permission Request**: iOS prompts for Health data access
3. **Historical Data**: App loads recent readings to populate chart
4. **Live Monitoring**: App observes new readings in background
5. **Data Integration**: New readings automatically update pet health and chart

## Data Flow

```
HealthKit → useHealthKit hook → gameStore.onEgvs() → engine.trail → glucose chart
```

## Features

- **Real-time monitoring**: Background observer for new readings
- **Historical data**: Loads past hour of readings on startup
- **Seamless integration**: Works with existing glucose chart and pet system
- **Smart fallback**: Simulator continues to work when HealthKit is unavailable
- **User control**: Easy enable/disable in settings

## Troubleshooting

### Common Issues

1. **"HealthKit not available"**: Only works on physical iOS devices
2. **Permission denied**: User must grant access in iOS Health app settings
3. **No data**: Check if glucose monitoring device is connected to iPhone
4. **Background monitoring stops**: iOS may limit background activity

### Debugging

Enable debug logging in the HealthKit service to trace data flow:

```typescript
console.log('HealthKit: New reading received:', reading);
```

## Security & Privacy

- Only requests read access to blood glucose data
- No sensitive data is stored locally beyond the 1-hour rolling window
- User can revoke access anytime through iOS Health app settings
- Complies with Apple's HealthKit privacy guidelines