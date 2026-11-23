import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { configureForegroundPresentation, routeForNotificationResponse } from "../native/notifications";
import { AppStoreProvider } from "../state/AppStore";
import { headerOptions, sheetOptions } from "../ui/navigation";

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
        <StatusBar style="auto" />
        <Stack screenOptions={headerOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: "fade" }} />
          <Stack.Screen name="limit-editor" options={{ ...sheetOptions, title: "制限" }} />
          <Stack.Screen name="rate" options={{ ...sheetOptions, title: "時間の単価" }} />
          <Stack.Screen name="stats" options={{ title: "統計" }} />
        </Stack>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
