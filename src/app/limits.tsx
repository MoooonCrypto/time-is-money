// 制限: every rule with pending changes, add, bulk unlock / resume.
import { router, Stack } from "expo-router";
import React from "react";

import { confirmBulkUnlock, confirmResume } from "../components/BulkUnlock";
import { NoRules, RuleRows, useRuleRows } from "../components/RuleList";
import { MAX_RULES } from "../domain/config";
import { useAppStore } from "../state/AppStore";
import { Button, HeaderAction, InlineNotice, Row, Screen, Section } from "../ui/components";

export default function LimitsScreen() {
  const store = useAppStore();
  const { statuses, paused } = useRuleRows();
  const canEdit = store.screenTimeStatus === "approved";
  const full = store.config.rules.length >= MAX_RULES;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            canEdit && !full ? <HeaderAction testID="limits-add" label="追加" icon="plus" onPress={() => router.push("/limit-editor")} /> : null,
        }}
      />
      <Screen>
        {paused ? (
          <InlineNotice icon="pause.circle" text="制限を停止しています。" action={<Button kind="text" title="再開" onPress={() => confirmResume(store)} />} />
        ) : null}
        {!canEdit && store.screenTimeStatus !== "checking" ? (
          <InlineNotice icon="hourglass" text="スクリーンタイムを許可すると制限を使えます。" action={<Button kind="text" title="許可" onPress={() => router.push("/permissions")} />} />
        ) : null}

        <Section
          footer={`上限を緩める変更（引き上げ、制限なし、アプリの除外、削除）は翌日から反映されます。${full ? `制限は${MAX_RULES}件までです。` : ""}`}
        >
          {statuses.length === 0 ? <NoRules /> : null}
          {statuses.length > 0 ? <RuleRows showPending /> : null}
          {canEdit && !full ? <Row title="制限を追加" accent onPress={() => router.push("/limit-editor")} /> : null}
        </Section>

        {paused || statuses.length === 0 ? null : (
          <Section footer="すべてのロックをすぐに止めます。制限は残り、ここから再開できます。">
            <Button testID="limits-bulk-unlock" kind="destructiveText" title="全制限を一括解除" onPress={() => confirmBulkUnlock(store)} />
          </Section>
        )}
      </Screen>
    </>
  );
}
