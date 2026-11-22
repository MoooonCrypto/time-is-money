// 制限設定: list / add / edit rules, explicit resume after bulk unlock.
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { BulkUnlockButton, ResumeLimitsButton } from "../../components/BulkUnlock";
import { ScreenTimePermissionCard } from "../../components/PermissionCards";
import { SelectionLabel } from "../../components/SelectionLabel";
import { Banner, Button, Card, colors, H2, Screen, Small } from "../../components/ui";
import { MAX_RULES } from "../../domain/config";
import { formatDayKeyJa } from "../../domain/dates";
import { formatDuration } from "../../domain/money";
import { describeLimits, ruleStatuses } from "../../domain/rules";
import { useAppStore } from "../../state/AppStore";

export default function LimitsScreen() {
  const store = useAppStore();
  const now = new Date();
  const statuses = ruleStatuses(store.config, now, store.shieldRecords);
  const canEdit = store.screenTimeStatus === "approved";

  return (
    <Screen>
      {store.config.bulkUnlock.active && (
        <Banner tone="warn" title="制限停止中（一括解除）">
          <Small>設定は保存されています。再開すると、今日すでに使った時間も含めて上限を判定します。</Small>
          <ResumeLimitsButton />
        </Banner>
      )}
      <ScreenTimePermissionCard />

      {statuses.length === 0 && (
        <Card>
          <Small>まだ制限はありません。</Small>
        </Card>
      )}

      {statuses.map((st) => {
        const rule = store.config.rules.find((r) => r.id === st.ruleId)!;
        const current = rule.versions.filter((v) => !st.pending || v !== st.pending.version).at(-1);
        return (
          <Pressable
            key={st.ruleId}
            disabled={!canEdit}
            onPress={() => router.push({ pathname: "/limits/edit", params: { id: st.ruleId } })}
          >
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <H2>{st.name}</H2>
                <Text style={{ color: colors.infoInk }}>編集</Text>
              </View>
              <SelectionLabel selectionId={st.selectionId} />
              {current && !current.deleted && <Small>{describeLimits(current, formatDuration)}</Small>}
              {st.pending && (
                <Small style={{ color: colors.warnInk }}>
                  {st.pending.deleted
                    ? `${formatDayKeyJa(st.pending.effectiveFrom)}に削除されます（今日は制限が続きます）`
                    : `${formatDayKeyJa(st.pending.effectiveFrom)}から：${describeLimits(st.pending.version, formatDuration)}`}
                </Small>
              )}
            </Card>
          </Pressable>
        );
      })}

      <Button
        title="制限を追加"
        disabled={!canEdit || store.config.rules.length >= MAX_RULES}
        onPress={() => router.push("/limits/edit")}
      />
      {store.config.rules.length >= MAX_RULES && <Small>制限は{MAX_RULES}件までです（削除した枠は翌日に空きます）。</Small>}
      <Small>上限を緩める変更（引き上げ・制限なし・アプリの除外・削除）は翌日から反映されます。個別の即時解除はありません。</Small>
      <BulkUnlockButton />
    </Screen>
  );
}
