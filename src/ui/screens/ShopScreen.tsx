import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, useWindowDimensions } from "react-native";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useToastStore } from "../../data/stores/toastStore";
import { useTheme } from "../../data/hooks/useTheme";
import HatPreview from "../components/HatPreview";
import ShadedShopViewport from "../components/ShadedShopViewport";

export default function ShopScreen() {
  const { width, height } = useWindowDimensions();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [showStore, setShowStore] = useState(false);

  // Cosmetics
  const catalog      = useCosmeticsStore(s => s.catalog) || [];
  const owned        = useCosmeticsStore(s => s.owned) || {};
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

  const handleSableTap = () => {
    console.log('Opening store. Cosmetics data:', {
      catalog: catalog,
      catalogLength: catalog?.length,
      owned: owned,
      ownedType: typeof owned,
      ownedIsArray: Array.isArray(owned)
    });
    setShowStore(true);
  };

  const handleCloseStore = () => {
    setShowStore(false);
  };

  const handlePurchase = async (item: any) => {
    try {
      const success = await buy(item.id);
      if (success) {
        addToast(`Purchased ${item.name}!`);
        spend(item.cost);
      } else {
        addToast("Not enough acorns!");
      }
    } catch (error) {
      addToast("Purchase failed");
    }
  };

  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.background.primary,
    }}>
      {/* ShadedShop Spine viewport */}
      <ShadedShopViewport
        width={width}
        height={height}
        onSableTap={handleSableTap}
      />

      {/* Store overlay */}
      {showStore && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.overlay || 'rgba(0, 0, 0, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: colors.background.secondary,
            borderRadius: borderRadius.large,
            padding: spacing.large,
            width: width * 0.9,
            height: height * 0.8,
            shadowColor: colors.shadow || '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8, // Android shadow
          }}>
            {/* Store header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing.medium,
              paddingBottom: spacing.small,
              borderBottomWidth: 1,
              borderBottomColor: colors.border?.primary || colors.text.secondary,
            }}>
              <Text style={[typography.title, { color: colors.text.primary }]}>
                Sable's Shop
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <View style={{
                  backgroundColor: colors.background.tertiary || colors.background.primary,
                  paddingHorizontal: spacing.medium,
                  paddingVertical: spacing.small,
                  borderRadius: borderRadius.medium,
                  marginRight: spacing.medium,
                }}>
                  <Text style={[typography.body, { color: colors.text.primary, fontWeight: 'bold' }]}>
                    {acorns} 🌰
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCloseStore}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.background.tertiary || colors.background.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={[typography.title, { color: colors.text.primary }]}>×</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Store items */}
            <FlatList
              data={catalog}
              keyExtractor={(item) => item.id}
              numColumns={2}
              renderItem={({ item }) => {
                const isOwned = owned[item.id] === true;
                const canAfford = acorns >= item.cost;

                return (
                  <View style={{
                    flex: 1,
                    margin: spacing.small,
                    backgroundColor: colors.background.primary,
                    borderRadius: borderRadius.medium,
                    padding: spacing.medium,
                    alignItems: 'center',
                    shadowColor: colors.shadow || '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2, // Android shadow
                    borderWidth: 1,
                    borderColor: colors.border?.secondary || 'transparent',
                  }}>
                    <HatPreview
                      hatId={item.id}
                      size={60}
                      style={{ marginBottom: spacing.small }}
                    />
                    <Text style={[
                      typography.caption,
                      {
                        color: colors.text.primary,
                        textAlign: 'center',
                        fontWeight: '600',
                        marginBottom: spacing.extraSmall,
                      }
                    ]}>
                      {item.name}
                    </Text>
                    <View style={{
                      backgroundColor: colors.background.tertiary || colors.background.secondary,
                      paddingHorizontal: spacing.small,
                      paddingVertical: spacing.extraSmall,
                      borderRadius: borderRadius.small,
                      marginBottom: spacing.small,
                    }}>
                      <Text style={[typography.body, { color: colors.text.primary, fontWeight: 'bold' }]}>
                        {item.cost} 🌰
                      </Text>
                    </View>

                    {isOwned ? (
                      <View style={{
                        backgroundColor: colors.success?.background || colors.accent.primary,
                        paddingHorizontal: spacing.medium,
                        paddingVertical: spacing.small,
                        borderRadius: borderRadius.small,
                      }}>
                        <Text style={[
                          typography.caption,
                          {
                            color: colors.success?.text || colors.text.inverse,
                            fontWeight: 'bold'
                          }
                        ]}>
                          ✓ Owned
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={{
                          backgroundColor: canAfford ? colors.accent.primary : colors.background.tertiary,
                          paddingHorizontal: spacing.medium,
                          paddingVertical: spacing.small,
                          borderRadius: borderRadius.small,
                          minWidth: 60,
                          alignItems: 'center',
                          opacity: canAfford ? 1 : 0.6,
                        }}
                        onPress={() => canAfford && handlePurchase(item)}
                        disabled={!canAfford}
                      >
                        <Text style={[
                          typography.caption,
                          {
                            color: canAfford ? colors.text.inverse : colors.text.secondary,
                            fontWeight: 'bold'
                          }
                        ]}>
                          {canAfford ? 'Buy' : 'Too Expensive'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
