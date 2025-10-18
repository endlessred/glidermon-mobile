import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useTheme } from "../../data/hooks/useTheme";
import { CustomDeck, Card, CardType } from "../../game/harmonyDrift/types";
import { HarmonyColors } from "../../theme/harmonyPalette";

interface DeckSelectorModalProps {
  visible: boolean;
  deckCollection: { decks: CustomDeck[]; activeDeckId: string };
  cards: Record<string, Card>;
  onClose: () => void;
  onSelectDeck: (deckId: string) => void;
  onEditDeck: (deck: CustomDeck) => void;
  onCreateNewDeck: () => void;
}

const TYPE_EMOJI: Record<CardType, string> = {
  Energy: "\u2600\uFE0F",
  Calm: "\uD83C\uDF0A",
  Rest: "\uD83C\uDF19",
  Nourish: "\uD83C\uDF3F",
  Anchor: "\uD83E\uDEB6",
};

const FONT_WEIGHT = {
  bold: "700" as const,
  semibold: "600" as const,
};

export const DeckSelectorModal: React.FC<DeckSelectorModalProps> = ({
  visible,
  deckCollection,
  cards,
  onClose,
  onSelectDeck,
  onEditDeck,
  onCreateNewDeck,
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: colors.background?.overlay || "rgba(0,0,0,0.6)" }]}>
      <View style={[styles.deckSelectorCard, { backgroundColor: colors.background?.secondary || "#fefaf5" }]}>
        <Text style={[styles.deckSelectorTitle, { color: colors.text?.primary || HarmonyColors.text.primary }]}>
          Choose Your Deck
        </Text>

        <ScrollView style={styles.deckList} showsVerticalScrollIndicator={false}>
          {deckCollection.decks.map((deck) => {
            const isActive = deck.id === deckCollection.activeDeckId;
            return (
              <TouchableOpacity
                key={deck.id}
                onPress={() => onSelectDeck(deck.id)}
                activeOpacity={0.8}
                style={[
                  styles.deckItem,
                  {
                    backgroundColor: isActive ? colors.primary?.[100] || "#dbeafe" : "transparent",
                    borderColor: isActive ? colors.primary?.[400] || "#38bdf8" : colors.gray?.[200] || "#e5e7eb",
                  }
                ]}
              >
                <View style={styles.deckItemHeader}>
                  <Text style={[styles.deckItemName, {
                    color: isActive ? colors.primary?.[700] || "#0369a1" : colors.text?.primary || HarmonyColors.text.primary,
                    fontWeight: isActive ? FONT_WEIGHT.bold : FONT_WEIGHT.semibold,
                  }]}>
                    {deck.name}
                  </Text>
                  {isActive && (
                    <View style={[styles.activeBadge, { backgroundColor: colors.primary?.[500] || "#0ea5e9" }]}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.deckItemInfo, { color: colors.text?.secondary || HarmonyColors.text.secondary }]}>
                  {deck.cards.length} cards • Created {new Date(deck.created).toLocaleDateString()}
                </Text>

                {/* Show card preview for custom decks */}
                {!deck.id.startsWith("starter") && (
                  <View style={styles.deckPreview}>
                    <Text style={[styles.deckPreviewLabel, { color: colors.text?.tertiary || HarmonyColors.text.tertiary }]}>
                      Cards:
                    </Text>
                    <View style={styles.deckPreviewCards}>
                      {deck.cards.slice(0, 6).map((cardId, idx) => {
                        const card = cards[cardId];
                        return card ? (
                          <Text key={idx} style={[styles.deckPreviewCard, { color: colors.text?.secondary || HarmonyColors.text.secondary }]}>
                            {TYPE_EMOJI[card.type]} {card.name}
                          </Text>
                        ) : null;
                      })}
                      {deck.cards.length > 6 && (
                        <Text style={[styles.deckPreviewMore, { color: colors.text?.tertiary || HarmonyColors.text.tertiary }]}>
                          +{deck.cards.length - 6} more...
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Edit button for custom decks */}
                {!deck.id.startsWith("starter") && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      onEditDeck(deck);
                    }}
                    style={styles.editDeckButton}
                  >
                    <Text style={[styles.editDeckButtonText, { color: colors.primary?.[600] || "#0284c7" }]}>
                      ✏️ Edit
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.deckSelectorActions}>
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

          {deckCollection.decks.filter(d => !d.id.startsWith("starter")).length < 2 && (
            <TouchableOpacity
              onPress={onCreateNewDeck}
              activeOpacity={0.8}
              style={[styles.deckActionButton, {
                backgroundColor: colors.primary?.[500] || "#0ea5e9",
              }]}
            >
              <Text style={[styles.deckActionButtonText, { color: "#ffffff" }]}>
                Create New Deck
              </Text>
            </TouchableOpacity>
          )}
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
  deckSelectorCard: {
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    elevation: 8,
  },
  deckSelectorTitle: {
    fontSize: 20,
    fontWeight: FONT_WEIGHT.bold,
    textAlign: "center",
    marginBottom: 16,
  },
  deckList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  deckItem: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  deckItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  deckItemName: {
    fontSize: 16,
    flex: 1,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
  },
  deckItemInfo: {
    fontSize: 12,
    marginBottom: 8,
  },
  deckPreview: {
    marginBottom: 8,
  },
  deckPreviewLabel: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semibold,
    marginBottom: 4,
  },
  deckPreviewCards: {
    gap: 2,
  },
  deckPreviewCard: {
    fontSize: 10,
  },
  deckPreviewMore: {
    fontSize: 10,
    fontStyle: "italic",
  },
  editDeckButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editDeckButtonText: {
    fontSize: 11,
    fontWeight: FONT_WEIGHT.semibold,
  },
  deckSelectorActions: {
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