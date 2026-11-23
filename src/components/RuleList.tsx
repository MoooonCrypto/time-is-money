// Rules as quiet rows: name, today's limit, state (symbol + text; colored only when locked).
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";

import { formatDayKeyJa } from "../domain/dates";
import { formatDuration } from "../domain/money";
import { ruleStatuses, type RuleStatus } from "../domain/rules";
import { useAppStore } from "../state/AppStore";
import { Row, StateLabel, T } from "../ui/components";
import { color } from "../ui/theme";

function stateFor(st: RuleStatus, paused: boolean) {
  if (paused) return <StateLabel tone="quiet" icon="pause.fill" label="停止中" />;
  if (st.notYetEffective) return <StateLabel tone="quiet" label="明日から" />;
  if (st.lockedNow) return <StateLabel tone="alert" icon="lock.fill" label="ロック中" />;
  if (!st.limitToday) return <StateLabel tone="quiet" label="今日は制限なし" />;
  return null;
}

export function useRuleRows() {
  const store = useAppStore();
  return { statuses: ruleStatuses(store.config, new Date(), store.shieldRecords), paused: store.config.bulkUnlock.active };
}

export function RuleRows({ showPending }: { showPending?: boolean }) {
  const store = useAppStore();
  const { statuses, paused } = useRuleRows();
  const canEdit = store.screenTimeStatus === "approved";
  return (
    <>
      {statuses.map((st) => (
        <Row
          key={st.ruleId}
          testID={`rule-${st.ruleId}`}
          title={st.name}
          subtitle={
            showPending && st.pending
              ? st.pending.deleted
                ? `${formatDayKeyJa(st.pending.effectiveFrom)}に削除`
                : `${formatDayKeyJa(st.pending.effectiveFrom)}から変更あり`
              : undefined
          }
          value={st.limitToday ? formatDuration(st.limitToday) : undefined}
          trailing={<View>{stateFor(st, paused)}</View>}
          disabled={!canEdit}
          onPress={() => router.push({ pathname: "/limit-editor", params: { id: st.ruleId } })}
        />
      ))}
    </>
  );
}

export function NoRules() {
  return (
    <T variant="subheadline" color={color.secondaryLabel}>
      まだ制限はありません。使いすぎたくないアプリに、1日の上限を決めましょう。
    </T>
  );
}
