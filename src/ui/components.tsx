// UI primitives. Quiet by default; the meter is the only loud element (docs/DESIGN.md).
import RNSegmentedControl from "@react-native-segmented-control/segmented-control";
import * as Haptics from "expo-haptics";
import { SymbolView, type SFSymbol } from "expo-symbols";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ColorValue,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, HIT, radius, space, type, type TypeStyle } from "./theme";

// MARK: Haptics (selection for pickers, light for confirmations, notification for async results)

export const haptic = {
  selection: () => void Haptics.selectionAsync().catch(() => undefined),
  light: () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  success: () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warning: () =>
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
};

// MARK: Text

export function T({
  variant = "body",
  color: c = color.label,
  weight,
  align,
  style,
  maxFontSizeMultiplier,
  ...rest
}: TextProps & { variant?: TypeStyle; color?: ColorValue; weight?: TextStyle["fontWeight"]; align?: TextStyle["textAlign"] }) {
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? (variant === "display" ? 1.3 : undefined)}
      style={[type[variant], { color: c }, weight ? { fontWeight: weight } : null, align ? { textAlign: align } : null, style]}
    />
  );
}

// MARK: SF Symbols

export function Icon({
  name,
  size = 17,
  tint = color.secondaryLabel,
  weight = "regular",
}: {
  name: SFSymbol;
  size?: number;
  tint?: ColorValue;
  weight?: "regular" | "medium" | "semibold" | "bold";
}) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tint}
      weight={weight}
      style={{ width: size, height: size }}
      fallback={<View style={{ width: size, height: size }} />}
    />
  );
}

// MARK: Screens

