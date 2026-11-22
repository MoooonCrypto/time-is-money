import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, View } from "react-native";

import { RuleEditor } from "../../components/RuleEditor";
import { Button, Screen, Small } from "../../components/ui";
import { addDays, dayKey, formatDayKeyJa } from "../../domain/dates";
import { cancelPendingChanges, deleteRule, pendingVersions } from "../../domain/rules";
import { useAppStore } from "../../state/AppStore";

export default function EditLimit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useAppStore();
  const rule = id ? store.config.rules.find((r) => r.id === id) ?? null : null;
  const pending = rule ? pendingVersions(rule, new Date()) : [];
  const tomorrow = formatDayKeyJa(addDays(dayKey(new Date()), 1));

  return (
    <Screen>
      <RuleEditor
        config={store.config}
        ruleId={rule?.id ?? null}
        onCancel={() => router.back()}
        onSave={async (result) => {
          await store.updateConfig(() => result.config);
          if (result.timing === "nextDay") {
            Alert.alert("保存しました", `上限を緩める変更のため、${formatDayKeyJa(result.effectiveFrom)}から反映されます。`);
          }
          router.back();
        }}
      />
      {rule && (
        <View style={{ gap: 8, marginTop: 8 }}>
          {pending.length > 0 && (
            <Button
              kind="secondary"
              title="予定している変更を取り消す"
              onPress={async () => {
                await store.updateConfig((c) => cancelPendingChanges(c, rule.id, new Date()));
                router.back();
              }}
            />
          )}
          <Button
            kind="danger"
            title="この制限を削除"
            onPress={() =>
              Alert.alert("この制限を削除しますか？", `削除は制限を緩める変更のため、${tomorrow}から反映されます。今日は制限が続きます。`, [
                { text: "キャンセル", style: "cancel" },
                {
                  text: "削除",
                  style: "destructive",
                  onPress: async () => {
                    await store.updateConfig((c) => deleteRule(c, rule.id, new Date()));
                    router.back();
                  },
                },
              ])
            }
          />
          <Small>即時に解除したい場合は、ホームの「全制限を一括解除」を使ってください。</Small>
        </View>
      )}
    </Screen>
  );
}
