// Development-only tools. Not reachable in release builds (__DEV__ is false there),
// and native code ignores `debugShortThresholds` unless compiled with DEBUG.
import { Redirect } from "expo-router";
import React from "react";
import { Switch, Text, View } from "react-native";

import { Banner, Button, Card, H2, Screen, Small } from "../components/ui";
import { screenTime } from "../native/screenTime";
import { useAppStore } from "../state/AppStore";

export default function DevScreen() {
  const store = useAppStore();
  if (!__DEV__) return <Redirect href="/" />;
  const log = screenTime.getDiagnosticsLog().slice(-40).reverse();
  return (
    <Screen>
      <Banner tone="warn" title="開発用ツール（Debugビルドのみ）" />
      <Card>
        <H2>短い閾値モード</H2>
        <Small>
          iPhone全体の通知閾値を「時間」→「分」に置き換えます（2分・4分…）。アプリ上限は編集画面で1〜3分(dev)を選べます。Releaseビルドでは無視されます。
        </Small>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Switch
            value={store.config.debugShortThresholds === true}
            onValueChange={(v) => void store.updateConfig((c) => ({ ...c, debugShortThresholds: v || undefined }))}
          />
          <Text>{store.config.debugShortThresholds ? "ON" : "OFF"}</Text>
        </View>
      </Card>
      <Card>
        <H2>ネイティブ状態</H2>
        <Small>API: {screenTime.kind}</Small>
        <Small>monitor: {JSON.stringify(store.monitorState)}</Small>
        <Small>shields: {JSON.stringify(store.shieldRecords)}</Small>
        <Small>lastSync: {JSON.stringify(store.lastSync)}</Small>
        <Button kind="secondary" title="再同期" onPress={() => void store.refresh()} />
      </Card>
      <Card>
        <H2>拡張のログ（新しい順）</H2>
        {log.length === 0 && <Small>ログなし</Small>}
        {log.map((e, i) => (
          <Small key={i}>
            {new Date(e.at).toLocaleTimeString()} [{e.source}] {e.message}
          </Small>
        ))}
      </Card>
      <Button
        kind="danger"
        title="オンボーディングをやり直す"
        onPress={() => void store.updateConfig((c) => ({ ...c, onboardingCompleted: false }))}
      />
    </Screen>
  );
}
