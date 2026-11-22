import React from "react";
import { Linking } from "react-native";

import { notificationAction, screenTimeAction } from "../domain/permissions";
import { useAppStore } from "../state/AppStore";
import { Banner, Button, Small } from "./ui";

/** Shown when Screen Time access is missing. Usage is never displayed as 0 minutes. */
export function ScreenTimePermissionCard() {
  const store = useAppStore();
  const action = screenTimeAction(store.screenTimeStatus, store.screenTimeRequestedThisSession);
  if (action.kind === "none") return null;
  return (
    <Banner tone="warn" title="スクリーンタイムへのアクセスが必要です">
      <Small>
        アプリごとの利用上限、iPhone全体の利用時間の集計、円換算の通知に使います。許可されるまで利用時間は表示しません。
      </Small>
      {action.kind === "request" ? (
        <Button title={action.label} onPress={() => void store.requestScreenTime()} />
      ) : (
        <>
          <Small>{action.instructions}</Small>
          <Button title={action.label} onPress={() => void Linking.openSettings()} />
          <Button kind="ghost" title="もう一度確認する" onPress={() => void store.refresh()} />
        </>
      )}
    </Banner>
  );
}

/** Notifications are optional: limits and statistics keep working without them. */
export function NotificationPermissionCard({ compact }: { compact?: boolean }) {
  const store = useAppStore();
  const action = notificationAction(store.notificationStatus);
  if (action.kind === "none") return null;
  return (
    <Banner tone="info" title="通知がオフです">
      {!compact && (
        <Small>
          iPhone全体の利用が2時間・4時間…と達したときに、時給で換算した金額をお知らせします。通知がオフでも、アプリ制限と統計はそのまま使えます。
        </Small>
      )}
      {action.kind === "request" ? (
        <Button kind="secondary" title={action.label} onPress={() => void store.requestNotifications()} />
      ) : (
        <>
          <Small>{action.instructions}</Small>
          <Button kind="secondary" title={action.label} onPress={() => void Linking.openSettings()} />
        </>
      )}
    </Banner>
  );
}
