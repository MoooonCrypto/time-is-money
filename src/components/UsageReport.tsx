// Hosts the DeviceActivityReport rendered by the report extension (SwiftUI).
// Usage numbers never reach JS; this only picks the range and handles the
// states where the report cannot be shown.
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { NativeUsageReportView, type UsageRange } from "../../modules/screen-time";
import { homeDataState } from "../domain/permissions";
import { screenTime } from "../native/screenTime";
import { useAppStore } from "../state/AppStore";
import { Notice, T } from "../ui/components";
import { color, radius, space } from "../ui/theme";
import { ScreenTimeRequiredCard } from "./Permissions";

export const RANGE_OPTIONS: { value: UsageRange; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "total", label: "累計" },
];

/** Height reserved for the native report (it scrolls inside if longer). */
const REPORT_HEIGHT = { today: 560, week: 720, total: 600 } as const;

export function UsageReport({ range }: { range: UsageRange }) {
  const store = useAppStore();
  const state = homeDataState(store.screenTimeStatus);

  if (screenTime.kind === "mock") return <DevMockReport range={range} />;
  if (state === "screenTimeUnavailable" || !NativeUsageReportView) {
    return (
      <Notice
        tone="neutral"
        icon="iphone.slash"
        title="この環境では利用時間を取得できません"
        message="iPhoneの開発ビルドでスクリーンタイムを許可すると表示されます。"
      />
    );
  }
  if (state === "checking") {
    return (
      <View style={[s.report, s.checking]} accessibilityLabel="利用データを確認中">
        <ActivityIndicator />
        <T variant="footnote" color={color.secondaryLabel}>
          スクリーンタイムの状態を確認中…
        </T>
      </View>
    );
  }
  if (state === "needsScreenTimePermission") return <ScreenTimeRequiredCard />;
  return (
    <View style={[s.report, { height: REPORT_HEIGHT[range] }]}>
      <NativeUsageReportView style={StyleSheet.absoluteFill} range={range} refreshToken={store.refreshToken} />
    </View>
  );
}

/** Development-only placeholder (EXPO_PUBLIC_TIM_MOCK=1). Clearly labelled; never in release builds. */
function DevMockReport({ range }: { range: UsageRange }) {
  return (
    <View style={[s.report, { padding: space.l, gap: space.s, borderWidth: 1, borderColor: color.warning, borderStyle: "dashed" }]}>
      <T variant="footnote" color={color.warning} weight="600">
        開発用ダミー表示（実データではありません）
      </T>
      <T variant="subheadline" color={color.secondaryLabel}>
        実機では DeviceActivityReport 拡張がここに「{range}」の利用時間・円換算・アプリ別内訳を描画します。
      </T>
    </View>
  );
}

const s = StyleSheet.create({
  checking: { height: 160, alignItems: "center", justifyContent: "center", gap: space.s, backgroundColor: color.card },
  report: {
    borderRadius: radius.card,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: color.background,
  },
});
