// Permission UI. Screen Time and notifications are separate and each is
// explained in context right before its system dialog (HIG 9.1 / 9.2).
import React from "react";
import { Linking, View } from "react-native";

import { notificationAction, screenTimeAction } from "../domain/permissions";
import { useAppStore } from "../state/AppStore";
import { Button, Icon, Notice, StatusPill, T } from "../ui/components";
import { color, radius, space } from "../ui/theme";

export function useScreenTimeAction() {
  const store = useAppStore();
  return screenTimeAction(store.screenTimeStatus, store.screenTimeRequestedThisSession);
}

/** Card shown wherever usage would appear without access. Never shows "0分". */
export function ScreenTimeRequiredCard({ compact }: { compact?: boolean }) {
  const store = useAppStore();
  const action = useScreenTimeAction();
  if (action.kind === "none") return null;
  return (
    <Notice
      tone="warning"
      icon="hourglass"
      title="スクリーンタイムへのアクセスが必要です"
      message={
        compact
          ? "許可されるまで利用時間と制限は使えません。"
          : "アプリごとの利用上限と、iPhone全体の利用時間の集計・円換算に使います。許可されるまで利用時間は表示しません。"
      }
    >
      {action.kind === "request" ? (
        <Button
          testID="request-screentime"
          title={action.label}
          icon="checkmark.shield"
          onPress={() => void store.requestScreenTime()}
        />
      ) : (
        <>
          <T variant="footnote" color={color.secondaryLabel}>
            {action.instructions}
          </T>
          <Button title={action.label} icon="gear" onPress={() => void Linking.openSettings()} />
          <Button kind="plain" compact title="もう一度確認する" onPress={() => void store.refresh()} />
        </>
      )}
    </Notice>
  );
}

/** Permission card with explanation, status and the single action that applies. */
export function PermissionCard({ kind }: { kind: "screenTime" | "notifications" }) {
  const store = useAppStore();
  const isST = kind === "screenTime";
  const action = isST
    ? screenTimeAction(store.screenTimeStatus, store.screenTimeRequestedThisSession)
    : notificationAction(store.notificationStatus);
  const status = isST ? store.screenTimeStatus : store.notificationStatus;
  const granted = status === "approved" || status === "granted" || status === "provisional";
  const unavailable = status === "unavailable";

  return (
    <View
      style={{
        backgroundColor: color.card,
        borderRadius: radius.card,
        borderCurve: "continuous",
        padding: space.l,
        gap: space.m,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.m }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            borderCurve: "continuous",
            backgroundColor: isST ? color.accent : color.destructive,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name={isST ? "hourglass" : "bell.badge.fill"} size={22} tint="#FFFFFF" weight="semibold" />
        </View>
        <View style={{ flex: 1 }}>
          <T variant="headline">{isST ? "スクリーンタイム" : "通知"}</T>
          <T variant="footnote" color={color.secondaryLabel}>
            {isST ? "必須：制限と利用時間の集計" : "任意：円換算のお知らせ"}
          </T>
        </View>
        {granted ? (
          <StatusPill tone="success" icon="checkmark" label="許可済み" />
        ) : unavailable ? (
          <StatusPill tone="neutral" icon="minus" label="利用不可" />
        ) : status === "denied" ? (
          <StatusPill tone="destructive" icon="xmark" label="オフ" />
        ) : null}
      </View>

      <T variant="subheadline" color={color.secondaryLabel}>
        {isST
          ? "選んだアプリが1日の上限に達したらロックし、iPhone全体の利用時間を集計して円に換算します。利用データは端末の外に送信しません。"
          : "iPhone全体の今日の利用が2時間・4時間…に達したときだけ「今日は6,000円分／4時間をスマホに浪費しました。」とお知らせします。オフでも制限と統計は使えます。"}
      </T>

      {action.kind === "request" ? (
        <Button
          testID={isST ? "permission-screentime" : "permission-notifications"}
          kind={isST ? "filled" : "tinted"}
          title={isST ? "スクリーンタイムを許可" : "通知を許可"}
          onPress={() => void (isST ? store.requestScreenTime() : store.requestNotifications())}
        />
      ) : action.kind === "openSettings" ? (
        <>
          <T variant="footnote" color={color.secondaryLabel}>
            {action.instructions}
          </T>
          <Button kind="tinted" title="設定を開く" icon="gear" onPress={() => void Linking.openSettings()} />
        </>
      ) : null}
    </View>
  );
}
