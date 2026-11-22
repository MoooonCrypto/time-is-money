import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { configureForegroundPresentation, routeForNotificationResponse } from "../native/notifications";
import { AppStoreProvider } from "../state/AppStore";

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
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerBackTitle: "戻る" }}>
          <Stack.Screen name="index" options={{ title: "Time Is Money" }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="stats" options={{ title: "統計" }} />
          <Stack.Screen name="rate" options={{ title: "時間の単価" }} />
          <Stack.Screen name="permissions" options={{ title: "権限" }} />
          <Stack.Screen name="limits/index" options={{ title: "制限設定" }} />
          <Stack.Screen name="limits/current" options={{ title: "現在の制限" }} />
          <Stack.Screen name="limits/edit" options={{ title: "制限の編集" }} />
          <Stack.Screen name="dev" options={{ title: "開発用" }} />
        </Stack>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
