import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";

type Props = {
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
};

export function GoalPicker({ title, options, selected, onSelect }: Props) {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const accentColor = (colors.accent as any)?.lavender ?? colors.primary[500];

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: typography.weight.semibold as any,
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: spacing.xs,
      }}>
        {title}
      </Text>

      {options.map((option) => {
        const isSelected = selected === option;
        return (
          <TouchableOpacity
            key={option}
            onPress={() => onSelect(option)}
            activeOpacity={0.75}
            style={{
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
              borderRadius: borderRadius.md,
              borderWidth: 1.5,
              borderColor: isSelected ? accentColor : colors.gray[300],
              backgroundColor: isSelected
                ? accentColor + "22"
                : colors.background.secondary,
            }}
          >
            <Text style={{
              color: isSelected ? accentColor : colors.text.primary,
              fontSize: typography.size.md,
              fontWeight: isSelected ? (typography.weight.semibold as any) : (typography.weight.normal as any),
            }}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
