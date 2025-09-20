import React, { useEffect } from "react";
import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import { useCosmeticsStore } from "../stores/cosmeticsStore";
import { useProgressionStore } from "../stores/progressionStore";
import { useToastStore } from "../stores/toastStore";
import { useTheme } from "../hooks/useTheme";

export default function ShopScreen() {
  const { colors, spacing, borderRadius, typography } = useTheme();

  // Cosmetics
  const catalog      = useCosmeticsStore(s => s.catalog);
  const owned        = useCosmeticsStore(s => s.owned);
  const loadCatalog  = useCosmeticsStore(s => s.loadCatalog);
  const buy          = useCosmeticsStore(s => s.buy);
  const equip        = useCosmeticsStore(s => s.equip);
  const equipTheme   = useCosmeticsStore(s => s.equipTheme);
  const equipped     = useCosmeticsStore(s => s.equipped);

  // Progression
  const acorns = useProgressionStore(s => s.acorns);
  const spend  = useProgressionStore(s => s.spend);

  const addToast = useToastStore(s => s.addToast);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background.primary,
      padding: spacing.lg,
    }}>
      {/* Header with acorn balance */}
      <View style={{
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        shadowColor: colors.gray[900],
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}>
        <Text style={{
          color: colors.text.primary,
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold,
        }}>
          🛍️ Pet Shop
        </Text>
        <View style={{
          backgroundColor: colors.accent.cream,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.xs,
          paddingHorizontal: spacing.sm,
          borderWidth: 1,
          borderColor: colors.accent.peach,
        }}>
          <Text style={{
            color: colors.text.primary,
            fontSize: typography.size.base,
            fontWeight: typography.weight.extrabold,
          }}>
            🌰 {acorns.toLocaleString()}
          </Text>
        </View>
      </View>

      <FlatList
        data={catalog}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const isOwned    = !!owned[item.id];
          const isEquipped = item.socket === "theme" ? equipped.theme === item.id : equipped.headTop === item.id;
          const canAfford  = acorns >= item.cost;
          const rnImageSource = item.tex ? (typeof item.tex === "string" ? { uri: item.tex } : item.tex) : null;

          return (
            <View
              style={{
                backgroundColor: colors.background.card,
                borderRadius: borderRadius.lg,
                padding: spacing.lg,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderWidth: isEquipped ? 2 : 1,
                borderColor: isEquipped ? colors.primary[500] : colors.gray[200],
                shadowColor: colors.gray[900],
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}
            >
              <View style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                flex: 1,
              }}>
                <View style={{
                  backgroundColor: colors.background.secondary,
                  borderRadius: borderRadius.md,
                  padding: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.gray[200],
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {rnImageSource ? (
                    <Image source={rnImageSource} style={{ width: 48, height: 48 }} resizeMode="contain" />
                  ) : (
                    <Text style={{ fontSize: 24 }}>
                      {item.socket === "theme" ? "🎨" : "👑"}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: colors.text.primary,
                    fontSize: typography.size.base,
                    fontWeight: typography.weight.semibold,
                  }}>
                    {item.name}
                  </Text>
                  <Text style={{
                    color: colors.text.secondary,
                    fontSize: typography.size.sm,
                    marginTop: spacing.xs,
                  }}>
                    {isOwned
                      ? (isEquipped ? "✨ Currently Equipped" : "✅ Owned")
                      : `💰 ${item.cost.toLocaleString()} acorns`
                    }
                  </Text>
                  {item.socket === "theme" && (
                    <Text style={{
                      color: colors.text.tertiary,
                      fontSize: typography.size.xs,
                      marginTop: spacing.xs,
                      fontStyle: 'italic',
                    }}>
                      Color Theme
                    </Text>
                  )}
                </View>
              </View>

              {!isOwned ? (
                <TouchableOpacity
                  disabled={!canAfford}
                  onPress={() => {
                    if (!canAfford) { addToast("Not enough Acorns"); return; }
                    if (!spend(item.cost)) { addToast("Not enough Acorns"); return; }
                    buy(item.id);
                    addToast(`Purchased ${item.name}`);
                  }}
                  style={{
                    backgroundColor: canAfford ? colors.health[500] : colors.gray[200],
                    borderRadius: borderRadius.md,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                    opacity: canAfford ? 1 : 0.5,
                  }}
                >
                  <Text style={{
                    color: canAfford ? colors.text.inverse : colors.text.tertiary,
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.sm,
                  }}>
                    {canAfford ? "Buy" : "Can't afford"}
                  </Text>
                </TouchableOpacity>
              ) : !isEquipped ? (
                <TouchableOpacity
                  onPress={() => {
                    if (item.socket === "theme") {
                      equipTheme(item.id);
                      addToast(`Equipped ${item.name} theme`);
                    } else {
                      equip(item.id);
                      addToast(`Equipped ${item.name}`);
                    }
                  }}
                  style={{
                    backgroundColor: colors.primary[500],
                    borderRadius: borderRadius.md,
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                  }}
                >
                  <Text style={{
                    color: colors.text.inverse,
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.sm,
                  }}>
                    Equip
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{
                  backgroundColor: colors.accent.mint,
                  borderRadius: borderRadius.md,
                  paddingVertical: spacing.sm,
                  paddingHorizontal: spacing.md,
                }}>
                  <Text style={{
                    color: colors.text.primary,
                    fontWeight: typography.weight.semibold,
                    fontSize: typography.size.sm,
                  }}>
                    Equipped
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
