// ui/components/AdjustmentSlider.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";

interface AdjustmentSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onValueChange: (value: number) => void;
}

export default function AdjustmentSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onValueChange
}: AdjustmentSliderProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const normalizedValue = (value - min) / (max - min);
  const displayValue = unit === "x" ? value.toFixed(2) : Math.round(value);

  const handleSliderPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const sliderWidth = 200; // Fixed width for consistency
    const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
    const newValue = min + percentage * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    onValueChange(clampedValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onValueChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onValueChange(newValue);
  };

  return (
    <View style={{ marginBottom: spacing.md }}>
      {/* Label and Value */}
      <View style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: spacing.sm
      }}>
        <Text style={{
          fontSize: typography.size.sm,
          fontWeight: typography.weight.medium as any,
          color: colors.text.primary
        }}>
          {label}
        </Text>

        <Text style={{
          fontSize: typography.size.sm,
          color: colors.text.secondary,
          fontFamily: "monospace"
        }}>
          {displayValue}{unit}
        </Text>
      </View>

      {/* Slider Container */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm
      }}>
        {/* Decrement Button */}
        <Pressable
          onPress={handleDecrement}
          disabled={value <= min}
          style={{
            width: 32,
            height: 32,
            backgroundColor: value <= min ? colors.gray[200] : colors.primary[500],
            borderRadius: borderRadius.sm,
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <Text style={{
            color: value <= min ? colors.gray[400] : colors.text.inverse,
            fontSize: typography.size.lg,
            fontWeight: typography.weight.bold as any
          }}>
            -
          </Text>
        </Pressable>

        {/* Slider Track */}
        <Pressable
          onPress={handleSliderPress}
          style={{
            flex: 1,
            height: 32,
            backgroundColor: colors.gray[200],
            borderRadius: borderRadius.md,
            justifyContent: "center"
          }}
        >
          <View style={{
            width: "100%",
            height: 4,
            backgroundColor: colors.gray[300],
            borderRadius: 2,
            overflow: "hidden"
          }}>
            {/* Progress Fill */}
            <View style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${normalizedValue * 100}%`,
              backgroundColor: colors.primary[500]
            }} />
          </View>

          {/* Slider Thumb */}
          <View style={{
            position: "absolute",
            left: `${normalizedValue * 100}%`,
            marginLeft: -8,
            width: 16,
            height: 16,
            backgroundColor: colors.primary[600],
            borderRadius: 8,
            borderWidth: 2,
            borderColor: colors.text.inverse,
            shadowColor: colors.gray[900],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 3
          }} />
        </Pressable>

        {/* Increment Button */}
        <Pressable
          onPress={handleIncrement}
          disabled={value >= max}
          style={{
            width: 32,
            height: 32,
            backgroundColor: value >= max ? colors.gray[200] : colors.primary[500],
            borderRadius: borderRadius.sm,
            justifyContent: "center",
            alignItems: "center"
          }}
        >
          <Text style={{
            color: value >= max ? colors.gray[400] : colors.text.inverse,
            fontSize: typography.size.lg,
            fontWeight: typography.weight.bold as any
          }}>
            +
          </Text>
        </Pressable>
      </View>

      {/* Range Display */}
      <View style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: spacing.xs
      }}>
        <Text style={{
          fontSize: typography.size.xs,
          color: colors.text.secondary
        }}>
          {unit === "x" ? min.toFixed(1) : min}{unit}
        </Text>

        <Text style={{
          fontSize: typography.size.xs,
          color: colors.text.secondary
        }}>
          {unit === "x" ? max.toFixed(1) : max}{unit}
        </Text>
      </View>
    </View>
  );
}