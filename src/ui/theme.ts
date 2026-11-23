// Design tokens following Apple's Human Interface Guidelines:
//  - Semantic system colors (PlatformColor) -> automatic Light/Dark + Increase Contrast.
//  - One accent color for every interactive element (systemIndigo).
//  - HIG text-style sizes (Dynamic Type scales them via allowFontScaling).
//  - 8pt spacing grid, 44pt minimum touch targets.
import { Platform, PlatformColor, type ColorValue, type TextStyle } from "react-native";

const ios = (name: string, fallback: string): ColorValue =>
  Platform.OS === "ios" ? PlatformColor(name) : fallback;

export const color = {
  // Backgrounds (grouped hierarchy, like Settings)
  background: ios("systemGroupedBackground", "#F2F2F7"),
  card: ios("secondarySystemGroupedBackground", "#FFFFFF"),
  cardElevated: ios("tertiarySystemGroupedBackground", "#F2F2F7"),
  // Text
  label: ios("label", "#000000"),
  secondaryLabel: ios("secondaryLabel", "#3C3C4399"),
  tertiaryLabel: ios("tertiaryLabel", "#3C3C434D"),
  placeholder: ios("placeholderText", "#3C3C434D"),
  // Lines & fills
  separator: ios("separator", "#3C3C4349"),
  fill: ios("tertiarySystemFill", "#7676801F"),
  fillStrong: ios("secondarySystemFill", "#78788029"),
  // Accent (single interactive color) and status colors
  accent: ios("systemIndigo", "#5856D6"),
  onAccent: "#FFFFFF" as ColorValue,
  destructive: ios("systemRed", "#FF3B30"),
  success: ios("systemGreen", "#34C759"),
  warning: ios("systemOrange", "#FF9500"),
  info: ios("systemBlue", "#007AFF"),
  gray: ios("systemGray", "#8E8E93"),
  // Brand: money gold, used only for illustration/hero accents (never for text)
  brand: ios("systemYellow", "#FFCC00"),
};

/** HIG iOS text styles (Large/default content size). */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: "700", letterSpacing: 0.4 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: "600", letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: "400", letterSpacing: -0.32 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: "400", letterSpacing: 0.07 },
} satisfies Record<string, TextStyle>;

export type TypeStyle = keyof typeof type;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;

export const radius = {
  /** Inset grouped list / card corner (iOS 26 uses generous continuous corners). */
  card: 22,
  control: 14,
  icon: 7,
  pill: 999,
} as const;

/** Minimum touch target (HIG). */
export const HIT = 44;

/** Tab bar + home indicator clearance for scroll content on tab roots. */
export const TAB_BAR_CLEARANCE = 96;
