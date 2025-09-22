import React, { useEffect, useMemo } from "react";
import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useToastStore } from "../../data/stores/toastStore";
import { useActiveLocalOutfit, useOutfitStore } from "../../data/stores/outfitStore";
import { useTheme } from "../../data/hooks/useTheme";
import { usePaletteUnlocks } from "../../data/hooks/usePaletteUnlocks";
import HatPreview from "../components/HatPreview";
import CharacterPreview from "../components/CharacterPreview";
import { SKIN_VARIATIONS, EYE_COLOR_VARIATIONS, SHOE_VARIATIONS } from "../../game/cosmetics/paletteSystem";
import type { SkinVariation, EyeColor, ShoeVariation } from "../../data/types/outfitTypes";

export default function EquipScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const loadCatalog = useCosmeticsStore(s => s.loadCatalog);
  const catalog     = useCosmeticsStore(s => s.catalog);
  const owned       = useCosmeticsStore(s => s.owned);
  const equipped    = useCosmeticsStore(s => s.equipped);
  const equip       = useCosmeticsStore(s => s.equip);
  const equipTheme  = useCosmeticsStore(s => s.equipTheme);

  // Outfit store for palette customization
  const activeOutfit = useActiveLocalOutfit();
  const setSkinVariation = useOutfitStore(s => s.setSkinVariation);
  const setEyeColor = useOutfitStore(s => s.setEyeColor);
  const setShoeVariation = useOutfitStore(s => s.setShoeVariation);
  const isSkinUnlocked = useOutfitStore(s => s.isSkinUnlocked);
  const isShoeUnlocked = useOutfitStore(s => s.isShoeUnlocked);

  const acorns   = useProgressionStore(s => s.acorns);
  const addToast = useToastStore(s => s.addToast);

  // Initialize palette unlock system
  usePaletteUnlocks();

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const hats = useMemo(
    () => catalog.filter(c => c.socket === "headTop" && owned[c.id]),
    [catalog, owned]
  );

  const themes = useMemo(
    () => catalog.filter(c => c.socket === "theme" && owned[c.id]),
    [catalog, owned]
  );

  // Palette options with unlock system
  const skinOptions = useMemo(() =>
    Object.keys(SKIN_VARIATIONS).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1) + ' Skin',
      type: 'skin' as const,
      unlocked: isSkinUnlocked(key as SkinVariation)
    })), [isSkinUnlocked]
  );

  const eyeOptions = useMemo(() =>
    Object.keys(EYE_COLOR_VARIATIONS).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1) + ' Eyes',
      type: 'eyes' as const,
      unlocked: true // Eyes are always unlocked
    })), []
  );

  const shoeOptions = useMemo(() =>
    Object.keys(SHOE_VARIATIONS).map(key => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1) + ' Shoes',
      type: 'shoes' as const,
      unlocked: isShoeUnlocked(key as ShoeVariation)
    })), [isShoeUnlocked]
  );

  const renderPaletteCard = (item: any, isEquipped: boolean, onEquip: () => void) => (
    <View
      style={{
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: isEquipped ? colors.primary[300] : colors.gray[200],
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md
      }}>
        {/* Color preview */}
        <View style={{
          width: 48,
          height: 48,
          borderRadius: borderRadius.md,
          backgroundColor: item.type === 'skin'
            ? SKIN_VARIATIONS[item.id]?.[11] || colors.primary[100] // Use main skin color
            : item.type === 'eyes'
            ? EYE_COLOR_VARIATIONS[item.id]?.[12] || colors.primary[100] // Use eye color
            : SHOE_VARIATIONS[item.id]?.[14] || colors.primary[100], // Use outer shoe color
          borderWidth: 2,
          borderColor: colors.gray[300],
        }} />

        <View>
          <Text style={{
            color: colors.text.primary,
            fontSize: typography.size.base,
            fontWeight: typography.weight.medium as any
          }}>
            {item.name}
          </Text>
          <Text style={{
            color: colors.text.secondary,
            fontSize: typography.size.sm
          }}>
            {isEquipped ? "Selected" : item.unlocked ? "Available" : "Locked"}
          </Text>
        </View>
      </View>

      {!isEquipped && item.unlocked ? (
        <TouchableOpacity
          onPress={onEquip}
          style={{
            backgroundColor: colors.primary[500],
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.md,
          }}
        >
          <Text style={{
            color: colors.text.inverse,
            fontWeight: typography.weight.semibold as any,
            fontSize: typography.size.sm
          }}>
            Select
          </Text>
        </TouchableOpacity>
      ) : isEquipped ? (
        <View style={{
          backgroundColor: colors.primary[100],
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.primary[300],
        }}>
          <Text style={{
            color: colors.primary[700],
            fontSize: typography.size.sm,
            fontWeight: typography.weight.medium as any
          }}>
            Selected
          </Text>
        </View>
      ) : (
        <View style={{
          backgroundColor: colors.gray[100],
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.gray[300],
        }}>
          <Text style={{
            color: colors.text.tertiary,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.medium as any
          }}>
            Locked
          </Text>
        </View>
      )}
    </View>
  );

  const renderItemCard = (item: any, isEquipped: boolean, onEquip: () => void, showImage = true) => (
    <View
      style={{
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: colors.gray[200],
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md
      }}>
        {item.socket === "headTop" ? (
          <HatPreview hatId={item.id} size={48} />
        ) : (
          <View style={{
            width: 48,
            height: 48,
            borderRadius: borderRadius.md,
            backgroundColor: colors.primary[100],
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Text style={{ fontSize: 20 }}>🎨</Text>
          </View>
        )}
        <View>
          <Text style={{
            color: colors.text.primary,
            fontSize: typography.size.base,
            fontWeight: typography.weight.medium as any
          }}>
            {item.name}
          </Text>
          <Text style={{
            color: colors.text.secondary,
            fontSize: typography.size.sm
          }}>
            {isEquipped ? "Equipped" : "Owned"}
          </Text>
        </View>
      </View>

      {!isEquipped ? (
        <TouchableOpacity
          onPress={onEquip}
          style={{
            backgroundColor: colors.primary[500],
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: borderRadius.md,
          }}
        >
          <Text style={{
            color: colors.text.inverse,
            fontWeight: typography.weight.semibold as any,
            fontSize: typography.size.sm
          }}>
            Equip
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={{
          backgroundColor: colors.background.secondary,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.gray[300],
        }}>
          <Text style={{
            color: colors.text.secondary,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.medium as any
          }}>
            Equipped
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background.primary,
      padding: spacing.lg,
    }}>
      {/* Header */}
      <View style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        marginBottom: spacing.lg
      }}>
        <Text style={{
          color: colors.text.primary,
          fontSize: typography.size['2xl'],
          fontWeight: typography.weight.bold as any
        }}>
          Cosmetics
        </Text>
        <Text style={{
          color: colors.text.secondary,
          fontSize: typography.size.base
        }}>
          Acorns: {acorns.toLocaleString()}
        </Text>
      </View>

      <FlatList
        data={[
          { type: 'character-preview' },
          { type: 'section', title: 'Skin Color', items: skinOptions, isPalette: true },
          { type: 'section', title: 'Eye Color', items: eyeOptions, isPalette: true },
          { type: 'section', title: 'Shoe Color', items: shoeOptions, isPalette: true },
          { type: 'section', title: 'Color Themes', items: themes },
          { type: 'section', title: 'Hats', items: hats }
        ]}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        renderItem={({ item: section }) => {
          // Handle character preview section
          if (section.type === 'character-preview') {
            return activeOutfit ? (
              <View style={{
                alignItems: 'center',
                marginBottom: spacing.md
              }}>
                <CharacterPreview
                  outfit={activeOutfit}
                  size="large"
                />
                <Text style={{
                  color: colors.text.secondary,
                  fontSize: typography.size.sm,
                  marginTop: spacing.sm,
                  textAlign: 'center'
                }}>
                  Preview your character's appearance
                </Text>
              </View>
            ) : null;
          }

          // Handle regular sections
          return (
            <View>
              <Text style={{
                color: colors.text.primary,
                fontSize: typography.size.lg,
                fontWeight: typography.weight.semibold as any,
                marginBottom: spacing.md
              }}>
                {section.title}
              </Text>

              {section.items.length === 0 ? (
                <Text style={{
                  color: colors.text.tertiary,
                  fontSize: typography.size.base,
                  fontStyle: 'italic'
                }}>
                  {section.title === 'Color Themes'
                    ? "No themes unlocked yet. Visit the Shop to buy some!"
                    : section.title === 'Hats'
                    ? "No hats unlocked yet. Visit the Shop to buy some!"
                    : "No options available"
                  }
                </Text>
              ) : (
                <View style={{ gap: spacing.md }}>
                  {section.items.map((item: any) => {
                    // Handle palette items
                    if (section.isPalette && activeOutfit) {
                      const isEquipped = section.title === 'Skin Color'
                        ? activeOutfit.skinVariation === item.id
                        : section.title === 'Eye Color'
                        ? activeOutfit.eyeColor === item.id
                        : section.title === 'Shoe Color'
                        ? activeOutfit.shoeVariation === item.id
                        : false;

                      const onEquip = section.title === 'Skin Color'
                        ? () => { setSkinVariation(activeOutfit.id, item.id as SkinVariation); addToast(`Selected ${item.name}`); }
                        : section.title === 'Eye Color'
                        ? () => { setEyeColor(activeOutfit.id, item.id as EyeColor); addToast(`Selected ${item.name}`); }
                        : section.title === 'Shoe Color'
                        ? () => { setShoeVariation(activeOutfit.id, item.id as ShoeVariation); addToast(`Selected ${item.name}`); }
                        : () => {};

                      return (
                        <View key={item.id}>
                          {renderPaletteCard(item, isEquipped, onEquip)}
                        </View>
                      );
                    }

                    // Handle regular cosmetic items
                    const isEquipped = section.title === 'Color Themes'
                      ? equipped.theme === item.id
                      : equipped.headTop === item.id;

                    const onEquip = section.title === 'Color Themes'
                      ? () => { equipTheme(item.id); addToast(`Equipped ${item.name} theme`); }
                      : () => { equip(item.id); addToast(`Equipped ${item.name}`); };

                    return (
                      <View key={item.id}>
                        {renderItemCard(item, isEquipped, onEquip, section.title !== 'Color Themes')}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
