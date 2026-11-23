// Native header colors resolved per color scheme (the native header does not
// re-resolve PlatformColor/DynamicColorIOS on appearance changes).
import { useColorScheme } from "react-native";

import { ACCENT, color } from "./theme";

const SYSTEM = {
  light: { plain: "#FFFFFF", grouped: "#F2F2F7", sheet: "#F2F2F7", label: "#000000" },
  dark: { plain: "#000000", grouped: "#000000", sheet: "#1C1C1E", label: "#FFFFFF" },
} as const;

export function useHeaderOptions(kind: "plain" | "grouped" | "sheet" = "plain") {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const c = SYSTEM[scheme];
  return {
    headerBackTitle: "戻る",
    headerTransparent: false,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: c[kind] },
    headerTintColor: ACCENT[scheme],
    headerTitleStyle: { color: c.label },
    contentStyle: { backgroundColor: kind === "plain" ? color.background : color.grouped },
    ...(kind === "sheet" ? { presentation: "modal" as const } : {}),
  };
}
