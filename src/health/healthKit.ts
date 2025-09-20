// src/healthKit.ts
// Apple HealthKit integration for blood glucose monitoring

import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions as RNHealthKitPermissions,
  HealthInputOptions,
} from 'react-native-health';

export type BloodGlucoseReading = {
  value: number; // mg/dL
  date: Date;
  sourceId?: string;
  sourceName?: string;
};

export type HealthKitPermissions = {
  read: boolean;
  write: boolean;
};

export class HealthKitService {
  private isAvailable: boolean = false;
  private hasPermissions: boolean = false;
  private observer: any = null;

  constructor() {
    try {
      this.isAvailable = Platform.OS === 'ios' && (AppleHealthKit as any).isAvailable?.() || false;
    } catch (error) {
      this.isAvailable = Platform.OS === 'ios';
    }
  }

  /**
   * Check if HealthKit is available on this device
   */
  isHealthKitAvailable(): boolean {
    return this.isAvailable;
  }

  /**
   * Request permissions to read blood glucose data
   */
  async requestPermissions(): Promise<HealthKitPermissions> {
    if (!this.isAvailable) {
      throw new Error('HealthKit is not available on this platform');
    }

    return new Promise((resolve, reject) => {
      console.log('HealthKit: Requesting permissions for blood glucose data');

      const permissions: RNHealthKitPermissions = {
        permissions: {
          read: [(AppleHealthKit as any).Constants?.Permissions?.BloodGlucose || 'BloodGlucose'],
          write: [],
        },
      };

      (AppleHealthKit as any).initHealthKit(permissions, (error: any, result: any) => {
        if (error) {
          console.error('HealthKit permission request failed:', error);
          this.hasPermissions = false;
          reject(new Error(error));
          return;
        }

        this.hasPermissions = Boolean(result);
        resolve({ read: Boolean(result), write: false });
      });
    });
  }

  /**
   * Get the most recent blood glucose reading
   */
  async getLatestBloodGlucose(): Promise<BloodGlucoseReading | null> {
    if (!this.hasPermissions) {
      throw new Error('HealthKit permissions not granted');
    }

    return new Promise((resolve, reject) => {
      console.log('HealthKit: Fetching latest blood glucose reading');

      const options: HealthInputOptions = {
        type: (AppleHealthKit as any).Constants?.Permissions?.BloodGlucose || 'BloodGlucose',
        limit: 1,
        ascending: false,
      };

      (AppleHealthKit as any).getSamples(options, (error: any, results: any[]) => {
        if (error) {
          console.error('Failed to fetch blood glucose data:', error);
          reject(new Error(error));
          return;
        }

        if (!results || results.length === 0) {
          resolve(null);
          return;
        }

        const sample = results[0];
        resolve({
          value: sample.value,
          date: new Date(sample.startDate),
          sourceId: (sample as any).sourceId || undefined,
          sourceName: (sample as any).sourceName || undefined,
        });
      });
    });
  }

  /**
   * Get blood glucose readings from the past hour
   */
  async getRecentBloodGlucose(): Promise<BloodGlucoseReading[]> {
    if (!this.hasPermissions) {
      throw new Error('HealthKit permissions not granted');
    }

    return new Promise((resolve, reject) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      console.log('HealthKit: Fetching recent blood glucose readings');

      const options: HealthInputOptions = {
        type: (AppleHealthKit as any).Constants?.Permissions?.BloodGlucose || 'BloodGlucose',
        startDate: oneHourAgo.toISOString(),
        endDate: new Date().toISOString(),
        ascending: true,
      };

      (AppleHealthKit as any).getSamples(options, (error: any, results: any[]) => {
        if (error) {
          console.error('Failed to fetch recent blood glucose data:', error);
          reject(new Error(error));
          return;
        }

        if (!results || results.length === 0) {
          resolve([]);
          return;
        }

        const readings = results.map((sample: any) => ({
          value: sample.value,
          date: new Date(sample.startDate),
          sourceId: sample.sourceId || undefined,
          sourceName: sample.sourceName || undefined,
        }));

        resolve(readings);
      });
    });
  }

  /**
   * Set up a background observer for new blood glucose readings
   */
  async observeBloodGlucose(callback: (reading: BloodGlucoseReading) => void): Promise<() => void> {
    if (!this.hasPermissions) {
      throw new Error('HealthKit permissions not granted');
    }

    console.log('HealthKit: Setting up blood glucose observer');

    // Clean up any existing observer
    if (this.observer) {
      this.observer();
      this.observer = null;
    }

    // Note: react-native-health doesn't have a built-in observer
    // We'll implement polling as a fallback
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
        console.error('HealthKit polling error:', error);
      }

      // Poll every 30 seconds
      setTimeout(poll, 30000);
    };

    // Start polling
    poll();

    // Return cleanup function
    return () => {
      isObserving = false;
      console.log('HealthKit: Stopped blood glucose observer');
    };
  }

  /**
   * Check permission status without requesting
   */
  async getPermissionStatus(): Promise<HealthKitPermissions> {
    if (!this.isAvailable) {
      return { read: false, write: false };
    }

    return new Promise((resolve) => {
      try {
        if (!(AppleHealthKit as any).getAuthorizationStatus) {
          // If the method doesn't exist, assume no permissions
          resolve({ read: this.hasPermissions, write: false });
          return;
        }

        (AppleHealthKit as any).getAuthorizationStatus(
          (AppleHealthKit as any).Constants?.Permissions?.BloodGlucose || 'BloodGlucose',
          (error: any, status: any) => {
            if (error) {
              console.error('Failed to check HealthKit permissions:', error);
              resolve({ read: false, write: false });
              return;
            }

            // HealthKit authorization status:
            // 0 = not determined
            // 1 = sharing denied
            // 2 = sharing authorized
            const isAuthorized = status === 2;
            this.hasPermissions = isAuthorized;

            resolve({ read: isAuthorized, write: false });
          }
        );
      } catch (error) {
        console.error('Failed to check HealthKit permissions:', error);
        resolve({ read: false, write: false });
      }
    });
  }
}

// Export singleton instance
export const healthKitService = new HealthKitService();

// Helper function to convert blood glucose from mmol/L to mg/dL if needed
export function convertMmolToMgDl(mmolValue: number): number {
  return mmolValue * 18.0182;
}

// Helper function to convert blood glucose from mg/dL to mmol/L if needed
export function convertMgDlToMmol(mgDlValue: number): number {
  return mgDlValue / 18.0182;
}