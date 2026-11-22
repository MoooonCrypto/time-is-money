import { router } from "expo-router";
import React from "react";

import { RateEditor } from "../components/RateEditor";
import { Screen, Small } from "../components/ui";
import { useAppStore } from "../state/AppStore";

export default function RateScreen() {
  const store = useAppStore();
  return (
    <Screen>
      <RateEditor
        initial={store.config.hourlyRateYen}
        submitLabel="保存"
        onSubmit={async (rate) => {
          await store.updateConfig((c) => ({ ...c, hourlyRateYen: rate }));
          router.back();
        }}
      />
      <Small>統計と通知の円換算は、過去の分も含めて現在の単価で計算されます。</Small>
    </Screen>
  );
}
