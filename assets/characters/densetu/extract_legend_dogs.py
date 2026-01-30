"""
伝説の犬キャラクター切り抜きスクリプト
- 4x4グリッドの画像から各キャラクターを切り抜き
- 透明部分を検出して中央配置
- フォルダ分けして保存
"""

from PIL import Image
import os

# 設定
OUTPUT_SIZE = 512  # 出力サイズ（正方形）
PADDING_RATIO = 0.04  # パディング比率（4%の余白）
GRID_COLS = 4  # 列数
GRID_ROWS = 4  # 行数

# 表情の順番（左から右）
EXPRESSIONS = ["neutral", "happy", "sad", "excited"]

# 各画像の犬種定義（行ごと）
# 画像1: 18885
IMAGE_1_DOGS = [
    "legend_01_bonechi",      # 骨をくわえた白チワワ
    "legend_02_cloudpom",     # 白いふわふわ犬
    "legend_03_cyborg",       # サイボーグ犬
    "legend_04_bananabernard" # バナナセントバーナード
]

# 画像2: 18886
IMAGE_2_DOGS = [
    "legend_05_whitechi",     # 白チワワ
    "legend_06_fluffball",    # 白いもふもふ犬
    "legend_07_mechadog",     # メカ犬
    "legend_08_stbernard"     # セントバーナード
]

# 画像3: 18887（画像2と同じデザインに見えるが別バージョンとして保存）
IMAGE_3_DOGS = [
    "legend_09_whitechi2",    # 白チワワ（バージョン2）
    "legend_10_fluffball2",   # 白いもふもふ犬（バージョン2）
    "legend_11_mechadog2",    # メカ犬（バージョン2）
    "legend_12_stbernard2"    # セントバーナード（バージョン2）
]

# 画像4: 18888
IMAGE_4_DOGS = [
    "legend_13_bonechi2",     # 骨をくわえた白チワワ（バージョン2）
    "legend_14_fluffycloud",  # 白いふわふわ犬
    "legend_15_cyborgtan",    # サイボーグ犬（茶色バージョン）
    "legend_16_bananabernard2" # バナナセントバーナード（バージョン2）
]

# 画像5: 40798
IMAGE_5_DOGS = [
    "legend_17_mushainu",     # 武者犬（侍の兜をかぶった柴犬）
    "legend_18_rengoku",      # 煉獄（炎をまとった犬）
    "legend_19_mizuinu",      # 水犬（水しぶきをまとった犬）
    "legend_20_kigurumi",     # きぐるみ（怪獣着ぐるみ犬）
]

# 画像6: ゴリラ（1行のみ）
IMAGE_6_DOGS = [
    "legend_21_gorilla",      # ゴリラ
]

# 入力ファイルと犬種のマッピング
INPUT_FILES = {
    "freepik__4x441234-__18885 (1).png": IMAGE_1_DOGS,
    "freepik__4x441234-__18886 (1).png": IMAGE_2_DOGS,
    "freepik__4x441234-__18887 (1).png": IMAGE_3_DOGS,
    "freepik__4x441234-__18888 (1).png": IMAGE_4_DOGS,
    "freepik__4x441234-__40798 (1).png": IMAGE_5_DOGS,
    "背景_を_削除 プロジェクト (3).png": IMAGE_6_DOGS,
}


