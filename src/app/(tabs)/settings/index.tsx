// 設定: hourly rate, permissions, about. (Frequent settings in-app, privacy in iOS Settings — HIG 8.6)
import Constants from "expo-constants";
import { router } from "expo-router";
import React from "react";

import { formatYen } from "../../../domain/money";
import { useAppStore } from "../../../state/AppStore";
import { Row, Section, StatusPill, TabScreen } from "../../../ui/components";
import { color } from "../../../ui/theme";

export default function SettingsScreen() {
  const store = useAppStore();
  const rate = store.config.hourlyRateYen;
  const st = store.screenTimeStatus;
  const nt = store.notificationStatus;

  const stPill =
    st === "approved" ? <StatusPill tone="success" icon="checkmark" label="許可済み" />
    : st === "checking" ? <StatusPill tone="neutral" icon="ellipsis" label="確認中" />
    : st === "unavailable" ? <StatusPill tone="neutral" icon="minus" label="利用不可" />
    : <StatusPill tone="warning" icon="exclamationmark" label="未許可" />;
  const ntPill =
    nt === "granted" || nt === "provisional" ? <StatusPill tone="success" icon="checkmark" label="オン" />
    : nt === "unavailable" ? <StatusPill tone="neutral" icon="minus" label="利用不可" />
    : <StatusPill tone="neutral" icon="bell.slash" label="オフ" />;

  return (
    <TabScreen title="設定">
      <Section header="換算" footer="実際の給与である必要はありません。統計と通知の金額はこの単価で計算します。">
        <Row
          testID="settings-rate"
          title="時間の単価"
          icon="yensign"
          iconBg={color.success}
          value={rate ? `${formatYen(rate)}円／時間` : "未設定"}
          chevron
          onPress={() => router.push("/rate")}
        />
      </Section>

      <Section header="アクセス許可">
        <Row
          testID="settings-screentime"
          title="スクリーンタイム"
          icon="hourglass"
          iconBg={color.accent}
          trailing={stPill}
          chevron
          onPress={() => router.push("/settings/permissions")}
        />
        <Row
          testID="settings-notifications"
          title="通知"
          icon="bell.badge.fill"
          iconBg={color.destructive}
          trailing={ntPill}
          chevron
          onPress={() => router.push("/settings/permissions")}
        />
      </Section>

      {__DEV__ ? (
        <Section header="開発">
          <Row title="開発用ツール" icon="hammer.fill" iconBg={color.gray} chevron onPress={() => router.push("/settings/dev")} />
        </Section>
      ) : null}

      <Section header="このアプリについて" footer="利用データは端末内だけで処理され、外部に送信されません。">
        <Row title="バージョン" icon="info.circle.fill" iconBg={color.info} value={Constants.expoConfig?.version ?? "1.0.0"} />
      </Section>
    </TabScreen>
  );
}
