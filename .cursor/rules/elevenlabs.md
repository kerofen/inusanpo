# いぬさんぽ オーディオ生成ルール

## ElevenLabs SE生成
- プロンプトは英語で、具体的に書く
- 形式: "[音の種類], [質感], [長さ], game sound effect"
- 例: "cartoon jump sound, bouncy spring, short 0.3s, game sound effect"
- SEは1-3秒、BGMは30秒以内で生成
- ループBGMは必ず「seamless loop」を指定

## 高品質プロンプトのコツ
- 「high-quality, professionally recorded」を追加
- 環境音は「[場所] ambience, [雰囲気], loopable」
- 効果音は「[動作] SFX, [質感], [長さ]」

## ファイル管理
- 出力先: assets/audio/
- 命名規則: [種類]_[説明].mp3 (例: se_jump.mp3, bgm_title.mp3)
- BGMとSEを別フォルダに分ける

## コード統合
- Howler.jsを使用
- BGMはloop: trueで再生
- SEはsprite対応を検討