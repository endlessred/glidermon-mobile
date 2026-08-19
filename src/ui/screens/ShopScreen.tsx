import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, useWindowDimensions, StyleSheet } from "react-native";
import { useCosmeticsStore } from "../../data/stores/cosmeticsStore";
import { useHousingStore } from "../../data/stores/housingStore";
import { useProgressionStore } from "../../data/stores/progressionStore";
import { useToastStore } from "../../data/stores/toastStore";
import { useShopStockStore } from "../../data/stores/shopStockStore";
import { getShopCatalogItem } from "../../data/shop/shopCatalog";
import type { ShopId } from "../../data/shop/shopTypes";
import { useAmbientConversations } from "../../data/hooks/useAmbientConversations";
import ShadedShopViewport from "../components/ShadedShopViewport";
import AmbientConversationDisplay from "../components/AmbientConversation";
import NpcStorePanel from "../components/shop/NpcStorePanel";
import type { ShopStockDisplayItem } from "../components/shop/ShopStockGrid";

export default function ShopScreen({ initialShop }: { initialShop?: ShopId }) {
  const { width, height } = useWindowDimensions();
  const [activeShop, setActiveShop] = useState<ShopId | null>(initialShop ?? null);
  const [restocking, setRestocking] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const stock = useShopStockStore((s) => s.stock);
  const ensureInitialStock = useShopStockStore((s) => s.ensureInitialStock);
  const checkNaturalRestocks = useShopStockStore((s) => s.checkNaturalRestocks);
  const freeRestockAvailable = useShopStockStore((s) => s.isFreeDailyRestockAvailable());
  const useFreeDailyRestock = useShopStockStore((s) => s.useFreeDailyRestock);
  const markSlotSold = useShopStockStore((s) => s.markSlotSold);

  const buyCosmetic = useCosmeticsStore((s) => s.buy);
  const unlockFurniture = useHousingStore((s) => s.unlockFurniture);
  const unlockFloorPattern = useHousingStore((s) => s.unlockFloorPattern);
  const unlockWallPattern = useHousingStore((s) => s.unlockWallPattern);

  const acorns = useProgressionStore((s) => s.acorns);
  const spend = useProgressionStore((s) => s.spend);
  const addToast = useToastStore((s) => s.addToast);

  // Generate stock once on first-ever visit; never regenerates just because
  // this screen mounts/remounts/rerenders.
  useEffect(() => {
    ensureInitialStock();
  }, [ensureInitialStock]);

  // Periodic check for a due natural restock + countdown tick. This is the
  // only thing that can trigger an automatic restock -- rerenders alone
  // never do.
  useEffect(() => {
    const interval = setInterval(() => {
      checkNaturalRestocks();
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, [checkNaturalRestocks]);

  const { currentConversation, isVisible: isConversationVisible, endConversation, triggerConversation } = useAmbientConversations({
    context: "ShadedShop",
    enabled: activeShop === null, // never competes with browsing once a store is open
    minInterval: 20000,
    maxInterval: 60000,
  });

  const items: ShopStockDisplayItem[] = useMemo(() => {
    if (!activeShop) return [];
    const record = stock[activeShop];
    if (!record) return [];
    return record.slots.map((slot) => ({ slot, catalogItem: getShopCatalogItem(slot.itemId) }));
  }, [activeShop, stock]);

  const activeRecord = activeShop ? stock[activeShop] : undefined;

  const handlePurchase = (itemId: string) => {
    if (!activeShop) return;
    const catalogItem = getShopCatalogItem(itemId);
    if (!catalogItem) return;
    if (acorns < catalogItem.price) {
      addToast("Not enough acorns!");
      return;
    }
    switch (catalogItem.sourceKind) {
      case "cosmetic":
        buyCosmetic(itemId);
        break;
      case "furniture":
        unlockFurniture(itemId);
        break;
      case "floorPattern":
        unlockFloorPattern(itemId);
        break;
      case "wallPattern":
        unlockWallPattern(itemId);
        break;
    }
    spend(catalogItem.price);
    markSlotSold(activeShop, itemId);
    addToast(`Purchased ${catalogItem.name}!`);
  };

  const handleConfirmRestock = () => {
    // Brief "Restocking…" banner while the grid's own fade/pop transition
    // (driven by transitionKey below) plays out -- see NpcStorePanel.
    setRestocking(true);
    useFreeDailyRestock();
    setTimeout(() => setRestocking(false), 280);
  };

  return (
    <View style={styles.root}>
      <ShadedShopViewport
        width={width}
        height={height}
        onSableTap={() => setActiveShop("sable")}
        onLumaTap={() => setActiveShop("luma")}
        cameraTarget={activeShop ?? "overview"}
      />

      {currentConversation && activeShop === null && (
        <AmbientConversationDisplay
          conversation={currentConversation}
          visible={isConversationVisible}
          onComplete={endConversation}
        />
      )}

      {__DEV__ && activeShop === null && (
        <TouchableOpacity style={styles.devTrigger} onPress={triggerConversation}>
          <Text style={styles.devTriggerText}>💬 Trigger Chat</Text>
        </TouchableOpacity>
      )}

      {activeShop && activeRecord && (
        <View style={[styles.panelWrap, { height: height * 0.68 }]}>
          <NpcStorePanel
            shopId={activeShop}
            items={items}
            msUntilRestock={Math.max(0, activeRecord.nextRestockAt - now)}
            transitionKey={activeRecord.generatedAt}
            restocking={restocking}
            freeRestockAvailable={freeRestockAvailable}
            acorns={acorns}
            onSelectShop={setActiveShop}
            onPurchase={handlePurchase}
            onConfirmRestock={handleConfirmRestock}
            onClose={() => setActiveShop(null)}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1a1c2c",
  },
  panelWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  devTrigger: {
    position: "absolute",
    top: 100,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 10,
    borderRadius: 20,
  },
  devTriggerText: {
    color: "#fff",
    fontSize: 12,
  },
});
