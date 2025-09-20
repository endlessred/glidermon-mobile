# Bluetooth System

Bluetooth Low Energy (BLE) communication system for connecting to continuous glucose monitors (CGMs) and other medical devices.

## Key Files

### Main BLE Client (`bleClient.ts`)
- **Purpose**: Primary BLE communication interface for native platforms
- **Devices**: Supports Dexcom G6/G7, FreeStyle, and other CGM devices
- **Features**: Device discovery, pairing, real-time data streaming
- **Library**: Uses `react-native-ble-plx` for cross-platform BLE access

### Web BLE Client (`bleClient.web.ts`)
- **Purpose**: Web Bluetooth API implementation for browser support
- **Limitations**: Requires HTTPS and user interaction to initiate
- **Compatibility**: Chrome/Edge browsers with Web Bluetooth enabled
- **Fallback**: Graceful degradation when Web Bluetooth unavailable

## Device Support

### Continuous Glucose Monitors
- **Dexcom G6/G7**: Primary target device with full integration
- **FreeStyle Libre**: Abbott's CGM system support
- **Medtronic**: Guardian sensor compatibility
- **Generic CGM**: Standard BLE glucose profile support

### Communication Patterns

#### Device Discovery
```typescript
// Scan for nearby CGM devices
const devices = await findAndConnect();
// Returns array of discovered devices with signal strength
```

#### Data Reading
```typescript
// Read current glucose value and trend
const stats = await readStats();
// Returns: { mgdl: number, trendCode: TrendCode, timestamp: number }

// Stream real-time readings
const unsubscribe = subscribeToReadings((reading) => {
  console.log(`${reading.mgdl} mg/dL, trend: ${reading.trendCode}`);
});
```

#### Connection Management
```typescript
// Force reconnection if connection lost
await forceReconnect();

// Clean disconnect
await disconnectBle();
```

## Data Types

### Trend Codes
```typescript
type TrendCode = 0 | 1 | 2; // Down, Flat, Up
```

### Reading Format
```typescript
interface GlucoseReading {
  mgdl: number;          // Glucose value in mg/dL
  trendCode: TrendCode;  // Direction indicator
  timestamp: number;     // Unix timestamp
  deviceId?: string;     // Device identifier
  batteryLevel?: number; // Device battery %
}
```

## Platform Differences

| Feature | Native (iOS/Android) | Web |
|---------|---------------------|-----|
| Device scanning | ✅ Background | ✅ User-initiated only |
| Auto-reconnect | ✅ | ⚠️ Limited |
| Background sync | ✅ | ❌ |
| Device pairing | ✅ Persistent | ⚠️ Session-based |
| Real-time streaming | ✅ | ✅ |

## Security & Privacy

### Data Protection
- **Encryption**: All BLE communication uses standard encryption
- **Authentication**: Device pairing with PIN/passcode verification
- **Local Only**: Bluetooth data stays on device, not transmitted to servers
- **User Control**: User can disconnect/unpair devices anytime

### Medical Device Compliance
- **FDA Cleared**: Only connects to FDA-approved CGM devices
- **No Interference**: Read-only access, doesn't modify device settings
- **Safety**: Cannot override device alarms or safety features

## Error Handling

### Connection Issues
```typescript
try {
  await findAndConnect();
} catch (error) {
  if (error.code === 'BLUETOOTH_DISABLED') {
    // Prompt user to enable Bluetooth
  } else if (error.code === 'DEVICE_NOT_FOUND') {
    // Show device pairing instructions
  }
}
```

### Data Quality
```typescript
// Validate readings before processing
if (reading.mgdl < 40 || reading.mgdl > 400) {
  // Out of range - likely sensor error
  console.warn('Invalid glucose reading:', reading);
  return;
}
```

## Integration with Game System

### Data Flow
```
CGM Device → BLE Client → Game Store → Engine → UI
     ↓           ↓           ↓         ↓       ↓
  Sensor      Bluetooth   State Mgmt  Scoring Display
```

### Real-time Updates
```typescript
// In game store or component:
import { readStats } from '../../bluetooth/bleClient';

// Poll for new readings
const pollReading = async () => {
  try {
    const reading = await readStats();
    onEgvs(reading.mgdl, reading.trendCode, reading.timestamp);
  } catch (error) {
    console.error('Failed to read glucose:', error);
  }
};
```

## Development & Testing

### Mock Data
For development without physical CGM device:
```typescript
// Simulate realistic glucose patterns
const mockReading = {
  mgdl: 120 + Math.random() * 40 - 20, // 100-140 range
  trendCode: Math.floor(Math.random() * 3) as TrendCode,
  timestamp: Date.now()
};
```

### Device Testing
- **Physical CGM**: Test with actual Dexcom/FreeStyle devices
- **BLE Simulator**: Use BLE peripheral simulators for development
- **Edge Cases**: Test connection loss, low battery, sensor expiration

## Troubleshooting

### Common Issues

#### Bluetooth Not Available
```typescript
if (!BluetoothManager.isAvailable()) {
  // Show message about Bluetooth requirement
  showAlert('Bluetooth required for CGM connection');
}
```

#### Device Pairing Problems
```typescript
// Check device compatibility
const isSupported = await checkDeviceSupport(deviceId);
if (!isSupported) {
  showAlert('Device not supported. Please use Dexcom G6/G7 or FreeStyle Libre.');
}
```

#### Connection Drops
```typescript
// Implement retry logic
let retries = 0;
const maxRetries = 3;

const reconnectWithRetry = async () => {
  try {
    await forceReconnect();
  } catch (error) {
    if (retries < maxRetries) {
      retries++;
      setTimeout(reconnectWithRetry, 1000 * retries); // Exponential backoff
    }
  }
};
```

## Future Enhancements

### Additional Devices
- **Insulin Pumps**: Integration with automated insulin delivery systems
- **Heart Rate**: Fitness tracker integration for health correlation
- **Sleep Tracking**: Sleep quality impact on glucose patterns

### Advanced Features
- **Multi-Device**: Connect multiple sensors simultaneously
- **Data Fusion**: Combine multiple data sources for better accuracy
- **Predictive**: Use trend data for glucose prediction algorithms

## Permissions Required

### iOS
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app uses Bluetooth to connect to your glucose monitor.</string>
```

### Android
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

The Bluetooth system provides reliable, secure communication with medical devices while maintaining user privacy and safety standards.