# ストアリリースガイド

このドキュメントは「ワンこねくと」をGoogle Play StoreとApp Storeにリリースするためのガイドです。

## 1. 事前準備チェックリスト

### 開発者アカウント
- [x] Google Play Console デベロッパーアカウント（$25 一回払い）
- [x] Apple Developer Program（年間 $99）
- [x] AdMob アカウント
- [ ] Firebase プロジェクト（推奨：Analytics用）

### 本番用ID（リリース前に必ず変更）

#### AdMob
1. AdMob Console (https://admob.google.com/) でアプリを登録
2. インタースティシャル広告ユニットを作成
3. 以下のファイルを本番IDに変更：

**Android** (`android/app/src/main/AndroidManifest.xml`):
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXX~XXXXX"/>  <!-- 本番App ID -->
```

**iOS** (`ios/App/App/Info.plist`):
```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXX~XXXXX</string>  <!-- 本番App ID -->
```

**AdManager.js**:
```javascript
// PRODUCTION_AD_IDS を本番IDに変更
// useTesting を false に変更
```

#### アプリ内課金
**PurchaseManager.js**:
```javascript
// PRODUCT_IDS を実際のストア商品IDに変更
PRODUCT_IDS: {
    REMOVE_ADS: 'com.kerofen.inusanpo.remove_ads',
    PREMIUM_DOGS: 'com.kerofen.inusanpo.premium_dogs',
},
```

---

## 2. 必要なアセット

### アプリアイコン

| プラットフォーム | サイズ | 用途 |
|-----------------|--------|------|
| Android | 512×512 px | Play Store掲載用 |
| iOS | 1024×1024 px | App Store掲載用 |

**作成場所**:
- Android: `android/app/src/main/res/mipmap-*/ic_launcher*.png`
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**アイコン作成ツール**:
- https://makeappicon.com/
- https://appicon.co/

### スクリーンショット

#### Google Play Store
| 種類 | サイズ | 必須枚数 |
|------|--------|----------|
| スマートフォン | 1080×1920 px (9:16) | 2〜8枚 |
| タブレット（7インチ） | 1024×600 px | 任意 |
| タブレット（10インチ） | 1280×800 px | 任意 |

#### App Store
| デバイス | サイズ | 必須枚数 |
|----------|--------|----------|
| iPhone 6.7" | 1290×2796 px | 最低3枚 |
| iPhone 6.5" | 1284×2778 px | 最低3枚 |
| iPhone 5.5" | 1242×2208 px | 最低3枚 |
| iPad Pro 12.9" | 2048×2732 px | 任意 |

**推奨スクリーンショット内容**:
1. タイトル画面（かわいい犬たちを見せる）
2. ゲームプレイ画面（パズルを解いている様子）
3. ステージセレクト画面
4. チャレンジモード画面
5. クリア演出画面
6. ずかん画面（犬種コレクション）

### フィーチャーグラフィック（Play Store用）
- サイズ: 1024×500 px
- ストアページのトップに表示される横長画像

---

## 3. ストア掲載情報

### アプリ名
- 日本語: ワンこねくと
- 英語: Wan Connect (提案)

### 短い説明（80文字以内）
```
かわいいワンコをつなぐ一筆書きパズル！32種類の犬種を集めて、おさんぽ気分でパズルを楽しもう！
```

### 詳細説明（日本語）
```
🐕 ワンこねくとへようこそ！

同じワンコをつなげて、グリッドのすべてのマスを埋める一筆書きパズルゲームです。

【遊び方】
・同じ種類のワンコ同士を線でつなごう
・すべてのマスを線で埋めるとクリア！
・簡単操作で誰でも楽しめます

【ゲームモード】
🐾 おさんぽモード：100ステージを順番にクリア
🏃 チャレンジモード：ミスするまで続くエンドレスモード

【集めて楽しい！32種類の犬種】
柴犬、パグ、トイプードル、ハスキー、ゴールデンレトリバー、コーギー...
ステージをクリアして新しいワンコを仲間に迎えよう！

【カスタマイズ機能】
・にくきゅうカラー変更
・きせかえアイテム
・せかいテーマ変更

【こんな方におすすめ】
・犬が大好きな方
・一筆書きパズルが好きな方
・スキマ時間に遊べるゲームを探している方
・かわいいキャラクターに癒されたい方

無料でダウンロードして、今すぐワンコたちと一緒にパズルを楽しもう！
```

### キーワード（App Store用、100文字以内）
```
パズル,一筆書き,犬,いぬ,ワンコ,カジュアルゲーム,脳トレ,柴犬,コーギー,かわいい,癒し,暇つぶし
```

### カテゴリ
- Google Play: ゲーム > パズル
- App Store: ゲーム > パズル

### 年齢レーティング
- Google Play: 3歳以上
- App Store: 4歳以上

---

## 4. プライバシーポリシー

ストアリリースにはプライバシーポリシーのURLが必須です。

### 含めるべき内容
1. 収集する情報（広告ID、使用状況データ等）
2. 情報の使用目的（広告配信、アプリ改善）
3. 第三者との共有（AdMob、Firebase等）
4. お問い合わせ先

### サンプルテンプレート
```
[アプリ名]プライバシーポリシー

最終更新日: [日付]

【収集する情報】
本アプリは、広告配信とアプリ改善のため、以下の情報を収集することがあります：
- 広告識別子（IDFA/AAID）
- デバイス情報（機種、OSバージョン）
- アプリの使用状況

【第三者サービス】
本アプリは以下のサービスを使用しています：
- Google AdMob（広告配信）
- Firebase Analytics（使用状況分析）

各サービスのプライバシーポリシーもご確認ください。

【お問い合わせ】
[メールアドレス]
```

---

## 5. ビルドとリリース手順

### Android (Google Play Store)

1. **署名鍵の作成**（初回のみ）
```bash
keytool -genkey -v -keystore release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

2. **リリースビルド**
```bash
# Webアセットをビルド
npm run build

# Capacitor同期
npx cap sync android

# Android Studioを開く
npx cap open android
```

3. **Android Studio で署名付きAPK/AAB作成**
   - Build > Generate Signed Bundle / APK
   - Android App Bundle (AAB) を選択（推奨）
   - 署名鍵を選択
   - release を選択してビルド

4. **Play Consoleにアップロード**
   - 内部テスト → クローズドテスト → オープンテスト → 製品版
   - 各段階でテストを実施

### iOS (App Store)

1. **Xcode設定**
```bash
# Webアセットをビルド
npm run build

# Capacitor同期
npx cap sync ios

# Xcodeを開く
npx cap open ios
```

2. **Xcode で設定**
   - Signing & Capabilities でチーム選択
   - Bundle Identifier 確認（com.kerofen.inusanpo）
   - バージョン番号設定

3. **アーカイブ作成**
   - Product > Archive
   - Distribute App > App Store Connect

4. **TestFlight でベータテスト**
   - App Store Connect でテスターを追加
   - 内部テスト → 外部テスト

5. **審査提出**
   - App Store Connect でアプリ情報入力
   - スクリーンショット、説明文を設定
   - 審査に提出

---

## 6. リリース前最終チェック

### コード
- [ ] AdManager.js: テストIDを本番IDに変更
- [ ] AdManager.js: `isTesting: false` に変更
- [ ] PurchaseManager.js: 商品IDを確認
- [ ] game.js: `TEST_MODE_UNLOCK_ALL = false` を確認

### ネイティブ設定
- [ ] AndroidManifest.xml: 本番AdMob App IDに変更
- [ ] Info.plist: 本番AdMob App IDに変更
- [ ] アプリアイコンをカスタムアイコンに差し替え

### ストア設定
- [ ] プライバシーポリシーURL準備
- [ ] サポートメールアドレス準備
- [ ] スクリーンショット準備
- [ ] 説明文作成

### アプリ内課金
- [ ] Google Play Console で商品登録
- [ ] App Store Connect で商品登録
- [ ] サンドボックスでテスト完了

---

## 7. 審査でよくあるリジェクト理由と対策

### iOS
1. **購入復元ボタンがない** → ShopSceneに「復元」ボタンを実装済み
2. **プライバシーポリシーがない** → URLを用意して設定
3. **スクリーンショットが不正確** → 実際の画面のみ使用
4. **アプリ内課金のテスト** → サンドボックスで十分にテスト

### Android
1. **ターゲットAPIレベルが低い** → Capacitor 6は対応済み
2. **広告表示の問題** → テスト広告でないことを確認
3. **クラッシュ** → 十分にテスト

---

## 8. リリース後のタスク

- [ ] ユーザーレビューの確認と対応
- [ ] クラッシュレポートの監視（Firebase Crashlytics推奨）
- [ ] 広告収益の確認（AdMobダッシュボード）
- [ ] 課金状況の確認（ストアダッシュボード）
- [ ] アップデート計画の策定
