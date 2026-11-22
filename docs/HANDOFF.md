# 引き継ぎ・積み残しタスク

最終更新: 2026-11-22（クラウド作業セッション終了時点）
README.md の「3. 実装状況」「7. 実機で確認する順番」「9. クラウドで未検証のもの」とあわせて読んでください。

## なぜ Swift が未ビルドなのか

- クラウド環境（Linux コンテナ）には Swift ツールチェーンがなく、`download.swift.org` へのアクセスもネットワークポリシーで拒否される（403）。apt にも Swift コンパイラはない。
- 仮に Linux 版 Swift を入れられても、ビルドできるのは Foundation だけを使う `targets/_shared/TIMCore.swift`（`npm run test:swift-core`）に限られる。FamilyControls / DeviceActivity / ManagedSettings / SwiftUI / ExpoModulesCore を使う残りのコード（本体モジュールと4つの拡張）は **macOS + Xcode でしかビルドできない**。
- このため Swift の型チェック・コンパイル・実機動作はすべて Mac での作業になる。実施済みなのは tree-sitter による構文チェックだけ。

## 優先度 高：Mac で最初にやる（ブロッカー確認）

1. [ ] `npm install`、`.env.local` を作成（`TIM_BUNDLE_ID`、`APPLE_TEAM_ID`）
2. [ ] `npm run test:swift-core`：TIMCore のテスト。文面・日付・版管理が TS と一致すること
3. [ ] `npx expo prebuild --clean -p ios` → `pod install` が通ること。特に `modules/screen-time/ios/Shared/*.swift`（`targets/_shared` へのシンボリックリンク）が Pod に取り込まれること
4. [ ] `npx expo run:ios --device` で全ターゲットをコンパイルする。エラーが出やすい箇所の候補：
   - `TIMScheduler.makeEvent`：`DeviceActivityEvent` の初期化子（`includesPastActivity` は iOS 17.4+）
   - `TIMShieldController`：`ManagedSettingsStore.Name("…")` と `.specific(_:except:)`
   - `targets/report`：`DeviceActivityReportScene` への準拠、`DeviceActivityFilter(segment:users:devices:)`、`Label(token)`（FamilyControls）
   - `modules/screen-time/ios/TIMHostedViews.swift`：`ExpoView` サブクラスの init。`requireNativeView("TIMUsageReport")` と `requireNativeView("TIMSelectionLabel")` で表示されるか
   - Swift 6 の並行性チェックで警告やエラーが出たら、Pod 側は `swift_version 5.9`。拡張側は apple-targets 既定の `SWIFT_VERSION` を確認する
5. [ ] ビルド成果物に `TimeIsMoney.app/Extensions/TimeIsMoneyReport.appex`（ExtensionKit）と `PlugIns/` 配下の3つの `.appex` が入っていること
6. [ ] README §7 の実機チェックリストを上から順に実施する

コンパイルを通すための修正が必要になった場合は、正本（`targets/**`、`modules/screen-time/**`、`app.config.ts`、`patches/**`）を直す。`ios/` を手で編集しないこと。

## 実機で確かめる前提（設計上の仮定。外れたら要修正）

| 仮定 | 外れた場合の影響 | 確認方法 |
| --- | --- | --- |
| 対象を指定しない `DeviceActivityEvent` が iPhone 全体の利用を数える（Apple ドキュメントに記載あり） | 円換算通知が来ない、または即座に来る | `/dev` で短縮モードを有効にし、ログの `threshold tim.total/h2` を見る |
| `intervalDidStart` の中から `startMonitoring` を呼んで再登録できる（署名比較でループを防止） | 日付切替や曜日ルールが反映されない | 0時をまたいだあとのログに `sync/intervalDidStart registered=…` が出るか |
| `stopMonitoring` で `intervalDidEnd` が呼ばれても Shield は外さない設計で問題ない | — | 0時以外でロックが外れないこと |
| `includesPastActivity: true` で再開時に当日分が算入される | 再開後、上限を超えているのにロックされない | README §7-8 |
| 24h イベントの扱い（拒否された場合は除外して再登録） | — | `/dev` の monitor warnings に `total24hRejected` が出るか |
| Report 拡張から App Group の単価を読める | 統計に「単価未設定」と出る | 単価設定後に統計を開く |
| 拡張が投稿した通知のタップを expo-notifications が受け取る（識別子 `tim.usage.*` でルーティング） | タップしても統計が開かない | アプリ起動中と終了状態の両方で通知をタップ |
| 監視数の上限が「ルール15件＋全体1件」で収まる | `excessiveActivities` エラー | ルールを多数作成し、`/dev` の lastSync を確認 |
| Monitor / Shield 拡張がメモリ制限内に収まる（`_shared` に SwiftUI を入れない方針） | 拡張がクラッシュする | Xcode の Debug Navigator、端末ログ |
| iOS の既知の不具合（閾値イベントの早期発火・重複）を、経過時間チェックと重複防止で吸収できる | 誤ってロックされる、誤って通知される | ログの `ignored … implausible` と `duplicate` |

## 積み残し（未実装・改善）

- [ ] アプリアイコンとスプラッシュが Expo テンプレートのまま（`assets/`）
- [ ] Family Controls (Distribution) の申請：TestFlight 配布の前に、本体と4拡張の計5つの Bundle ID すべてで必要
- [ ] Swift 側の Scheduler / ShieldController に自動テストがない（ManagedSettings / DeviceActivity に依存するため、実機確認で代替している）
- [ ] 統計のアプリ別内訳はアプリだけ（Web ドメイン別の内訳は表示していない）
- [ ] 選択データ（`tim.selection.*`）の不要分削除は起動時だけ行う。編集をキャンセルした下書きは次回起動まで残る
- [ ] ダークモードは未対応（`userInterfaceStyle: "light"`）。アクセシビリティ（VoiceOver の読み上げ文言）も未確認
- [ ] 日本語のみ（ローカライズなし）
- [ ] apple-targets のパッチ（device-activity-report 型）は、upstream が対応したら削除する。apple-targets を更新する場合はパッチを作り直す
- [ ] 画面のスクリーンショット確認は未実施。必要なら `EXPO_PUBLIC_TIM_MOCK=1` の開発用モックで確認できる（Debug のみ）
- [ ] `.claude/settings.json` は create-expo-app テンプレート由来の設定（Expo プラグインの有効化）。不要なら削除してよい

## クラウドで実施済みの検証（2026-11-22）

typecheck、lint、Jest（7スイート・43テスト）、`expo export --platform ios`、`expo prebuild -p ios`（Linux）、モジュールの自動リンク解決、Swift の構文チェック（tree-sitter）。詳細は README §8。
