import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { configureForegroundPresentation, routeForNotificationResponse } from "../native/notifications";
import { AppStoreProvider } from "../state/AppStore";
import { useHeaderOptions } from "../ui/navigation";

configureForegroundPresentation();

/** Tapping a usage notification opens today's statistics (cold start and running app). */
function useNotificationRouting() {
  useEffect(() => {
    let handled: string | null = null;
    const go = (response: Notifications.NotificationResponse | null) => {
      const route = routeForNotificationResponse(response);
      const id = response?.notification.request.identifier ?? null;
      if (!route || id === handled) return;
      handled = id;
      router.push(route as never);
    };
    void Notifications.getLastNotificationResponseAsync().then(go).catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  useNotificationRouting();
  const plain = useHeaderOptions("plain");
  const grouped = useHeaderOptions("grouped");
  const sheet = useHeaderOptions("sheet");
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={plain}>
          <Stack.Screen name="index" options={{ headerShown: false, title: "今日" }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: "fade" }} />
          <Stack.Screen name="limits" options={{ title: "制限" }} />
          <Stack.Screen name="settings" options={{ ...grouped, title: "設定" }} />
          <Stack.Screen name="permissions" options={{ ...grouped, title: "アクセス許可" }} />
          <Stack.Screen name="dev" options={{ ...grouped, title: "開発用" }} />
          <Stack.Screen name="stats" options={{ title: "統計" }} />
          <Stack.Screen name="limit-editor" options={{ ...sheet, title: "制限" }} />
          <Stack.Screen name="rate" options={{ ...sheet, title: "1時間の価値" }} />
        </Stack>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
