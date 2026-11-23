// 現在の制限: today's limit per rule and whether it is locked right now.
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";

import { confirmResume } from "../../../components/BulkUnlock";
import { RuleStatusPill } from "../../../components/RuleStatusPill";
import { SelectionLabel } from "../../../components/SelectionLabel";
import { formatDayKeyJa, WEEKDAY_LABELS } from "../../../domain/dates";
import { formatDuration } from "../../../domain/money";
import { describeLimits, ruleStatuses } from "../../../domain/rules";
import { useAppStore } from "../../../state/AppStore";
import { Button, EmptyState, Notice, Screen, Section, T } from "../../../ui/components";
import { color, space } from "../../../ui/theme";

export default function CurrentLimits() {
  const store = useAppStore();
  const now = new Date();
  const statuses = ruleStatuses(store.config, now, store.shieldRecords);
  const paused = store.config.bulkUnlock.active;

  return (
    <Screen>
      {paused ? (
        <Notice tone="warning" icon="pause.circle.fill" title="制限を一時停止中" message="一括解除中のため、どのアプリもロックされません。">
          <Button kind="tinted" compact title="制限を再開" icon="play.fill" onPress={() => confirmResume(store)} />
        </Notice>
      ) : null}
      {store.screenTimeStatus !== "approved" && store.screenTimeStatus !== "unavailable" ? (
        <Notice tone="warning" icon="hourglass" title="スクリーンタイムの許可がないため、制限は動作していません" />
      ) : null}

      {statuses.length === 0 ? (
        <EmptyState icon="hourglass" title="制限はありません" message="使いすぎたくないアプリを選んで、1日の上限を決めましょう。">
          <Button title="制限を追加" icon="plus" onPress={() => router.push("/limit-editor")} />
        </EmptyState>
      ) : (
        <Section
          header={`今日（${WEEKDAY_LABELS[now.getDay()]}曜日）`}
          footer="上限に達したアプリだけが、今日の終わりまでロックされます。"
        >
          {statuses.map((st) => (
            <View key={st.ruleId} style={{ padding: space.l, gap: space.s }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
                <T variant="headline" style={{ flex: 1 }} numberOfLines={1}>
                  {st.name}
                </T>
                <RuleStatusPill status={st} paused={paused} />
              </View>
              <SelectionLabel selectionId={st.selectionId} />
              <T variant="subheadline" color={color.secondaryLabel} tabular>
                今日の上限：{st.limitToday ? formatDuration(st.limitToday) : "制限なし"}
              </T>
              {st.pending ? (
                <T variant="footnote" color={color.warning}>
                  {st.pending.deleted
                    ? `${formatDayKeyJa(st.pending.effectiveFrom)}に削除されます`
                    : `${formatDayKeyJa(st.pending.effectiveFrom)}から：${describeLimits(st.pending.version, formatDuration)}`}
                </T>
              ) : null}
            </View>
          ))}
        </Section>
      )}

      {store.monitorState.lastError && store.monitorState.lastError !== "notAuthorized" ? (
        <Notice tone="destructive" icon="exclamationmark.triangle.fill" title="監視の登録でエラーが発生しました" message={store.monitorState.lastError} />
      ) : null}
    </Screen>
  );
}