def get_content_bbox(img):
    """
    透明でない部分のバウンディングボックスを取得
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # アルファチャンネルを取得
    alpha = img.split()[3]
    
    # 不透明部分のバウンディングボックス
    bbox = alpha.getbbox()
    return bbox


def center_and_pad_image(img, output_size, padding_ratio):
    """
    画像を中央配置してパディング付きで出力
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # 不透明部分のバウンディングボックスを取得
    bbox = get_content_bbox(img)
    
    if bbox is None:
        print("  ⚠ 画像が完全に透明です")
        # 透明な画像をそのまま返す
        result = Image.new('RGBA', (output_size, output_size), (0, 0, 0, 0))
        return result
    
    # コンテンツ部分をクロップ
    content = img.crop(bbox)
    content_width, content_height = content.size
    
    # パディングを考慮した利用可能領域
    available_size = int(output_size * (1 - padding_ratio * 2))
    
    # アスペクト比を維持してリサイズ
    scale = min(available_size / content_width, available_size / content_height)
    new_width = int(content_width * scale)
    new_height = int(content_height * scale)
    
    # 高品質リサイズ
    content_resized = content.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # 新しいキャンバス（透明）
    result = Image.new('RGBA', (output_size, output_size), (0, 0, 0, 0))
    
    # 中央に配置
    paste_x = (output_size - new_width) // 2
    paste_y = (output_size - new_height) // 2
    
    result.paste(content_resized, (paste_x, paste_y), content_resized)
    
    return result


def extract_grid_cell(img, row, col, cell_width, cell_height):
    """
    グリッドから指定のセルを切り抜き
    """
    left = col * cell_width
    upper = row * cell_height
    right = left + cell_width
    lower = upper + cell_height
    
    return img.crop((left, upper, right, lower))


def process_image(input_path, dog_names, output_base_dir):
    """
    1枚の画像から全キャラクターを切り抜き
    """
    print(f"\n📷 処理中: {os.path.basename(input_path)}")
    
    img = Image.open(input_path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    width, height = img.size
    print(f"   画像サイズ: {width}x{height}")
    
    cell_width = width // GRID_COLS
    cell_height = height // GRID_ROWS
    print(f"   セルサイズ: {cell_width}x{cell_height}")
    
    processed_count = 0
    
    for row, dog_name in enumerate(dog_names):
        # 出力フォルダを作成
        output_dir = os.path.join(output_base_dir, dog_name)
        os.makedirs(output_dir, exist_ok=True)
        print(f"\n   📁 {dog_name}/")
        
        for col, expression in enumerate(EXPRESSIONS):
            # セルを切り抜き
            cell = extract_grid_cell(img, row, col, cell_width, cell_height)
            
            # 中央配置して保存
            centered = center_and_pad_image(cell, OUTPUT_SIZE, PADDING_RATIO)
            
            # 保存
            output_path = os.path.join(output_dir, f"{expression}.png")
            centered.save(output_path, 'PNG', optimize=True)
            
            print(f"      ✓ {expression}.png")
            processed_count += 1
    
    return processed_count


def main():
    """
    メイン処理
    """
    import sys
    
    # Windows コンソール用 UTF-8 設定
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_base_dir = os.path.dirname(base_dir)  # charactersフォルダ
    
    print("=" * 60)
    print("🌟 伝説の犬キャラクター切り抜きツール")
    print("=" * 60)
    print(f"出力サイズ: {OUTPUT_SIZE}x{OUTPUT_SIZE}px")
    print(f"パディング: {PADDING_RATIO * 100}%")
    print(f"出力先: {output_base_dir}")
    print("=" * 60)
    
    total_processed = 0
    
    for filename, dog_names in INPUT_FILES.items():
        input_path = os.path.join(base_dir, filename)
        
        if not os.path.exists(input_path):
            print(f"\n⚠ ファイルが見つかりません: {filename}")
            continue
        
        count = process_image(input_path, dog_names, output_base_dir)
        total_processed += count
    
    print("\n" + "=" * 60)
    print(f"✅ 処理完了: {total_processed}枚の画像を生成")
    print("=" * 60)
    
    # 生成されたフォルダ一覧
    print("\n📂 生成されたフォルダ:")
    for dogs in INPUT_FILES.values():
        for dog in dogs:
            folder_path = os.path.join(output_base_dir, dog)
            if os.path.exists(folder_path):
                print(f"   - {dog}/")


if __name__ == "__main__":
    main()
