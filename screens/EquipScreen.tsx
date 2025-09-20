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

  const acorns   = useProgressionStore(s => s.acorns);
  const addToast = useToastStore(s => s.addToast);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const hats = useMemo(
    () => catalog.filter(c => c.socket === "headTop" && owned[c.id]),
    [catalog, owned]
  );

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background.primary,
      padding: spacing.lg,
      gap: spacing.md
    }}>
      <View style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between"
      }}>
        <Text style={{
          color: colors.text.primary,
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold as any
        }}>
          Equip Hat
        </Text>
        <Text style={{
          color: colors.text.secondary,
          fontSize: typography.size.base
        }}>
          Acorns: {acorns.toLocaleString()}
        </Text>
      </View>

      {hats.length === 0 ? (
        <Text style={{
          color: colors.text.tertiary,
          fontSize: typography.size.base
        }}>
          You don't own any hats yet. Visit the Shop to buy one.
        </Text>
      ) : (
        <FlatList
          data={hats}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => {
            const isEquipped = equipped.headTop === item.id;
            const rnImageSource = typeof item.tex === "string" ? { uri: item.tex } : item.tex;

            return (
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
                  <Image
                    source={rnImageSource}
                    style={{ width: 48, height: 48 }}
                    resizeMode="contain"
                  />
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
                    onPress={() => { equip(item.id); addToast(`Equipped ${item.name}`); }}
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
          }}
        />
      )}
    </View>
  );
}
