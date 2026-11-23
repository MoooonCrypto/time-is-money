// Rule editor sheet: キャンセル (header) / 保存 (pinned bottom).
import { router, Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { ActionSheetIOS, Alert, Platform, Pressable } from "react-native";

import { RuleEditor } from "../components/RuleEditor";
import { addDays, dayKey, formatDayKeyJa } from "../domain/dates";
import { cancelPendingChanges, deleteRule, pendingVersions } from "../domain/rules";
import { useAppStore } from "../state/AppStore";
import { haptic, Row, Section, T } from "../ui/components";
import { color } from "../ui/theme";

export default function LimitEditorSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useAppStore();
  const rule = id ? store.config.rules.find((r) => r.id === id) ?? null : null;
  const pending = rule ? pendingVersions(rule, new Date()) : [];
  const tomorrow = formatDayKeyJa(addDays(dayKey(new Date()), 1));

  const confirmDelete = () => {
    if (!rule) return;
    const title = "この制限を削除しますか？";
    const message = `削除は制限を緩める変更のため、${tomorrow}から反映されます。今日は制限が続きます。`;
    const run = async () => {
      haptic.warning();
      await store.updateConfig((c) => deleteRule(c, rule.id, new Date()));
      router.back();
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, message, options: ["制限を削除", "キャンセル"], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
        (i) => i === 0 && void run(),
      );
    } else {
      Alert.alert(title, message, [
        { text: "キャンセル", style: "cancel" },
        { text: "削除", style: "destructive", onPress: () => void run() },
      ]);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: rule ? "制限の編集" : "制限の追加",
          headerLeft: () => (
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
              <T variant="body" color={color.accent}>
                キャンセル
              </T>
            </Pressable>
          ),
        }}
      />
      <RuleEditor
        config={store.config}
        ruleId={rule?.id ?? null}
        saveLabel={rule ? "保存" : "追加"}
        onSave={async (result) => {
          await store.updateConfig(() => result.config);
          router.back();
        }}
      >
        {rule ? (
          <Section footer="即時に解除したい場合は「全制限を一括解除」を使ってください。">
            {pending.length > 0 ? (
              <Row
                title="予定している変更を取り消す"
                icon="arrow.uturn.backward"
                iconBg={color.gray}
                onPress={async () => {
                  await store.updateConfig((c) => cancelPendingChanges(c, rule.id, new Date()));
                  router.back();
                }}
              />
            ) : null}
            <Row title="この制限を削除" icon="trash.fill" iconBg={color.destructive} destructive onPress={confirmDelete} />
          </Section>
        ) : null}
      </RuleEditor>
    </>
  );
}
