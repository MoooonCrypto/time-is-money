// 現在の制限: today's limit per rule and whether it is locked now.
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";

import { ResumeLimitsButton } from "../../components/BulkUnlock";
import { SelectionLabel } from "../../components/SelectionLabel";
import { Banner, Button, Card, colors, H2, Screen, Small } from "../../components/ui";
import { formatDayKeyJa, WEEKDAY_LABELS } from "../../domain/dates";
import { formatDuration } from "../../domain/money";
import { describeLimits, ruleStatuses } from "../../domain/rules";
import { useAppStore } from "../../state/AppStore";

export default function CurrentLimits() {
  const store = useAppStore();
  const now = new Date();
  const statuses = ruleStatuses(store.config, now, store.shieldRecords);

  return (
    <Screen>
      <Small>
        今日（{WEEKDAY_LABELS[now.getDay()]}曜日）の上限です。上限に達したアプリだけが、今日の終わりまでロックされます。
      </Small>
      {store.config.bulkUnlock.active && (
        <Banner tone="warn" title="制限停止中">
          <Small>一括解除中のため、どのアプリもロックされません。</Small>
          <ResumeLimitsButton />
        </Banner>
      )}
      {store.screenTimeStatus !== "approved" && (
        <Banner tone="warn" title="スクリーンタイムの許可がないため、制限は動作していません" />
      )}
      {statuses.length === 0 && (
        <Card>
          <Small>制限はありません。</Small>
          <Button kind="secondary" title="制限を追加" onPress={() => router.push("/limits/edit")} />
        </Card>
      )}
      {statuses.map((st) => (
        <Card key={st.ruleId}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <H2>{st.name}</H2>
            <Small style={{ color: st.lockedNow ? colors.danger : colors.okInk, fontWeight: "700" }}>
              {store.config.bulkUnlock.active ? "停止中" : st.lockedNow ? "ロック中" : st.limitToday ? "利用可" : "今日は制限なし"}
            </Small>
          </View>
          <SelectionLabel selectionId={st.selectionId} />
          <Small>今日の上限：{st.limitToday ? formatDuration(st.limitToday) : "制限なし"}</Small>
          {st.pending && (
            <Small style={{ color: colors.warnInk }}>
              {st.pending.deleted
                ? `${formatDayKeyJa(st.pending.effectiveFrom)}に削除`
                : `${formatDayKeyJa(st.pending.effectiveFrom)}から：${describeLimits(st.pending.version, formatDuration)}`}
            </Small>
          )}
        </Card>
      ))}
      {store.monitorState.lastError && store.monitorState.lastError !== "notAuthorized" && (
        <Banner tone="warn" title="監視の登録でエラーが発生しました">
          <Small>{store.monitorState.lastError}</Small>
        </Banner>
      )}
    </Screen>
  );
}
