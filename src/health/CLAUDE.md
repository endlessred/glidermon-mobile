# Health Monitoring System

Cross-platform health data integration supporting both iOS HealthKit and Android Health Connect for live blood glucose monitoring.

## System Architecture

### Unified Service (`healthService.ts`)
- **Purpose**: Platform-agnostic health monitoring API
- **Auto-Detection**: Automatically uses HealthKit on iOS, Health Connect on Android
- **Consistent API**: Same interface regardless of platform
- **Features**: Permission management, data fetching, background monitoring

### iOS HealthKit (`healthKit.ts`)
- **Purpose**: Apple HealthKit integration for iOS devices
- **Library**: Uses `react-native-health` for native iOS access
- **Features**: Real-time glucose monitoring, historical data, permission management
- **API**: Callback-based Apple APIs converted to Promise-based interface

### Android Health Connect (`healthConnect.ts`)
- **Purpose**: Google Health Connect integration for Android devices
- **Library**: Uses `react-native-health-connect` for native Android access
- **Features**: Same functionality as iOS but through Health Connect platform
- **API**: Modern Promise-based Android health platform

## Key Features

### 1. **Permission Management**
```typescript
// Request permissions (cross-platform)
const permissions = await unifiedHealthService.requestPermissions();
// Returns: { read: boolean, write: boolean }

// Check current status
const status = await unifiedHealthService.getPermissionStatus();
```

### 2. **Real-time Monitoring**
```typescript
// Start background monitoring
const cleanup = await unifiedHealthService.observeBloodGlucose((reading) => {
  console.log(`New reading: ${reading.value} mg/dL at ${reading.date}`);
});

// Stop monitoring
cleanup();
```

### 3. **Historical Data**
```typescript
// Get latest reading
const latest = await unifiedHealthService.getLatestBloodGlucose();

// Get past hour of readings
const recent = await unifiedHealthService.getRecentBloodGlucose();
```

## Data Flow

```
Health Platform → Health Service → useHealthKit Hook → Game Store → Engine → UI
     ↓                ↓                    ↓              ↓         ↓      ↓
HealthKit/       Unified API      React Hook      State Mgmt   Scoring  Display
Health Connect
```

### Integration with Game Engine
```typescript
// In useHealthKit hook:
const unsubscribe = await unifiedHealthService.observeBloodGlucose((reading) => {
  const epochSec = Math.floor(reading.date.getTime() / 1000);
  const trendCode = 1; // flat - let system calculate trend from history

  // Feed into game engine via store
  onEgvs(reading.value, trendCode, epochSec);
});
```

## Platform Differences

| Feature | iOS HealthKit | Android Health Connect |
|---------|---------------|------------------------|
| Real-time observers | ❌ (polling) | ❌ (polling) |
| Historical data | ✅ | ✅ |
| Permission management | ✅ | ✅ |
| Background monitoring | ✅ | ✅ |
| Data sources | Apple Health ecosystem | Google Health ecosystem |
| Settings access | iOS Settings app | Health Connect app |

## Configuration

### iOS Setup (`app.json`)
```json
{
  "ios": {
    "infoPlist": {
      "NSHealthShareUsageDescription": "This app reads blood glucose data to monitor your virtual pet's health.",
      "NSHealthUpdateUsageDescription": "This app may write health data for tracking purposes."
    }
  }
}
```

### Android Setup (`app.json`)
```json
{
  "android": {
    "permissions": [
      "android.permission.health.READ_BLOOD_GLUCOSE"
    ]
  }
}
```

## Error Handling

### Common Error Scenarios
1. **Platform Not Supported**: Service unavailable on platform
2. **Permissions Denied**: User declined health data access
3. **No Data Available**: No glucose readings in health app
4. **Network/Sync Issues**: Health platform sync problems

### Graceful Degradation
```typescript
// Health service falls back to simulator if unavailable
if (!healthService.isHealthMonitoringAvailable()) {
  // Continue with simulator data
  startEgvsSimulator({ onEgvs });
}
```

## Testing Strategy

### Development Testing
- **Simulator Mode**: Use `simCgms.ts` when health platforms unavailable
- **Mock Data**: Add test readings via platform health apps
- **Physical Devices**: Test on real iOS/Android devices with health apps

### Platform Testing
- **iOS**: Test with Apple Health app and connected glucose monitors
- **Android**: Test with Health Connect app and supported devices
- **Permissions**: Test grant/deny scenarios
- **Background**: Test monitoring when app backgrounded

## Security & Privacy

### Data Handling
- **Read-Only**: Only requests read access to glucose data
- **Minimal Storage**: No local persistence beyond 1-hour rolling window
- **User Control**: Users can revoke access anytime via platform settings
- **No Transmission**: Health data stays on device, not sent to servers

### Compliance
- **Apple Guidelines**: Follows HealthKit privacy and security requirements
- **Google Guidelines**: Complies with Health Connect data policies
- **HIPAA Considerations**: Health data handling follows best practices

## Troubleshooting

### Common Issues
```typescript
// Check service availability
if (!unifiedHealthService.isHealthMonitoringAvailable()) {
  console.log('Health monitoring not available on this platform');
}

// Verify permissions
const permissions = await unifiedHealthService.getPermissionStatus();
if (!permissions.read) {
  console.log('Health data read permission not granted');
}
```

### Debug Logging
Enable detailed logging for troubleshooting:
```typescript
// In health service implementations
console.log('Health service: New reading received:', reading);
console.log('Health service: Permission status:', permissions);
```

## Extension Points

### Adding New Health Metrics
1. Extend `BloodGlucoseReading` type for new data fields
2. Update platform-specific services for new APIs
3. Modify unified service interface
4. Update integration with game engine

### Platform Support
The architecture supports adding new platforms by:
1. Creating new platform-specific service
2. Adding platform detection to unified service
3. Implementing same interface as existing services