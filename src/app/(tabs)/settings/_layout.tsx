import { Stack } from "expo-router";
import React from "react";

import { headerOptions } from "../../../ui/navigation";

export default function TabStack() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="permissions" options={{ title: "アクセス許可" }} />
      <Stack.Screen name="dev" options={{ title: "開発用ツール" }} />
    </Stack>
  );
}
