import React from "react";

import { PermissionCard } from "../../../components/Permissions";
import { useAppStore } from "../../../state/AppStore";
import { Button, Screen } from "../../../ui/components";

export default function PermissionsScreen() {
  const store = useAppStore();
  return (
    <Screen>
      <PermissionCard kind="screenTime" />
      <PermissionCard kind="notifications" />
      <Button kind="plain" compact title="状態を再確認" icon="arrow.clockwise" onPress={() => void store.refresh()} />
    </Screen>
  );
}
