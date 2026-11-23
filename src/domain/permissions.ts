// Screen Time (FamilyControls) and notification permissions are independent.
// Notification denial never blocks limits/statistics.

/** "checking" = not read yet (the native read is asynchronous). */
export type ScreenTimeStatus = "checking" | "notDetermined" | "denied" | "approved" | "unavailable";
export type NotificationStatus = "undetermined" | "denied" | "granted" | "provisional" | "unavailable";

export type PermissionAction =
  | { kind: "none" }
  | { kind: "request"; label: string }
  | { kind: "openSettings"; label: string; instructions: string };

export const SCREEN_TIME_SETTINGS_INSTRUCTIONS =
  "設定アプリ →「スクリーンタイム」→「スクリーンタイムへのアクセスを許可されたApp」（または「アプリとWebサイトのアクティビティ」）で Time Is Money をオンにしてから、このアプリに戻ってください。";

export const NOTIFICATION_SETTINGS_INSTRUCTIONS =
  "設定アプリ →「通知」→「Time Is Money」で「通知を許可」をオンにしてから、このアプリに戻ってください。";

/**
 * FamilyControls individual authorization can be requested again after a
 * denial; if the dialog does not appear (or it was revoked in Settings) the
 * user has to change it in Settings. `requestedThisSession` lets the UI switch
 * to the Settings guidance after a re-request that stayed denied.
 */
export function screenTimeAction(status: ScreenTimeStatus, requestedThisSession: boolean): PermissionAction {
  switch (status) {
    case "approved":
    case "unavailable":
    case "checking":
      return { kind: "none" };
    case "notDetermined":
      return { kind: "request", label: "スクリーンタイムへのアクセスを許可" };
    case "denied":
      return requestedThisSession
        ? { kind: "openSettings", label: "設定を開く", instructions: SCREEN_TIME_SETTINGS_INSTRUCTIONS }
        : { kind: "request", label: "もう一度許可を求める" };
  }
}

/** iOS shows the notification dialog only once; afterwards only Settings can change it. */
export function notificationAction(status: NotificationStatus): PermissionAction {
  switch (status) {
    case "granted":
    case "provisional":
    case "unavailable":
      return { kind: "none" };
    case "undetermined":
      return { kind: "request", label: "通知を許可" };
    case "denied":
      return { kind: "openSettings", label: "設定を開く", instructions: NOTIFICATION_SETTINGS_INSTRUCTIONS };
  }
}

export type HomeDataState =
  | "screenTimeUnavailable" // not iOS / native module missing
  | "checking" // status not read yet: show a placeholder, never "0分" or a permission prompt
  | "needsScreenTimePermission"
  | "ready";

export function homeDataState(status: ScreenTimeStatus): HomeDataState {
  if (status === "checking") return "checking";
  if (status === "unavailable") return "screenTimeUnavailable";
  if (status !== "approved") return "needsScreenTimePermission";
  return "ready";
}
