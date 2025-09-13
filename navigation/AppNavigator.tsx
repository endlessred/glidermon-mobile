// navigation/AppNavigator.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import HudScreen from "../screens/HudScreen";
import GameScreen from "../screens/GameScreen";
import DexcomEgvsScreen from "../src/DexcomEgvsScreen";
import SettingsScreen from "../screens/SettingsScreen";

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
        <Tab.Screen
          name="Game"
          component={GameScreen}
          options={{ tabBarLabel: ({ color }) => <Text style={{ color }}>Game</Text> }}
        />
        <Tab.Screen
          name="Dexcom"
          component={DexcomEgvsScreen}
          options={{ tabBarLabel: ({ color }) => <Text style={{ color }}>Dexcom</Text> }}
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
