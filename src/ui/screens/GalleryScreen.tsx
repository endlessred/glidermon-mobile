// screens/GalleryScreen.tsx
import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useGalleryStore, GalleryCategory, GalleryEntry } from "../../data/stores/galleryStore";
import { useUserStore } from "../../data/stores/userStore";
import { useActivePublicOutfit } from "../../data/stores/outfitStore";
import { useTheme } from "../../data/hooks/useTheme";
import SpineCharacterPreview from "../components/SpineCharacterPreview";
import ReactionPicker from "../components/ReactionPicker";
import ComplimentSystem from "../components/ComplimentSystem";
import SeeReactions from "../components/SeeReactions";

export default function GalleryScreen() {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>("style_stars");

  const {
    galleries,
    myEntry,
    isParticipating,
    updateMyShowcase,
    submitForCategory,
    addReaction,
    addCompliment,
    fetchGallery,
    setParticipation,
    getNewReactions,
    getNewCompliments,
    clearNewReactions,
    clearNewCompliments
  } = useGalleryStore();

  const { allowLeaderboards, hasCompletedOnboarding } = useUserStore();
  const activePublicOutfit = useActivePublicOutfit();

  useEffect(() => {
    if (allowLeaderboards && hasCompletedOnboarding) {
      fetchGallery(selectedCategory);
    }
  }, [selectedCategory, allowLeaderboards, hasCompletedOnboarding]);

  const categories: { key: GalleryCategory; label: string; description: string; icon: string }[] = [
    {
      key: "style_stars",
      label: "Style Stars",
      description: "Best dressed glidermons",
      icon: "✨"
    },
    {
      key: "collection_kings",
      label: "Collectors",
      description: "Most cosmetics unlocked",
      icon: "👑"
    },
    {
      key: "daily_companions",
      label: "Daily Friends",
      description: "Most consistent companions",
      icon: "🌅"
    },
    {
      key: "community_favorites",
      label: "Fan Favorites",
      description: "Most liked by community",
      icon: "❤️"
    },
    {
      key: "level_leaders",
      label: "Level Leaders",
      description: "Highest engagement levels",
      icon: "🚀"
    },
    {
      key: "newcomer_spotlight",
      label: "Rising Stars",
      description: "New players doing great",
      icon: "🌟"
    }
  ];

  const handleJoinGallery = () => {
    if (!myEntry) {
      updateMyShowcase();
    }
    submitForCategory(selectedCategory);
    Alert.alert("Success!", `You've been added to ${categories.find(c => c.key === selectedCategory)?.label}!`);
  };

  const renderGalleryEntry = (entry: GalleryEntry, rank: number) => (
    <View
      key={entry.id}
      style={{
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray[200],
      }}
    >
      <View style={{
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: spacing.md,
        minHeight: 75, // Ensure minimum height for character preview
      }}>
        {/* Rank */}
        <View style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: rank <= 3 ? colors.primary[500] : colors.gray[400],
          alignItems: "center",
          justifyContent: "center",
          marginRight: spacing.md,
          marginTop: spacing.sm, // Align with text baseline
        }}>
          <Text style={{
            color: colors.text.inverse,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.bold as any,
          }}>
            {rank}
          </Text>
        </View>

        {/* Character Preview - showing entry's outfit */}
        <View style={{ width: 60, height: 75 }}>
          <SpineCharacterPreview
            outfit={entry.outfit}
            size="small"
          />
        </View>

        {/* Player Info - Full width */}
        <View style={{
          flex: 1,
          marginLeft: spacing.md,
        }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: typography.size.md,
              fontWeight: typography.weight.semibold as any,
              color: colors.text.primary,
            }}
          >
            {entry.anonymousGliderName}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontSize: typography.size.sm,
              color: colors.text.secondary,
              marginBottom: spacing.sm,
            }}
          >
            Level {entry.level}
          </Text>

          {/* Social Interactions - Right aligned below text */}
          <View style={{
            alignItems: "flex-end",
            gap: spacing.sm,
          }}>
            <ReactionPicker
              onReactionSelect={(reactionType) => addReaction(entry.id, reactionType)}
              currentReactions={entry.reactions}
            />
            <ComplimentSystem
              onComplimentSelect={(categoryId, complimentId, complimentText) =>
                addCompliment(entry.id, categoryId, complimentId, complimentText)
              }
            />
          </View>
        </View>
      </View>


      {/* Stats */}
      <View style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
      }}>
        <Text style={{ fontSize: typography.size.xs, color: colors.text.secondary }}>
          🗓️ {entry.stats.daysActive} days active
        </Text>
        <Text style={{ fontSize: typography.size.xs, color: colors.text.secondary }}>
          👑 {entry.stats.cosmeticsUnlocked} cosmetics
        </Text>
        <Text style={{ fontSize: typography.size.xs, color: colors.text.secondary }}>
          🎨 {entry.stats.customizationChanges} customizations
        </Text>
      </View>
    </View>
  );

  if (!hasCompletedOnboarding) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: colors.background.primary,
        alignItems: "center",
        justifyContent: "center",
        padding: spacing.xl,
      }}>
        <Text style={{
          fontSize: typography.size.lg,
          color: colors.text.secondary,
          textAlign: "center",
        }}>
          Complete your glidermon setup to access the gallery!
        </Text>
      </View>
    );
  }

  if (!allowLeaderboards) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: colors.background.primary,
        padding: spacing.lg,
      }}>
        <View style={{
          backgroundColor: colors.background.card,
          borderRadius: borderRadius.lg,
          padding: spacing.xl,
          alignItems: "center",
        }}>
          <Text style={{
            fontSize: typography.size.lg,
            fontWeight: typography.weight.semibold as any,
            color: colors.text.primary,
            textAlign: "center",
            marginBottom: spacing.md,
          }}>
            🎨 Glidermon Gallery
          </Text>
          <Text style={{
            fontSize: typography.size.md,
            color: colors.text.secondary,
            textAlign: "center",
            marginBottom: spacing.lg,
          }}>
            Show off your glidermon's style and see amazing creations from other players!
          </Text>
          <Pressable
            onPress={() => setParticipation(true)}
            style={{
              backgroundColor: colors.primary[500],
              borderRadius: borderRadius.md,
              padding: spacing.md,
              alignItems: "center",
            }}
          >
            <Text style={{
              color: colors.text.inverse,
              fontSize: typography.size.md,
              fontWeight: typography.weight.semibold as any,
            }}>
              Join the Gallery
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background.primary }}
      contentContainerStyle={{
        padding: spacing.lg,
        paddingBottom: spacing['3xl'],
      }}
    >
      {/* Header */}
      <View style={{
        alignItems: "center",
        marginBottom: spacing.lg,
      }}>
        <Text style={{
          fontSize: typography.size.xl,
          fontWeight: typography.weight.bold as any,
          color: colors.text.primary,
          textAlign: "center",
          marginBottom: spacing.md,
        }}>
          🎨 Glidermon Gallery
        </Text>

        {/* See Reactions Button */}
        {isParticipating && myEntry && activePublicOutfit && (
          <SeeReactions
            outfit={activePublicOutfit}
            newReactions={getNewReactions(myEntry.id)}
            newCompliments={getNewCompliments(myEntry.id)}
            onClearReactions={() => {
              if (myEntry) {
                clearNewReactions(myEntry.id);
                clearNewCompliments(myEntry.id);
              }
            }}
          />
        )}
      </View>

      {/* Category Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: spacing.lg }}
        contentContainerStyle={{ gap: spacing.sm }}
      >
        {categories.map((category) => (
          <Pressable
            key={category.key}
            onPress={() => setSelectedCategory(category.key)}
            style={{
              backgroundColor: selectedCategory === category.key ? colors.primary[500] : colors.background.card,
              borderRadius: borderRadius.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: selectedCategory === category.key ? colors.primary[600] : colors.gray[300],
              minWidth: 120,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 20, marginBottom: spacing.xs }}>
              {category.icon}
            </Text>
            <Text style={{
              color: selectedCategory === category.key ? colors.text.inverse : colors.text.primary,
              fontSize: typography.size.sm,
              fontWeight: typography.weight.semibold as any,
              textAlign: "center",
            }}>
              {category.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Category Description */}
      <Text style={{
        fontSize: typography.size.md,
        color: colors.text.secondary,
        textAlign: "center",
        marginBottom: spacing.lg,
      }}>
        {categories.find(c => c.key === selectedCategory)?.description}
      </Text>

      {/* Join Gallery Section */}
      {isParticipating && (
        <View style={{
          backgroundColor: colors.primary[50],
          borderRadius: borderRadius.lg,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          borderWidth: 1,
          borderColor: colors.primary[200],
        }}>
          <Text style={{
            fontSize: typography.size.md,
            fontWeight: typography.weight.semibold as any,
            color: colors.primary[700],
            marginBottom: spacing.md,
          }}>
            Join this Gallery
          </Text>

          <Text style={{
            fontSize: typography.size.sm,
            color: colors.text.secondary,
            marginBottom: spacing.md,
            textAlign: "center",
          }}>
            Showcase your glider's style! Your outfit will be displayed anonymously.
          </Text>

          <Pressable
            onPress={handleJoinGallery}
            style={{
              backgroundColor: colors.primary[500],
              borderRadius: borderRadius.md,
              padding: spacing.md,
              alignItems: "center",
            }}
          >
            <Text style={{
              color: colors.text.inverse,
              fontSize: typography.size.md,
              fontWeight: typography.weight.semibold as any,
            }}>
              Submit to {categories.find(c => c.key === selectedCategory)?.label}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Gallery Entries */}
      <View>
        {galleries[selectedCategory].length === 0 ? (
          <View style={{
            backgroundColor: colors.background.card,
            borderRadius: borderRadius.lg,
            padding: spacing.xl,
            alignItems: "center",
          }}>
            <Text style={{
              fontSize: typography.size.lg,
              color: colors.text.secondary,
              textAlign: "center",
            }}>
              No entries yet! Be the first to showcase your glidermon.
            </Text>
          </View>
        ) : (
          galleries[selectedCategory].map((entry, index) =>
            renderGalleryEntry(entry, index + 1)
          )
        )}
      </View>
    </ScrollView>
  );
}