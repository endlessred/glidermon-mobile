// ui/screens/OutfitScreen.tsx
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, Modal } from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { useOutfitStore, useOutfitSlots, useActiveLocalOutfit, useActivePublicOutfit } from "../../data/stores/outfitStore";
import { OutfitSlot } from "../../data/types/outfitTypes";
import OutfitEditor from "../components/OutfitEditor";
import SpineCharacterPreview from "../components/SpineCharacterPreview";

export default function OutfitScreen() {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);

  // Store actions
  const {
    createOutfit,
    deleteOutfit,
    duplicateOutfit,
    renameOutfit,
    setLocalOutfit,
    setPublicOutfit,
    maxSlots
  } = useOutfitStore();

  // Store selectors
  const outfitSlots = useOutfitSlots();
  const activeLocalOutfit = useActiveLocalOutfit();
  const activePublicOutfit = useActivePublicOutfit();

  const handleCreateOutfit = () => {
    try {
      const newOutfitId = createOutfit(`Outfit ${outfitSlots.length + 1}`);
      setSelectedOutfitId(newOutfitId);
    } catch (error) {
      Alert.alert("Error", "Maximum outfit slots reached! Unlock more slots to create additional outfits.");
    }
  };

  const handleDeleteOutfit = (outfitId: string) => {
    Alert.alert(
      "Delete Outfit",
      "Are you sure you want to delete this outfit? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            try {
              deleteOutfit(outfitId);
              if (selectedOutfitId === outfitId) {
                setSelectedOutfitId(null);
              }
            } catch (error) {
              Alert.alert("Error", "Cannot delete active outfit");
            }
          }
        }
      ]
    );
  };

  const handleDuplicateOutfit = (outfitId: string) => {
    try {
      const originalOutfit = outfitSlots.find(slot => slot.id === outfitId);
      if (originalOutfit) {
        const newOutfitId = duplicateOutfit(outfitId, `${originalOutfit.name} Copy`);
        setSelectedOutfitId(newOutfitId);
      }
    } catch (error) {
      Alert.alert("Error", "Maximum outfit slots reached!");
    }
  };

  const handleSetActiveOutfit = (outfitId: string, type: "local" | "public") => {
    try {
      if (type === "local") {
        setLocalOutfit(outfitId);
      } else {
        setPublicOutfit(outfitId);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to set active outfit");
    }
  };

  const renderOutfitCard = (outfit: OutfitSlot) => {
    const isActiveLocal = outfit.id === activeLocalOutfit?.id;
    const isActivePublic = outfit.id === activePublicOutfit?.id;
    const isSelected = outfit.id === selectedOutfitId;

    return (
      <Pressable
        key={outfit.id}
        onPress={() => setSelectedOutfitId(outfit.id)}
        style={{
          backgroundColor: isSelected ? colors.primary[100] : colors.background.card,
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? colors.primary[500] : colors.gray[200],
        }}
      >
        <View style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: spacing.sm,
          gap: spacing.md
        }}>
          {/* Character Preview */}
          <SpineCharacterPreview
            outfit={outfit}
            size="small"
          />

          {/* Outfit Info */}
          <View style={{ flex: 1 }}>
            <View style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: spacing.sm
            }}>
              <Text style={{
                fontSize: typography.size.lg,
                fontWeight: typography.weight.semibold as any,
                color: colors.text.primary,
                flex: 1
              }}>
                {outfit.name}
              </Text>

              {/* Status badges */}
              <View style={{ flexDirection: "row", gap: spacing.xs }}>
                {isActiveLocal && (
                  <View style={{
                    backgroundColor: colors.health[100],
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: borderRadius.sm
                  }}>
                    <Text style={{
                      fontSize: typography.size.xs,
                      color: colors.health[700],
                      fontWeight: typography.weight.medium as any
                    }}>
                      LOCAL
                    </Text>
                  </View>
                )}
                {isActivePublic && (
                  <View style={{
                    backgroundColor: colors.primary[100],
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: borderRadius.sm
                  }}>
                    <Text style={{
                      fontSize: typography.size.xs,
                      color: colors.primary[700],
                      fontWeight: typography.weight.medium as any
                    }}>
                      PUBLIC
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={{
              fontSize: typography.size.sm,
              color: colors.text.secondary,
              marginBottom: spacing.md
            }}>
              Created: {new Date(outfit.createdAt).toLocaleDateString()}
            </Text>

            {/* Cosmetic summary */}
            <View style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: spacing.xs,
              marginBottom: spacing.md
            }}>
              {Object.entries(outfit.cosmetics).map(([socket, cosmetic]) => (
                <View
                  key={socket}
                  style={{
                    backgroundColor: colors.gray[100],
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.xs,
                    borderRadius: borderRadius.sm
                  }}
                >
                  <Text style={{
                    fontSize: typography.size.xs,
                    color: colors.text.secondary
                  }}>
                    {socket}: {cosmetic?.itemId || "none"}
                  </Text>
                </View>
              ))}
            </View>

            {/* Action buttons */}
            <View style={{
              flexDirection: "row",
              gap: spacing.sm,
              flexWrap: "wrap"
            }}>
              <Pressable
                onPress={() => handleSetActiveOutfit(outfit.id, "local")}
                disabled={isActiveLocal}
                style={{
                  backgroundColor: isActiveLocal ? colors.gray[200] : colors.health[500],
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md
                }}
              >
                <Text style={{
                  color: isActiveLocal ? colors.gray[500] : colors.text.inverse,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.medium as any
                }}>
                  {isActiveLocal ? "Active Local" : "Set Local"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSetActiveOutfit(outfit.id, "public")}
                disabled={isActivePublic}
                style={{
                  backgroundColor: isActivePublic ? colors.gray[200] : colors.primary[500],
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md
                }}
              >
                <Text style={{
                  color: isActivePublic ? colors.gray[500] : colors.text.inverse,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.medium as any
                }}>
                  {isActivePublic ? "Active Public" : "Set Public"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setEditingOutfitId(outfit.id)}
                style={{
                  backgroundColor: colors.accent.lavender,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md
                }}
              >
                <Text style={{
                  color: colors.text.primary,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.medium as any
                }}>
                  Edit
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleDuplicateOutfit(outfit.id)}
                style={{
                  backgroundColor: colors.gray[500],
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderRadius: borderRadius.md
                }}
              >
                <Text style={{
                  color: colors.text.inverse,
                  fontSize: typography.size.sm,
                  fontWeight: typography.weight.medium as any
                }}>
                  Copy
                </Text>
              </Pressable>

              {!isActiveLocal && !isActivePublic && (
                <Pressable
                  onPress={() => handleDeleteOutfit(outfit.id)}
                  style={{
                    backgroundColor: colors.status.error,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.sm,
                    borderRadius: borderRadius.md
                  }}
                >
                  <Text style={{
                    color: colors.text.inverse,
                    fontSize: typography.size.sm,
                    fontWeight: typography.weight.medium as any
                  }}>
                    Delete
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background.primary }}
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing['3xl']
        }}
      >
      {/* Header */}
      <View style={{
        marginBottom: spacing.xl
      }}>
        <Text style={{
          fontSize: typography.size['2xl'],
          fontWeight: typography.weight.bold as any,
          color: colors.text.primary,
          marginBottom: spacing.sm
        }}>
          👗 Outfit Manager
        </Text>

        <Text style={{
          fontSize: typography.size.base,
          color: colors.text.secondary,
          marginBottom: spacing.lg
        }}>
          Create and manage your character outfits. Set different looks for gameplay and public gallery.
        </Text>

        {/* Slot info */}
        <View style={{
          backgroundColor: colors.background.card,
          padding: spacing.lg,
          borderRadius: borderRadius.lg,
          marginBottom: spacing.lg
        }}>
          <Text style={{
            fontSize: typography.size.lg,
            fontWeight: typography.weight.semibold as any,
            color: colors.text.primary,
            marginBottom: spacing.sm
          }}>
            Outfit Slots: {outfitSlots.length} / {maxSlots}
          </Text>

          <Pressable
            onPress={handleCreateOutfit}
            disabled={outfitSlots.length >= maxSlots}
            style={{
              backgroundColor: outfitSlots.length >= maxSlots ? colors.gray[300] : colors.primary[500],
              padding: spacing.md,
              borderRadius: borderRadius.md,
              alignItems: "center"
            }}
          >
            <Text style={{
              color: outfitSlots.length >= maxSlots ? colors.gray[500] : colors.white,
              fontSize: typography.size.base,
              fontWeight: typography.weight.semibold as any
            }}>
              {outfitSlots.length >= maxSlots ? "Max Slots Reached" : "Create New Outfit"}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Outfit List */}
      {outfitSlots.length === 0 ? (
        <View style={{
          backgroundColor: colors.background.card,
          padding: spacing.xl,
          borderRadius: borderRadius.lg,
          alignItems: "center"
        }}>
          <Text style={{
            fontSize: typography.size.lg,
            color: colors.text.secondary,
            textAlign: "center"
          }}>
            No outfits created yet. Create your first outfit to get started!
          </Text>
        </View>
      ) : (
        outfitSlots.map(renderOutfitCard)
      )}

      {/* Instructions */}
      <View style={{
        backgroundColor: colors.background.card,
        padding: spacing.lg,
        borderRadius: borderRadius.lg,
        marginTop: spacing.xl
      }}>
        <Text style={{
          fontSize: typography.size.lg,
          fontWeight: typography.weight.semibold as any,
          color: colors.text.primary,
          marginBottom: spacing.sm
        }}>
          How to Use Outfits
        </Text>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{
              fontSize: typography.size.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              marginRight: spacing.sm
            }}>
              •
            </Text>
            <Text style={{
              fontSize: typography.size.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              flex: 1
            }}>
              <Text style={{ fontWeight: typography.weight.semibold as any }}>Local Outfit:</Text> What you see during gameplay
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{
              fontSize: typography.size.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              marginRight: spacing.sm
            }}>
              •
            </Text>
            <Text style={{
              fontSize: typography.size.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              flex: 1
            }}>
              <Text style={{ fontWeight: typography.weight.semibold as any }}>Public Outfit:</Text> What others see in gallery and contests
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{
              fontSize: typography.size.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              marginRight: spacing.sm
            }}>
              •
            </Text>
            <Text style={{
              fontSize: typography.size.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              flex: 1
            }}>
              Create multiple outfits and switch between them
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Text style={{
              fontSize: typography.size.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              marginRight: spacing.sm
            }}>
              •
            </Text>
            <Text style={{
              fontSize: typography.size.base,
              color: colors.text.secondary,
              lineHeight: typography.lineHeight.relaxed,
              flex: 1
            }}>
              Click "Edit" to customize positioning and poses with live preview!
            </Text>
          </View>
        </View>
      </View>
      </ScrollView>

      {/* Outfit Editor Modal */}
      <Modal
        visible={editingOutfitId !== null}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        {editingOutfitId && (
          <OutfitEditor
            outfitId={editingOutfitId}
            onClose={() => setEditingOutfitId(null)}
          />
        )}
      </Modal>
    </>
  );
}