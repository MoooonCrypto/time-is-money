// Development-only tools. Not reachable in release builds (__DEV__ is false there),
// and native code ignores `debugShortThresholds` unless compiled with DEBUG.
import { Redirect } from "expo-router";
import React from "react";
import { Switch, View } from "react-native";

import { screenTime } from "../native/screenTime";
import { useAppStore } from "../state/AppStore";
import { Button, Row, Screen, Section, T } from "../ui/components";
import { color, space } from "../ui/theme";

export default function DevScreen() {
  const store = useAppStore();
  if (!__DEV__) return <Redirect href="/" />;
  const log = screenTime.getDiagnosticsLog().slice(-40).reverse();
  return (
    <Screen grouped>
      <Section inset footer="全体のお知らせの区切りを時間から分に置き換えます（2分、4分…）。アプリの上限は編集画面で1〜3分を選べます。Releaseビルドでは無視されます。">
        <Row
          inset
          title="短い区切りで試す"
          trailing={
            <Switch
              value={store.config.debugShortThresholds === true}
              onValueChange={(v) => void store.updateConfig((c) => ({ ...c, debugShortThresholds: v || undefined }))}
            />
          }
        />
      </Section>
      <Section inset title="ネイティブ状態">
        <View style={{ padding: space.l, gap: space.xs }}>
          <T variant="caption" color={color.secondaryLabel}>API: {screenTime.kind}</T>
          <T variant="caption" color={color.secondaryLabel}>monitor: {JSON.stringify(store.monitorState)}</T>
          <T variant="caption" color={color.secondaryLabel}>shields: {JSON.stringify(store.shieldRecords)}</T>
          <T variant="caption" color={color.secondaryLabel}>lastSync: {JSON.stringify(store.lastSync)}</T>
        </View>
        <Row inset title="再同期" accent onPress={() => void store.refresh()} />
      </Section>
      <Section inset title="拡張のログ（新しい順）">
        <View style={{ padding: space.l, gap: space.xs }}>
          {log.length === 0 ? <T variant="footnote" color={color.secondaryLabel}>ログなし</T> : null}
          {log.map((e, i) => (
            <T key={i} variant="caption" color={color.secondaryLabel}>
              {new Date(e.at).toLocaleTimeString()} [{e.source}] {e.message}
            </T>
          ))}
        </View>
      </Section>
      <Button kind="destructiveText" title="オンボーディングをやり直す" onPress={() => void store.updateConfig((c) => ({ ...c, onboardingCompleted: false }))} />
    </Screen>
  );
}
