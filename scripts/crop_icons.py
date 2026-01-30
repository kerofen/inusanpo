"""
inuicon.png から個別のアイコンを切り抜くスクリプト
4x4グリッド配置のアイコンを背景透過のまま保存
"""

from PIL import Image
import os

# 入力ファイル
INPUT_FILE = "../assets/icon/menu/inuicon.png"
OUTPUT_DIR = "../assets/icon/menu"

# アイコンの配置マップ（row, col）→ ファイル名
# 画像は4x4グリッド（16アイコン）
ICON_MAP = {
    # 1行目
    (0, 0): "osanpo",      # 柴犬（お散歩）
    (0, 1): "endless",     # 炎（エンドレス）
    (0, 2): "bonfire",     # 焚き火
    (0, 3): "settings",    # 歯車（せってい）
    # 2行目
    (1, 0): "erabu",       # 子犬（えらぶ）
    (1, 1): "zukan",       # 図鑑（ずかん）
    (1, 2): "palette",     # パレット
    (1, 3): "kisekae",     # 衣装棚（きせかえ）
    # 3行目
    (2, 0): "shop",        # ショップ
    (2, 1): "doghouse",    # 犬小屋
    (2, 2): "color",       # 肉球（カラー）
    (2, 3): "costume",     # 衣装ハンガー（衣装）
    # 4行目
    (3, 0): "ribbon",      # リボン
    (3, 1): "theme",       # 地球（テーマ）
    (3, 2): "memo",        # メモ帳
    (3, 3): "treasure",    # 宝箱
}

def crop_icons():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, INPUT_FILE)
    output_dir = os.path.join(script_dir, OUTPUT_DIR)
    
    # 出力フォルダ作成
    os.makedirs(output_dir, exist_ok=True)
    
    # 画像読み込み
    img = Image.open(input_path)
    print(f"入力画像サイズ: {img.width}x{img.height}")
    print(f"モード: {img.mode}")
    
    # グリッドサイズ計算
    cols, rows = 4, 4
    cell_width = img.width // cols
    cell_height = img.height // rows
    print(f"セルサイズ: {cell_width}x{cell_height}")
    
    # 各アイコンを切り抜き
    for (row, col), name in ICON_MAP.items():
        left = col * cell_width
        upper = row * cell_height
        right = left + cell_width
        lower = upper + cell_height
        
        # 切り抜き
        icon = img.crop((left, upper, right, lower))
        
        # 透明部分をトリミング（getbbox）
        bbox = icon.getbbox()
        if bbox:
            icon = icon.crop(bbox)
        
        # 保存
        output_path = os.path.join(output_dir, f"{name}.png")
        icon.save(output_path, "PNG")
        print(f"保存: {name}.png ({icon.width}x{icon.height})")
    
    print(f"\n完了！ {len(ICON_MAP)}個のアイコンを保存しました。")

if __name__ == "__main__":
    crop_icons()
