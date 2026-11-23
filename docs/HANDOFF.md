# 引き継ぎ・積み残しタスク

最終更新: 2026-11-22（GitHub Actions による macOS ビルドと UI テストの導入後）
README.md の「3. 実装状況」「7. 実機で確認する順番」「9. クラウドで未検証のもの」とあわせて読んでください。

## ビルド検証の状況

- クラウドの Linux コンテナでは Swift をビルドできない。macOS のビルドは GitHub Actions（`.github/workflows/ios-ci.yml`）で行い、全 Swift ターゲットの Simulator 向けビルドは run 1〜11 ですべて成功した。
- **CI は現在「手動実行のみ」**（シミュレータ段階の失敗が続いたため、依頼により push での自動実行を停止）。Actions タブ →「iOS CI」→「Run workflow」で実行する。
- 最後に画面まで確認できたのは run 11（ライトの 01〜10、ダークの全画面）。それ以降の修正は、コード検証だけ通した状態で未確認：
  - ダークモードでシートのヘッダー色が明るいままになる問題（`src/ui/navigation.ts` の `useHeaderOptions`）
  - 編集カード内の区切り線
  - 権限がないときの「制限を追加」ボタン無効化
  - Maestro で編集シートの表示を待つステップ（`extendedWaitUntil`）
- 起動時の白画面の原因は、Screen Time の認可状態を JS スレッドで同期的に読んでいたこと（XPC が止まる）。非同期化で解消済み。**ネイティブの同期 API を描画中に呼ばないこと。**

### CI の運用メモ
- 手動実行のみ。1回あたり約35〜40分（xcodebuild 約15分、シミュレータ起動 約10分）。
- CI が `ci-results: …[skip ci]` コミットをブランチへ push するので、作業前に `git pull` すること。
- Maestro の iOS ドライバが起動待ちでタイムアウトすることがある → 待ち時間を延長し、暖機と1回の再試行を入れてある。
- `takeScreenshot` は相対名で指定する（絶対パスは Maestro が拒否する）。`appId` は直接書く（`${APP_ID}` は展開されなかった）。
- 成果物の zip（動画）は Actions の画面からダウンロードする（クラウドのサンドボックスからは blob ストレージに届かない）。
- このセッションの GitHub 連携は Actions を読むことはできるが、手動実行や再実行の API は 403 になる。CI を回すには push するしかない（`ci-results/**` と `*.md` だけの変更では起動しない）。
- 新しいシミュレータでの初回起動は詰まることがあるので、Maestro の前にアプリを1回起動して待つ手順（暖機起動、`00-warmup-launch.jpg`）を入れてある。

## 優先度 高：Mac で最初にやる

1. [ ] `npm install`、`.env.local` を作成（`TIM_BUNDLE_ID`、`APPLE_TEAM_ID`）
2. [x] ~~`npm run test:swift-core`~~（CI で成功）
3. [x] ~~prebuild / pod install / 全ターゲットのコンパイル~~（CI で成功。ただし署名なし）
4. [ ] `npx expo run:ios --device`：**署名付き**（Family Controls / App Groups）でビルドとインストールが通ること
5. [ ] README §7 の実機チェックリストを上から順に実施する

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

- [ ] CI を1回手動実行し、最終修正（ダークのシートヘッダーなど）を画面で確認する
- [ ] 実機で新 UI のレイアウト・ダークモード・Dynamic Type（大きい文字サイズ）を目視確認する

- [ ] アプリアイコンとスプラッシュが Expo テンプレートのまま（`assets/`）
- [ ] Family Controls (Distribution) の申請：TestFlight 配布の前に、本体と4拡張の計5つの Bundle ID すべてで必要
- [ ] Swift 側の Scheduler / ShieldController に自動テストがない（ManagedSettings / DeviceActivity に依存するため、実機確認で代替している）
- [ ] 統計のアプリ別内訳はアプリだけ（Web ドメイン別の内訳は表示していない）
- [ ] 選択データ（`tim.selection.*`）の不要分削除は起動時だけ行う。編集をキャンセルした下書きは次回起動まで残る
- [ ] ダークモードは未対応（`userInterfaceStyle: "light"`）。アクセシビリティ（VoiceOver の読み上げ文言）も未確認
- [ ] 日本語のみ（ローカライズなし）
- [ ] apple-targets のパッチ（device-activity-report 型）は、upstream が対応したら削除する。apple-targets を更新する場合はパッチを作り直す
- [ ] UI テストは権限なしの経路だけ。ルール編集画面などは Screen Time 認可が必要なので、シミュレータでは届かない（Debug ビルド + `EXPO_PUBLIC_TIM_MOCK=1` で Maestro を回す案あり）
- [x] ヘッダー下に入り込む不具合：不透明ヘッダーで修正し、run 7 で確認
- [x] 白画面（run 5・6・9）の原因は ScrollView ではなく、認可状態の同期読み込み（上記）だった
- [ ] 実機でも全画面のレイアウトを目視確認する
- [ ] `.claude/settings.json` は create-expo-app テンプレート由来の設定（Expo プラグインの有効化）。不要なら削除してよい

## 実施済みの検証（2026-11-22）

- クラウド：typecheck、lint、Jest（7スイート・43テスト）、`expo export --platform ios`、`expo prebuild -p ios`（Linux）、autolinking の解決、Swift の構文チェック（tree-sitter）
- GitHub Actions（macOS）：TIMCore テスト、prebuild + pod install、xcodebuild（全ターゲット）、拡張の埋め込み確認、Maestro UI テスト（スクリーンショット 10枚）。詳細は README §8
