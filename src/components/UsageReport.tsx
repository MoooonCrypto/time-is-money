// The meter. With Screen Time access the report extension (SwiftUI) draws it with
// real data; usage never reaches JS. Without access we draw the same shape empty,
// never "0".
import { router } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { NativeUsageReportView, type UsageRange } from "../../modules/screen-time";
import { formatYen } from "../domain/money";
import { homeDataState, screenTimeAction } from "../domain/permissions";
import { screenTime } from "../native/screenTime";
import { useAppStore } from "../state/AppStore";
import { Button, HourRuler, T } from "../ui/components";
import { color, space } from "../ui/theme";

export const RANGE_OPTIONS: { value: UsageRange; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "total", label: "累計" },
];

/** Height reserved for the native report (it scrolls inside if longer). */
const REPORT_HEIGHT = { today: 520, week: 640, total: 560 } as const;

export function UsageReport({ range }: { range: UsageRange }) {
  const store = useAppStore();
  const state = homeDataState(store.screenTimeStatus);
  const rate = store.config.hourlyRateYen;

  if (state === "ready" && NativeUsageReportView && screenTime.kind === "native") {
    return (
      <View style={{ height: REPORT_HEIGHT[range], marginHorizontal: -space.screen }}>
        <NativeUsageReportView style={StyleSheet.absoluteFill} range={range} refreshToken={store.refreshToken} />
      </View>
    );
  }

  const action = screenTimeAction(store.screenTimeStatus, store.screenTimeRequestedThisSession);
  const message =
    state === "checking"
      ? "スクリーンタイムの状態を確認しています。"
      : state === "screenTimeUnavailable"
        ? "この端末では利用時間を取得できません。iPhoneでスクリーンタイムを許可すると表示されます。"
        : "スクリーンタイムを許可すると、使った時間をこの金額で表示します。";

  return (
    <View style={{ gap: space.l }} testID="meter-placeholder">
      <View>
        <T variant="display" color={color.tertiaryLabel} accessibilityLabel="金額は未取得">
          ¥ --
        </T>
        <T variant="subheadline" color={color.secondaryLabel}>
          {rate ? `1時間 ${formatYen(rate)}円で換算` : "1時間の価値が未設定です"}
        </T>
      </View>
      <HourRuler hours={null} />
      <T variant="subheadline" color={color.secondaryLabel}>
        {message}
      </T>
      {action.kind === "request" ? (
        <Button testID="request-screentime" title="スクリーンタイムを許可" onPress={() => void store.requestScreenTime()} />
      ) : action.kind === "openSettings" ? (
        <Button kind="secondary" title="許可の方法を見る" onPress={() => router.push("/permissions")} />
      ) : null}
    </View>
  );
}
