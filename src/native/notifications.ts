// Notification permission + tap handling. The notifications themselves are
// posted by the DeviceActivityMonitor extension (Swift), not from JS.
import * as Notifications from "expo-notifications";
import { IosAuthorizationStatus } from "expo-notifications";
import { Platform } from "react-native";

import type { NotificationStatus } from "../domain/permissions";

export const USAGE_NOTIFICATION_PREFIX = "tim.usage.";

export function configureForegroundPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function mapStatus(p: Notifications.NotificationPermissionsStatus): NotificationStatus {
  if (Platform.OS === "ios" && p.ios) {
    switch (p.ios.status) {
      case IosAuthorizationStatus.PROVISIONAL:
      case IosAuthorizationStatus.EPHEMERAL:
        return "provisional";
      case IosAuthorizationStatus.AUTHORIZED:
        return "granted";
      case IosAuthorizationStatus.DENIED:
        return "denied";
      default:
        return "undetermined";
    }
  }
  if (p.granted) return "granted";
  return p.status === "denied" ? "denied" : "undetermined";
}

export async function getNotificationStatus(): Promise<NotificationStatus> {
  if (Platform.OS === "web") return "unavailable";
  try {
    return mapStatus(await Notifications.getPermissionsAsync());
  } catch {
    return "unavailable";
  }
}

export async function requestNotificationPermission(): Promise<NotificationStatus> {
  if (Platform.OS === "web") return "unavailable";
  return mapStatus(
    await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }),
  );
}

/** Route to open for a tapped notification, or null if it is not ours. */
export function routeForNotificationResponse(response: Notifications.NotificationResponse | null): string | null {
  if (!response) return null;
  const req = response.notification.request;
  if (req.identifier.startsWith(USAGE_NOTIFICATION_PREFIX)) return "/stats?range=today";
  const data = req.content.data as Record<string, unknown> | undefined;
  if (data && data.type === "usageThreshold") return "/stats?range=today";
  return null;
}
