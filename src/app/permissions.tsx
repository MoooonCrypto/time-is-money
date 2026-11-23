import React from "react";
import { View } from "react-native";

import { PermissionBlock } from "../components/Permissions";
import { useAppStore } from "../state/AppStore";
import { Button, Screen } from "../ui/components";
import { color, radius, space } from "../ui/theme";

export default function PermissionsScreen() {
  const store = useAppStore();
  return (
    <Screen grouped>
      {(["screenTime", "notifications"] as const).map((k) => (
        <View key={k} style={{ backgroundColor: color.groupedRow, borderRadius: radius.group, borderCurve: "continuous", padding: space.l }}>
          <PermissionBlock kind={k} />
        </View>
      ))}
      <Button kind="text" title="状態を再確認" onPress={() => void store.refresh()} />
    </Screen>
  );
}
