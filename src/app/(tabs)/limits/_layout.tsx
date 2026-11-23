import { Stack } from "expo-router";
import React from "react";

import { headerOptions } from "../../../ui/navigation";

export default function TabStack() {
  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
