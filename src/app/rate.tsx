import { router, Stack } from "expo-router";
import React from "react";
import { Pressable } from "react-native";

import { RateEditor, useRateInput } from "../components/RateEditor";
import { useAppStore } from "../state/AppStore";
import { Button, haptic, Screen, T } from "../ui/components";
import { color } from "../ui/theme";

export default function RateSheet() {
  const store = useAppStore();
  const input = useRateInput(store.config.hourlyRateYen);
  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={10}>
              <T variant="body" color={color.accent}>
                キャンセル
              </T>
            </Pressable>
          ),
        }}
      />
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
        <RateEditor input={input} />
      </Screen>
    </>
  );
}
