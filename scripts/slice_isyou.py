"""
きせかえアイテム画像（isyou.png）を4x4グリッドで切り抜くスクリプト
16個のアクセサリーアイテムを個別のPNG画像に分割
"""

from PIL import Image
import os

# アイテムの名前マッピング（左上から右へ、上から下へ）
ISYOU_ITEMS = [
    # 1行目
    "ribbon_red",       # 赤リボン
    "ribbon_brown",     # 茶色リボン
    "crown_gold",       # 王冠
    "scarf_blue",       # 青マフラー
    
    # 2行目
    "glasses_star",     # 星サングラス
    "flower_sakura",    # 桜の花
    "bandana_camo",     # バンダナ
    "beret",            # ベレー帽
    
    # 3行目
    "headphone",        # ヘッドフォン
    "badge_paw",        # 肉球バッジ
    "flower_sunflower", # ひまわり
    "hat_straw",        # 麦わら帽子
    
    # 4行目
    "glasses",          # サングラス
    "headband_cat",     # 猫耳カチューシャ
    "scarf_white",      # 白スカーフ
    "hat_explorer",     # 探検帽
]

def slice_isyou(input_path, output_dir, grid_size=4):
    """
    4x4グリッドの画像を個別のアイテムに切り抜く
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
    
    # 各アイテムを切り抜き
    for i, name in enumerate(ISYOU_ITEMS):
        row = i // grid_size
        col = i % grid_size
        
        # 切り抜き範囲を計算
        left = col * cell_width
        top = row * cell_height
        right = left + cell_width
        bottom = top + cell_height
        
        # 切り抜き
        item = img.crop((left, top, right, bottom))
        
        # 透明部分をトリミング（余白を削除）
        bbox = item.getbbox()
        if bbox:
            # 少しのパディングを追加（5ピクセル）
            padding = 5
            left_trim = max(0, bbox[0] - padding)
            top_trim = max(0, bbox[1] - padding)
            right_trim = min(item.width, bbox[2] + padding)
            bottom_trim = min(item.height, bbox[3] + padding)
            item = item.crop((left_trim, top_trim, right_trim, bottom_trim))
        
        # 保存
        output_path = os.path.join(output_dir, f"{name}.png")
        item.save(output_path, "PNG")
        
        print(f"[OK] {name}.png ({item.width}x{item.height})")
    
    print(f"\n[DONE] {len(ISYOU_ITEMS)} items saved to {output_dir}")


def main():
    """
    メイン処理
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    
    input_path = os.path.join(project_dir, "assets", "kisekae", "isyou", "isyou.png")
    output_dir = os.path.join(project_dir, "assets", "kisekae", "isyou")
    
    if not os.path.exists(input_path):
        print(f"[ERROR] {input_path} not found")
        return
    
    print(f"\n{'='*50}")
    print(f"[START] Processing isyou.png")
    print(f"Input: {input_path}")
    print(f"Output: {output_dir}")
    print(f"{'='*50}\n")
    
    slice_isyou(input_path, output_dir)


if __name__ == "__main__":
    main()
