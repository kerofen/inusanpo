# Audio Asset Plan

このリポジトリは **主要BGMをDOVA-SYNDROMEの正式素材に差し替え済み** です（タイトル／メインメニュー／ゲーム画面）。追加差し替えや再ダウンロードが必要な場合は、下記手順でDOVA-SYNDROMEと効果音ラボから取得してください。

## 1. ダウンロード手順
1. **BGM (DOVA-SYNDROME)**
   - 各ページにアクセスし、「音楽素材ダウンロードページへ」→「DOWNLOAD FILE」をクリックしてMP3を取得します。
   - ダウンロードファイルを `assets/audio/bgm/` 配下の指定ファイル名にリネームして上書きしてください。
   - サイト規約に従いクレジット表記が必要な場合は、タイトル画面かクレジットセクションに作曲者名を追記してください。
2. **SE (効果音ラボ)**
   - 該当カテゴリページからMP3を保存し、`assets/audio/se/` の指定ファイル名に置き換えてください。
   - 効果音ラボはクレジット任意ですが、配布ページURLを控えておくとトラブルシュートが容易です。

> 置き換え後に `npm run dev` を再起動するとPhaserが新しい音声をキャッシュします。

## 2. BGM セットリスト（DOVA-SYNDROME）
| シーン | 保存ファイル | 採用トラック (URL) | 作曲者 / メモ |
| --- | --- | --- | --- |
| タイトル | `assets/audio/bgm/bgm_title_comicalnichijo.mp3` | コミカルな日常 – カピバラっ子<br>https://dova-s.jp/bgm/play16862.html | コミカルな日常のほっこりループ。明るい朝感でタイトルの世界観を即伝える。 |
| メニュー/図鑑/ショップ | `assets/audio/bgm/bgm_menu_puzzle_cooking.mp3` | パズル＆クッキング – 今川彰人オーケストラ<br>https://dova-s.jp/bgm/play5435.html | 楽しげで生活感のある4拍子。メニュー内の全画面遷移で統一再生。 |
| ストーリーモード（通常プレイ） | `assets/audio/bgm/bgm_game_honobono.mp3` | ほのぼの – shimtone<br>https://dova-s.jp/bgm/play7650.html | 癒やし系アコースティック。パズル操作中の集中を妨げない帯域に調整。 |
| チャレンジモード | `assets/audio/bgm/bgm_game_honobono.mp3` | ほのぼの – shimtone<br>https://dova-s.jp/bgm/play7650.html | エンドレスも同曲で統一し、「ギター/ロック系が苦手」というリクエストに対応。 |
| クリア演出 | `assets/audio/bgm/bgm_clear_tailwag.wav` | FanFare!! – Kei Morimoto<br>https://dova-s.jp/bgm/play15056.html | 3秒で喜びを伝えるブラス主体のファンファーレ。非ループ推奨。 |
| ゲームオーバー | `assets/audio/bgm/bgm_gameover_waltz.wav` | 眠れぬ夜はワルツを – こっけ<br>https://dova-s.jp/bgm/play16611.html | しょんぼりしつつも優しい雰囲気。フェードアウト再生。 |

## 3. SE セットリスト（効果音ラボ）
| 用途 | 保存ファイル | 効果音名 (カテゴリーURL) | 備考 |
| --- | --- | --- | --- |
| 決定/ボタンUP | `assets/audio/se/ui_select_soft.mp3` | 決定ボタンを押す45<br>https://soundeffect-lab.info/sound/button/ | クセの少ない「キュピッ」。ノンパズル選択音。 |
| トグルON/OFF | `assets/audio/se/ui_toggle_decision35.wav` | 決定ボタンを押す35<br>同上 | 少し長めのポップ音でON/OFFを明確化。 |
| 描画開始 | `assets/audio/se/draw_start_decision39.wav` | 決定ボタンを押す39<br>同上 | 「ぷにっ」とした開始フィードバック。 |
| 描画中ステップ | `assets/audio/se/draw_trail_cursor11.mp3` | カーソル移動11<br>https://soundeffect-lab.info/sound/button/ | 指なぞりに寄り添うサラッとした電子摩擦音。 |
| ペア接続完了 | `assets/audio/se/connect_soft_correct2.mp3` | クイズ正解2<br>https://soundeffect-lab.info/sound/anime/ | 木琴主体で控えめな「ピロン」。繋がり演出用。 |
| エラー/交差 | `assets/audio/se/fail_incorrect2.mp3` | クイズ不正解2<br>同上 | 柔らかく下降する2音でミスを優しく通知。 |
| リセット | `assets/audio/se/reset_menu4.wav` | メニューを開く4<br>同上 | 巻き戻し感のあるウインドウ音。 |
| ヒント | `assets/audio/se/hint_data_display1.wav` | データ表示1<br>同上 | 情報ポップを想起するアルペジオ。 |
| クリアジングル | `assets/audio/se/clear_kiraan1.mp3` | きらーん1<br>https://soundeffect-lab.info/sound/anime/ | 透明感のある「キラーン」で最も嬉しい瞬間を演出。 |
| ゲームオーバー | `assets/audio/se/gameover_cancel5.wav` | キャンセル5<br>同上 | 「シュッ」と短く次の挑戦を促す。 |
| チャレンジコンボ | `assets/audio/se/challenge_combo_roulette.wav` | 電子ルーレット停止ボタンを押す<br>同上 | コンボ数表示と同期。 |
| 実績/購入完了 | `assets/audio/se/achievement_message_display3.wav` | メッセージ表示音3<br>同上 | アチーブメント到達演出で使用。 |

## 4. ループ/音量設定
- ループ曲（タイトル/メニュー/ストーリー/チャレンジ）は `AudioManager` 側でループON・推奨音量を指定済み。必要に応じて `AUDIO_MAP` の `volume` を微調整してください。
- クリア/ゲームオーバーBGMはループOFF。シーン遷移前にフェードアウトしなくても演出で被らない長さを選定しています。
- 効果音は短尺なのでPhaserのワンショット再生でOKです。カスタム音量が必要な場合は `AudioManager.playSfx` 呼び出し時に `config` を渡せます。

## 5. 今後の差し替え時のチェックリスト
- 新しいファイルを入れたら `npm run dev` を再起動してブラウザキャッシュをクリア。
- Phaserのloaderログに404が出ていないかDevToolsで確認。
- ループシームが気になる場合はDOVAのWAV版をダウンロードし、DAWでループポイント調整→再エンコードしてください。
