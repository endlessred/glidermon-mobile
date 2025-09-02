import { registerRootComponent } from "expo";
import React from "react";
import DexcomEgvsScreen from "./src/DexcomEgvsScreen";
function App() { return <DexcomEgvsScreen />; }
registerRootComponent(App);