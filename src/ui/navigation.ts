import { color } from "./theme";

/** Opaque native headers: content is laid out below them (no translucent-header overlap). */
export const headerOptions = {
  headerBackTitle: "戻る",
  headerTransparent: false,
  headerShadowVisible: false,
  headerStyle: { backgroundColor: color.background },
  headerTintColor: color.accent,
  headerTitleStyle: { color: color.label },
  contentStyle: { backgroundColor: color.background },
} as const;

/** Sheets for scoped tasks (HIG 7.3). */
export const sheetOptions = {
  ...headerOptions,
  presentation: "modal",
} as const;
