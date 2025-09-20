import React, { useMemo } from 'react';
import { useHudVM } from './useHudVM';

type GlucoseReading = {
  timestamp: number;
  mgdl: number;
};

export const useGlucoseHistory = (): GlucoseReading[] => {
  const { mgdl: currentMgdl } = useHudVM();
  const [showData, setShowData] = React.useState(false);

  // Show empty state for first 1 second to demonstrate the empty state
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowData(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return useMemo(() => {
    // Return empty array initially to show empty state
    if (!showData) {
      return [];
    }

    const now = Date.now();
    const readings: GlucoseReading[] = [];

    // Generate 12 readings over the past hour (5-minute intervals)
    // Include some out-of-range values to test coloring
    const baseGlucose = currentMgdl || 120;
    let lastValue = Math.max(80, Math.min(200, baseGlucose - 30 + Math.random() * 40));

    for (let i = 11; i >= 0; i--) {
      const timestamp = now - (i * 5 * 60 * 1000); // 5 minutes ago for each reading

      // Create realistic glucose fluctuations with some extreme values for testing
      let change = (Math.random() - 0.5) * 20; // Random change of ±10 mg/dL
      const trend = (Math.random() - 0.5) * 5; // Small trend bias

      // Add some intentional out-of-range values for testing
      if (i === 8) {
        // Add a low value around 40 minutes ago
        lastValue = 65; // Below low threshold (80)
      } else if (i === 5) {
        // Add a high value around 25 minutes ago
        lastValue = 220; // Above high threshold (180)
      } else if (i === 2) {
        // Add a very high value around 10 minutes ago
        lastValue = 280; // Above very high threshold (250)
      } else {
        lastValue = Math.max(40, Math.min(350, lastValue + change + trend));
      }

      // Recent readings trend toward current value
      if (i < 3 && i !== 2) { // Don't override our test high value
        const targetDiff = (currentMgdl || 120) - lastValue;
        lastValue += targetDiff * 0.3;
      }

      readings.push({
        timestamp,
        mgdl: Math.round(lastValue),
      });
    }

    // Ensure the last reading matches current if available
    if (currentMgdl && readings.length > 0) {
      readings[readings.length - 1].mgdl = currentMgdl;
    }

    return readings;
  }, [currentMgdl, showData]);
};