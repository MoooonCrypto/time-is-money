// Home: whole-iPhone yen + total time (today / week / total), shortcuts to limits.
import { Link, Redirect, router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { UsageRange } from "../../modules/screen-time";
import { BulkUnlockButton } from "../components/BulkUnlock";
import { NotificationPermissionCard } from "../components/PermissionCards";
import { RANGE_OPTIONS, UsageReport } from "../components/UsageReport";
import { Banner, Button, colors, Loading, Row, Screen, Segmented, Small } from "../components/ui";
import { formatYen } from "../domain/money";
import { useAppStore } from "../state/AppStore";

export default function Home() {
  const store = useAppStore();
  const [range, setRange] = useState<UsageRange>("today");

  if (!store.loaded) return <Loading label="読み込み中…" />;
  if (!store.config.onboardingCompleted) return <Redirect href="/onboarding" />;

  const rate = store.config.hourlyRateYen;
  return (
    <Screen>
      {store.config.bulkUnlock.active && (
        <Banner tone="warn" title="制限停止中">
          <Small>全制限を一括解除しています。iPhone全体の集計と通知は続いています。「制限設定」から再開できます。</Small>
          <Button kind="secondary" title="制限設定を開く" onPress={() => router.push("/limits")} />
        </Banner>
      )}
      {store.lastSync?.errors.some((e) => e !== "notAuthorized" && e !== "unavailable") && (
        <Banner tone="warn" title="監視を設定できませんでした">
          <Small>{store.lastSync.errors.join("\n")}</Small>
        </Banner>
      )}

      <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />
      <UsageReport range={range} />

      <Row style={{ justifyContent: "space-between" }}>
        <Small>換算単価：{rate ? `${formatYen(rate)}円／時間` : "未設定"}</Small>
        <Link href="/rate" asChild>
          <Pressable accessibilityRole="link">
            <Text style={{ color: colors.infoInk, fontWeight: "600" }}>単価を変更</Text>
          </Pressable>
        </Link>
      </Row>

      <NotificationPermissionCard compact />

      <View style={{ gap: 8 }}>
        <Button kind="secondary" title="現在の制限" onPress={() => router.push("/limits/current")} />
        <Button kind="secondary" title="制限設定" onPress={() => router.push("/limits")} />
        <BulkUnlockButton />
        <Button kind="ghost" title="権限の確認" onPress={() => router.push("/permissions")} />
        {__DEV__ && <Button kind="ghost" title="開発用ツール" onPress={() => router.push("/dev")} />}
      </View>
    </Screen>
  );
}
