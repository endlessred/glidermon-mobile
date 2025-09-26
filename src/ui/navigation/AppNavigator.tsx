// navigation/AppNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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

const Tab = createBottomTabNavigator();

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
          options={{ tabBarLabel: ({ color }) => <Text style={{ color }}>Home</Text> }}
        />
        <Tab.Screen name="Shop" component={ShopScreen} />
        <Tab.Screen
          name="Outfit"
          component={OutfitScreen}
          options={{ tabBarLabel: ({ color }) => <Text style={{ color }}>Outfit</Text> }}
        />
        <Tab.Screen
          name="AcornHunt"
          component={AcornHuntScreen}
          options={{
            tabBarLabel: ({ color }) => <Text style={{ color }}>🌰 Hunt</Text>,
            headerTitle: 'Acorn Hunt'
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarLabel: ({ color }) => <Text style={{ color }}>Settings</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
