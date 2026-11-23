// UI primitives modelled on native iOS components (inset grouped lists,
// filled buttons, SF Symbols, native segmented control).
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

import { color, HIT, radius, space, TAB_BAR_CLEARANCE, type, type TypeStyle } from "./theme";

// MARK: Haptics (visual + haptic feedback, HIG 8.7)

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
  tabular,
  style,
  ...rest
}: TextProps & {
  variant?: TypeStyle;
  color?: ColorValue;
  weight?: TextStyle["fontWeight"];
  align?: TextStyle["textAlign"];
  tabular?: boolean;
}) {
  return (
    <Text
      {...rest}
      style={[
        type[variant],
        { color: c },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
    />
  );
}

// MARK: SF Symbols

export function Icon({
  name,
  size = 20,
  tint = color.accent,
  weight = "regular",
  mode = "monochrome",
}: {
  name: SFSymbol;
  size?: number;
  tint?: ColorValue;
  weight?: "regular" | "medium" | "semibold" | "bold";
  mode?: "monochrome" | "hierarchical" | "multicolor";
}) {
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tint}
      weight={weight}
      type={mode}
      style={{ width: size, height: size }}
      fallback={<View style={{ width: size, height: size }} />}
    />
  );
}

/** Settings-style rounded square icon tile. */
export function IconTile({ name, bg }: { name: SFSymbol; bg: ColorValue }) {
  return (
    <View style={[s.tile, { backgroundColor: bg }]}>
      <Icon name={name} size={17} tint="#FFFFFF" weight="semibold" />
    </View>
  );
}

// MARK: Screens

/** Tab root: in-content large title (HIG 2.3), grouped background, clears the tab bar. */
export function TabScreen({
  title,
  subtitle,
  trailing,
  children,
}: {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.content, { paddingTop: insets.top + space.s, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.largeTitleRow}>
        <View style={{ flex: 1 }}>
          <T variant="largeTitle" accessibilityRole="header">
            {title}
          </T>
          {subtitle ? (
            <T variant="subheadline" color={color.secondaryLabel}>
              {subtitle}
            </T>
          ) : null}
        </View>
        {trailing}
      </View>
      {children}
    </ScrollView>
  );
}

/** Pushed screen or sheet content (the native header sits above it). */
export function Screen({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={footer ? 64 : 0}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, { paddingTop: space.l, paddingBottom: (footer ? space.l : insets.bottom) + space.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer ? <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, space.l) }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

// MARK: Inset grouped list

export function Section({
  header,
  footer,
  children,
  style,
}: {
  header?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[s.section, style]}>
      {header ? (
        <T variant="footnote" color={color.secondaryLabel} style={s.sectionHeader}>
          {header}
        </T>
      ) : null}
      <View style={s.group}>
        {rows.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={s.separator} /> : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? (
        typeof footer === "string" ? (
          <T variant="footnote" color={color.secondaryLabel} style={s.sectionFooter}>
            {footer}
          </T>
        ) : (
          <View style={s.sectionFooter}>{footer}</View>
        )
      ) : null}
    </View>
  );
}

export function Row({
  title,
  subtitle,
  value,
  icon,
  iconBg = color.accent,
  leading,
  trailing,
  chevron,
  destructive,
  tint,
  onPress,
  disabled,
  testID,
  accessibilityLabel,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: SFSymbol;
  iconBg?: ColorValue;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  tint?: ColorValue;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}) {
  const titleColor = destructive ? color.destructive : tint ?? color.label;
  const content = (
    <View style={[s.row, disabled && { opacity: 0.4 }]}>
      {icon ? <IconTile name={icon} bg={iconBg} /> : leading}
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="body" color={titleColor} numberOfLines={2}>
          {title}
        </T>
        {subtitle ? (
          <T variant="subheadline" color={color.secondaryLabel}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {value ? (
        <T variant="body" color={color.secondaryLabel} tabular numberOfLines={1}>
          {value}
        </T>
      ) : null}
      {trailing}
      {chevron ? <Icon name="chevron.right" size={13} tint={color.tertiaryLabel} weight="semibold" /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [pressed && { backgroundColor: color.fill }]}
    >
      {content}
    </Pressable>
  );
}

// MARK: Buttons

type ButtonKind = "filled" | "tinted" | "plain" | "destructive";

export function Button({
  title,
  onPress,
  kind = "filled",
  icon,
  disabled,
  loading,
  testID,
  compact,
}: {
  title: string;
  onPress: () => void;
  kind?: ButtonKind;
  icon?: SFSymbol;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  compact?: boolean;
}) {
  const bg =
    kind === "filled" ? color.accent : kind === "destructive" ? color.destructive : kind === "tinted" ? color.fill : "transparent";
  const fg = kind === "filled" || kind === "destructive" ? color.onAccent : color.accent;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={({ pressed }) => [
        s.button,
        compact && s.buttonCompact,
        { backgroundColor: bg },
        (disabled || loading) && { opacity: 0.35 },
        pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
          {icon ? <Icon name={icon} size={17} tint={fg} weight="semibold" /> : null}
          <T variant="headline" color={fg}>
            {title}
          </T>
        </View>
      )}
    </Pressable>
  );
}

/** Circular toolbar-style icon button (e.g. "+"), 44pt hit area. */
export function IconButton({
  name,
  onPress,
  label,
  disabled,
  testID,
}: {
  name: SFSymbol;
  onPress: () => void;
  label: string;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptic.light();
        onPress();
      }}
      style={({ pressed }) => [s.iconButton, disabled && { opacity: 0.35 }, pressed && { opacity: 0.6 }]}
    >
      <Icon name={name} size={18} tint={color.accent} weight="semibold" />
    </Pressable>
  );
}

