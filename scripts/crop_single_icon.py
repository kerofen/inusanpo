"""
iconcon.png から特定のアイコンを切り抜くスクリプト
"""

from PIL import Image
import os

# 入力ファイル
INPUT_FILE = "../assets/icon/menu/iconcon.png"
OUTPUT_DIR = "../assets/icon/menu"

def crop_single_icon():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, INPUT_FILE)
    output_dir = os.path.join(script_dir, OUTPUT_DIR)
    
    # 画像読み込み
    img = Image.open(input_path)
    print(f"入力画像サイズ: {img.width}x{img.height}")
    
    # グリッドサイズ計算（4x4）
    cols, rows = 4, 4
    cell_width = img.width // cols
    cell_height = img.height // rows
    print(f"セルサイズ: {cell_width}x{cell_height}")
    
    # 一番右の上から3番目 = (row=2, col=3)
    row, col = 2, 3
    name = "kisekae"
    
    left = col * cell_width
    upper = row * cell_height
    right = left + cell_width
    lower = upper + cell_height
    
    print(f"切り抜き位置: ({left}, {upper}) - ({right}, {lower})")
    
    # 切り抜き
    icon = img.crop((left, upper, right, lower))
    
    # 透明部分をトリミング
    bbox = icon.getbbox()
    if bbox:
        icon = icon.crop(bbox)
    
    # 保存
    output_path = os.path.join(output_dir, f"{name}.png")
    icon.save(output_path, "PNG")
    print(f"保存: {name}.png ({icon.width}x{icon.height})")

if __name__ == "__main__":
    crop_single_icon()
