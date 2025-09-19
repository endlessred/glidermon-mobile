import React, { useEffect } from "react";
import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import { useCosmeticsStore } from "../stores/cosmeticsStore";
import { useProgressionStore } from "../stores/progressionStore";
import { useToastStore } from "../stores/toastStore";

export default function ShopScreen() {
  // Cosmetics
  const catalog      = useCosmeticsStore(s => s.catalog);
  const owned        = useCosmeticsStore(s => s.owned);
  const loadCatalog  = useCosmeticsStore(s => s.loadCatalog);
  const buy          = useCosmeticsStore(s => s.buy);
  const equip        = useCosmeticsStore(s => s.equip);
  const equippedHead = useCosmeticsStore(s => s.equipped.headTop);

  // Progression
  const acorns = useProgressionStore(s => s.acorns);
  const spend  = useProgressionStore(s => s.spend);

  const addToast = useToastStore(s => s.addToast);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0d1117", padding: 16, gap: 12 }}>
      <Text style={{ color: "#9cc4e4", fontSize: 18, marginBottom: 8 }}>
        Acorns: {acorns.toLocaleString()}
      </Text>

      <FlatList
        data={catalog}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const isOwned    = !!owned[item.id];
          const isEquipped = equippedHead === item.id;
          const canAfford  = acorns >= item.cost;
          const rnImageSource = typeof item.tex === "string" ? { uri: item.tex } : item.tex;

          return (
            <View
              style={{
                backgroundColor: "#161b22",
                borderRadius: 12,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Image source={rnImageSource} style={{ width: 48, height: 48 }} resizeMode="contain" />
                <View>
                  <Text style={{ color: "white", fontSize: 16 }}>{item.name}</Text>
                  <Text style={{ color: "#9aa6b2" }}>
                    {isOwned ? (isEquipped ? "Equipped" : "Owned") : `Cost: ${item.cost.toLocaleString()} 🌰`}
                  </Text>
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
                  style={{ opacity: canAfford ? 1 : 0.5 }}
                >
                  <Text style={{ color: canAfford ? "#10b981" : "#6b7280", fontWeight: "600" }}>
                    {canAfford ? "Buy" : "Not enough"}
                  </Text>
                </TouchableOpacity>
              ) : !isEquipped ? (
                <TouchableOpacity onPress={() => { equip(item.id); addToast(`Equipped ${item.name}`); }}>
                  <Text style={{ color: "#60a5fa", fontWeight: "600" }}>Equip</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <Text style={{ color: "#9cc4e4" }}>Equipped</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
