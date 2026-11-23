// Development-only tools. Not reachable in release builds (__DEV__ is false there),
// and native code ignores `debugShortThresholds` unless compiled with DEBUG.
import { Redirect } from "expo-router";
import React from "react";
import { Switch, View } from "react-native";

import { screenTime } from "../../../native/screenTime";
import { useAppStore } from "../../../state/AppStore";
import { Button, Notice, Row, Screen, Section, T } from "../../../ui/components";
import { color, space } from "../../../ui/theme";

export default function DevScreen() {
  const store = useAppStore();
  if (!__DEV__) return <Redirect href="/" />;
  const log = screenTime.getDiagnosticsLog().slice(-40).reverse();
  return (
    <Screen>
      <Notice tone="warning" icon="hammer.fill" title="Debugビルド専用" message="Releaseビルドでは表示されず、設定も無視されます。" />
      <Section header="しきい値" footer="iPhone全体の通知しきい値を「時間」→「分」に置き換えます（2分・4分…）。アプリ上限は編集画面で1〜3分を選べます。">
        <Row
          title="短いしきい値モード"
          icon="timer"
          iconBg={color.warning}
          trailing={
            <Switch
              value={store.config.debugShortThresholds === true}
              onValueChange={(v) => void store.updateConfig((c) => ({ ...c, debugShortThresholds: v || undefined }))}
            />
          }
        />
      </Section>
      <Section header="ネイティブ状態">
        <View style={{ padding: space.l, gap: space.xs }}>
          <T variant="caption1" color={color.secondaryLabel}>API: {screenTime.kind}</T>
          <T variant="caption1" color={color.secondaryLabel}>monitor: {JSON.stringify(store.monitorState)}</T>
          <T variant="caption1" color={color.secondaryLabel}>shields: {JSON.stringify(store.shieldRecords)}</T>
          <T variant="caption1" color={color.secondaryLabel}>lastSync: {JSON.stringify(store.lastSync)}</T>
        </View>
        <Row title="再同期" icon="arrow.clockwise" iconBg={color.info} onPress={() => void store.refresh()} />
      </Section>
      <Section header="拡張のログ（新しい順）">
        <View style={{ padding: space.l, gap: space.xs }}>
          {log.length === 0 ? <T variant="footnote" color={color.secondaryLabel}>ログなし</T> : null}
          {log.map((e, i) => (
            <T key={i} variant="caption1" color={color.secondaryLabel}>
              {new Date(e.at).toLocaleTimeString()} [{e.source}] {e.message}
            </T>
          ))}
        </View>
      </Section>
      <Button kind="destructive" title="オンボーディングをやり直す" onPress={() => void store.updateConfig((c) => ({ ...c, onboardingCompleted: false }))} />
    </Screen>
  );
}
