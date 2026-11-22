import React from "react";
import { Alert } from "react-native";

import { bulkUnlock, resumeLimits } from "../domain/rules";
import { useAppStore } from "../state/AppStore";
import { Button } from "./ui";

/** 1 tap (+ confirmation) stops every Time Is Money limit. Rules are kept. */
export function BulkUnlockButton() {
  const store = useAppStore();
  if (store.config.bulkUnlock.active) return null;
  return (
    <Button
      testID="bulk-unlock"
      kind="danger"
      title="全制限を一括解除"
      onPress={() =>
        Alert.alert(
          "全制限を一括解除しますか？",
          "Time Is Money によるロックをすべて止めます。設定した制限は保存され、「制限設定」からいつでも再開できます。iPhone全体の利用時間の集計と通知は続きます。",
          [
            { text: "キャンセル", style: "cancel" },
            {
              text: "一括解除",
              style: "destructive",
              onPress: () => void store.updateConfig((c) => bulkUnlock(c, new Date())),
            },
          ],
        )
      }
    />
  );
}

/** Explicit resume from 制限設定. Today's usage so far counts toward the limits (iOS 17.4+). */
export function ResumeLimitsButton() {
  const store = useAppStore();
  if (!store.config.bulkUnlock.active) return null;
  return (
    <Button
      testID="resume-limits"
      title="制限を再開"
      onPress={() =>
        Alert.alert(
          "制限を再開しますか？",
          "今日すでに使った時間も上限に含めて判定します。上限を超えているアプリはすぐにロックされます。",
          [
            { text: "キャンセル", style: "cancel" },
            { text: "再開", onPress: () => void store.updateConfig((c) => resumeLimits(c, new Date())) },
          ],
        )
      }
    />
  );
}
