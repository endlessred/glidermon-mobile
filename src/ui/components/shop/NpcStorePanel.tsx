// components/shop/NpcStorePanel.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import CraftPanel from "../handcrafted/CraftPanel";
import ShopHeader from "./ShopHeader";
import ShopTabs from "./ShopTabs";
import ShopStockGrid, { ShopStockDisplayItem } from "./ShopStockGrid";
import ShopPurchaseSheet from "./ShopPurchaseSheet";
import RestockControl from "./RestockControl";
import { INK_MUTED } from "../handcrafted/tokens";
import type { ShopId } from "../../../data/shop/shopTypes";

export type NpcStoreConfig = {
  shopId: ShopId;
  shopkeeperName: string;
};

const SHOPKEEPERS: Record<ShopId, string> = { luma: "Luma", sable: "Sable" };

type Props = {
  shopId: ShopId;
  items: ShopStockDisplayItem[];
  msUntilRestock: number;
  transitionKey: number;
  restocking: boolean;
  freeRestockAvailable: boolean;
  acorns: number;
  onSelectShop: (shopId: ShopId) => void;
  onPurchase: (itemId: string) => void;
  onConfirmRestock: () => void;
  onClose: () => void;
};

// One reusable store surface for both merchants -- everything about which
// shop this is comes from the `shopId`/`items`/etc. props, never a
// duplicated Luma-specific or Sable-specific implementation.
export default function NpcStorePanel({
  shopId,
  items,
  msUntilRestock,
  transitionKey,
  restocking,
  freeRestockAvailable,
  acorns,
  onSelectShop,
  onPurchase,
  onConfirmRestock,
  onClose,
}: Props) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((i) => i.slot.itemId === selectedItemId)?.catalogItem ?? null,
    [items, selectedItemId]
  );

  const handleSelectItem = (itemId: string) => {
    setSelectedItemId((current) => (current === itemId ? null : itemId));
  };

  const handleSelectShop = (nextShopId: ShopId) => {
    setSelectedItemId(null);
    onSelectShop(nextShopId);
  };

  const handleBuy = () => {
    if (!selectedItemId) return;
    onPurchase(selectedItemId);
    setSelectedItemId(null);
  };

  const canAfford = selectedItem ? acorns >= selectedItem.price : false;

  return (
    <View style={styles.wrap}>
      {/* Tabs paint above the panel and the panel slides up behind them
          (negative margin below), so the two read as one welded object --
          same technique as Outfit's CategoryTabRow/CorkInventoryPanel. */}
      <View style={styles.tabRow}>
        <ShopTabs activeShopId={shopId} onSelect={handleSelectShop} />
      </View>

      <CraftPanel
        texture="paper"
        stitched={false}
        shadow="panel"
        flatTop
        style={styles.panel}
        contentStyle={styles.content}
        inset={16}
      >
        <ShopHeader shopkeeperName={SHOPKEEPERS[shopId]} tone={shopId} msUntilRestock={msUntilRestock} onClose={onClose} />

        <View style={styles.body}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {restocking && (
              <View style={styles.restockingBanner}>
                <Text style={styles.restockingText}>Restocking…</Text>
              </View>
            )}
            <ShopStockGrid
              items={items}
              tone={shopId}
              selectedItemId={selectedItemId}
              onSelectItem={handleSelectItem}
              transitionKey={transitionKey}
            />
            <RestockControl freeRestockAvailable={freeRestockAvailable} onConfirmRestock={onConfirmRestock} />
          </ScrollView>

          {/* Overlays the bottom of the scroll area rather than flowing after
              it -- a sibling ScrollView with flex:1 would otherwise claim all
              remaining height and push this sheet out past the panel's own
              clipped bounds. */}
          <View style={styles.purchaseSheetWrap} pointerEvents="box-none">
            <ShopPurchaseSheet item={selectedItem} canAfford={canAfford} onBuy={handleBuy} onDismiss={() => setSelectedItemId(null)} />
          </View>
        </View>
      </CraftPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  tabRow: {
    zIndex: 2,
  },
  panel: {
    flex: 1,
    marginTop: -6,
  },
  content: {
    flex: 1,
  },
  body: {
    flex: 1,
    position: "relative",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  purchaseSheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  restockingBanner: {
    alignItems: "center",
    paddingVertical: 6,
  },
  restockingText: {
    fontSize: 12,
    fontWeight: "700",
    color: INK_MUTED,
    fontStyle: "italic",
  },
});
