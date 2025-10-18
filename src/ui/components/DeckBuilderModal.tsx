import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
} from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { Card, CustomDeck } from "../../game/harmonyDrift/types";
import { HarmonyCard } from "./HarmonyCard";
import { HarmonyColors } from "../../theme/harmonyPalette";

interface DeckBuilderModalProps {
  visible: boolean;
  editingDeck: CustomDeck | null;
  builderName: string;
  builderCards: string[];
  cards: Record<string, Card>;
  deckSize: number;
  onClose: () => void;
  onSave: () => void;
  onNameChange: (name: string) => void;
  onCardAdd: (cardId: string) => void;
  onCardRemove: (cardId: string) => void;
  getEffectDescription?: (effect: any) => string;
}

const FONT_WEIGHT = {
  bold: "700" as const,
  semibold: "600" as const,
};

export const DeckBuilderModal: React.FC<DeckBuilderModalProps> = ({
  visible,
  editingDeck,
  builderName,
  builderCards,
  cards,
  deckSize,
  onClose,
  onSave,
  onNameChange,
  onCardAdd,
  onCardRemove,
  getEffectDescription,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background?.overlay || "rgba(0,0,0,0.6)" }]}>
      <View style={[styles.deckBuilderCard, { backgroundColor: colors.background?.secondary || "#fefaf5" }]}>
        <Text style={[styles.deckBuilderTitle, { color: colors.text?.primary || HarmonyColors.text.primary }]}>
          {editingDeck ? "Edit Deck" : "Create New Deck"}
        </Text>

        {/* Deck Name Input */}
        <View style={styles.deckNameSection}>
          <Text style={[styles.deckNameLabel, { color: colors.text?.secondary || HarmonyColors.text.secondary }]}>
            Deck Name:
          </Text>
          <TextInput
            style={[styles.deckNameInput, {
              borderColor: colors.gray?.[300] || "#d6d3d1",
              color: colors.text?.primary || HarmonyColors.text.primary,
              backgroundColor: colors.background?.primary || "#ffffff",
            }]}
            value={builderName}
            onChangeText={onNameChange}
            placeholder="Enter deck name..."
            placeholderTextColor={colors.text?.tertiary || HarmonyColors.text.tertiary}
            maxLength={20}
          />
        </View>

        {/* Current Deck Status */}
        <View style={styles.deckStatusSection}>
          <Text style={[styles.deckStatusText, {
            color: builderCards.length === deckSize ? colors.primary?.[600] || "#0284c7" : colors.orange?.[600] || "#ea580c"
          }]}>
            {builderCards.length}/{deckSize} cards {builderCards.length === deckSize ? "✓" : "⚠️"}
          </Text>
          <Text style={[styles.deckStatusHint, { color: colors.text?.tertiary || HarmonyColors.text.tertiary }]}>
            {builderCards.length === deckSize ? "Deck ready to save!" : `Need ${deckSize - builderCards.length} more cards`}
          </Text>
        </View>

        {/* Card Selection */}
        <ScrollView style={styles.cardSelectionArea} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: colors.text?.primary || HarmonyColors.text.primary }]}>
            Available Cards
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.text?.secondary || HarmonyColors.text.secondary }]}>
            Tap cards to add/remove (max 3 copies each)
          </Text>

          <View style={styles.cardGrid}>
            {Object.values(cards).map((card) => {
              const cardCount = builderCards.filter(id => id === card.id).length;
              const canAdd = cardCount < 3 && builderCards.length < deckSize;
              const canRemove = cardCount > 0;

              return (
                <TouchableOpacity
                  key={card.id}
                  onPress={() => {
                    if (canAdd && cardCount === 0) {
                      onCardAdd(card.id);
                    } else if (canRemove) {
                      onCardRemove(card.id);
                    }
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.builderCard,
                    {
                      opacity: cardCount > 0 ? 1 : 0.7,
                      borderColor: cardCount > 0 ? colors.primary?.[400] || "#38bdf8" : colors.gray?.[200] || "#e5e7eb",
                    }
                  ]}
                >
                  <HarmonyCard
                    data={card}
                    variant="hand"
                    widthOverride={90}
                    effect={card.effect}
                    getEffectDescription={getEffectDescription}
                  />

                  {/* Card Count Badge */}
                  {cardCount > 0 && (
                    <View style={[styles.cardCountBadge, { backgroundColor: colors.primary?.[500] || "#0ea5e9" }]}>
                      <Text style={styles.cardCountText}>{cardCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Actions */}
        <View style={styles.deckBuilderActions}>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={[styles.deckActionButton, {
              backgroundColor: colors.background?.tertiary || "#e7e5e4",
              borderColor: colors.gray?.[300] || "#d6d3d1",
            }]}
          >
            <Text style={[styles.deckActionButtonText, { color: colors.text?.primary || HarmonyColors.text.primary }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSave}
            activeOpacity={0.8}
            disabled={builderCards.length !== deckSize || !builderName.trim()}
            style={[styles.deckActionButton, {
              backgroundColor: (builderCards.length === deckSize && builderName.trim())
                ? colors.primary?.[500] || "#0ea5e9"
                : colors.gray?.[300] || "#d6d3d1",
            }]}
          >
            <Text style={[styles.deckActionButtonText, {
              color: (builderCards.length === deckSize && builderName.trim()) ? "#ffffff" : colors.text?.tertiary || HarmonyColors.text.tertiary
            }]}>
              {editingDeck ? "Update Deck" : "Create Deck"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  deckBuilderCard: {
    width: "95%",
    maxWidth: 500,
    maxHeight: "90%",
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    elevation: 8,
  },
  deckBuilderTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
    marginBottom: 16,
  },
  deckNameSection: {
    marginBottom: 16,
  },
  deckNameLabel: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 6,
  },
  deckNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  deckStatusSection: {
    marginBottom: 16,
    alignItems: "center",
  },
  deckStatusText: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.bold,
  },
  deckStatusHint: {
    fontSize: 12,
    marginTop: 2,
  },
  cardSelectionArea: {
    flex: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: FONT_WEIGHT.bold,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
  },
  builderCard: {
    borderWidth: 2,
    borderRadius: 8,
    padding: 4,
    position: "relative",
    width: "48%",
  },
  cardCountBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  cardCountText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
  },
  deckBuilderActions: {
    flexDirection: "row",
    gap: 12,
  },
  deckActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  deckActionButtonText: {
    fontSize: 14,
    fontWeight: FONT_WEIGHT.semibold,
  },
});