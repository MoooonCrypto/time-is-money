import { router, Stack } from "expo-router";
import React from "react";

import { RateEditor, useRateInput } from "../components/RateEditor";
import { useAppStore } from "../state/AppStore";
import { Button, haptic, HeaderAction, Screen } from "../ui/components";

export default function RateSheet() {
  const store = useAppStore();
  const input = useRateInput(store.config.hourlyRateYen);
  return (
    <>
      <Stack.Screen options={{ headerLeft: () => <HeaderAction label="キャンセル" onPress={() => router.back()} /> }} />
      <Screen
        footer={
          <Button
            testID="rate-submit"
            title="保存"
            disabled={!input.parsed.ok}
            onPress={async () => {
              if (!input.parsed.ok) return;
              const rate = input.parsed.value;
              haptic.success();
              await store.updateConfig((c) => ({ ...c, hourlyRateYen: rate }));
              router.back();
            }}
          />
        }
      >
        <RateEditor input={input} autoFocus />
      </Screen>
    </>
  );
}
