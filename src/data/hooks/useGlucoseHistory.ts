import React, { useMemo } from 'react';
import { useGameStore } from '../stores/gameStore';

type GlucoseReading = {
  timestamp: number;
  mgdl: number;
};

export const useGlucoseHistory = (): GlucoseReading[] => {
  const engine = useGameStore(s => s.engine);
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

    // Use live data from engine trail if available
    const trail = engine?.trail || [];

    if (trail.length > 0) {
      // Convert engine trail format to chart format
      return trail.map(reading => ({
        timestamp: reading.ts,
        mgdl: reading.mgdl,
      }));
    }

    // If no live data yet, generate some initial seed data for demonstration
    // This will be replaced by live data as the simulator runs
    const now = Date.now();
    const readings: GlucoseReading[] = [];

    // Generate fewer initial readings (just 6 over past 30 minutes) to be quickly replaced by live data
    let lastValue = 100 + Math.random() * 40; // Start with a reasonable baseline

    for (let i = 5; i >= 0; i--) {
      const timestamp = now - (i * 5 * 60 * 1000); // 5 minutes ago for each reading

      // Create subtle realistic fluctuations for initial seed data
      const change = (Math.random() - 0.5) * 10; // Smaller changes for seed data
      lastValue = Math.max(80, Math.min(180, lastValue + change));

      readings.push({
        timestamp,
        mgdl: Math.round(lastValue),
      });
    }

    return readings;
  }, [engine?.trail, showData]);
};