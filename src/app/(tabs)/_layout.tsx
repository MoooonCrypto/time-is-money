// Tab bar for the three top-level sections (HIG 2.1) with SF Symbols.
import { NativeTabs } from "expo-router/native-tabs";
import React from "react";

import { color } from "../../ui/theme";

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={color.accent}>
      <NativeTabs.Trigger name="(home)" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>ホーム</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "yensign.circle", selected: "yensign.circle.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="limits" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>制限</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "hourglass", selected: "hourglass" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>設定</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
