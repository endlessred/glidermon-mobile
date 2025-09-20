import React from 'react';
import { View, Dimensions, Text, Platform } from 'react-native';
import { useTheme } from '../../data/hooks/useTheme';
import { useSettingsStore } from '../../data/stores/settingsStore';

type GlucoseReading = {
  timestamp: number;
  mgdl: number;
};

type Props = {
  readings: GlucoseReading[];
  height?: number;
};

const GLUCOSE_MIN = 40;
const GLUCOSE_MAX = 400;

export default function GlucoseWindTrail({ readings, height = 120 }: Props) {
  const { colors, spacing } = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  const [containerWidth, setContainerWidth] = React.useState(
    screenWidth - (spacing.lg * 4) // Better initial estimate based on screen width
  );

  // Get configurable thresholds from settings
  const low = useSettingsStore(s => s.low);
  const high = useSettingsStore(s => s.high);
  const veryHigh = useSettingsStore(s => s.veryHigh);

  // Show empty state when no data is available
  if (!readings.length) {
    return (
      <View
        style={{
          height,
          width: '100%',
          marginTop: 12,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background.secondary,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.gray[200],
          borderStyle: 'dashed',
        }}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          setContainerWidth(width);
        }}
      >
        <View style={{
          alignItems: 'center',
          gap: 8,
        }}>
          <Text style={{
            fontSize: 32,
            opacity: 0.6,
          }}>
            🐿️
          </Text>
          <Text style={{
            color: colors.text.secondary,
            fontSize: 14,
            textAlign: 'center',
            paddingHorizontal: 16,
            lineHeight: 20,
          }}>
            Waiting for glucose data...{'\n'}Wind trail will appear here
          </Text>

          {/* Loading dots animation */}
          <View style={{
            flexDirection: 'row',
            gap: 4,
            marginTop: 4,
          }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.primary[400],
                  opacity: 0.3,
                }}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // Use actual container width minus margin for the glider
  const chartWidth = Math.max(0, containerWidth - 24); // Leave 12px margin on each side for glider

  // Get current glucose color using configurable thresholds
  const getCurrentGlucoseColor = () => {
    if (!readings.length) return colors.text.secondary;
    const current = readings[readings.length - 1].mgdl;
    if (current < low) return colors.glucose.low;
    if (current < high) return colors.glucose.normal;
    if (current < veryHigh) return colors.glucose.high;
    return colors.glucose.critical;
  };

  // Get color for any glucose value (for individual data points)
  const getGlucoseColorForValue = (mgdl: number) => {
    if (mgdl < low) return colors.glucose.low;
    if (mgdl < high) return colors.glucose.normal;
    if (mgdl < veryHigh) return colors.glucose.high;
    return colors.glucose.critical;
  };

  // Analyze which ranges have data points
  const getDataRanges = () => {
    const ranges = {
      hasLow: false,
      hasNormal: false,
      hasHigh: false,
      hasCritical: false
    };

    readings.forEach(reading => {
      if (reading.mgdl < low) {
        ranges.hasLow = true;
      } else if (reading.mgdl < high) {
        ranges.hasNormal = true;
      } else if (reading.mgdl < veryHigh) {
        ranges.hasHigh = true;
      } else {
        ranges.hasCritical = true;
      }
    });

    return ranges;
  };

  const dataRanges = getDataRanges();

  // Calculate dynamic min/max based on data and expand to include relevant threshold bands
  const getChartRange = () => {
    if (!readings.length) return { min: GLUCOSE_MIN, max: GLUCOSE_MAX };

    const dataMin = Math.min(...readings.map(r => r.mgdl));
    const dataMax = Math.max(...readings.map(r => r.mgdl));

    // Determine which threshold boundaries to include
    let chartMin = GLUCOSE_MIN;
    let chartMax = GLUCOSE_MAX;

    // Expand range to include relevant threshold bands
    if (dataRanges.hasLow) {
      chartMin = Math.min(chartMin, GLUCOSE_MIN); // Show from bottom if we have low values
    } else {
      chartMin = Math.max(GLUCOSE_MIN, low - 20); // Start slightly below normal range
    }

    if (dataRanges.hasCritical) {
      chartMax = Math.min(chartMax, Math.max(dataMax + 50, veryHigh + 50)); // Show critical range plus buffer
    } else if (dataRanges.hasHigh) {
      chartMax = Math.min(chartMax, Math.max(dataMax + 30, veryHigh)); // Show up to very high threshold
    } else if (dataRanges.hasNormal) {
      chartMax = Math.max(dataMax + 20, high + 20); // Show normal range plus buffer
    }

    // Ensure we have reasonable bounds
    chartMin = Math.max(chartMin, 40);
    chartMax = Math.min(chartMax, 400);

    // Ensure minimum range for readability
    const range = chartMax - chartMin;
    if (range < 60) {
      const center = (chartMin + chartMax) / 2;
      chartMin = center - 30;
      chartMax = center + 30;
    }

    return { min: chartMin, max: chartMax };
  };

  const { min: chartMin, max: chartMax } = getChartRange();

  // Create simple chart using React Native Views for web compatibility
  return (
    <View
      style={{
        height,
        width: '100%', // Use full available width
        marginTop: 12,
      }}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
      }}
    >
      {/* Dynamic threshold bands - only show ranges that have data */}

      {/* Low range band (red) */}
      {dataRanges.hasLow && (
        <View style={{
          position: 'absolute',
          left: 12,
          right: 12,
          top: height - ((Math.min(low, chartMax) - chartMin) / (chartMax - chartMin) * height),
          height: ((Math.min(low, chartMax) - Math.max(chartMin, 0)) / (chartMax - chartMin) * height),
          backgroundColor: colors.glucose.low,
          opacity: 0.15,
          borderRadius: 4,
        }} />
      )}

      {/* Normal range band (green) */}
      {dataRanges.hasNormal && (
        <View style={{
          position: 'absolute',
          left: 12,
          right: 12,
          top: height - ((Math.min(high, chartMax) - chartMin) / (chartMax - chartMin) * height),
          height: ((Math.min(high, chartMax) - Math.max(low, chartMin)) / (chartMax - chartMin) * height),
          backgroundColor: colors.glucose.normal,
          opacity: 0.15,
          borderRadius: 4,
        }} />
      )}

      {/* High range band (orange) */}
      {dataRanges.hasHigh && (
        <View style={{
          position: 'absolute',
          left: 12,
          right: 12,
          top: height - ((Math.min(veryHigh, chartMax) - chartMin) / (chartMax - chartMin) * height),
          height: ((Math.min(veryHigh, chartMax) - Math.max(high, chartMin)) / (chartMax - chartMin) * height),
          backgroundColor: colors.glucose.high,
          opacity: 0.15,
          borderRadius: 4,
        }} />
      )}

      {/* Critical range band (dark red) */}
      {dataRanges.hasCritical && (
        <View style={{
          position: 'absolute',
          left: 12,
          right: 12,
          top: height - ((chartMax - chartMin) / (chartMax - chartMin) * height),
          height: ((chartMax - Math.max(veryHigh, chartMin)) / (chartMax - chartMin) * height),
          backgroundColor: colors.glucose.critical,
          opacity: 0.15,
          borderRadius: 4,
        }} />
      )}

      {/* Glucose data points */}
      {readings.map((reading, index) => {
        const timeRange = readings[readings.length - 1].timestamp - readings[0].timestamp;
        const maxTime = timeRange || 3600000;
        const x = 12 + (reading.timestamp - readings[0].timestamp) / maxTime * chartWidth;
        const normalizedGlucose = Math.max(0, Math.min(1, (reading.mgdl - chartMin) / (chartMax - chartMin)));
        const y = height - (normalizedGlucose * height);

        const pointOpacity = 0.6 + (index / readings.length) * 0.4;

        return (
          <React.Fragment key={index}>
            {/* Main data point */}
            <View
              style={{
                position: 'absolute',
                left: x - 3,
                top: y - 3,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: getGlucoseColorForValue(reading.mgdl),
                opacity: pointOpacity,
              }}
            />

            {/* Wind trail wispy effect around each point */}
            <View
              style={{
                position: 'absolute',
                left: x - 8,
                top: y - 8,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: getGlucoseColorForValue(reading.mgdl),
                opacity: pointOpacity * 0.2,
              }}
            />

            {/* Outer wispy glow */}
            <View
              style={{
                position: 'absolute',
                left: x - 12,
                top: y - 12,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: getGlucoseColorForValue(reading.mgdl),
                opacity: pointOpacity * 0.1,
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Connecting lines for trail effect */}
      {readings.map((reading, index) => {
        if (index === 0) return null;

        const timeRange = readings[readings.length - 1].timestamp - readings[0].timestamp;
        const maxTime = timeRange || 3600000;

        const prevReading = readings[index - 1];
        const x1 = 12 + (prevReading.timestamp - readings[0].timestamp) / maxTime * chartWidth;
        const y1 = height - (Math.max(0, Math.min(1, (prevReading.mgdl - chartMin) / (chartMax - chartMin))) * height);

        const x2 = 12 + (reading.timestamp - readings[0].timestamp) / maxTime * chartWidth;
        const y2 = height - (Math.max(0, Math.min(1, (reading.mgdl - chartMin) / (chartMax - chartMin))) * height);

        const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        const lineOpacity = 0.4 + (index / readings.length) * 0.4;
        // Use color from the more recent reading for the line
        const lineColor = getGlucoseColorForValue(reading.mgdl);

        return (
          <React.Fragment key={`line-${index}`}>
            {/* Main connecting line */}
            <View
              style={{
                position: 'absolute',
                left: x1,
                top: y1 - 1,
                width: lineLength,
                height: 3,
                backgroundColor: lineColor,
                opacity: lineOpacity,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
                borderRadius: 1.5,
              }}
            />

            {/* Wispy trail line (thicker, more transparent) */}
            <View
              style={{
                position: 'absolute',
                left: x1,
                top: y1 - 3,
                width: lineLength,
                height: 6,
                backgroundColor: lineColor,
                opacity: lineOpacity * 0.3,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
                borderRadius: 3,
              }}
            />

            {/* Very wide, very faint trail for wind effect */}
            <View
              style={{
                position: 'absolute',
                left: x1,
                top: y1 - 5,
                width: lineLength,
                height: 10,
                backgroundColor: lineColor,
                opacity: lineOpacity * 0.1,
                transform: [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
                borderRadius: 5,
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Sugar glider emoji at the most recent data point */}
      {readings.length > 0 && (() => {
        const lastReading = readings[readings.length - 1];
        const timeRange = readings[readings.length - 1].timestamp - readings[0].timestamp;
        const maxTime = timeRange || 3600000;
        const x = 12 + (lastReading.timestamp - readings[0].timestamp) / maxTime * chartWidth;
        const normalizedGlucose = Math.max(0, Math.min(1, (lastReading.mgdl - chartMin) / (chartMax - chartMin)));
        const y = height - (normalizedGlucose * height);

        return (
          <View style={{
            position: 'absolute',
            left: Math.max(0, Math.min(containerWidth - 24, x - 12)), // Keep glider within container bounds
            top: Math.max(0, Math.min(height - 24, y - 12)),  // Keep glider within bounds
          }}>
            {/* Multiple glow layers for wind effect behind glider */}
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: getCurrentGlucoseColor(),
              opacity: 0.1,
              position: 'absolute',
              left: -4,
              top: -4,
            }} />
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: getCurrentGlucoseColor(),
              opacity: 0.2,
              position: 'absolute',
            }} />
            <View style={{
              width: 24,
              height: 24,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              {/* Using flying squirrel emoji as sugar glider substitute */}
              <Text style={{ fontSize: 16 }}>🐿️</Text>
            </View>
          </View>
        );
      })()}
    </View>
  );
}