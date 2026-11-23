import { ActionSheetIOS, Alert, Platform } from "react-native";

import { bulkUnlock, resumeLimits } from "../domain/rules";
import type { AppStore } from "../state/AppStore";
import { haptic } from "../ui/components";

/** Destructive confirmation as an action sheet (HIG), 1 tap + confirm. Rules are kept. */
export function confirmBulkUnlock(store: AppStore) {
  const message =
    "Time Is Money によるロックをすべて止めます。設定した制限は保存され、「制限」タブから再開できます。iPhone全体の集計と通知は続きます。";
  const run = () => {
    haptic.warning();
    void store.updateConfig((c) => bulkUnlock(c, new Date()));
  };
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: "全制限を一括解除しますか？", message, options: ["全制限を一括解除", "キャンセル"], destructiveButtonIndex: 0, cancelButtonIndex: 1 },
      (i) => i === 0 && run(),
    );
  } else {
    Alert.alert("全制限を一括解除しますか？", message, [
      { text: "キャンセル", style: "cancel" },
      { text: "一括解除", style: "destructive", onPress: run },
    ]);
  }
}

/** Explicit resume. Today's usage so far counts toward the limits (iOS 17.4+). */
export function confirmResume(store: AppStore) {
  const message = "今日すでに使った時間も上限に含めて判定します。上限を超えているアプリはすぐにロックされます。";
  const run = () => {
    haptic.success();
    void store.updateConfig((c) => resumeLimits(c, new Date()));
  };
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: "制限を再開しますか？", message, options: ["制限を再開", "キャンセル"], cancelButtonIndex: 1 },
      (i) => i === 0 && run(),
    );
  } else {
    Alert.alert("制限を再開しますか？", message, [
      { text: "キャンセル", style: "cancel" },
      { text: "再開", onPress: run },
    ]);
  }
}
