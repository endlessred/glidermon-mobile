import React, { useEffect, useMemo } from "react";
import { View, Text, FlatList, Image, TouchableOpacity } from "react-native";
import { useCosmeticsStore } from "../stores/cosmeticsStore";
import { useProgressionStore } from "../stores/progressionStore";
import { useToastStore } from "../stores/toastStore";

export default function EquipScreen() {
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
    <View style={{ flex: 1, backgroundColor: "#0d1117", padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ color: "#cfe6ff", fontSize: 18, fontWeight: "600" }}>Equip Hat</Text>
        <Text style={{ color: "#9cc4e4" }}>Acorns: {acorns.toLocaleString()}</Text>
      </View>

      {hats.length === 0 ? (
        <Text style={{ color: "#9aa6b2" }}>
          You don’t own any hats yet. Visit the Shop to buy one.
        </Text>
      ) : (
        <FlatList
          data={hats}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => {
            const isEquipped = equipped.headTop === item.id;
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
                    <Text style={{ color: "#9aa6b2" }}>{isEquipped ? "Equipped" : "Owned"}</Text>
                  </View>
                </View>

                {!isEquipped ? (
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
      )}
    </View>
  );
}
