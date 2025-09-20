# Health Connect Integration Setup

This document explains the Android Health Connect integration for live blood glucose monitoring.

## Overview

The Health Connect integration is designed to:
- Read blood glucose data from Android Health Connect
- Monitor live readings from connected glucose monitors (like Dexcom, FreeStyle, etc.)
- Integrate seamlessly with the existing glucose chart and pet health system
- Provide real-time notifications for new readings

## Current Status

✅ **Completed:**
- Health Connect service architecture (`src/healthConnect.ts`)
- Unified health service (`src/healthService.ts`) that works with both platforms
- React hook integration (`hooks/useHealthKit.ts`) updated for cross-platform use
- Settings UI updated with platform-specific service names
- Data flow integration with existing glucose system
- Real Health Connect native dependency (react-native-health-connect)
- Android permissions configuration in app.json
- Background monitoring with polling fallback

## Required Dependencies

### react-native-health-connect

```bash
pnpm add react-native-health-connect
```

This is the official Health Connect library for React Native.

## Implementation Steps

### 1. Install Health Connect Dependency ✅

The dependency is already installed: `react-native-health-connect`

### 2. Update Android Configuration ✅

Android permissions are already added to `app.json`:

```json
{
  "android": {
    "permissions": [
      "android.permission.health.READ_BLOOD_GLUCOSE"
    ]
  }
}
```

### 3. Health Connect Service Implementation ✅

The service is implemented in `src/healthConnect.ts` with:

- **Initialization**: Automatic Health Connect initialization
- **Permission Management**: Request/check Health Connect access with proper error handling
- **Data Fetching**: Read latest and historical blood glucose readings
- **Background Monitoring**: 30-second polling for new readings (Health Connect doesn't support real-time observers)

### 4. Unified Cross-Platform Service ✅

`src/healthService.ts` provides a unified interface that:

- Automatically detects platform (iOS HealthKit vs Android Health Connect)
- Provides consistent API across platforms
- Shows appropriate service names in UI ("HealthKit" on iOS, "Health Connect" on Android)
- Handles platform-specific settings and data management

### 5. Test the Integration

1. Build and run on a physical Android device (Health Connect doesn't work in emulator)
2. Install Health Connect app from Google Play Store if not already installed
3. Go to Settings > Data Source
4. Tap "Connect Health Connect"
5. Grant permissions in the Health Connect app
6. Tap "Start Monitoring" to begin live monitoring
7. Add test blood glucose data in Health Connect to verify integration

## Usage Flow

1. **Initial Setup**: User taps "Connect Health Connect" in settings
2. **Permission Request**: Health Connect prompts for data access
3. **Historical Data**: App loads recent readings to populate chart
4. **Live Monitoring**: App observes new readings via polling
5. **Data Integration**: New readings automatically update pet health and chart

## Data Flow

```
Health Connect → useHealthKit hook → gameStore.onEgvs() → engine.trail → glucose chart
```

## Features

- **Real-time monitoring**: Background polling for new readings (30-second intervals)
- **Historical data**: Loads past hour of readings on startup
- **Seamless integration**: Works with existing glucose chart and pet system
- **Smart fallback**: Simulator continues to work when Health Connect is unavailable
- **User control**: Easy enable/disable in settings
- **Cross-platform**: Same UI and functionality as iOS HealthKit

## Troubleshooting

### Common Issues

1. **"Health Connect not available"**: Only works on Android devices with Health Connect installed
2. **Permission denied**: User must grant access in Health Connect app settings
3. **No data**: Check if glucose monitoring device is connected and syncing to Health Connect
4. **Background monitoring stops**: Android may limit background activity

### Debugging

Enable debug logging in the Health Connect service to trace data flow:

```typescript
console.log('Health Connect: New reading received:', reading);
```

## Security & Privacy

- Only requests read access to blood glucose data
- No sensitive data is stored locally beyond the 1-hour rolling window
- User can revoke access anytime through Health Connect app settings
- Complies with Android Health Connect privacy guidelines

## Platform Differences

| Feature | iOS HealthKit | Android Health Connect |
|---------|---------------|------------------------|
| Real-time observers | ❌ (polling fallback) | ❌ (polling fallback) |
| Historical data | ✅ | ✅ |
| Permission management | ✅ | ✅ |
| Background monitoring | ✅ | ✅ |
| Settings integration | System Settings | Health Connect app |
| Data sources | Wide variety | Wide variety |