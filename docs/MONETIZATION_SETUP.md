# 広告・課金セットアップ完了レポート

## 実装概要

| 項目 | 状態 | 詳細 |
|------|------|------|
| AdMobプラグイン | ✅ 完了 | `@capacitor-community/admob@6.2.0` |
| IAPプラグイン | ✅ 完了 | `@capgo/native-purchases@8.0.18` |
| AdManager | ✅ 完了 | インタースティシャル広告管理 |
| PurchaseManager | ✅ 完了 | アプリ内課金管理 |
| ShopScene統合 | ✅ 完了 | 購入・復元機能 |
| ゲーム統合 | ✅ 完了 | 5ステージごとに広告表示 |

---

## 作成されたファイル

### 新規ファイル
- `AdManager.js` - 広告管理モジュール
- `PurchaseManager.js` - 課金管理モジュール
- `docs/STORE_RELEASE_GUIDE.md` - ストアリリースガイド
- `docs/MONETIZATION_SETUP.md` - このファイル

### 変更されたファイル
- `game.js` - 広告・課金マネージャーの統合
- `package.json` - プラグイン追加、スクリプト追加
- `android/app/src/main/AndroidManifest.xml` - AdMob App ID追加
- `ios/App/App/Info.plist` - AdMob App ID、ATT、SKAdNetwork追加

---

## 商品構成

### 広告
- **タイプ**: インタースティシャル広告
- **表示タイミング**: 5ステージクリアごと
- **除外条件**: 広告削除購入済みの場合

### アプリ内課金
| 商品ID | 商品名 | タイプ | 用途 |
|--------|--------|--------|------|
| `com.kerofen.inusanpo.remove_ads` | 広告削除 | 非消費型 | 全広告を永久削除 |
| `com.kerofen.inusanpo.premium_dogs` | プレミアム犬種 | 非消費型 | 特別犬種を解放 |

---

## 次のステップ

### 1. AdMob設定（本番用）
1. AdMob Console (https://admob.google.com/) にログイン
2. アプリを登録（Android/iOS別々に）
3. インタースティシャル広告ユニットを作成
4. 取得したIDを以下に設定：
   - `android/app/src/main/AndroidManifest.xml`
   - `ios/App/App/Info.plist`
   - `AdManager.js` の `PRODUCTION_AD_IDS`

### 2. アプリ内課金設定

#### Google Play Console
1. アプリを作成（まだなら）
2. 収益化 > アプリ内アイテム
3. 商品を登録：
   - `com.kerofen.inusanpo.remove_ads` (非消費型)
   - `com.kerofen.inusanpo.premium_dogs` (非消費型)

#### App Store Connect
1. アプリを作成（まだなら）
2. App内課金 > 管理
3. 商品を登録（同じ商品IDで）

### 3. テスト

#### 広告テスト
- 現在はテストIDが設定されているので、そのままテスト可能
- 実機でのテストを推奨

#### 課金テスト
- **Android**: Google Play Console でライセンステスター追加
- **iOS**: App Store Connect でサンドボックステスター追加

### 4. リリース準備
```bash
# リリース用ビルド準備
npm run release:prepare

# Android Studioを開く
npm run build:android

# Xcodeを開く（Macのみ）
npm run build:ios
```

---

## 本番リリース前チェックリスト

```
□ AdMob
  □ 本番App IDに変更（AndroidManifest.xml）
  □ 本番App IDに変更（Info.plist）
  □ 本番広告ユニットIDに変更（AdManager.js）
  □ isTesting: false に変更（AdManager.js）

□ アプリ内課金
  □ Google Play Console で商品登録完了
  □ App Store Connect で商品登録完了
  □ サンドボックステスト完了

□ ストア掲載
  □ プライバシーポリシーURL準備
  □ スクリーンショット準備（各サイズ）
  □ アプリアイコン差し替え
  □ 説明文作成

□ アプリ
  □ TEST_MODE_UNLOCK_ALL = false 確認
  □ バージョン番号設定
  □ 実機テスト完了
```

---

## トラブルシューティング

### 広告が表示されない
1. テストIDが正しく設定されているか確認
2. 実機でテストしているか確認（シミュレータでは表示されない場合あり）
3. ネットワーク接続を確認

### 購入が完了しない
1. ストアで商品が正しく登録されているか確認
2. テスターアカウントが設定されているか確認
3. 商品IDが一致しているか確認

### ビルドエラー
```bash
# 依存関係を再インストール
rm -rf node_modules
npm install

# Capacitorを再同期
npx cap sync
```

---

## 参考リンク

- [AdMob Console](https://admob.google.com/)
- [Google Play Console](https://play.google.com/console/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Capacitor AdMob Plugin](https://github.com/capacitor-community/admob)
- [Capgo Native Purchases](https://capgo.app/docs/plugins/native-purchases/)
