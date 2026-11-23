// Native header colors. The native header does not re-resolve PlatformColor
// on appearance changes (CI dark-mode screenshot showed a light sheet header),
// so resolve the exact system values per color scheme here.
import { useColorScheme } from "react-native";

import { color } from "./theme";

const SYSTEM = {
  light: { grouped: "#F2F2F7", groupedElevated: "#F2F2F7", label: "#000000", accent: "#5856D6" },
  dark: { grouped: "#000000", groupedElevated: "#1C1C1E", label: "#FFFFFF", accent: "#5E5CE6" },
} as const;

/** Opaque native headers: content is laid out below them (no translucent-header overlap). */
export function useHeaderOptions(kind: "push" | "sheet" = "push") {
  const c = SYSTEM[useColorScheme() === "dark" ? "dark" : "light"];
  const bg = kind === "sheet" ? c.groupedElevated : c.grouped;
  return {
    headerBackTitle: "戻る",
    headerTransparent: false,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: bg },
    headerTintColor: c.accent,
    headerTitleStyle: { color: c.label },
    contentStyle: { backgroundColor: color.background },
    ...(kind === "sheet" ? { presentation: "modal" as const } : {}),
  };
}
