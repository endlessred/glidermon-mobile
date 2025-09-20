// src/healthService.ts
// Unified health service that works with both HealthKit (iOS) and Health Connect (Android)

import { Platform } from 'react-native';
import { healthKitService, BloodGlucoseReading as HealthKitReading, HealthKitPermissions } from './healthKit';
import { healthConnectService, BloodGlucoseReading as HealthConnectReading, HealthConnectPermissions } from './healthConnect';

export type BloodGlucoseReading = {
  value: number; // mg/dL
  date: Date;
  sourceId?: string;
  sourceName?: string;
};

export type HealthPermissions = {
  read: boolean;
  write: boolean;
};

export class UnifiedHealthService {
  private get service() {
    return Platform.OS === 'ios' ? healthKitService : healthConnectService;
  }

  /**
   * Check if health monitoring is available on this device
   */
  isHealthMonitoringAvailable(): boolean {
    return Platform.OS === 'ios'
      ? healthKitService.isHealthKitAvailable()
      : healthConnectService.isHealthConnectAvailable();
  }

  /**
   * Get the platform-specific health service name
   */
  getServiceName(): string {
    return Platform.OS === 'ios' ? 'HealthKit' : 'Health Connect';
  }

  /**
   * Request permissions to read blood glucose data
   */
  async requestPermissions(): Promise<HealthPermissions> {
    return await this.service.requestPermissions();
  }

  /**
   * Get the most recent blood glucose reading
   */
  async getLatestBloodGlucose(): Promise<BloodGlucoseReading | null> {
    return await this.service.getLatestBloodGlucose();
  }

  /**
   * Get blood glucose readings from the past hour
   */
  async getRecentBloodGlucose(): Promise<BloodGlucoseReading[]> {
    return await this.service.getRecentBloodGlucose();
  }

  /**
   * Set up a background observer for new blood glucose readings
   */
  async observeBloodGlucose(callback: (reading: BloodGlucoseReading) => void): Promise<() => void> {
    return await this.service.observeBloodGlucose(callback);
  }

  /**
   * Check permission status without requesting
   */
  async getPermissionStatus(): Promise<HealthPermissions> {
    return await this.service.getPermissionStatus();
  }

  /**
   * Open platform-specific health settings
   */
  async openSettings(): Promise<void> {
    if (Platform.OS === 'android' && 'openSettings' in healthConnectService) {
      await healthConnectService.openSettings();
    } else {
      // For iOS, we can't programmatically open HealthKit settings
      // Users need to go to iOS Settings > Privacy & Security > Health
      console.log('Please open iOS Settings > Privacy & Security > Health to manage permissions');
    }
  }

  /**
   * Open platform-specific data management
   */
  async openDataManagement(): Promise<void> {
    if (Platform.OS === 'android' && 'openDataManagement' in healthConnectService) {
      await healthConnectService.openDataManagement();
    } else {
      // For iOS, open the Health app
      console.log('Please open the iOS Health app to manage your data');
    }
  }
}

// Export singleton instance
export const unifiedHealthService = new UnifiedHealthService();