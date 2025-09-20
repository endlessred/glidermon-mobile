import React, { useEffect, useMemo } from "react";
import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import { useCosmeticsStore } from "../stores/cosmeticsStore";
import { useProgressionStore } from "../stores/progressionStore";
import { useToastStore } from "../stores/toastStore";
import { useTheme } from "../hooks/useTheme";

export default function EquipScreen() {
  const { colors, typography, spacing, borderRadius } = useTheme();

  const loadCatalog = useCosmeticsStore(s => s.loadCatalog);
  const catalog     = useCosmeticsStore(s => s.catalog);
  const owned       = useCosmeticsStore(s => s.owned);
  const equipped    = useCosmeticsStore(s => s.equipped);
  const equip       = useCosmeticsStore(s => s.equip);
  const equipTheme  = useCosmeticsStore(s => s.equipTheme);

  const acorns   = useProgressionStore(s => s.acorns);
  const addToast = useToastStore(s => s.addToast);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const hats = useMemo(
    () => catalog.filter(c => c.socket === "headTop" && owned[c.id]),
    [catalog, owned]
  );

  const themes = useMemo(
    () => catalog.filter(c => c.socket === "theme" && owned[c.id]),
    [catalog, owned]
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
        {showImage && item.tex && (
          <Image
            source={typeof item.tex === "string" ? { uri: item.tex } : item.tex}
            style={{ width: 48, height: 48 }}
            resizeMode="contain"
          />
        )}
        {!showImage && (
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
          { type: 'section', title: 'Color Themes', items: themes },
          { type: 'section', title: 'Hats', items: hats }
        ]}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
        renderItem={({ item: section }) => (
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
                  : "No hats unlocked yet. Visit the Shop to buy some!"
                }
              </Text>
            ) : (
              <View style={{ gap: spacing.md }}>
                {section.items.map((item: any) => {
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
        )}
      />
    </View>
  );
}
