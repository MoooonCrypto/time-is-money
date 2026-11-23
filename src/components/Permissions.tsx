// Permission primes: each explained in one line right before its system dialog.
import React from "react";
import { Linking, View } from "react-native";

import { notificationAction, screenTimeAction } from "../domain/permissions";
import { useAppStore } from "../state/AppStore";
import { Button, StateLabel, T } from "../ui/components";
import { color, space } from "../ui/theme";

export function PermissionBlock({ kind }: { kind: "screenTime" | "notifications" }) {
  const store = useAppStore();
  const isST = kind === "screenTime";
  const action = isST
    ? screenTimeAction(store.screenTimeStatus, store.screenTimeRequestedThisSession)
    : notificationAction(store.notificationStatus);
  const status = isST ? store.screenTimeStatus : store.notificationStatus;
  const granted = status === "approved" || status === "granted" || status === "provisional";

  return (
    <View style={{ gap: space.s }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
        <T variant="headline" style={{ flex: 1 }}>
          {isST ? "スクリーンタイム" : "通知"}
        </T>
        {granted ? (
          <StateLabel tone="ok" icon="checkmark" label="許可済み" />
        ) : status === "checking" ? (
          <StateLabel tone="quiet" label="確認中" />
        ) : status === "denied" ? (
          <StateLabel tone="quiet" label="オフ" />
        ) : null}
      </View>
      <T variant="subheadline" color={color.secondaryLabel}>
        {isST
          ? "アプリごとの上限でロックし、iPhone全体の利用時間を集計します。データは端末の外に出ません。"
          : "今日の利用が2時間、4時間と区切りを超えたときだけ、金額でお知らせします。オフでも他の機能は使えます。"}
      </T>
      {action.kind === "request" ? (
        <Button
          testID={isST ? "permission-screentime" : "permission-notifications"}
          kind={isST ? "primary" : "secondary"}
          title={isST ? "スクリーンタイムを許可" : "通知を許可"}
          onPress={() => void (isST ? store.requestScreenTime() : store.requestNotifications())}
        />
      ) : action.kind === "openSettings" ? (
        <>
          <T variant="footnote" color={color.secondaryLabel}>
            {action.instructions}
          </T>
          <Button kind="secondary" title="設定アプリを開く" onPress={() => void Linking.openSettings()} />
        </>
      ) : null}
    </View>
  );
}
