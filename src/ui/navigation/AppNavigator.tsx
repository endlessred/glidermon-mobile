// navigation/AppNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Text } from "react-native";
import HudScreen from "../screens/HudScreen";
import GameScreen from "../screens/GameScreen";
import DexcomEgvsScreen from "../screens/DexcomEgvsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import ShopScreen from "../screens/ShopScreen";
import EquipScreen from "../screens/EquipScreen";
import GalleryScreen from "../screens/GalleryScreen";
import OutfitScreen from "../screens/OutfitScreen";
import AcornHuntScreen from "../screens/AcornHuntScreen";
import ArcadeScreen from "../screens/ArcadeScreen";
import UpsAndDownsScreen from "../screens/UpsAndDownsScreen";

const Tab = createBottomTabNavigator();
const ArcadeStack = createStackNavigator();

function ArcadeStackNavigator() {
  return (
    <ArcadeStack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <ArcadeStack.Screen name="ArcadeMain" component={ArcadeScreen} />
      <ArcadeStack.Screen name="AcornHunt" component={AcornHuntScreen} />
      <ArcadeStack.Screen name="UpsAndDowns" component={UpsAndDownsScreen} />
    </ArcadeStack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: "#10b981",
          tabBarInactiveTintColor: "#9ca3af",
        }}
      >
        <Tab.Screen
          name="Home"
          component={HudScreen}
          options={{
            tabBarLabel: ({ color }) => <Text style={{ color }}>Home</Text>,
            tabBarAccessibilityLabel: "Home screen, view your virtual pet and glucose data",
            headerTitle: "GliderMon"
          }}
        />
        <Tab.Screen
          name="Shop"
          component={ShopScreen}
          options={{
            tabBarAccessibilityLabel: "Shop, purchase cosmetic items for your pet",
            headerTitle: "Shop"
          }}
        />
        <Tab.Screen
          name="Outfit"
          component={OutfitScreen}
          options={{
            tabBarLabel: ({ color }) => <Text style={{ color }}>Outfit</Text>,
            tabBarAccessibilityLabel: "Outfit customization, equip cosmetic items",
            headerTitle: "Outfit"
          }}
        />
        <Tab.Screen
          name="Arcade"
          component={ArcadeStackNavigator}
          options={{
            tabBarLabel: ({ color }) => <Text style={{ color }}>🕹️ Arcade</Text>,
            tabBarAccessibilityLabel: "Arcade mini-games, play various games to earn rewards",
            headerTitle: 'Arcade'
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: ({ color }) => <Text style={{ color }}>Settings</Text>,
            tabBarAccessibilityLabel: "Settings, configure app preferences and accessibility options",
            headerTitle: "Settings"
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
