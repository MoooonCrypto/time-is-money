# Time Is Money（iOS）

スマホの利用時間を「自分の時間の単価（円／時間）」で円に換算して見える化し、アプリごとに決めた1日の上限で今日だけロックする iOS アプリです。

- Expo SDK 58 / React Native 0.88 / Expo Router（画面・フォーム・設定ロジックは TypeScript）
- **Expo dev client 前提**（Expo Go では動きません）
- Screen Time API（FamilyControls / DeviceActivity / ManagedSettings）と各拡張は Swift
- 設定は端末内（App Group の UserDefaults）にのみ保存。アカウント・バックエンド・課金・ウィジェットはなし

このREADMEだけで、会話ログを読まずに Mac で再開できるように書いています。

---

## 0. Macで最初にやること（要約）

```bash
git clone <repo> && cd time-is-money
git checkout claude/kind-fermat-30o1am
npm install                      # postinstall で patches/ が適用される
cp .env.example .env.local       # TIM_BUNDLE_ID と APPLE_TEAM_ID を自分の値に
npm run test:swift-core          # Swiftの共有ロジック単体テスト（クラウドでは未実行）
npx expo prebuild --clean -p ios # ios/ を生成（ios/ はコミットしない）
npx expo run:ios --device        # 実機に dev client をビルド＆インストール
```

ビルドが通らない場合は「9. クラウドで未検証のもの」の順に確認してください。

---

## 1. 採用した構成と理由

