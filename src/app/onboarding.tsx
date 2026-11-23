// Onboarding: 3 pages, skippable (HIG 8.1). Permissions are explained in
// context on their own page, each right before its system dialog (HIG 9.2).
import { router } from "expo-router";
import type { SFSymbol } from "expo-symbols";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PermissionCard } from "../components/Permissions";
import { RateEditor, useRateInput } from "../components/RateEditor";
import { SelectionLabel } from "../components/SelectionLabel";
import { formatDuration } from "../domain/money";
import { dayKey } from "../domain/dates";
import { describeLimits, effectiveVersion } from "../domain/rules";
import { useAppStore } from "../state/AppStore";
import { Button, haptic, Icon, Section, T } from "../ui/components";
import { color, radius, space } from "../ui/theme";

const PAGES = 3;

export default function Onboarding() {
  const store = useAppStore();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const rate = useRateInput(store.config.hourlyRateYen);

  const finish = async () => {
    haptic.success();
    await store.updateConfig((c) => ({ ...c, onboardingCompleted: true }));
    router.replace("/");
  };

  const next = async () => {
    if (page === 0 && rate.parsed.ok) {
      const value = rate.parsed.value;
      await store.updateConfig((c) => ({ ...c, hourlyRateYen: value }));
    }
    if (page < PAGES - 1) setPage(page + 1);
    else await finish();
  };

  const canEditLimits = store.screenTimeStatus === "approved";
  const today = dayKey(new Date());

  return (
    <KeyboardAvoidingView style={[s.root, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.topBar}>
        {page > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => setPage(page - 1)} hitSlop={10} style={s.topButton}>
            <Icon name="chevron.left" size={17} tint={color.accent} weight="semibold" />
          </Pressable>
        ) : (
          <View style={s.topButton} />
        )}
        <View style={s.progress} accessibilityLabel={`ステップ ${page + 1} / ${PAGES}`}>
          {Array.from({ length: PAGES }, (_, i) => (
            <View key={i} style={[s.dot, i === page && s.dotActive, i < page && s.dotDone]} />
          ))}
        </View>
        <Pressable testID="onboarding-skip" accessibilityRole="button" onPress={() => void finish()} hitSlop={10} style={s.topButton}>
          <T variant="body" color={color.accent}>
            スキップ
          </T>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {page === 0 ? (
          <>
            <Hero icon="yensign.circle.fill" title={"あなたの1時間は\nいくら？"} message="スマホに使った時間を、この単価で円に換算して見える化します。あとから変更できます。" />
            <RateEditor input={rate} />
          </>
        ) : page === 1 ? (
          <>
            <Hero icon="lock.shield.fill" title="アクセスの許可" message="何に使うかを確認してから、それぞれ許可してください。通知を許可しなくても、制限と統計は使えます。" />
            <PermissionCard kind="screenTime" />
            <PermissionCard kind="notifications" />
          </>
        ) : (
          <>
            <Hero icon="hourglass" title="最初の制限" message="使いすぎたくないアプリを選び、1日の上限を決めます。上限に達したアプリは今日だけロックされ、明日また使えます。" />
            {store.config.rules.length > 0 ? (
              <Section header="作成した制限">
                {store.config.rules.map((r) => {
                  const v = effectiveVersion(r, today);
                  return (
                    <View key={r.id} style={{ padding: space.l, gap: space.xs }}>
                      <T variant="headline">{r.name}</T>
                      <SelectionLabel selectionId={v?.selectionId ?? null} />
                      {v ? (
                        <T variant="subheadline" color={color.secondaryLabel}>
                          {describeLimits(v, formatDuration)}
                        </T>
                      ) : null}
                    </View>
                  );
                })}
              </Section>
            ) : null}
            {canEditLimits ? (
              store.config.rules.length > 0 ? (
                <Button kind="tinted" icon="plus" title="もう1つ追加" onPress={() => router.push("/limit-editor")} />
              ) : null
            ) : (
              <View style={s.hint}>
                <Icon name="info.circle" size={18} tint={color.secondaryLabel} />
                <T variant="subheadline" color={color.secondaryLabel} style={{ flex: 1 }}>
                  アプリの制限は、スクリーンタイムを許可したあとで「制限」タブから追加できます。
                </T>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, space.l) }]}>
        {page === PAGES - 1 && canEditLimits && store.config.rules.length === 0 ? (
          <>
            {/* One clear primary action: create the first limit; "later" is secondary. */}
            <Button testID="onboarding-create-limit" title="アプリを選んで制限を作成" icon="plus" onPress={() => router.push("/limit-editor")} />
            <Button testID="onboarding-later" kind="plain" compact title="あとで設定する" onPress={() => void finish()} />
          </>
        ) : (
          <Button
            testID="onboarding-next"
            title={page < PAGES - 1 ? "次へ" : "はじめる"}
            disabled={page === 0 && !rate.parsed.ok}
            onPress={() => void next()}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function Hero({ icon, title, message }: { icon: SFSymbol; title: string; message: string }) {
  return (
    <View style={s.hero}>
      <View style={s.heroIcon}>
        <Icon name={icon} size={40} tint={color.accent} weight="semibold" mode="hierarchical" />
      </View>
      <T variant="title1" align="center" accessibilityRole="header">
        {title}
      </T>
      <T variant="body" color={color.secondaryLabel} align="center">
        {message}
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.l, height: 44 },
  topButton: { minWidth: 64, height: 44, justifyContent: "center" },
  progress: { flexDirection: "row", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.fillStrong },
  dotActive: { width: 24, backgroundColor: color.accent },
  dotDone: { backgroundColor: color.accent, opacity: 0.4 },
  content: { padding: space.l, paddingTop: space.m, gap: space.xl },
  hero: { alignItems: "center", gap: space.s, paddingHorizontal: space.s },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    borderCurve: "continuous",
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.s,
  },
  hint: {
    flexDirection: "row",
    gap: space.s,
    padding: space.l,
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderCurve: "continuous",
  },
  footer: { paddingHorizontal: space.l, paddingTop: space.m, gap: space.xs, backgroundColor: color.background },
});
