// Design tokens. See docs/DESIGN.md (concept: "the meter").
//  - System backgrounds and text colors (PlatformColor) for native light/dark behavior.
//  - ONE brand/interactive accent: copper (DynamicColorIOS light/dark pair).
//  - SF Pro for UI, SF Pro Rounded + tabular figures for money and durations only.
import { DynamicColorIOS, Platform, PlatformColor, type ColorValue, type TextStyle } from "react-native";

const ios = (name: string, fallback: string): ColorValue =>
  Platform.OS === "ios" ? PlatformColor(name) : fallback;

const dynamic = (light: string, dark: string): ColorValue =>
  Platform.OS === "ios" ? DynamicColorIOS({ light, dark }) : light;

/** Raw values (also used where a native API needs plain hex, e.g. headers). */
export const ACCENT = { light: "#A8541A", dark: "#F0A35E" } as const;

export const color = {
  background: ios("systemBackground", "#FFFFFF"),
  grouped: ios("systemGroupedBackground", "#F2F2F7"),
  groupedRow: ios("secondarySystemGroupedBackground", "#FFFFFF"),
  surface: ios("secondarySystemBackground", "#F2F2F7"),
  label: ios("label", "#000000"),
  secondaryLabel: ios("secondaryLabel", "#3C3C4399"),
  tertiaryLabel: ios("tertiaryLabel", "#3C3C434D"),
  placeholder: ios("placeholderText", "#3C3C434D"),
  separator: ios("separator", "#3C3C4349"),
  fill: ios("tertiarySystemFill", "#7676801F"),
  accent: dynamic(ACCENT.light, ACCENT.dark),
  accentSoft: dynamic("#A8541A1F", "#F0A35E29"),
  onAccent: dynamic("#FFFFFF", "#1C1004"),
  destructive: ios("systemRed", "#FF3B30"),
  positive: ios("systemGreen", "#34C759"),
};

const rounded = Platform.OS === "ios" ? "ui-rounded" : undefined;

/** Type scale (HIG sizes). `display` is the meter: once per screen at most. */
export const type = {
  display: { fontSize: 56, lineHeight: 62, fontWeight: "700", fontFamily: rounded, fontVariant: ["tabular-nums"], letterSpacing: -0.5 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: 0.35 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600", letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: "400", letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: "400", letterSpacing: -0.32 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: "400", letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: "400", letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "400", letterSpacing: 0 },
  /** Money / durations in running text. */
  figure: { fontSize: 17, lineHeight: 22, fontWeight: "600", fontFamily: rounded, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

export type TypeStyle = keyof typeof type;

/** 4/8 grid. Screen padding is 20 everywhere (airy). */
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, screen: 20 } as const;

/** One radius scale, by role. */
export const radius = { control: 10, group: 14 } as const;

/** Minimum touch target (HIG). */
export const HIT = 44;
