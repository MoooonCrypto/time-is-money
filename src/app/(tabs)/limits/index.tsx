// 制限: list / add / edit rules, explicit resume after bulk unlock.
import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

import { confirmBulkUnlock, confirmResume } from "../../../components/BulkUnlock";
import { ScreenTimeRequiredCard } from "../../../components/Permissions";
import { RuleStatusPill } from "../../../components/RuleStatusPill";
import { SelectionLabel } from "../../../components/SelectionLabel";
import { MAX_RULES } from "../../../domain/config";
import { dayKey, formatDayKeyJa } from "../../../domain/dates";
import { formatDuration } from "../../../domain/money";
import { describeLimits, effectiveVersion, ruleStatuses } from "../../../domain/rules";
import { useAppStore } from "../../../state/AppStore";
import { Button, EmptyState, haptic, Icon, IconButton, Notice, Row, Section, T, TabScreen } from "../../../ui/components";
import { color, space } from "../../../ui/theme";

export default function LimitsScreen() {
  const store = useAppStore();
  const now = new Date();
  const statuses = ruleStatuses(store.config, now, store.shieldRecords);
  const canEdit = store.screenTimeStatus === "approved";
  const paused = store.config.bulkUnlock.active;
  const full = store.config.rules.length >= MAX_RULES;

  return (
    <TabScreen
      title="制限"
      subtitle={statuses.length > 0 ? `${statuses.length}件のルール` : undefined}
      trailing={
        <IconButton
          testID="add-limit"
          name="plus"
          label="制限を追加"
          disabled={!canEdit || full}
          onPress={() => router.push("/limit-editor")}
        />
      }
    >
      {paused ? (
        <Notice
          tone="warning"
          icon="pause.circle.fill"
          title="制限を一時停止中"
          message="設定は保存されています。再開すると、今日すでに使った時間も含めて上限を判定します。"
        >
          <Button testID="resume-limits" title="制限を再開" icon="play.fill" onPress={() => confirmResume(store)} />
        </Notice>
      ) : null}

      <ScreenTimeRequiredCard compact />

      {statuses.length === 0 ? (
        <EmptyState
          icon="hourglass"
          title="まだ制限はありません"
          message="使いすぎたくないアプリを選び、1日の上限を決めましょう。上限に達すると今日だけロックされます。"
        >
          <Button title="制限を追加" icon="plus" disabled={!canEdit} onPress={() => router.push("/limit-editor")} />
        </EmptyState>
      ) : (
        <Section
          header="ルール"
          footer="上限を緩める変更（引き上げ・制限なし・アプリの除外・削除）は翌日から反映されます。個別の即時解除はありません。"
        >
          {statuses.map((st) => {
            const rule = store.config.rules.find((r) => r.id === st.ruleId)!;
            const current = effectiveVersion(rule, dayKey(now));
            return (
              <Pressable
                key={st.ruleId}
                testID={`rule-${st.ruleId}`}
                accessibilityRole="button"
                accessibilityLabel={`${st.name}を編集`}
                disabled={!canEdit}
                onPress={() => {
                  haptic.selection();
                  router.push({ pathname: "/limit-editor", params: { id: st.ruleId } });
                }}
                style={({ pressed }) => [{ padding: 16, gap: space.s }, pressed && { backgroundColor: color.fill }]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
                  <T variant="headline" style={{ flex: 1 }} numberOfLines={1}>
                    {st.name}
                  </T>
                  <RuleStatusPill status={st} paused={paused} />
                  <Icon name="chevron.right" size={13} tint={color.tertiaryLabel} weight="semibold" />
                </View>
                <SelectionLabel selectionId={st.selectionId} />
                {current && !current.deleted ? (
                  <T variant="subheadline" color={color.secondaryLabel} tabular>
                    {describeLimits(current, formatDuration)}
                  </T>
                ) : null}
                {st.pending ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Icon name="calendar.badge.clock" size={14} tint={color.warning} />
                    <T variant="footnote" color={color.secondaryLabel} style={{ flex: 1 }}>
                      {st.pending.deleted
                        ? `${formatDayKeyJa(st.pending.effectiveFrom)}に削除（今日は制限が続きます）`
                        : `${formatDayKeyJa(st.pending.effectiveFrom)}から：${describeLimits(st.pending.version, formatDuration)}`}
                    </T>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </Section>
      )}

      {full ? (
        <T variant="footnote" color={color.secondaryLabel} style={{ paddingHorizontal: space.l }}>
          制限は{MAX_RULES}件までです（削除した枠は翌日に空きます）。
        </T>
      ) : null}

      {paused ? null : (
        <Section footer="すべてのロックをすぐに止めます。ルールは保存され、ここから再開できます。">
          <Row
            testID="limits-bulk-unlock"
            title="全制限を一括解除"
            icon="lock.open.fill"
            iconBg={color.destructive}
            destructive
            onPress={() => confirmBulkUnlock(store)}
          />
        </Section>
      )}
    </TabScreen>
  );
}