| 項目 | 採用 | 理由 |
| --- | --- | --- |
| ネイティブ管理 | **Continuous Native Generation（CNG）**。`ios/` は `.gitignore` 済みで、`npx expo prebuild --clean` で毎回再生成 | 空のリポジトリから開始したため。手編集した Xcode ターゲットが prebuild で消える事故を構造的に防ぐ |
| 拡張ターゲット | [`@bacons/apple-targets`](https://github.com/EvanBacon/expo-apple-targets) 5.0.0 + `targets/*/expo-target.config.js` | 拡張のソース・Bundle ID・entitlements をリポジトリ内の設定ファイルで管理し、prebuild で毎回 Xcode プロジェクトに反映できる |
| DeviceActivityReport 拡張 | `patches/@bacons+apple-targets+5.0.0.patch` で `device-activity-report` 型を追加（`patch-package`、`npm install` 時に自動適用） | apple-targets 5.0.0 は Report 拡張（ExtensionKit, `com.apple.deviceactivityui.report-extension`）を未サポート。パッチで ExtensionKit 製品（`.appex`、`$(EXTENSIONS_FOLDER_PATH)` に埋め込み）として生成する |
| JS ↔ Swift | ローカル Expo モジュール `modules/screen-time`（Pod 名 `TimeIsMoneyScreenTime`） | Expo autolinking で自動組み込み。Pod 名は Apple の `ScreenTime.framework` とのモジュール名衝突を避けるため |
| ナビゲーション | Expo Router（`src/app/`） | Expo 標準 |
| 対象 iOS | 16.4 以上（Expo SDK 58 の最小値）。`includesPastActivity` は iOS 17.4+ のみで使用 | 下記「技術的制約」参照 |

### 設定の正本（ここを編集する）

| 何を | 正本ファイル |
| --- | --- |
| アプリ名・Bundle ID・App Group・本体 entitlements・プラグイン | `app.config.ts`、`config/ids.js` |
| 各拡張の種類・Bundle ID 接尾辞・entitlements・フレームワーク・最小iOS | `targets/<name>/expo-target.config.js` |
| 各拡張の Info.plist | `targets/<name>/Info.plist`（初回 prebuild で生成されコミット済み。拡張ポイントIDのみ） |
| Report 拡張の型定義 | `patches/@bacons+apple-targets+5.0.0.patch` |
| 拡張と本体モジュールで共有する Swift | `targets/_shared/*.swift`（apple-targets が全拡張＋本体ターゲットにリンク）。`modules/screen-time/ios/Shared/*.swift` は**これへのシンボリックリンク**で、Pod にもコンパイルされる |
| JS ブリッジ（Swift） | `modules/screen-time/ios/*.swift`、型は `modules/screen-time/index.ts` |

`ios/` 内（`ios/.targets/*/generated.entitlements` を含む）は生成物です。**Xcode で直接編集しないでください**。変更は上の正本に入れて `npx expo prebuild --clean -p ios` を再実行します。

### ディレクトリ

```
app.config.ts                 Expo 設定（CNG の正本）
config/ids.js                 Bundle ID / App Group の決定（環境変数で上書き）
patches/                      apple-targets への device-activity-report 追加パッチ
modules/screen-time/          ローカル Expo モジュール
  index.ts                    TS 型付きブリッジ
  ios/ScreenTimeModule.swift  認可・アプリ選択UI・設定保存・監視同期
  ios/TIMHostedViews.swift    RN に埋め込むネイティブView（レポート / アプリアイコン）
  ios/TIMReportFilters.swift  レポートの期間フィルタ（今日・今週[日〜土]・累計）
  ios/Shared/ -> ../../../targets/_shared/*.swift（symlink）
targets/
  _shared/                    TIMCore（純ロジック）, TIMStore（App Group）, TIMSelections,
                              TIMShieldController（ManagedSettings）, TIMScheduler（DeviceActivity）
  monitor/                    DeviceActivityMonitor 拡張（日替わり・上限到達でShield・円換算通知）
  shield-config/              Shield Configuration 拡張（ロゴ・色・文言・「閉じる」）
  shield-action/              Shield Action 拡張（「閉じる」で対象アプリを閉じる）
  report/                     DeviceActivityReport 拡張（集計と描画。SwiftUI + Charts）
src/
  app/                        画面（Expo Router）
  components/                 UI 部品（RuleEditor, RateEditor, UsageReport, …）
  domain/                     純 TS ロジック（単価・日付・設定スキーマ・ルール版管理・権限）
  native/                     ネイティブ API ラッパー（開発専用モック含む）
  state/AppStore.tsx          設定・権限・ネイティブ状態
scripts/test-swift-core.sh    Swift 共有ロジックのテスト（Mac で実行）
```

---

## 2. 仕組み（設計メモ）

### データの流れ
- **設定**（単価・ルール・一括解除状態）は TypeScript が JSON にして App Group の UserDefaults（キー `tim.config.v1`）に保存。拡張は読むだけ。スキーマは `src/domain/config.ts` と `targets/_shared/TIMCore.swift`（`TIMConfig`）で一致させる。
- **アプリ選択**（`FamilyActivitySelection`）は不透明トークンなので Swift 側だけで保存（`tim.selection.<id>`）。TS は ID と件数のみ扱う。
- **利用時間**は DeviceActivityReport 拡張の中だけで集計・描画し、TS や App Group には持ち出さない。本体はその View を埋め込むだけ。
- **通知**は利用時間データではなく、独立した DeviceActivityEvent（閾値到達イベント）で出す。

### 監視（DeviceActivity）
| アクティビティ名 | スケジュール | イベント |
| --- | --- | --- |
| `tim.total` | 毎日 00:00–23:59:59 繰り返し | `h2`,`h4`,…,`h24`：アプリ・カテゴリ・Webドメイン**未指定**＝iPhone全体（Apple ドキュメント: 何も指定しないと全アプリ・カテゴリ・ドメインを含む） |
| `tim.rule.<ruleId>.g<世代>` | 毎日 00:00–23:59:59 繰り返し | `limit`：その日の曜日の上限（分）。「制限なし」の日はイベントなしで監視だけ残す（翌日の intervalDidStart を受けるため） |

- 1ルール＝1つの名前付き `ManagedSettingsStore`（`tim.rule.<ruleId>`）。X の上限到達で YouTube はロックされない。
- **日付切替**：各監視の `intervalDidStart`（＝0時）で拡張が `TIMScheduler.sync()` を実行し、前日の Shield を外し、その日の曜日の上限で再登録する。本体アプリを開いている必要はない。本体の起動・フォアグラウンド復帰時、Shield の「閉じる」押下時にも同じ整合処理を行う（0時のコールバック取りこぼし対策）。
- **再登録の冪等性**：監視ごとに署名（日付・上限・世代・選択ID）を App Group に保存し、変わったときだけ再登録。`intervalDidStart` 内から再登録してもループしない。
- **遅延イベント対策**：「0時からの経過時間 < 閾値」のイベントは前日分の遅延配信とみなして無視（Shield も通知もしない）。
- **ルールの版管理**：各ルールは `effectiveFrom`（日付）付きの版を持ち、拡張は「今日以前で最新の版」を使う。上限を緩める変更（引き上げ・制限なし・アプリ除外・削除）は翌日付の版として保存されるので、アプリを開かなくても翌日0時に反映される。厳しくする変更は当日から反映。
- **一括解除**：`bulkUnlock.active=true` と世代+1 を保存→全 Shield を即時解除・ルール監視を停止（`tim.total` は継続）。ルールは保存されたまま。
  - 古いイベント対策：Shield 適用前に「一括解除中でないこと」「イベントのアクティビティ名の世代＝現在の世代」を確認し、適用後にもう一度確認して競合時はロールバック。
- **再開**（制限設定画面から明示的に）：世代+1 で新しい名前の監視を登録。iOS 17.4+ では `DeviceActivityEvent(…, includesPastActivity: true)` を使い、**当日すでに使った分も上限に含める**（Apple ドキュメント：「監視開始前のアクティビティを考慮するかどうか」）。上限超過済みならすぐロックされる。
- **円換算通知**：`h<N>` 到達で「設定単価 × N時間」の**当日累計額**を通知（例：時給1,500円・4時間→「今日は6,000円分／4時間をスマホに浪費しました。」）。`日付×段階` を App Group に記録して重複を抑止し、通知IDも `tim.usage.<日付>.h<N>` で固定。翌日は新しい日として扱う。通知タップで当日の統計（`/stats?range=today`）を開く。

---

## 3. 実装状況

### 実装済み（コード）
- オンボーディング：単価入力（円換算プレビュー）→ スクリーンタイム許可（事前説明→OSダイアログ）→ 通知許可（事前説明→OSダイアログ）→ 最初のアプリ制限（スキップ可）
- 単価の変更画面、権限画面（拒否検知・再申請・設定アプリ導線と操作案内・フォアグラウンド復帰時の再確認）
- スクリーンタイム未許可時は利用時間を表示せず「許可が必要」を表示（0分表示はしない）。通知拒否でも制限・統計は動作
- アプリごとのロック：Apple のアプリ選択UI（`FamilyActivityPicker`）、毎日固定／曜日別（各曜日「制限なし」可）、ルールごとに独立
- DeviceActivityMonitor 拡張で上限到達→ManagedSettings で Shield、翌日解除と曜日ルール切替
- Shield Configuration（ロゴ・色・見出し「今日の利用上限に達しました」・説明「今日の利用枠20分を使い切りました。明日また使えます。」、アプリ名が取れない場合も自然な文面）、Shield Action（「閉じる」1つのみ、`.close`）
- 全制限を一括解除（ルール保持・全体監視/通知/統計は継続）、制限設定画面からの再開（当日分を含める）、個別の即時解除なし、緩める変更は翌日反映（予定中の変更の取り消し可）
- iPhone全体の 2〜24時間（2時間刻み）累計通知、重複防止、タップで当日統計
- ホーム／統計：今日・今週（日〜土、日別棒グラフ）・累計（集計期間と「iOSが保持する範囲のみ」を明記）、アプリ別の時間と換算額、換算単価の表示、権限不足／制限停止中／取得中／データなしの区別、ホームから「現在の制限」「制限設定」「全制限を一括解除」
- 開発専用：短い閾値モード、拡張ログ表示（`/dev` 画面、`__DEV__` のみ）、モックAPI（`EXPO_PUBLIC_TIM_MOCK=1` かつ `__DEV__` のときだけ）

### 未実装・対象外
- アカウント、バックエンド、課金、チケット、ウィジェット（仕様で対象外）
- Android（`platforms: ["ios"]`）
- アプリアイコン/スプラッシュは Expo テンプレートのまま（Shield のロゴはコード描画）

### 実機未検証（Macで確認が必要）
**Swift コードは一度もコンパイルされていません**（クラウドに Swift ツールチェーンが無く、swift.org への通信も遮断）。構文解析（tree-sitter）のみ通過済みです。以下すべて実機確認が必要です。
- 全 Swift ソースのビルド（本体 Pod、4つの拡張）、パッチで生成した Report 拡張（ExtensionKit）の埋め込みと起動
- FamilyControls 認可、アプリ選択UI、Shield 表示と「閉じる」
- 本体を閉じた状態での監視・Shield・日付切替・通知
- `includesPastActivity: true` による再開時の当日分算入（iOS 17.4+）
- `tim.total` の 24時間イベント（下記制約）
- Report 拡張から App Group の単価を読めること

---

## 4. 技術的制約（根拠つき）

1. **24時間の閾値**：監視区間は 00:00–23:59:59 で 24時間に届かないため、24時間の閾値イベントは事実上発火しません。仕様どおり 24h イベントも登録を試み、`startMonitoring` が拒否した場合は 24h を除いて再登録し、警告を `/dev` 画面と監視状態に残します（`TIMScheduler.swift`）。
2. **利用時間を本体に持ち出せない**：DeviceActivityReport 拡張はサンドボックスでデータを外に出せません。円換算・集計はすべて拡張内（`targets/report`）で行い、本体は描画結果を埋め込むだけです。通知は独立した閾値イベントで実現しています。
3. **累計の範囲**：iOS が保持している履歴の範囲しか取得できません（期間は非公開・不定）。累計は過去365日を要求し、実際にデータがあった最初と最後の日・日数を表示します。データの無い日を0分として扱いません。
4. **`includesPastActivity`** は iOS 17.4+ の API（Apple ドキュメントで確認）。iOS 16.4–17.3 では従来の初期化子を使うため、再開時の当日分算入の挙動は保証されません（実機確認項目）。
5. **監視数の上限**：`DeviceActivityCenter` は数値を公開せず `excessiveActivities` を返します。ルールは最大15件（＋全体監視1件）に制限しています。削除予定のルールは当日まで監視が続くため、枠は翌日に空きます。
6. **アプリ名**：`Application.localizedDisplayName` は nil になり得ます。Shield 文面は名前なしでも自然な文にしています。本体の一覧ではアプリ名・アイコンを SwiftUI `Label(token)` で表示します。
7. **配布用 entitlement**：Family Controls は開発署名では使えますが、TestFlight / App Store 配布には Apple への申請（Family Controls (Distribution)）が**本体と全拡張の Bundle ID ごとに**必要です。

---

## 5. 初回セットアップ（Mac）

前提：Xcode（iOS 17.4+ SDK を含む最新版を推奨）、Node.js 22、CocoaPods、実機 iPhone（Screen Time API はシミュレータでは実質検証できません）、Apple Developer Program の Team。

```bash
npm install                     # 依存＋patch-package（patches/ を適用）
cp .env.example .env.local      # 下記を記入（.env.local はコミットしない）
#   TIM_BUNDLE_ID=com.yourname.timeismoney
#   APPLE_TEAM_ID=XXXXXXXXXX
npx expo prebuild --clean -p ios
npx expo run:ios --device       # dev client をビルドして実機へ（Xcode の署名が必要）
npm start                       # 2回目以降は Metro だけ起動（= expo start --dev-client）
```

Xcode から実行する場合：`ios/TimeIsMoney.xcworkspace` を開き、スキーム `TimeIsMoney` を実機向けにビルド（Metro は `npm start` で起動）。

### ネイティブプロジェクトの再生成
`app.config.ts`、`config/ids.js`、`targets/**`、`modules/screen-time/**`、`patches/**`、依存関係を変えたら：
```bash
npx expo prebuild --clean -p ios && npx expo run:ios --device
```
`targets/_shared` にファイルを追加・削除・改名した場合は、`modules/screen-time/ios/Shared/` のシンボリックリンクも合わせて追加・削除してください（`ln -s ../../../../targets/_shared/<File>.swift modules/screen-time/ios/Shared/`）。

---

## 6. Xcode / Apple Developer の設定

`.env.local` の `APPLE_TEAM_ID` が prebuild 時に全ターゲットの Development Team に入ります（未設定だと apple-targets が警告し、Xcode で各ターゲットの Team を手で選ぶ必要がありますが、その手作業は次の prebuild で消えます）。

| ターゲット | Bundle ID（`TIM_BUNDLE_ID=com.example.timeismoney` の場合） | 種類 |
| --- | --- | --- |
| TimeIsMoney | `com.example.timeismoney` | アプリ本体 |
| TimeIsMoneyMonitor | `com.example.timeismoney.monitor` | Device Activity Monitor |
| TimeIsMoneyShieldConfig | `com.example.timeismoney.shieldconfig` | Shield Configuration |
| TimeIsMoneyShieldAction | `com.example.timeismoney.shieldaction` | Shield Action |
| TimeIsMoneyReport | `com.example.timeismoney.report` | Device Activity Report（ExtensionKit） |

全ターゲット共通の entitlements（prebuild が生成）：
- `com.apple.developer.family-controls` = `true`（Capability: **Family Controls**）
- `com.apple.security.application-groups` = `["group.<TIM_BUNDLE_ID>"]`（Capability: **App Groups**）

App Group ID は `group.<本体 Bundle ID>` 固定の規約です（Swift 側は拡張の Bundle ID から本体 ID を導出して同じ ID を使います：`TIMStore.deriveAppGroupIdentifier`）。

**開発署名**：Xcode の Automatic Signing で、上記5つの App ID に Family Controls と App Groups が付与された開発用プロファイルが作られます。追加申請は不要です。

**配布（TestFlight / App Store）**：Apple に **Family Controls (Distribution)** の利用申請を行い、承認後に**5つすべての Bundle ID** で Family Controls (Distribution) を有効化する必要があります。未承認のままでは配布用プロファイルを作れません。

通知はローカル通知のみなので Push Notifications capability（`aps-environment`）は付けていません（`expo-notifications` を `enableRemoteNotifications: false` で設定）。

---

## 7. 実機で確認する順番

開発中は `/dev`（ホーム下部「開発用ツール」）で拡張ログと監視状態を確認できます。

1. **起動とオンボーディング**：単価入力でプレビューが変わる → 説明画面 → スクリーンタイム許可ダイアログ → 通知の説明 → 通知ダイアログ → 最初の制限（アプリ選択UIが出る）
2. **権限拒否と復帰**
   - スクリーンタイムを拒否 → ホームに「アクセスが必要」（利用時間は0分ではなく非表示）→「もう一度許可を求める」→ 再拒否で「設定を開く」と手順 → 設定でオン → アプリに戻ると自動で再確認され表示される
   - 通知を拒否 → 制限と統計が通常どおり動く／通知カードに設定導線
   - 設定アプリでスクリーンタイムのアクセスを取り消し → 戻ると許可が必要な表示に変わる
3. **Shield 表示**：1アプリに上限1〜3分（dev プリセット）を設定 → そのアプリを使い続ける → Shield（ロゴ・色・見出し・「今日の利用枠N分を…」・「閉じる」のみ）→「閉じる」でアプリが閉じる。別ルールのアプリはロックされないこと
4. **本体を閉じた状態**：本体をアプリスイッチャーから終了してから 3 を再実行
5. **翌日の解除**：上限到達のまま日付をまたぐ（実時間で0時をまたぐのが確実。端末の日時変更は Screen Time の挙動が不安定なため参考程度）→ 0時以降にロックが外れ、その曜日のルールで再監視される
6. **曜日別と制限なし**：今日の曜日を「制限なし」にした曜日別ルール → 今日はロックされない／翌日の曜日の上限で翌日ロックされる
7. **緩める変更は翌日**：上限を引き上げ／アプリを外す／削除 →「明日から反映」と表示され、今日はロックが続く。「予定している変更を取り消す」が効く。厳しくする変更は即時
8. **一括解除と再開**：ロック中に一括解除 → 全 Shield が即時に外れる、ホームに「制限停止中」、全体通知は継続 → 制限設定から再開 → 今日すでに上限超過のアプリが（iOS 17.4+ では）すぐロックされる。解除直後に古いイベントで再ロックされないこと（ログに `ignored … bulk unlock` が出る）
9. **円換算通知と重複防止**：`/dev` で短い閾値モードON（2分・4分…）→ 2分使うと「今日は○円分／2時間…」が届く（短縮モード中は本文先頭に「[DEV 短縮: 実際はN分]」が付く）→ 本体を再起動・再同期しても同じ段階が再通知されない → 通知タップで当日統計が開く（起動中・終了状態の両方）→ 翌日は再び通知される
10. **レポート**：今日（合計・円・アプリ別）、今週（日〜土の棒グラフ、未来日は「—」、データの無い日は「データなし」）、累計（集計期間・データのある日数の表記）。換算単価の表示。単価を変更するとレポートの換算額が変わる
11. **Release ビルド**：短い閾値モードやモックが効かないこと（`npx expo run:ios --device --configuration Release`）

### 開発時に上限と通知閾値を数分にする方法
- アプリ上限：Debug ビルドでは編集画面に「1分(dev)・2分(dev)・3分(dev)」のプリセットが出ます（Release では出ず、最小5分刻み）。
- 全体通知：`/dev` 画面の「短い閾値モード」をONにすると、全体監視の閾値が「時間」→「分」になります。
- 混入防止：TS は `__DEV__` のときだけ `debugShortThresholds` を保存し、Swift は `#if DEBUG` のときだけ参照します。Release ビルドではフラグが残っていても無視されます。モックAPIは `__DEV__` かつ `EXPO_PUBLIC_TIM_MOCK=1` のときだけ有効です。

---

## 8. クラウド（Linux）で実行した検証と結果

| 検証 | コマンド | 結果 |
| --- | --- | --- |
| 型チェック | `npm run typecheck` | ✅ エラーなし |
| Lint | `npm run lint`（`expo lint`） | ✅ エラーなし |
| 単体・コンポーネントテスト | `npm test` | ✅ 7スイート / 43テスト成功（単価換算・通知文面・日付と週（日曜始まり）・設定スキーマ・ルール版管理（独立上限、曜日別、制限なし、緩める変更の翌日反映、削除、取り消し）・一括解除・権限の導線・単価入力UI・ルール編集UI） |
| iOS JS バンドル | `npx expo export --platform ios` | ✅ 成功 |
| ネイティブ生成 | `npx expo prebuild -p ios --no-install --clean` | ✅ 成功。5ターゲット生成、Report 拡張は `com.apple.product-type.extensionkit-extension`・`.appex`・「Embed ExtensionKit Extensions（`$(EXTENSIONS_FOLDER_PATH)`）」で埋め込み、全ターゲットに Family Controls と App Group の entitlements、`_shared` が全ターゲットにリンクされることを pbxproj で確認 |
| Autolinking | `npx expo-modules-autolinking resolve --platform apple` | ✅ `TimeIsMoneyScreenTime` Pod と3モジュールを検出 |
| Swift 構文 | tree-sitter-swift で全 `.swift` を解析 | ✅ 構文エラーなし（**型チェック・コンパイルは未実施**） |

### 9. クラウドで未検証のもの（Macで最初に試すこと）
1. `npm run test:swift-core` — `TIMCore.swift` を `swiftc` でビルドし、TS と同じ文面・日付・版管理を検証
2. `npx expo prebuild --clean -p ios && cd ios && pod install`（prebuild が自動で実行）— Pod のシンボリックリンク（`modules/screen-time/ios/Shared`）が解決されること
3. `npx expo run:ios --device` — Swift のコンパイル。エラーが出やすい箇所の候補：
   - `TIMScheduler.makeEvent` の `DeviceActivityEvent` 初期化子
   - `TIMShieldController` の `ManagedSettingsStore.Name("…")`、`.specific(_:except:)`
   - `targets/report` の `DeviceActivityReportScene` 準拠と `DeviceActivityFilter(segment:users:devices:)`
   - `modules/screen-time/ios/TIMHostedViews.swift` の `ExpoView` サブクラス
4. Xcode の Report 拡張が Extensions フォルダに埋め込まれていること（Product → Show Build Folder で `TimeIsMoney.app/Extensions/TimeIsMoneyReport.appex`）
5. 以降は「7. 実機で確認する順番」

---

## コマンド一覧

| コマンド | 内容 |
| --- | --- |
| `npm start` | Metro（dev client 用） |
| `npm run ios` / `npm run ios:device` | dev client をビルドしてシミュレータ / 実機で起動 |
| `npm run prebuild:ios` | `expo prebuild --clean -p ios` |
| `npm run typecheck` / `npm run lint` / `npm test` | 検証 |
| `npm run verify` | 上の3つをまとめて |
| `npm run test:swift-core` | Swift 共有ロジックのテスト（要 Xcode） |
