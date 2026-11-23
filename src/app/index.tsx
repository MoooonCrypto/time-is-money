// Home. 0.5s test: one large yen figure over an hour ruler (docs/DESIGN.md).
import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

import type { UsageRange } from "../../modules/screen-time";
import { confirmBulkUnlock, confirmResume } from "../components/BulkUnlock";
import { NoRules, RuleRows, useRuleRows } from "../components/RuleList";
import { RANGE_OPTIONS, UsageReport } from "../components/UsageReport";
import { WEEKDAY_LABELS } from "../domain/dates";
import { notificationAction } from "../domain/permissions";
import { useAppStore } from "../state/AppStore";
import { Button, HeaderAction, InlineNotice, Page, Row, Section, Segmented, T } from "../ui/components";
import { color, space } from "../ui/theme";

export default function Home() {
  const store = useAppStore();
  const [range, setRange] = useState<UsageRange>("today");
  const { statuses, paused } = useRuleRows();

  if (!store.config.onboardingCompleted) return <Redirect href="/onboarding" />;

  const now = new Date();
  const canEdit = store.screenTimeStatus === "approved";
  const notifOff = notificationAction(store.notificationStatus).kind !== "none";
  const syncErrors = store.lastSync?.errors.filter((e) => e !== "notAuthorized" && e !== "unavailable") ?? [];

  return (
    <Page>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <T variant="headline" style={{ flex: 1 }} accessibilityRole="header">
          今日 <T variant="headline" color={color.secondaryLabel}>{`${now.getMonth() + 1}月${now.getDate()}日（${WEEKDAY_LABELS[now.getDay()]}）`}</T>
        </T>
        <HeaderAction testID="open-settings" label="設定" icon="gearshape" onPress={() => router.push("/settings")} />
      </View>

      <View style={{ gap: space.l }}>
        <Segmented testID="range-segmented" options={RANGE_OPTIONS} value={range} onChange={setRange} />
        <UsageReport range={range} />
      </View>

      {paused ? (
        <InlineNotice
          icon="pause.circle"
          text="制限を停止しています。集計とお知らせは続いています。"
          action={<Button kind="text" title="再開" onPress={() => confirmResume(store)} />}
        />
      ) : null}
      {syncErrors.length > 0 ? <InlineNotice icon="exclamationmark.triangle" text={`制限を登録できませんでした：${syncErrors[0]}`} /> : null}

      <Section
        title="制限"
        action={statuses.length > 0 ? <HeaderAction testID="open-limits" label="すべて" onPress={() => router.push("/limits")} /> : null}
      >
        {statuses.length === 0 ? <NoRules /> : null}
        {statuses.length > 0 ? <RuleRows /> : null}
        <Row
          testID="add-limit"
          title="制限を追加"
          accent
          disabled={!canEdit}
          onPress={() => router.push("/limit-editor")}
        />
      </Section>

      <View style={{ gap: space.xs, alignItems: "flex-start" }}>
        {notifOff ? (
          <InlineNotice
            icon="bell.slash"
            text="お知らせはオフです"
            action={<Button kind="text" title="オンにする" onPress={() => router.push("/permissions")} />}
          />
        ) : null}
        {paused || statuses.length === 0 ? null : (
          <Button testID="bulk-unlock" kind="destructiveText" title="全制限を一括解除" onPress={() => confirmBulkUnlock(store)} />
        )}
      </View>
    </Page>
  );
}
