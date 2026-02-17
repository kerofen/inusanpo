"""
肉球アセットを16個に切り抜くスクリプト
4x4のグリッドから個別の画像に分割
"""

from PIL import Image
import os

# 画像を読み込み
input_path = "freepik__4416ui__39161 (1).png"
img = Image.open(input_path)

print(f"画像サイズ: {img.size}")
print(f"モード: {img.mode}")

width, height = img.size

# 4x4のグリッドなので、各セルのサイズを計算
cols = 4
rows = 4
cell_width = width // cols
cell_height = height // rows

print(f"セルサイズ: {cell_width} x {cell_height}")

# 各肉球の名前（左上から右下へ、行ごとに）
paw_names = [
    # 1行目
    "paw_pink_heart",      # ピンク＋ハート
    "paw_blue_heart",      # 水色＋ハート
    "paw_yellow_star",     # 黄色＋星
    "paw_green_star",      # 緑＋星
    # 2行目
    "paw_orange_heart",    # オレンジ＋ハート
    "paw_purple_star",     # 紫＋星
    "paw_brown_bone",      # 茶色＋骨
    "paw_gray_bone",       # グレー＋骨
    # 3行目
    "paw_red_heart",       # 赤＋ハート
    "paw_teal_bone",       # ティール＋骨
    "paw_lime_bone",       # ライム＋骨
    "paw_lavender_bone",   # ラベンダー＋骨
    # 4行目
    "paw_magenta_sparkle", # マゼンタ＋キラキラ
    "paw_cyan_bone",       # シアン＋骨
    "paw_gold_bone",       # ゴールド＋骨
    "paw_rainbow_sparkle", # レインボー＋キラキラ
]

# 出力ディレクトリ
output_dir = "individual"
os.makedirs(output_dir, exist_ok=True)

# 切り抜いて保存
for idx, name in enumerate(paw_names):
    row = idx // cols
    col = idx % cols
    
    left = col * cell_width
    top = row * cell_height
    right = left + cell_width
    bottom = top + cell_height
    
    # 切り抜き
    paw_img = img.crop((left, top, right, bottom))
    
    # 保存
    output_path = os.path.join(output_dir, f"{name}.png")
    paw_img.save(output_path, "PNG")
    print(f"保存: {output_path} (位置: {row+1}行{col+1}列)")

print(f"\n完了！{len(paw_names)}個の肉球を切り抜きました。")
