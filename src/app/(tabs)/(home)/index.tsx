// Home: whole-iPhone yen + time (today / week / total) and shortcuts to limits.
import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

import type { UsageRange } from "../../../../modules/screen-time";
import { confirmBulkUnlock, confirmResume } from "../../../components/BulkUnlock";
import { RANGE_OPTIONS, UsageReport } from "../../../components/UsageReport";
import { WEEKDAY_LABELS } from "../../../domain/dates";
import { formatYen } from "../../../domain/money";
import { notificationAction } from "../../../domain/permissions";
import { ruleStatuses } from "../../../domain/rules";
import { useAppStore } from "../../../state/AppStore";
import { Button, Notice, Row, Section, Segmented, TabScreen } from "../../../ui/components";
import { color, space } from "../../../ui/theme";

function todayLabel(d: Date) {
  return `${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAY_LABELS[d.getDay()]}）`;
}

export default function Home() {
  const store = useAppStore();
  const [range, setRange] = useState<UsageRange>("today");

  if (!store.config.onboardingCompleted) return <Redirect href="/onboarding" />;

  const now = new Date();
  const rate = store.config.hourlyRateYen;
  const statuses = ruleStatuses(store.config, now, store.shieldRecords);
  const locked = statuses.filter((s) => s.lockedNow).length;
  const unlocked = store.config.bulkUnlock.active;
  const notifOff = notificationAction(store.notificationStatus).kind !== "none";
  const syncErrors = store.lastSync?.errors.filter((e) => e !== "notAuthorized" && e !== "unavailable") ?? [];

  return (
    <TabScreen title="Time Is Money" subtitle={todayLabel(now)}>
      {unlocked ? (
        <Notice
          tone="warning"
          icon="pause.circle.fill"
          title="制限を一時停止中"
          message="全制限を一括解除しています。iPhone全体の集計と通知は続いています。"
        >
          <Button kind="tinted" compact title="制限を再開" icon="play.fill" onPress={() => confirmResume(store)} />
        </Notice>
      ) : null}
      {syncErrors.length > 0 ? (
        <Notice tone="destructive" icon="exclamationmark.triangle.fill" title="監視を設定できませんでした" message={syncErrors.join("\n")} />
      ) : null}

      <View style={{ gap: space.m }}>
        <Segmented testID="range-segmented" options={RANGE_OPTIONS} value={range} onChange={setRange} />
        <UsageReport range={range} />
      </View>

      <Section header="アプリの制限">
        <Row
          testID="row-current-limits"
          title="現在の制限"
          icon="hourglass"
          iconBg={color.accent}
          value={statuses.length === 0 ? "なし" : locked > 0 ? `${locked}件ロック中` : `${statuses.length}件`}
          chevron
          onPress={() => router.push("/current")}
        />
        <Row
          testID="row-limit-settings"
          title="制限設定"
          icon="slider.horizontal.3"
          iconBg={color.gray}
          chevron
          onPress={() => router.navigate("/limits")}
        />
        {unlocked ? null : (
          <Row
            testID="row-bulk-unlock"
            title="全制限を一括解除"
            icon="lock.open.fill"
            iconBg={color.destructive}
            destructive
            onPress={() => confirmBulkUnlock(store)}
          />
        )}
      </Section>

      <Section
        header="換算"
        footer="統計と通知の金額は、過去の分も含めて現在の単価で計算します。"
      >
        <Row
          testID="row-rate"
          title="時間の単価"
          icon="yensign"
          iconBg={color.success}
          value={rate ? `${formatYen(rate)}円／時間` : "未設定"}
          chevron
          onPress={() => router.push("/rate")}
        />
        {notifOff ? (
          <Row
            title="通知がオフです"
            subtitle="円換算のお知らせが届きません"
            icon="bell.slash.fill"
            iconBg={color.gray}
            chevron
            onPress={() => router.navigate("/settings/permissions")}
          />
        ) : null}
      </Section>
    </TabScreen>
  );
}
