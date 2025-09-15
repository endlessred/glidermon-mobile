import React, { useEffect } from "react";
import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import { useCosmeticsStore } from "../stores/cosmeticsStore";

export default function ShopScreen() {
  const catalog = useCosmeticsStore(s => s.catalog);
  const owned = useCosmeticsStore(s => s.owned);
  const points = useCosmeticsStore(s => s.points);
  const loadCatalog = useCosmeticsStore(s => s.loadCatalog);
  const buy = useCosmeticsStore(s => s.buy);
  const equip = useCosmeticsStore(s => s.equip);
  const equippedHead = useCosmeticsStore(s => s.equipped.headTop);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  return (
    <View style={{ flex: 1, backgroundColor: "#0d1117", padding: 16, gap: 12 }}>
      <Text style={{ color: "#9cc4e4", fontSize: 18, marginBottom: 8 }}>
        Points: {points}
      </Text>
      <FlatList
        data={catalog}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const isOwned = !!owned[item.id];
          const isEquipped = equippedHead === item.id;
          const rnImageSource =
            typeof item.tex === "string" ? { uri: item.tex } : item.tex;

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
                <Image
                  source={rnImageSource}
                  style={{ width: 48, height: 48 }}
                  resizeMode="contain"
                />
                <View>
                  <Text style={{ color: "white", fontSize: 16 }}>{item.name}</Text>
                  <Text style={{ color: "#9aa6b2" }}>
                    {isOwned ? (isEquipped ? "Equipped" : "Owned") : `Cost: ${item.cost}`}
                  </Text>
                </View>
              </View>

              {!isOwned ? (
                <TouchableOpacity onPress={() => buy(item.id)}>
                  <Text style={{ color: "#10b981", fontWeight: "600" }}>Buy</Text>
                </TouchableOpacity>
              ) : !isEquipped ? (
                <TouchableOpacity onPress={() => equip(item.id)}>
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
