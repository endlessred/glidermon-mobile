// Dev-only tool for iterating on the 3D room's slot-based furniture without
// going through the shop's buy/unlock/apply flow each time. Lets you pick
// any variant (or clear) per slot directly, and isolate a single slot by
// clearing all the others -- handy for confirming whether a specific piece
// (e.g. an animated layer) is rendering/animating correctly on its own.
import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, DevSettings } from "react-native";
import { useHousingStore } from "../../data/stores/housingStore";
import { FURNITURE_CATALOG } from "../../game/housing/types/furnitureCatalog";
import { SlotType } from "../../game/housing/types/roomSlots";

const SLOT_TYPES: SlotType[] = ["bed", "seating", "storage", "rug", "wallDecor", "tableDesk", "lighting", "hobby", "feature"];

// Maps a slot TYPE to the one or two physical slotIds that can hold it, per
// roomSlots.ts's tier-1 (4x4, default) layout -- good enough for a dev tool
// that's only ever used against the default room size.
const SLOT_IDS_FOR_TYPE: Record<SlotType, string[]> = {
  bed: ["bed"],
  seating: ["seating"],
  storage: ["storage"],
  rug: ["rug"],
  wallDecor: ["wallDecor1", "wallDecor2"],
  tableDesk: ["tableDesk"],
  lighting: ["lighting"],
  hobby: ["hobby"],
  feature: ["feature"],
};

const FURNITURE_ID_FOR_SLOT_TYPE: Record<SlotType, string> = {
  bed: "bed",
  seating: "chair",
  storage: "storage",
  rug: "rug",
  wallDecor: "wallDecor",
  tableDesk: "tableDesk",
  lighting: "lighting",
  hobby: "hobby",
  feature: "feature",
};

export default function FurnitureDevPanel() {
  const [open, setOpen] = useState(false);
  const activeFurnitureBySlot = useHousingStore((s) => s.activeFurnitureBySlot);
  const unlockFurniture = useHousingStore((s) => s.unlockFurniture);
  const setActiveFurniture = useHousingStore((s) => s.setActiveFurniture);
  const clearFurnitureSlot = useHousingStore((s) => s.clearFurnitureSlot);

  if (!__DEV__) return null;

  const pick = (slotId: string, furnitureId: string, variantId: string) => {
    unlockFurniture(`${furnitureId}_${variantId}`);
    setActiveFurniture(slotId, furnitureId, variantId);
  };

  const isolate = (slotId: string, furnitureId: string, variantId: string) => {
    for (const t of SLOT_TYPES) {
      for (const id of SLOT_IDS_FOR_TYPE[t]) clearFurnitureSlot(id);
    }
    pick(slotId, furnitureId, variantId);
  };

  return (
    <View style={{ position: "absolute", top: 40, left: 8, zIndex: 20 }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{ backgroundColor: "#2d4356", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 }}
      >
        <Text style={{ color: "#ffd8a8", fontSize: 12, fontWeight: "600" }}>🛋 Furniture Dev</Text>
      </Pressable>

      {open && (
        <View style={{ marginTop: 6, backgroundColor: "#1a2330", borderRadius: 8, padding: 8, maxHeight: 420, width: 280 }}>
          <Pressable
            onPress={() => {
              for (const t of SLOT_TYPES) for (const id of SLOT_IDS_FOR_TYPE[t]) clearFurnitureSlot(id);
            }}
            style={{ backgroundColor: "#5c2a2a", borderRadius: 6, paddingVertical: 6, marginBottom: 6 }}
          >
            <Text style={{ color: "#ffb3b3", fontSize: 11, textAlign: "center", fontWeight: "600" }}>Clear all slots</Text>
          </Pressable>
          <ScrollView style={{ maxHeight: 380 }}>
            {SLOT_TYPES.map((slotType) => {
              const furnitureId = FURNITURE_ID_FOR_SLOT_TYPE[slotType];
              const def = FURNITURE_CATALOG[furnitureId];
              if (!def) return null;
              return (
                <View key={slotType} style={{ marginBottom: 10 }}>
                  <Text style={{ color: "#9cc4e4", fontSize: 11, fontWeight: "700", marginBottom: 4 }}>
                    {slotType}
                  </Text>
                  {SLOT_IDS_FOR_TYPE[slotType].map((slotId) => {
                    const occupant = activeFurnitureBySlot[slotId];
                    return (
                      <View key={slotId} style={{ marginBottom: 4 }}>
                        <Text style={{ color: "#6f8aa3", fontSize: 10, marginBottom: 2 }}>{slotId}</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                          <Pressable
                            onPress={() => clearFurnitureSlot(slotId)}
                            style={{
                              paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4,
                              backgroundColor: !occupant ? "#e29e4a" : "#233043",
                            }}
                          >
                            <Text style={{ color: !occupant ? "#1a1305" : "#9cc4e4", fontSize: 10 }}>none</Text>
                          </Pressable>
                          {def.variants.map((variant) => {
                            const active = occupant?.furnitureId === furnitureId && occupant?.variantId === variant.id;
                            return (
                              <Pressable
                                key={variant.id}
                                onPress={() => pick(slotId, furnitureId, variant.id)}
                                onLongPress={() => isolate(slotId, furnitureId, variant.id)}
                                style={{
                                  paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4,
                                  backgroundColor: active ? "#e29e4a" : "#233043",
                                }}
                              >
                                <Text style={{ color: active ? "#1a1305" : "#9cc4e4", fontSize: 10 }}>
                                  {variant.id}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
          <Text style={{ color: "#4a6178", fontSize: 9, marginTop: 4 }}>
            Tap = apply. Long-press = apply + clear all others (isolate).
          </Text>
        </View>
      )}
    </View>
  );
}
