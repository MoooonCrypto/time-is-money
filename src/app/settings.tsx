import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";

import { formatYen } from "../domain/money";
import { useAppStore } from "../state/AppStore";
import { Row, Screen, Section } from "../ui/components";

export default function SettingsScreen() {
  const store = useAppStore();
  const rate = store.config.hourlyRateYen;
  const st = store.screenTimeStatus;
  const nt = store.notificationStatus;
  const stLabel = st === "approved" ? "許可済み" : st === "checking" ? "確認中" : st === "unavailable" ? "利用不可" : "未許可";
  const ntLabel = nt === "granted" || nt === "provisional" ? "オン" : nt === "unavailable" ? "利用不可" : "オフ";

  return (
    <Screen grouped>
      <Section inset footer="金額はすべてこの値で計算します。実際の時給でなくてかまいません。">
        <Row inset testID="settings-rate" title="1時間の価値" value={rate ? `${formatYen(rate)}円` : "未設定"} chevron onPress={() => router.push("/rate")} />
      </Section>
      <Section inset title="アクセス">
        <Row inset testID="settings-screentime" title="スクリーンタイム" value={stLabel} chevron onPress={() => router.push("/permissions")} />
        <Row inset testID="settings-notifications" title="お知らせ" value={ntLabel} chevron onPress={() => router.push("/permissions")} />
      </Section>
      {__DEV__ ? (
        <Section inset title="開発">
          <Row inset title="開発用ツール" chevron onPress={() => router.push("/dev")} />
        </Section>
      ) : null}
      <Section inset footer="利用データは端末の中だけで処理します。">
        <Row inset title="バージョン" value={Constants.expoConfig?.version ?? "1.0.0"} />
      </Section>
    </Screen>
  );
}
