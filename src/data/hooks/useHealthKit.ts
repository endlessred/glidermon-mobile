// hooks/useHealthKit.ts
// React hook for integrating cross-platform health data (HealthKit on iOS, Health Connect on Android)

import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { unifiedHealthService, BloodGlucoseReading, HealthPermissions } from '../../health/healthService';
import { useGameStore } from '../stores/gameStore';
import { useToastStore } from '../stores/toastStore';

export type HealthKitStatus = 'unavailable' | 'available' | 'authorized' | 'denied' | 'checking';

export function useHealthKit() {
  const [status, setStatus] = useState<HealthKitStatus>('checking');
  const [permissions, setPermissions] = useState<HealthPermissions>({ read: false, write: false });
  const [isObserving, setIsObserving] = useState(false);
  const [lastReading, setLastReading] = useState<BloodGlucoseReading | null>(null);

  const onEgvs = useGameStore(s => s.onEgvs);
  const addToast = useToastStore(s => s.addToast);

  // Check initial status
  useEffect(() => {
    const checkStatus = async () => {
      if (!unifiedHealthService.isHealthMonitoringAvailable()) {
        setStatus('unavailable');
        return;
      }

      try {
        const perms = await unifiedHealthService.getPermissionStatus();
        setPermissions(perms);

        if (perms.read) {
          setStatus('authorized');
        } else {
          setStatus('available');
        }
      } catch (error) {
        console.error('Failed to check health monitoring status:', error);
        setStatus('available');
      }
    };

    checkStatus();
  }, []);

  // Request health monitoring permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (status === 'unavailable') {
      const serviceName = unifiedHealthService.getServiceName();
      addToast(`${serviceName} is not available on this device`);
      return false;
    }

    try {
      setStatus('checking');
      const perms = await unifiedHealthService.requestPermissions();
      setPermissions(perms);

      if (perms.read) {
        setStatus('authorized');
        const serviceName = unifiedHealthService.getServiceName();
        addToast(`${serviceName} access granted! 🩺`);
        return true;
      } else {
        setStatus('denied');
        const serviceName = unifiedHealthService.getServiceName();
        addToast(`${serviceName} access denied`);
        return false;
      }
    } catch (error) {
      console.error('Health monitoring permission request failed:', error);
      setStatus('denied');
      addToast('Failed to request health permissions');
      return false;
    }
  }, [status, addToast]);

  // Start observing blood glucose data
  const startObserving = useCallback(async (): Promise<(() => void) | false> => {
    if (status !== 'authorized') {
      const granted = await requestPermissions();
      if (!granted) return false;
    }

    try {
      const unsubscribe = await unifiedHealthService.observeBloodGlucose((reading) => {
        const serviceName = unifiedHealthService.getServiceName();
        console.log(`New ${serviceName} blood glucose reading:`, reading);
        setLastReading(reading);

        // Convert health reading to our data format
        const epochSec = Math.floor(reading.date.getTime() / 1000);

        // For health data, we don't have trend info, so we'll default to "flat"
        // The trend calculation will be done by the useHudVM hook based on historical data
        const trendCode = 1; // flat - let the system calculate trend from data history

        // Feed the reading into our existing data pipeline
        onEgvs(reading.value, trendCode as any, epochSec);

        addToast(`📱 ${serviceName}: ${reading.value} mg/dL`);
      });

      // Also fetch recent historical data to populate the chart
      try {
        const recentReadings = await unifiedHealthService.getRecentBloodGlucose();
        const serviceName = unifiedHealthService.getServiceName();
        console.log(`Fetched recent ${serviceName} readings:`, recentReadings);

        // Feed historical readings into the system
        recentReadings.forEach(reading => {
          const epochSec = Math.floor(reading.date.getTime() / 1000);
          onEgvs(reading.value, 1 as any, epochSec); // Default to flat trend for historical data
        });

        if (recentReadings.length > 0) {
          const serviceName = unifiedHealthService.getServiceName();
          addToast(`📊 Loaded ${recentReadings.length} recent readings from ${serviceName}`);
        }
      } catch (error) {
        const serviceName = unifiedHealthService.getServiceName();
        console.error(`Failed to fetch recent ${serviceName} data:`, error);
      }

      setIsObserving(true);

      // Return cleanup function
      return () => {
        unsubscribe();
        setIsObserving(false);
      };
    } catch (error) {
      console.error('Failed to start health monitoring observer:', error);
      addToast('Failed to start health monitoring');
      return false;
    }
  }, [status, requestPermissions, onEgvs, addToast]);

  // Stop observing
  const stopObserving = useCallback(() => {
    setIsObserving(false);
    const serviceName = unifiedHealthService.getServiceName();
    addToast(`Stopped ${serviceName} monitoring`);
  }, [addToast]);

  // Manually fetch latest reading
  const fetchLatest = useCallback(async (): Promise<BloodGlucoseReading | null> => {
    if (status !== 'authorized') {
      return null;
    }

    try {
      const reading = await unifiedHealthService.getLatestBloodGlucose();
      if (reading) {
        setLastReading(reading);

        // Feed into data pipeline
        const epochSec = Math.floor(reading.date.getTime() / 1000);
        onEgvs(reading.value, 1 as any, epochSec);

        addToast(`📱 Latest: ${reading.value} mg/dL`);
      }
      return reading;
    } catch (error) {
      const serviceName = unifiedHealthService.getServiceName();
      console.error(`Failed to fetch latest ${serviceName} reading:`, error);
      return null;
    }
  }, [status, onEgvs, addToast]);

  return {
    // Status
    status,
    permissions,
    isObserving,
    lastReading,
    isAvailable: status !== 'unavailable',
    isAuthorized: status === 'authorized',

    // Actions
    requestPermissions,
    startObserving,
    stopObserving,
    fetchLatest,
  };
}