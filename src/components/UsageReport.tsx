// Embeds the DeviceActivityReport rendered by the report extension.
// Usage numbers never reach JS; this component only chooses the range and
// shows the right state when the report cannot be shown.
import React from "react";
import { StyleSheet, View } from "react-native";

import { NativeUsageReportView, type UsageRange } from "../../modules/screen-time";
import { homeDataState } from "../domain/permissions";
import { screenTime } from "../native/screenTime";
import { useAppStore } from "../state/AppStore";
import { ScreenTimePermissionCard } from "./PermissionCards";
import { Banner, Card, colors, Small } from "./ui";

export const RANGE_OPTIONS: { value: UsageRange; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "total", label: "累計" },
];

export function UsageReport({ range, height }: { range: UsageRange; height?: number }) {
  const store = useAppStore();
  const state = homeDataState(store.screenTimeStatus);

  if (screenTime.kind === "mock") {
    return <DevMockReport range={range} rate={store.config.hourlyRateYen} />;
  }
  if (state === "screenTimeUnavailable" || !NativeUsageReportView) {
    return (
      <Banner tone="info" title="この環境では利用時間を取得できません">
        <Small>iPhoneの開発ビルド（Expo dev client）でスクリーンタイムを許可すると表示されます。</Small>
      </Banner>
    );
  }
  if (state === "needsScreenTimePermission") {
    return <ScreenTimePermissionCard />;
  }
  return (
    <View style={[s.reportBox, height ? { height } : { flex: 1, minHeight: 420 }]}>
      <NativeUsageReportView style={StyleSheet.absoluteFill} range={range} refreshToken={store.refreshToken} />
    </View>
  );
}

/** Development-only placeholder (EXPO_PUBLIC_TIM_MOCK=1). Clearly labelled; never in release builds. */
function DevMockReport({ range, rate }: { range: UsageRange; rate: number | null }) {
  return (
    <Card style={{ borderWidth: 2, borderColor: colors.gold, borderStyle: "dashed" }}>
      <Small style={{ color: colors.warnInk, fontWeight: "700" }}>開発用ダミー表示（実データではありません）</Small>
      <Small>
        範囲: {range} / 単価: {rate ?? "未設定"}円。実機では DeviceActivityReport 拡張がここに利用時間・円換算・アプリ別内訳
        {range === "week" ? "・日別棒グラフ（日〜土）" : ""}
        {range === "total" ? "・集計期間" : ""}を描画します。
      </Small>
    </Card>
  );
}

const s = StyleSheet.create({
  reportBox: { borderRadius: 14, overflow: "hidden", backgroundColor: colors.card },
});
