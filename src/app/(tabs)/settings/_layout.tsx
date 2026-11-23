import { Stack } from "expo-router";
import React from "react";

import { useHeaderOptions } from "../../../ui/navigation";

export default function TabStack() {
  const headerOptions = useHeaderOptions("push");
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="permissions" options={{ title: "アクセス許可" }} />
      <Stack.Screen name="dev" options={{ title: "開発用ツール" }} />
    </Stack>
  );
}
