// components/handcrafted/CraftNavItem.tsx
import React, { useEffect, useRef } from "react";
import { Pressable, Text, Image, ImageSourcePropType, Animated, StyleSheet, ViewStyle, StyleProp } from "react-native";
import { INK, CREAM_LIGHT, NAV_BLUE, SHADOW_CARD } from "./tokens";

type CraftNavItemProps = {
  /** An emoji/symbol string, or a require()'d custom craft icon -- see
   * App.tsx's NAV_ICONS map. */
  icon: string | ImageSourcePropType;
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Fine-tunes this item's icon size relative to its siblings (touch
   * target unaffected) -- for normalizing perceived visual weight across
   * mixed emoji/custom-PNG icons, since a dense hand-illustrated PNG and a
   * system emoji glyph don't automatically read as the same size at
   * identical width/height. Defaults to 1 (no adjustment). */
  iconScale?: number;
};

const LIFT_PAD = 4; // how far the active patch extends upward, see PATCH_PAD_BASE
const PATCH_PAD_BASE = 9;
const ICON_SIZE = 31;
const ICON_SIZE_ACTIVE = 33;
const IMAGE_SIZE = 33;
const IMAGE_SIZE_ACTIVE = 35;

// One destination on the global bottom nav shelf (CraftBottomNav). Inactive
// items sit flat on the shelf with no card/background of their own -- just
// dark-brown icon+label. The active destination rises as a small muted-blue
// felt patch: rounded top corners, square-ish bottom, no bottom border, so
// it reads as physically emerging from the shelf rather than floating above
// it -- the "growth" is animated via top padding (not a translateY, which
// would open a gap beneath it) so its bottom edge always stays welded to
// the shelf.
export default function CraftNavItem({ icon, label, active, onPress, style, iconScale = 1 }: CraftNavItemProps) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressTranslateY = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(lift, {
      toValue: active ? 1 : 0,
      duration: 140,
      useNativeDriver: false, // animates paddingTop, not a transform
    }).start();
  }, [active, lift]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(pressScale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(pressTranslateY, { toValue: 1, duration: 70, useNativeDriver: true }),
    ]).start();
  };
  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(pressScale, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(pressTranslateY, { toValue: 0, duration: 90, useNativeDriver: true }),
    ]).start();
  };

  const paddingTop = lift.interpolate({
    inputRange: [0, 1],
    outputRange: [PATCH_PAD_BASE, PATCH_PAD_BASE + LIFT_PAD],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      style={[styles.touch, style]}
    >
      {/* Two separate Animated nodes on purpose: paddingTop (the active
          "lift") is a layout property, which the native driver can't touch,
          while the press scale/translateY is transform-only and native-
          driven for smoothness. Mixing both on one node crashes RN's
          Animated ("paddingTop is not supported by native animated
          module"), so the JS-driven lift owns the outer (background/border)
          node and the native-driven press feedback owns a plain inner one. */}
      <Animated.View
        style={[styles.patch, active ? styles.patchActive : styles.patchInactive, { paddingTop }]}
      >
        <Animated.View
          style={[styles.pressWrap, { transform: [{ scale: pressScale }, { translateY: pressTranslateY }] }]}
        >
          {typeof icon === "string" ? (
            <Text style={[styles.icon, { fontSize: (active ? ICON_SIZE_ACTIVE : ICON_SIZE) * iconScale }]}>
              {icon}
            </Text>
          ) : (
            <Image
              source={icon}
              style={{ width: (active ? IMAGE_SIZE_ACTIVE : IMAGE_SIZE) * iconScale, height: (active ? IMAGE_SIZE_ACTIVE : IMAGE_SIZE) * iconScale }}
              resizeMode="contain"
            />
          )}
          <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touch: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  patch: {
    alignItems: "center",
    justifyContent: "center",
    // ~78% of this item's 25% touch zone -- a wide, low-profile felt tab
    // rather than a narrow bookmark. The invisible touch zone (`touch`,
    // above) stays the full flex:1 share regardless.
    width: "78%",
    paddingHorizontal: 8,
    paddingBottom: PATCH_PAD_BASE,
  },
  pressWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  patchInactive: {
    backgroundColor: "transparent",
  },
  patchActive: {
    backgroundColor: NAV_BLUE,
    borderWidth: 2.5,
    borderColor: INK,
    borderBottomWidth: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    ...SHADOW_CARD,
  },
  icon: {
    fontSize: ICON_SIZE,
  },
  label: {
    fontSize: 12,
    lineHeight: 14,
    includeFontPadding: false,
    fontWeight: "600",
    color: INK,
  },
  labelActive: {
    fontSize: 13,
    lineHeight: 15,
    includeFontPadding: false,
    fontWeight: "700",
    color: CREAM_LIGHT,
  },
});
