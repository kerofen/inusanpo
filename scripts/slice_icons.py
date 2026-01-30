"""
4x4グリッドのアイコン画像を切り抜くスクリプト
3種類のスプライトシート（inu1, inu2, inu3）に対応
"""

from PIL import Image
import os

# アイコンの名前マッピング（左上から右へ、上から下へ）
ICON_NAMES = [
    # 1行目
    "settings",      # 歯車 - 設定
    "music",         # 音符 - 音楽
    "sound",         # スピーカー - 効果音
    "vibration",     # 振動/通知
    
    # 2行目
    "back",          # 左矢印 - 戻る
    "home",          # 犬小屋 - ホーム
    "refresh",       # リフレッシュ - リセット/再読込
    "hint",          # 電球 - ヒント
    
    # 3行目
    "play",          # 再生ボタン - プレイ
    "pause",         # 一時停止（骨）
    "star",          # 星 - お気に入り/クリア
    "lock",          # 鍵 - ロック
    
    # 4行目
    "coin",          # 肉球コイン - 通貨
    "paw",           # 肉球
    "heart",         # ハート - ライフ/お気に入り
    "share",         # シェア
]

# スプライトシートの種類
SPRITE_SHEETS = ["inu1", "inu2", "inu3"]

def slice_icons(input_path, output_dir, grid_size=4):
    """
    4x4グリッドの画像を個別のアイコンに切り抜く
    """
    # 画像を読み込み
    img = Image.open(input_path)
    width, height = img.size
    
    print(f"入力画像: {width}x{height}")
    
    # 各セルのサイズを計算
    cell_width = width // grid_size
    cell_height = height // grid_size
    
    print(f"セルサイズ: {cell_width}x{cell_height}")
    
    # 出力ディレクトリを作成
    os.makedirs(output_dir, exist_ok=True)
    
    # 各アイコンを切り抜き
    for i, name in enumerate(ICON_NAMES):
        row = i // grid_size
        col = i % grid_size
        
        # 切り抜き範囲を計算
        left = col * cell_width
        top = row * cell_height
        right = left + cell_width
        bottom = top + cell_height
        
        # 切り抜き
        icon = img.crop((left, top, right, bottom))
        
        # 透明部分をトリミング（余白を削除）
        bbox = icon.getbbox()
        if bbox:
            # 少しのパディングを追加（10ピクセル）
            padding = 10
            left_trim = max(0, bbox[0] - padding)
            top_trim = max(0, bbox[1] - padding)
            right_trim = min(icon.width, bbox[2] + padding)
            bottom_trim = min(icon.height, bbox[3] + padding)
            icon = icon.crop((left_trim, top_trim, right_trim, bottom_trim))
        
        # 保存
        output_path = os.path.join(output_dir, f"{name}.png")
        icon.save(output_path, "PNG")
        
        print(f"[OK] {name}.png ({icon.width}x{icon.height})")
    
    print(f"\n[DONE] {len(ICON_NAMES)} icons saved to {output_dir}")


def slice_all_icon_sheets():
    """
    全てのスプライトシート（inu1, inu2, inu3）を処理
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    icon_dir = os.path.join(project_dir, "assets", "icon")
    
    for sheet_name in SPRITE_SHEETS:
        input_path = os.path.join(icon_dir, f"{sheet_name}.png")
        output_dir = os.path.join(icon_dir, sheet_name)
        
        if not os.path.exists(input_path):
            print(f"[SKIP] {sheet_name}.png not found")
            continue
        
        print(f"\n{'='*50}")
        print(f"[START] Processing {sheet_name}.png")
        print(f"Input: {input_path}")
        print(f"Output: {output_dir}")
        print(f"{'='*50}\n")
        
        slice_icons(input_path, output_dir)


if __name__ == "__main__":
    slice_all_icon_sheets()
