import React from "react";

import { NotificationPermissionCard, ScreenTimePermissionCard } from "../components/PermissionCards";
import { Banner, Button, Screen, Small } from "../components/ui";
import { useAppStore } from "../state/AppStore";

export default function PermissionsScreen() {
  const store = useAppStore();
  const st = store.screenTimeStatus;
  const nt = store.notificationStatus;
  return (
    <Screen>
      {st === "approved" && <Banner tone="ok" title="スクリーンタイム：許可済み" />}
      {st === "unavailable" && (
        <Banner tone="info" title="スクリーンタイム：この環境では利用できません">
          <Small>iPhone（iOS 16.4以降）の開発ビルドで動作します。</Small>
        </Banner>
      )}
      <ScreenTimePermissionCard />
      {(nt === "granted" || nt === "provisional") && <Banner tone="ok" title="通知：許可済み" />}
      <NotificationPermissionCard />
      <Button kind="ghost" title="状態を再確認" onPress={() => void store.refresh()} />
    </Screen>
  );
}
