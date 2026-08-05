import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, TouchableOpacity, useWindowDimensions } from "react-native";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useToastStore } from "../../data/stores/toastStore";
import { useHousingStore } from "../../data/stores/housingStore";
import { useTheme } from "../../data/hooks/useTheme";
import { useAmbientConversations } from "../../data/hooks/useAmbientConversations";
import HatPreview from "../components/HatPreview";
import PatternSwatch from "../components/PatternSwatch";
import ShadedShopViewport from "../components/ShadedShopViewport";
import AmbientConversationDisplay from "../components/AmbientConversation";
import {
  FLOOR_PATTERN_CATALOG,
  WALL_PATTERN_CATALOG,
  FloorPatternItem,
  WallPatternItem,
} from "../../game/housing/types/proceduralPatternCatalog";
import { FURNITURE_SHOP_CATALOG, FurnitureShopItem } from "../../game/housing/types/furnitureCatalog";
import { getSlotsForTier } from "../../game/housing/types/roomSlots";
import { getFurnitureImageSource } from "../../game/housing/assets/quadTextures";

export type ShopCategory = "cosmetics" | "floors" | "walls" | "furniture";

export default function ShopScreen({ initialCategory }: { initialCategory?: ShopCategory }) {
  const { width, height } = useWindowDimensions();
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const [showStore, setShowStore] = useState(!!initialCategory);
  const [category, setCategory] = useState<ShopCategory>(initialCategory ?? "cosmetics");

  // Ambient conversations
  const {
    currentConversation,
    isVisible: isConversationVisible,
    endConversation,
    triggerConversation,
  } = useAmbientConversations({
    context: "ShadedShop",
    enabled: !showStore, // Only show conversations when store is closed
    minInterval: 20000, // 20 seconds
    maxInterval: 60000, // 1 minute
  });

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

  // Housing patterns (floors/walls) -- separate procedural catalog from the
  // cosmetics one above, see proceduralPatternCatalog.ts for why.
  const unlockedFloorPatternIds = useHousingStore(s => s.unlockedFloorPatternIds);
  const unlockedWallPatternIds  = useHousingStore(s => s.unlockedWallPatternIds);
  const activeFloorPatternId    = useHousingStore(s => s.activeFloorPatternId);
  const activeWallPatternId     = useHousingStore(s => s.activeWallPatternId);
  const unlockFloorPattern      = useHousingStore(s => s.unlockFloorPattern);
  const unlockWallPattern       = useHousingStore(s => s.unlockWallPattern);
  const setActiveFloorPattern   = useHousingStore(s => s.setActiveFloorPattern);
  const setActiveWallPattern    = useHousingStore(s => s.setActiveWallPattern);

  // Furniture (slot-based, 3D room shell) -- separate catalog again, see
  // furnitureCatalog.ts.
  const roomSizeTier         = useHousingStore(s => s.roomSizeTier);
  const activeFurnitureBySlot = useHousingStore(s => s.activeFurnitureBySlot);
  const unlockedFurnitureIds  = useHousingStore(s => s.unlockedFurnitureIds);
  const unlockFurniture       = useHousingStore(s => s.unlockFurniture);
  const setActiveFurniture    = useHousingStore(s => s.setActiveFurniture);

  const handleFurniturePurchase = (item: FurnitureShopItem) => {
    if (acorns < item.cost) {
      addToast("Not enough acorns!");
      return;
    }
    unlockFurniture(item.id);
    spend(item.cost);
    addToast(`Purchased ${item.name}!`);
  };

  const handleApplyFurniture = (item: FurnitureShopItem) => {
    const slots = getSlotsForTier(roomSizeTier).filter((s) => s.type === item.slotType);
    if (slots.length === 0) return;
    const targetSlot = slots.find((s) => !activeFurnitureBySlot[s.slotId]) ?? slots[0];
    setActiveFurniture(targetSlot.slotId, item.furnitureId, item.variantId);
  };

  const isFurnitureActive = (item: FurnitureShopItem) =>
    getSlotsForTier(roomSizeTier)
      .filter((s) => s.type === item.slotType)
      .some((s) => {
        const occupant = activeFurnitureBySlot[s.slotId];
        return occupant?.furnitureId === item.furnitureId && occupant?.variantId === item.variantId;
      });

  const unlockedPatternIds = category === "floors" ? unlockedFloorPatternIds : unlockedWallPatternIds;
  const activePatternId    = category === "floors" ? activeFloorPatternId : activeWallPatternId;

  const handlePatternPurchase = (item: FloorPatternItem | WallPatternItem) => {
    if (acorns < item.cost) {
      addToast("Not enough acorns!");
      return;
    }
    if (category === "floors") unlockFloorPattern(item.id);
    else unlockWallPattern(item.id);
    spend(item.cost);
    addToast(`Purchased ${item.name}!`);
  };

  const handleApplyPattern = (item: FloorPatternItem | WallPatternItem) => {
    if (category === "floors") setActiveFloorPattern(item.id);
    else setActiveWallPattern(item.id);
  };

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

      {/* Ambient Conversations */}
      {currentConversation && (
        <AmbientConversationDisplay
          conversation={currentConversation}
          visible={isConversationVisible}
          onComplete={endConversation}
        />
      )}

      {/* Debug: Manual conversation trigger (remove in production) */}
      {__DEV__ && !showStore && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            top: 100,
            right: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: 10,
            borderRadius: 20,
          }}
          onPress={triggerConversation}
        >
          <Text style={{ color: '#fff', fontSize: 12 }}>💬 Trigger Chat</Text>
        </TouchableOpacity>
      )}

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

            {/* Category selector */}
            <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
              {(['cosmetics', 'floors', 'walls', 'furniture'] as ShopCategory[]).map((cat) => {
                const isSelected = category === cat;
                const label = cat === 'cosmetics' ? 'Cosmetics' : cat === 'floors' ? 'Floors' : cat === 'walls' ? 'Walls' : 'Furniture';
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={{
                      flex: 1,
                      paddingVertical: spacing.sm,
                      marginRight: cat !== 'furniture' ? spacing.sm : 0,
                      borderRadius: borderRadius.md,
                      alignItems: 'center',
                      backgroundColor: isSelected ? colors.primary[500] : colors.background.tertiary,
                    }}
                  >
                    <Text style={{
                      fontSize: typography.size.xs,
                      color: isSelected ? colors.text.inverse : colors.text.primary,
                      fontWeight: 'bold',
                    }}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Store items */}
            {category === 'cosmetics' ? (
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
            ) : category === 'furniture' ? (
            <FlatList<FurnitureShopItem>
              data={FURNITURE_SHOP_CATALOG}
              keyExtractor={(item) => item.id}
              numColumns={2}
              renderItem={({ item }) => {
                const isOwned = unlockedFurnitureIds.includes(item.id);
                const isActive = isFurnitureActive(item);
                const canAfford = acorns >= item.cost;
                const imageSource = getFurnitureImageSource(item.previewAsset);

                return (
                  <View style={{
                    flex: 1,
                    margin: spacing.sm,
                    backgroundColor: colors.background.primary,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    alignItems: 'center',
                    ...shadows.sm,
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive ? colors.primary[500] : colors.gray[200],
                  }}>
                    <View style={{ width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
                      {imageSource ? (
                        <Image source={imageSource} style={{ width: 60, height: 60 }} resizeMode="contain" />
                      ) : (
                        <View style={{ width: 60, height: 60, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.sm }} />
                      )}
                    </View>
                    <Text style={{
                      fontSize: typography.size.xs,
                      color: colors.text.primary,
                      textAlign: 'center',
                      fontWeight: '600',
                      marginTop: spacing.sm,
                      marginBottom: spacing.xs,
                    }}>
                      {item.name}
                    </Text>
                    <View style={{
                      backgroundColor: colors.background.tertiary,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.sm,
                      marginBottom: spacing.sm,
                    }}>
                      <Text style={{ fontSize: typography.size.base, color: colors.text.primary, fontWeight: 'bold' }}>
                        {item.cost} 🌰
                      </Text>
                    </View>

                    {isActive ? (
                      <View style={{
                        backgroundColor: colors.accent.mint,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: borderRadius.sm,
                      }}>
                        <Text style={{ fontSize: typography.size.xs, color: colors.text.primary, fontWeight: 'bold' }}>
                          ✓ Active
                        </Text>
                      </View>
                    ) : isOwned ? (
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.primary[500],
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          borderRadius: borderRadius.sm,
                          minWidth: 60,
                          alignItems: 'center',
                        }}
                        onPress={() => handleApplyFurniture(item)}
                      >
                        <Text style={{ fontSize: typography.size.xs, color: colors.text.inverse, fontWeight: 'bold' }}>
                          Apply
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={{
                          backgroundColor: canAfford ? colors.primary[500] : colors.background.tertiary,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          borderRadius: borderRadius.sm,
                          minWidth: 60,
                          alignItems: 'center',
                          opacity: canAfford ? 1 : 0.6,
                        }}
                        onPress={() => canAfford && handleFurniturePurchase(item)}
                        disabled={!canAfford}
                      >
                        <Text style={{
                          fontSize: typography.size.xs,
                          color: canAfford ? colors.text.inverse : colors.text.secondary,
                          fontWeight: 'bold',
                        }}>
                          {canAfford ? 'Buy' : 'Too Expensive'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
            ) : (
            <FlatList<FloorPatternItem | WallPatternItem>
              data={category === 'floors' ? FLOOR_PATTERN_CATALOG : WALL_PATTERN_CATALOG}
              keyExtractor={(item) => item.id}
              numColumns={2}
              renderItem={({ item }) => {
                const isOwned = unlockedPatternIds.includes(item.id);
                const isActive = item.id === activePatternId;
                const canAfford = acorns >= item.cost;

                return (
                  <View style={{
                    flex: 1,
                    margin: spacing.sm,
                    backgroundColor: colors.background.primary,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                    alignItems: 'center',
                    ...shadows.sm,
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive ? colors.primary[500] : colors.gray[200],
                  }}>
                    <PatternSwatch
                      family={item.family}
                      style={item.style}
                      size={60}
                    />
                    <Text style={{
                      fontSize: typography.size.xs,
                      color: colors.text.primary,
                      textAlign: 'center',
                      fontWeight: '600',
                      marginTop: spacing.sm,
                      marginBottom: spacing.xs,
                    }}>
                      {item.name}
                    </Text>
                    <View style={{
                      backgroundColor: colors.background.tertiary,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                      borderRadius: borderRadius.sm,
                      marginBottom: spacing.sm,
                    }}>
                      <Text style={{ fontSize: typography.size.base, color: colors.text.primary, fontWeight: 'bold' }}>
                        {item.cost} 🌰
                      </Text>
                    </View>

                    {isActive ? (
                      <View style={{
                        backgroundColor: colors.accent.mint,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: borderRadius.sm,
                      }}>
                        <Text style={{ fontSize: typography.size.xs, color: colors.text.primary, fontWeight: 'bold' }}>
                          ✓ Active
                        </Text>
                      </View>
                    ) : isOwned ? (
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.primary[500],
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          borderRadius: borderRadius.sm,
                          minWidth: 60,
                          alignItems: 'center',
                        }}
                        onPress={() => handleApplyPattern(item)}
                      >
                        <Text style={{ fontSize: typography.size.xs, color: colors.text.inverse, fontWeight: 'bold' }}>
                          Apply
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={{
                          backgroundColor: canAfford ? colors.primary[500] : colors.background.tertiary,
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                          borderRadius: borderRadius.sm,
                          minWidth: 60,
                          alignItems: 'center',
                          opacity: canAfford ? 1 : 0.6,
                        }}
                        onPress={() => canAfford && handlePatternPurchase(item)}
                        disabled={!canAfford}
                      >
                        <Text style={{
                          fontSize: typography.size.xs,
                          color: canAfford ? colors.text.inverse : colors.text.secondary,
                          fontWeight: 'bold',
                        }}>
                          {canAfford ? 'Buy' : 'Too Expensive'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
            )}
          </View>
        </View>
      )}
    </View>
  );
}
