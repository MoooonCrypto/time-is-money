// Onboarding: rate (live value demo) -> permission primes -> first limit.
// Each step is personalization or a permission prime; skippable.
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PermissionBlock } from "../components/Permissions";
import { RateEditor, useRateInput } from "../components/RateEditor";
import { NoRules, RuleRows } from "../components/RuleList";
import { useAppStore } from "../state/AppStore";
import { Button, haptic, Section, T } from "../ui/components";
import { color, space } from "../ui/theme";

const STEPS = [
  { title: "あなたの1時間は\nいくらですか", body: "スマホに使った時間を、この金額で数えます。" },
  { title: "2つの許可", body: "使う直前に、それぞれ確認します。" },
  { title: "最初の制限", body: "上限に達したアプリは、その日の終わりまで開けなくなります。" },
];

export default function Onboarding() {
  const store = useAppStore();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const rate = useRateInput(store.config.hourlyRateYen);
  const canEditLimits = store.screenTimeStatus === "approved";
  const last = step === STEPS.length - 1;

  const finish = async () => {
    haptic.success();
    await store.updateConfig((c) => ({ ...c, onboardingCompleted: true }));
    router.replace("/");
  };
  const next = async () => {
    if (step === 0 && rate.parsed.ok) {
      const value = rate.parsed.value;
      await store.updateConfig((c) => ({ ...c, hourlyRateYen: value }));
    }
    if (!last) setStep(step + 1);
    else await finish();
  };

  return (
    <KeyboardAvoidingView style={[s.root, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="戻る"
          disabled={step === 0}
          onPress={() => setStep(step - 1)}
          hitSlop={12}
          style={s.topSide}
        >
          {step > 0 ? <T variant="body" color={color.accent}>戻る</T> : null}
        </Pressable>
        <T variant="footnote" color={color.secondaryLabel} style={{ fontVariant: ["tabular-nums"] }} accessibilityLabel={`ステップ ${step + 1} / ${STEPS.length}`}>
          {step + 1} / {STEPS.length}
        </T>
        <Pressable testID="onboarding-skip" accessibilityRole="button" onPress={() => void finish()} hitSlop={12} style={[s.topSide, { alignItems: "flex-end" }]}>
          <T variant="body" color={color.accent}>スキップ</T>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={{ gap: space.s }}>
          <T variant="title" accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34 }}>
            {STEPS[step].title}
          </T>
          <T variant="body" color={color.secondaryLabel}>
            {STEPS[step].body}
          </T>
        </View>

        {step === 0 ? <RateEditor input={rate} /> : null}
        {step === 1 ? (
          <View style={{ gap: space.xxl }}>
            <PermissionBlock kind="screenTime" />
            <PermissionBlock kind="notifications" />
          </View>
        ) : null}
        {step === 2 ? (
          <Section>
            {store.config.rules.length === 0 ? (
              canEditLimits ? <NoRules /> : (
                <T variant="subheadline" color={color.secondaryLabel}>
                  スクリーンタイムを許可すると、ホームから追加できます。
                </T>
              )
            ) : (
              <RuleRows />
            )}
          </Section>
        ) : null}
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, space.l) }]}>
        {last && canEditLimits && store.config.rules.length === 0 ? (
          <>
            <Button testID="onboarding-create-limit" title="アプリを選んで制限する" onPress={() => router.push("/limit-editor")} />
            <Button testID="onboarding-later" kind="text" title="あとで" onPress={() => void finish()} />
          </>
        ) : (
          <Button
            testID="onboarding-next"
            title={last ? "はじめる" : "次へ"}
            disabled={step === 0 && !rate.parsed.ok}
            onPress={() => void next()}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.screen, height: 44 },
  topSide: { minWidth: 72, height: 44, justifyContent: "center" },
  content: { paddingHorizontal: space.screen, paddingTop: space.xl, paddingBottom: space.xl, gap: space.xxl },
  footer: { paddingHorizontal: space.screen, paddingTop: space.m, gap: space.xs, backgroundColor: color.background },
});