/** Root page (Home): no navigation bar, content owns the top safe area. */
export function Page({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.background }}
      contentContainerStyle={{ paddingTop: insets.top + space.s, paddingBottom: insets.bottom + space.xxl, paddingHorizontal: space.screen, gap: space.xl }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

/** Pushed screen or sheet (native header above). `grouped` for forms and settings. */
export function Screen({
  children,
  footer,
  grouped,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  grouped?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const bg = grouped ? color.grouped : color.background;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={footer ? 64 : 0}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingTop: space.l, paddingBottom: (footer ? space.l : insets.bottom) + space.xl, gap: space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={{ paddingHorizontal: space.screen, paddingTop: space.m, paddingBottom: Math.max(insets.bottom, space.l), gap: space.xs, backgroundColor: bg }}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

// MARK: Sections and rows

/**
 * A titled block. `inset` = iOS inset-grouped list (forms/settings); otherwise rows sit on the
 * page separated by hairlines (lists on Home / Limits).
 */
export function Section({
  title,
  action,
  footer,
  inset,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  footer?: string;
  inset?: boolean;
  children: React.ReactNode;
}) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={{ gap: space.s }}>
      {title || action ? (
        <View style={[s.sectionHead, inset && { paddingHorizontal: space.l }]}>
          {title ? (
            <T variant={inset ? "footnote" : "headline"} color={inset ? color.secondaryLabel : color.label} accessibilityRole="header" style={{ flex: 1 }}>
              {title}
            </T>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {action}
        </View>
      ) : null}
      <View style={inset ? s.inset : null}>
        {rows.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={[s.hairline, inset ? { marginLeft: space.l } : null]} /> : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? (
        <T variant="footnote" color={color.secondaryLabel} style={inset ? { paddingHorizontal: space.l } : null}>
          {footer}
        </T>
      ) : null}
    </View>
  );
}

export function Row({
  title,
  subtitle,
  value,
  valueColor,
  leading,
  trailing,
  chevron,
  destructive,
  accent,
  inset,
  onPress,
  disabled,
  testID,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: ColorValue;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  accent?: boolean;
  /** Padding for rows inside an inset group. */
  inset?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  const titleColor = destructive ? color.destructive : accent ? color.accent : color.label;
  const body = (
    <View style={[s.row, inset && { paddingHorizontal: space.l }, disabled && { opacity: 0.35 }]}>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="body" color={titleColor} numberOfLines={2}>
          {title}
        </T>
        {subtitle ? (
          <T variant="footnote" color={color.secondaryLabel}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {value ? (
        <T variant="body" color={valueColor ?? color.secondaryLabel} numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>
          {value}
        </T>
      ) : null}
      {trailing}
      {chevron ? <Icon name="chevron.right" size={13} tint={color.tertiaryLabel} weight="semibold" /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      // Every visible string, so VoiceOver reads the whole row.
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join("、")}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [pressed && { backgroundColor: color.fill }, inset ? null : { marginHorizontal: -space.s, paddingHorizontal: space.s, borderRadius: radius.control }]}
    >
      {body}
    </Pressable>
  );
}

/** State as symbol + text, colored only when the meaning needs it (never color alone). */
export function StateLabel({ tone, icon, label }: { tone: "alert" | "ok" | "quiet"; icon?: SFSymbol; label: string }) {
  const c = tone === "alert" ? color.destructive : tone === "ok" ? color.secondaryLabel : color.tertiaryLabel;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessibilityLabel={label}>
      {icon ? <Icon name={icon} size={12} tint={c} weight="semibold" /> : null}
      <T variant="footnote" color={c} weight={tone === "alert" ? "600" : "400"}>
        {label}
      </T>
    </View>
  );
}

// MARK: Buttons

export function Button({
  title,
  onPress,
  kind = "primary",
  disabled,
  loading,
  testID,
}: {
  title: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "text" | "destructiveText";
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const filled = kind === "primary";
  const bg = filled ? color.accent : kind === "secondary" ? color.accentSoft : "transparent";
  const fg = filled ? color.onAccent : kind === "destructiveText" ? color.destructive : color.accent;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        kind === "text" || kind === "destructiveText" ? s.textButton : s.button,
        { backgroundColor: bg },
        (disabled || loading) && { opacity: 0.35 },
        pressed && { opacity: 0.7 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <T variant="headline" color={fg}>{title}</T>}
    </Pressable>
  );
}

/** Small header-row action ("編集", settings gear), 44pt hit area. */
export function HeaderAction({ label, icon, onPress, testID }: { label: string; icon?: SFSymbol; onPress: () => void; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress} style={({ pressed }) => [s.headerAction, pressed && { opacity: 0.5 }]}>
      {icon ? <Icon name={icon} size={20} tint={color.accent} weight="medium" /> : <T variant="body" color={color.accent}>{label}</T>}
    </Pressable>
  );
}

/** One-line inline notice. Used sparingly; not a card. */
export function InlineNotice({ icon, text, action }: { icon: SFSymbol; text: string; action?: React.ReactNode }) {
  return (
    <View style={s.notice} accessibilityRole="summary">
      <Icon name={icon} size={16} tint={color.secondaryLabel} />
      <T variant="subheadline" color={color.secondaryLabel} style={{ flex: 1 }}>
        {text}
      </T>
      {action}
    </View>
  );
}

// MARK: The meter's ruler (signature element)

/**
 * 0–24h ruler with a tick every 2 hours: the exact points where the yen
 * notification fires. `hours` fills it (null = unknown, drawn empty).
 */
export function HourRuler({ hours }: { hours: number | null }) {
  const pct = hours === null ? 0 : Math.max(0, Math.min(1, hours / 24));
  return (
    <View accessibilityLabel={hours === null ? "利用時間は未取得" : `今日の利用 ${hours.toFixed(1)}時間`}>
      <View style={s.rulerTrack}>
        <View style={[s.rulerFill, { width: `${pct * 100}%` }]} />
        {Array.from({ length: 11 }, (_, i) => (
          <View key={i} style={[s.rulerTick, { left: `${((i + 1) * 2 * 100) / 24}%` }]} />
        ))}
      </View>
      <View style={s.rulerLabels}>
        {["0", "6", "12", "18", "24h"].map((l) => (
          <T key={l} variant="caption" color={color.tertiaryLabel} style={{ fontVariant: ["tabular-nums"] }}>
            {l}
          </T>
        ))}
      </View>
    </View>
  );
}

// MARK: Native segmented control (UISegmentedControl)

// The package ships class-component typings that React 19's JSX types reject.
const SegmentedControl = RNSegmentedControl as unknown as React.ComponentType<{
  testID?: string;
  values: string[];
  selectedIndex: number;
  onChange: (e: { nativeEvent: { selectedSegmentIndex: number } }) => void;
  style?: StyleProp<ViewStyle>;
}>;

export function Segmented<V extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  testID?: string;
}) {
  return (
    <SegmentedControl
      testID={testID}
      values={options.map((o) => o.label)}
      selectedIndex={Math.max(0, options.findIndex((o) => o.value === value))}
      onChange={(e) => {
        const next = options[e.nativeEvent.selectedSegmentIndex];
        if (next) {
          haptic.selection();
          onChange(next.value);
        }
      }}
      style={{ height: 32 }}
    />
  );
}

const s = StyleSheet.create({
  sectionHead: { flexDirection: "row", alignItems: "center", minHeight: 28 },
  inset: { backgroundColor: color.groupedRow, borderRadius: radius.group, borderCurve: "continuous", overflow: "hidden" },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator },
  row: { minHeight: HIT + 6, paddingVertical: space.m - 2, flexDirection: "row", alignItems: "center", gap: space.m },
  button: { minHeight: 50, borderRadius: radius.control, borderCurve: "continuous", paddingHorizontal: space.xl, alignItems: "center", justifyContent: "center" },
  textButton: { minHeight: HIT, alignItems: "center", justifyContent: "center", paddingHorizontal: space.s },
  headerAction: { minWidth: HIT, height: HIT, alignItems: "flex-end", justifyContent: "center" },
  notice: { flexDirection: "row", alignItems: "center", gap: space.s, paddingVertical: space.s },
  rulerTrack: { height: 10, borderRadius: 5, backgroundColor: color.accentSoft, overflow: "hidden" },
  rulerFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: color.accent, borderRadius: 5 },
  rulerTick: { position: "absolute", top: 2, bottom: 2, width: StyleSheet.hairlineWidth * 2, backgroundColor: color.background, opacity: 0.9 },
  rulerLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
});
