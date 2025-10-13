import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useTheme } from '../../data/hooks/useTheme';
import AcornHuntScreen from './AcornHuntScreen';
import UpsAndDownsScreen from './UpsAndDownsScreen';
import HarmonyDriftScreen from './HarmonyDriftScreen';

interface MinigameCardProps {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
}

const MinigameCard: React.FC<MinigameCardProps> = ({
  title,
  description,
  icon,
  onPress,
  disabled = false
}) => {
  const { colors, typography } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.gameCard,
        {
          backgroundColor: colors.background.secondary,
          borderColor: colors.gray[300],
          opacity: disabled ? 0.6 : 1
        }
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.gameIcon}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.gameInfo}>
        <Text style={[{ fontSize: typography.size?.lg || 18, fontWeight: typography.weight?.semibold || '600' }, styles.gameTitle, { color: colors.text?.primary || '#1c1917' }]}>
          {title}
        </Text>
        <Text style={[{ fontSize: typography.size?.sm || 14 }, { color: colors.text?.secondary || '#44403c' }]}>
          {description}
        </Text>
      </View>
      <View style={[styles.arrow, { backgroundColor: '#0ea5e9' }]}>
        <Text style={styles.arrowText}>{">"}</Text>
      </View>
    </TouchableOpacity>
  );
};

type ArcadeScreen = 'menu' | 'acornhunt' | 'upsanddowns' | 'harmonydrift';

export default function ArcadeScreen() {
  const { colors, typography } = useTheme();
  const [currentScreen, setCurrentScreen] = useState<ArcadeScreen>('menu');

  const handleAcornHunt = () => {
    setCurrentScreen('acornhunt');
  };

  const handleUpsAndDowns = () => {
    setCurrentScreen('upsanddowns');
  };

  const handleHarmonyDrift = () => {
    setCurrentScreen('harmonydrift');
  };

  const handleBack = () => {
    setCurrentScreen('menu');
  };

  // Render individual game screens
  if (currentScreen === 'acornhunt') {
    return (
      <AcornHuntScreen
        navigation={{
          goBack: handleBack,
          navigate: (screen: string) => {
            if (screen === 'Arcade') {
              handleBack();
            }
          }
        }}
      />
    );
  }

  if (currentScreen === 'upsanddowns') {
    return (
      <UpsAndDownsScreen
        navigation={{
          goBack: handleBack,
          navigate: (screen: string) => {
            if (screen === 'Arcade') {
              handleBack();
            }
          }
        }}
      />
    );
  }

  if (currentScreen === 'harmonydrift') {
    return (
      <HarmonyDriftScreen
        navigation={{
          goBack: handleBack,
          navigate: (screen: string) => {
            if (screen === 'Arcade') {
              handleBack();
            }
          }
        }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[{ fontSize: typography.size?.['3xl'] || 30, fontWeight: typography.weight?.bold || '700' }, styles.title, { color: colors.text?.primary || '#1c1917' }]}>
            Arcade Games
          </Text>
          <Text style={[{ fontSize: typography.size?.base || 16 }, styles.subtitle, { color: colors.text?.secondary || '#44403c' }]}>
            Choose a minigame to play and earn rewards!
          </Text>
        </View>

        <View style={styles.gamesContainer}>
          <MinigameCard
            title="Acorn Hunt"
            description="Strategic turn-based battles to collect acorns"
            icon="AH"
            onPress={handleAcornHunt}
          />

          <MinigameCard
            title="Ups and Downs"
            description="Navigate your glider through obstacles by managing insulin levels"
            icon="UD"
            onPress={handleUpsAndDowns}
          />

          <MinigameCard
            title="Harmony Drift"
            description="Card-based balance duel to steady glucose drift"
            icon="HD"
            onPress={handleHarmonyDrift}
          />
        </View>

        <View style={styles.comingSoon}>
          <Text style={[{ fontSize: typography.size?.base || 16 }, { color: colors.text?.tertiary || '#78716c', textAlign: 'center' }]}>
            More games coming soon!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  gamesContainer: {
    gap: 16,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gameIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
  },
  gameInfo: {
    flex: 1,
    gap: 4,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowText: {
    color: '#fff',
    fontSize: 16,
  },
  comingSoon: {
    marginTop: 32,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 118, 110, 0.08)',
  },
});
