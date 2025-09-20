// src/healthConnect.ts
// Android Health Connect integration for blood glucose monitoring

import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  openHealthConnectSettings,
  openHealthConnectDataManagement,
} from 'react-native-health-connect';

export type BloodGlucoseReading = {
  value: number; // mg/dL
  date: Date;
  sourceId?: string;
  sourceName?: string;
};

export type HealthConnectPermissions = {
  read: boolean;
  write: boolean;
};

export class HealthConnectService {
  private isAvailable: boolean = false;
  private hasPermissions: boolean = false;
  private isInitialized: boolean = false;

  constructor() {
    this.isAvailable = Platform.OS === 'android';
  }

  /**
   * Check if Health Connect is available on this device
   */
  isHealthConnectAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Initialize Health Connect
   */
  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.isAvailable) {
      throw new Error('Health Connect is not available on this platform');
    }

    try {
      const isInitialized = await initialize();
      this.isInitialized = isInitialized;

      if (!isInitialized) {
        throw new Error('Failed to initialize Health Connect');
      }
    } catch (error) {
      console.error('Health Connect initialization failed:', error);
      throw error;
    }
  }

  /**
   * Request permissions to read blood glucose data
   */
  async requestPermissions(): Promise<HealthConnectPermissions> {
    await this.ensureInitialized();

    try {
      console.log('Health Connect: Requesting permissions for blood glucose data');

      const permissions = [
        {
          accessType: 'read' as const,
          recordType: 'BloodGlucose' as const,
        },
      ];

      const granted = await requestPermission(permissions);
      this.hasPermissions = Array.isArray(granted) && granted.length > 0;

      return { read: this.hasPermissions, write: false };
    } catch (error) {
      console.error('Health Connect permission request failed:', error);
      this.hasPermissions = false;
      throw error;
    }
  }

  /**
   * Get the most recent blood glucose reading
   */
  async getLatestBloodGlucose(): Promise<BloodGlucoseReading | null> {
    await this.ensureInitialized();

    if (!this.hasPermissions) {
      throw new Error('Health Connect permissions not granted');
    }

    try {
      console.log('Health Connect: Fetching latest blood glucose reading');

      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      const result = await readRecords('BloodGlucose', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
        dataOriginFilter: [],
        ascendingOrder: false,
        pageSize: 1,
      });

      if (!result.records || result.records.length === 0) {
        return null;
      }

      const record = result.records[0] as any;
      return {
        value: this.convertToMgDl(record.level?.inMilligramsPerDeciliter || record.level || 0),
        date: new Date(record.time),
        sourceId: record.metadata?.dataOrigin,
        sourceName: record.metadata?.dataOrigin,
      };
    } catch (error) {
      console.error('Failed to fetch blood glucose data:', error);
      throw error;
    }
  }

  /**
   * Get blood glucose readings from the past hour
   */
  async getRecentBloodGlucose(): Promise<BloodGlucoseReading[]> {
    await this.ensureInitialized();

    if (!this.hasPermissions) {
      throw new Error('Health Connect permissions not granted');
    }

    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // 1 hour ago
      console.log('Health Connect: Fetching recent blood glucose readings');

      const result = await readRecords('BloodGlucose', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
        dataOriginFilter: [],
        ascendingOrder: true,
        pageSize: 100,
      });

      if (!result.records || result.records.length === 0) {
        return [];
      }

      return result.records.map((record: any) => ({
        value: this.convertToMgDl(record.level?.inMilligramsPerDeciliter || record.level || 0),
        date: new Date(record.time),
        sourceId: record.metadata?.dataOrigin,
        sourceName: record.metadata?.dataOrigin,
      }));
    } catch (error) {
      console.error('Failed to fetch recent blood glucose data:', error);
      throw error;
    }
  }

  /**
   * Set up a background observer for new blood glucose readings
   */
  async observeBloodGlucose(callback: (reading: BloodGlucoseReading) => void): Promise<() => void> {
    await this.ensureInitialized();

    if (!this.hasPermissions) {
      throw new Error('Health Connect permissions not granted');
    }

    console.log('Health Connect: Setting up blood glucose observer');

    // Health Connect doesn't have real-time observers, so we'll use polling
    let isObserving = true;
    let lastReadingDate: Date | null = null;

    const poll = async () => {
      if (!isObserving) return;

      try {
        const latest = await this.getLatestBloodGlucose();
        if (latest && (!lastReadingDate || latest.date > lastReadingDate)) {
          lastReadingDate = latest.date;
          callback(latest);
        }
      } catch (error) {
        console.error('Health Connect polling error:', error);
      }

      // Poll every 30 seconds
      setTimeout(poll, 30000);
    };

    // Start polling
    poll();

    // Return cleanup function
    return () => {
      isObserving = false;
      console.log('Health Connect: Stopped blood glucose observer');
    };
  }

  /**
   * Check permission status without requesting
   */
  async getPermissionStatus(): Promise<HealthConnectPermissions> {
    if (!this.isAvailable) {
      return { read: false, write: false };
    }

    try {
      await this.ensureInitialized();

      const grantedPermissions = await getGrantedPermissions();
      const hasBloodGlucoseRead = grantedPermissions.some(
        (permission) =>
          permission.recordType === 'BloodGlucose' && permission.accessType === 'read'
      );

      this.hasPermissions = hasBloodGlucoseRead;
      return { read: hasBloodGlucoseRead, write: false };
    } catch (error) {
      console.error('Failed to check Health Connect permissions:', error);
      return { read: false, write: false };
    }
  }

  /**
   * Open Health Connect settings
   */
  async openSettings(): Promise<void> {
    try {
      await openHealthConnectSettings();
    } catch (error) {
      console.error('Failed to open Health Connect settings:', error);
    }
  }

  /**
   * Open Health Connect data management
   */
  async openDataManagement(): Promise<void> {
    try {
      await openHealthConnectDataManagement();
    } catch (error) {
      console.error('Failed to open Health Connect data management:', error);
    }
  }

  /**
   * Convert blood glucose value to mg/dL if needed
   */
  private convertToMgDl(value: number): number {
    // Health Connect stores blood glucose in mg/dL by default
    return Math.round(value);
  }
}

// Export singleton instance
export const healthConnectService = new HealthConnectService();

// Helper function to convert blood glucose from mmol/L to mg/dL if needed
export function convertMmolToMgDl(mmolValue: number): number {
  return mmolValue * 18.0182;
}

// Helper function to convert blood glucose from mg/dL to mmol/L if needed
export function convertMgDlToMmol(mgDlValue: number): number {
  return mgDlValue / 18.0182;
}