// ui/theme/routeUIMode.ts
import { UIMode } from "./uiTheme";

// Determine UI mode based on route name
export const getUIModeForRoute = (routeName: string): UIMode => {
  // Clinical mode for health-critical screens
  if (routeName === "DexcomEgvs" || routeName.includes("Glucose") || routeName.includes("Health")) {
    return "clinical";
  }

  // Cozy mode for game screens
  if (["Home", "Shop", "Outfit", "Gallery", "Arcade"].includes(routeName)) {
    return "cozy";
  }

  // Default to clinical for settings and other screens to be safe
  return "clinical";
};