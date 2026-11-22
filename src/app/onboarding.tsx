// First run: hourly rate -> Screen Time (explained before the OS dialog)
// -> notifications (explained before the OS dialog) -> optional first app limit.
import { router } from "expo-router";
import React, { useState } from "react";
import { Linking } from "react-native";

import { RateEditor } from "../components/RateEditor";
import { RuleEditor } from "../components/RuleEditor";
import { Banner, Button, Card, H1, P, Screen, Small } from "../components/ui";
import {
  NOTIFICATION_SETTINGS_INSTRUCTIONS,
  SCREEN_TIME_SETTINGS_INSTRUCTIONS,
} from "../domain/permissions";
import { useAppStore } from "../state/AppStore";

type Step = "welcome" | "rate" | "screenTime" | "notifications" | "firstLimit";

export default function Onboarding() {
  const store = useAppStore();
  const [step, setStep] = useState<Step>("welcome");
  const [stDeniedOnce, setStDeniedOnce] = useState(false);

  const finish = async () => {
    await store.updateConfig((c) => ({ ...c, onboardingCompleted: true }));
    router.replace("/");
  };

  if (step === "welcome") {
    return (
      <Screen edges={["top", "bottom"]}>
        <H1>Time Is Money</H1>
        <P>スマホに使った時間を、あなたの「時間の単価」で円に換算して見える化します。使いすぎたアプリは、決めた上限で今日だけロックします。</P>
        <Button title="はじめる" onPress={() => setStep("rate")} />
      </Screen>
    );
  }

  if (step === "rate") {
    return (
      <Screen edges={["top", "bottom"]}>
        <H1>あなたの1時間はいくら？</H1>
        <RateEditor
          initial={store.config.hourlyRateYen}
          submitLabel="次へ"
          onSubmit={async (rate) => {
            await store.updateConfig((c) => ({ ...c, hourlyRateYen: rate }));
            setStep("screenTime");
          }}
        />
      </Screen>
    );
  }

  if (step === "screenTime") {
    const st = store.screenTimeStatus;
    return (
      <Screen edges={["top", "bottom"]}>
        <H1>スクリーンタイムへのアクセス</H1>
        <Card>
          <P>次の画面で、iOSがスクリーンタイムへのアクセスを確認します。Time Is Money はこれを次のことだけに使います。</P>
          <Small>・選んだアプリの利用時間が上限に達したらロックする</Small>
          <Small>・iPhone全体の利用時間を集計し、円に換算して表示・通知する</Small>
          <Small>利用データは端末の外に送信しません。</Small>
        </Card>
        {st === "approved" && <Banner tone="ok" title="許可されました" />}
        {st === "unavailable" && (
          <Banner tone="info" title="この環境ではスクリーンタイムを利用できません">
            <Small>iPhoneの開発ビルドで動作します。このまま進めます。</Small>
          </Banner>
        )}
        {st === "denied" && (
          <Banner tone="warn" title="許可されていません">
            <Small>許可がないと、アプリ制限と利用時間の表示は使えません（0分とは表示しません）。</Small>
            {stDeniedOnce && <Small>{SCREEN_TIME_SETTINGS_INSTRUCTIONS}</Small>}
            {stDeniedOnce && <Button kind="secondary" title="設定を開く" onPress={() => void Linking.openSettings()} />}
          </Banner>
        )}
        {st !== "approved" && st !== "unavailable" && (
          <Button
            title={st === "denied" ? "もう一度許可を求める" : "続ける（許可画面へ）"}
            onPress={async () => {
              const s = await store.requestScreenTime();
              if (s === "denied") setStDeniedOnce(true);
              else if (s === "approved") setStep("notifications");
            }}
          />
        )}
        <Button
          kind={st === "approved" || st === "unavailable" ? "primary" : "ghost"}
          title={st === "approved" || st === "unavailable" ? "次へ" : "あとで設定する"}
          onPress={() => setStep("notifications")}
        />
      </Screen>
    );
  }

  if (step === "notifications") {
    const nt = store.notificationStatus;
    return (
      <Screen edges={["top", "bottom"]}>
        <H1>通知</H1>
        <Card>
          <P>次の画面で、iOSが通知の許可を確認します。</P>
          <Small>
            iPhone全体の今日の利用が2時間・4時間・6時間…に達したときだけ、「今日は6,000円分／4時間をスマホに浪費しました。」のようにお知らせします。
          </Small>
          <Small>通知を許可しなくても、アプリ制限と統計は使えます。</Small>
        </Card>
        {nt === "denied" && (
          <Banner tone="info" title="通知はオフです">
            <Small>{NOTIFICATION_SETTINGS_INSTRUCTIONS}</Small>
          </Banner>
        )}
        {nt === "undetermined" && (
          <Button
            title="続ける（許可画面へ）"
            onPress={async () => {
              await store.requestNotifications();
              setStep("firstLimit");
            }}
          />
        )}
        <Button
          kind={nt === "undetermined" ? "ghost" : "primary"}
          title={nt === "undetermined" ? "通知なしで進む" : "次へ"}
          onPress={() => setStep("firstLimit")}
        />
      </Screen>
    );
  }

  // firstLimit
  const canLimit = store.screenTimeStatus === "approved" || store.screenTimeStatus === "unavailable";
  return (
    <Screen edges={["top", "bottom"]}>
      <H1>アプリの上限を決める</H1>
      <P>使いすぎたくないアプリを選び、1日の上限を決めましょう。あとから追加・変更もできます。</P>
      {store.screenTimeStatus === "approved" ? (
        <RuleEditor
          config={store.config}
          ruleId={null}
          saveLabel="この制限で始める"
          onSave={async (result) => {
            await store.updateConfig(() => ({ ...result.config, onboardingCompleted: true }));
            router.replace("/");
          }}
        />
      ) : (
        <Banner tone="warn" title="スクリーンタイムの許可が必要です">
          <Small>アプリの制限は、スクリーンタイムへのアクセスを許可したあとで「制限設定」から追加できます。</Small>
        </Banner>
      )}
      <Button kind={canLimit ? "ghost" : "primary"} title="あとで設定する" onPress={() => void finish()} />
    </Screen>
  );
}
