import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const colors = {
  bg: "#F5F6F8",
  card: "#FFFFFF",
  ink: "#111827",
  sub: "#6B7280",
  line: "#E5E7EB",
  navy: "#111827",
  gold: "#F9C22E",
  danger: "#DC2626",
  warnBg: "#FEF3C7",
  warnInk: "#92400E",
  infoBg: "#E0F2FE",
  infoInk: "#075985",
  okBg: "#DCFCE7",
  okInk: "#166534",
};

export function Screen({
  children,
  scroll = true,
  edges = ["bottom"],
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
}) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.scroll, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h1}>{children}</Text>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={styles.h2}>{children}</Text>;
}

export function P({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.p, style]}>{children}</Text>;
}

export function Small({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.small, style]}>{children}</Text>;
}

type ButtonKind = "primary" | "secondary" | "danger" | "ghost";

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
  kind?: ButtonKind;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}) {
  const s = buttonStyles[kind];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, s.box, (disabled || loading) && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
    >
      {loading ? <ActivityIndicator color={s.text.color} /> : <Text style={[styles.buttonText, s.text]}>{title}</Text>}
    </Pressable>
  );
}

export function Banner({
  tone,
  title,
  children,
}: {
  tone: "warn" | "info" | "ok";
  title: string;
  children?: React.ReactNode;
}) {
  const bg = tone === "warn" ? colors.warnBg : tone === "ok" ? colors.okBg : colors.infoBg;
  const ink = tone === "warn" ? colors.warnInk : tone === "ok" ? colors.okInk : colors.infoInk;
  return (
    <View style={[styles.banner, { backgroundColor: bg }]} accessibilityRole="summary">
      <Text style={[styles.bannerTitle, { color: ink }]}>{title}</Text>
      {children}
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>{children}</View>;
}

export function Loading({ label }: { label: string }) {
  return (
    <View style={{ padding: 24, alignItems: "center", gap: 8 }}>
      <ActivityIndicator />
      <Small>{label}</Small>
    </View>
  );
}

const buttonStyles: Record<ButtonKind, { box: ViewStyle; text: TextStyle }> = {
  primary: { box: { backgroundColor: colors.navy }, text: { color: "#fff" } },
  secondary: { box: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }, text: { color: colors.ink } },
  danger: { box: { backgroundColor: colors.danger }, text: { color: "#fff" } },
  ghost: { box: { backgroundColor: "transparent" }, text: { color: colors.infoInk } },
};

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, gap: 8 },
  h1: { fontSize: 24, fontWeight: "800", color: colors.ink },
  h2: { fontSize: 17, fontWeight: "700", color: colors.ink },
  p: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  small: { fontSize: 13, color: colors.sub, lineHeight: 18 },
  button: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center", minHeight: 48 },
  buttonText: { fontSize: 16, fontWeight: "700" },
  banner: { borderRadius: 12, padding: 12, gap: 6 },
  bannerTitle: { fontSize: 15, fontWeight: "700" },
  segmented: { flexDirection: "row", backgroundColor: colors.line, borderRadius: 10, padding: 3 },
  segment: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { fontSize: 14, color: colors.sub, fontWeight: "600" },
  segmentTextActive: { color: colors.ink },
});