// MARK: Status & notices

export type Tone = "accent" | "success" | "warning" | "destructive" | "neutral";

const toneColor = (t: Tone): ColorValue =>
  t === "success" ? color.success : t === "warning" ? color.warning : t === "destructive" ? color.destructive : t === "neutral" ? color.gray : color.accent;

/** Status capsule: icon + text, never color alone (HIG 4.3). */
export function StatusPill({ tone, icon, label }: { tone: Tone; icon: SFSymbol; label: string }) {
  const c = toneColor(tone);
  return (
    <View style={s.pill} accessibilityLabel={label}>
      <Icon name={icon} size={12} tint={c} weight="bold" />
      <T variant="footnote" color={c} weight="600">
        {label}
      </T>
    </View>
  );
}

/** Inline notice card (instead of alerts for non-critical information, HIG 7.2). */
export function Notice({
  tone,
  icon,
  title,
  message,
  children,
}: {
  tone: Tone;
  icon: SFSymbol;
  title: string;
  message?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={s.notice} accessibilityRole="summary">
      <View style={{ flexDirection: "row", gap: space.m }}>
        <Icon name={icon} size={22} tint={toneColor(tone)} weight="semibold" mode="hierarchical" />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="headline">{title}</T>
          {message ? (
            <T variant="subheadline" color={color.secondaryLabel}>
              {message}
            </T>
          ) : null}
        </View>
      </View>
      {children ? <View style={{ gap: space.s }}>{children}</View> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  children,
}: {
  icon: SFSymbol;
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={30} tint={color.accent} weight="semibold" mode="hierarchical" />
      </View>
      <T variant="title3" align="center">
        {title}
      </T>
      <T variant="subheadline" color={color.secondaryLabel} align="center">
        {message}
      </T>
      {children ? <View style={{ alignSelf: "stretch", marginTop: space.s }}>{children}</View> : null}
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

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  content: { paddingHorizontal: space.l, gap: space.xl },
  footer: {
    paddingHorizontal: space.l,
    paddingTop: space.m,
    backgroundColor: color.background,
    gap: space.s,
  },
  largeTitleRow: { flexDirection: "row", alignItems: "flex-end", gap: space.m, marginBottom: -space.s },
  section: { gap: space.s },
  sectionHeader: { paddingHorizontal: space.l, textTransform: "uppercase" },
  sectionFooter: { paddingHorizontal: space.l },
  group: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: color.separator, marginLeft: space.l + 29 + space.m },
  row: {
    minHeight: HIT + 8,
    paddingHorizontal: space.l,
    paddingVertical: space.m - 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.m,
  },
  tile: {
    width: 29,
    height: 29,
    borderRadius: radius.icon,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonCompact: { minHeight: HIT, paddingHorizontal: space.l },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.fill,
    alignItems: "center",
    justifyContent: "center",
    margin: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: color.fill,
  },
  notice: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderCurve: "continuous",
    padding: space.l,
    gap: space.m,
  },
  empty: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderCurve: "continuous",
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
    alignItems: "center",
    gap: space.s,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.fill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs,
  },
});

export const isIOS = Platform.OS === "ios";
