"""
画像下部のゴミを除去して中央配置
NumPy不要版
"""

from PIL import Image
import os

OUTPUT_SIZE = 512
PADDING_RATIO = 0.04

def remove_bottom_artifacts(img, bottom_percent=0.15):
    """
    画像下部の孤立したピクセル（ゴミ）を除去
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # ピクセルデータを取得
    pixels = img.load()
    width, height = img.size
    
    # 下部領域（下から15%）
    bottom_start = int(height * (1 - bottom_percent))
    
    # 下部領域で孤立したピクセルを除去
    for y in range(bottom_start, height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a > 0:  # 不透明ピクセル
                # 周囲の不透明ピクセル数をカウント
                neighbors = 0
                search_range = 8
                for dy in range(-search_range, search_range + 1):
                    for dx in range(-search_range, search_range + 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < width and 0 <= ny < height:
                            _, _, _, na = pixels[nx, ny]
                            if na > 0:
                                neighbors += 1
                
                # 孤立している場合は透明化
                if neighbors < 80:  # 閾値
                    pixels[x, y] = (0, 0, 0, 0)
    
    return img


def get_content_bbox(img):
    """透明でない部分のバウンディングボックスを取得"""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    alpha = img.split()[3]
    return alpha.getbbox()


def center_and_pad_image(img, output_size, padding_ratio):
    """画像を中央配置してパディング付きで出力"""
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    bbox = get_content_bbox(img)
    if bbox is None:
        return img
    
    content = img.crop(bbox)
    content_width, content_height = content.size
    
    available_size = int(output_size * (1 - padding_ratio * 2))
    scale = min(available_size / content_width, available_size / content_height)
    new_width = int(content_width * scale)
    new_height = int(content_height * scale)
    
    content_resized = content.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    result = Image.new('RGBA', (output_size, output_size), (0, 0, 0, 0))
    paste_x = (output_size - new_width) // 2
    paste_y = (output_size - new_height) // 2
    result.paste(content_resized, (paste_x, paste_y), content_resized)
    
    return result


def fix_image(img_path):
    """画像を修正"""
    print(f"Processing: {img_path}")
    
    # 元画像を読み込み
    img = Image.open(img_path)
    original_bbox = get_content_bbox(img)
    print(f"  Original bbox: {original_bbox}")
    
    # ゴミ除去
    img_cleaned = remove_bottom_artifacts(img)
    cleaned_bbox = get_content_bbox(img_cleaned)
    print(f"  Cleaned bbox: {cleaned_bbox}")
    
    # 中央配置
    result = center_and_pad_image(img_cleaned, OUTPUT_SIZE, PADDING_RATIO)
    
    # 保存
    result.save(img_path, 'PNG', optimize=True)
    print(f"  Saved!")


if __name__ == "__main__":
    import sys
    
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 修正対象ファイル
    files_to_fix = [
        "dog_03_toypoodle/happy.png",
        "dog_03_toypoodle/neutral.png",
    ]
    
    for f in files_to_fix:
        img_path = os.path.join(base_dir, f)
        if os.path.exists(img_path):
            fix_image(img_path)
        else:
            print(f"Not found: {img_path}")
    
    print("\nDone!")
