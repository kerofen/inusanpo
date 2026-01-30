"""
犬画像中央配置スクリプト
- 透明部分を検出してワンコを中央に配置
- パディング付きで余裕を持たせる
- 元画像はバックアップを取る
"""

from PIL import Image
import os
import shutil
from datetime import datetime

# 設定
OUTPUT_SIZE = 512  # 出力サイズ（正方形）
PADDING_RATIO = 0.04  # パディング比率（4%の余白）
BACKUP_FOLDER = "_backup_originals"

# 処理対象フォルダ
DOG_FOLDERS = [
    "dog_01_shiba",
    "dog_02_pug",
    "dog_03_toypoodle",
    "dog_04_husky",
    "dog_05_golden",
    "dog_06_corgi",
    "dog_07_dalmatian",
    "dog_08_chihuahua",
    "dog_09_schnauzer",
    "dog_10_doberman",
    "dog_11_stbernard",
    "dog_12_borzoi",
    "dog_13_bernese",
    "dog_14_samoyed",
    "dog_15_greatdane",
    "dog_16_cavalier",
    "dog_17_jackrussell",
    "dog_18_papillon",
    "dog_19_bulldog",
    "dog_20_blackshiba",
    # 新しい犬種（21-32）
    "dog_21_chipoo",
    "dog_22_dachshund",
    "dog_23_bichon",
    "dog_24_pomeranian",
    "dog_25_chowchow",
    "dog_26_newfoundland",
    "dog_27_sharpei",
    "dog_28_chinesecrested",
    "dog_29_goldenwanko",
    "dog_30_bordercollie",
    "dog_31_beagle",
    "dog_32_maltese",
]

EXPRESSIONS = ["neutral", "happy", "sad", "excited"]


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
        return img
    
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


def process_all_dogs():
    """
    全犬画像を処理
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backup_dir = os.path.join(base_dir, BACKUP_FOLDER)
    
    # バックアップフォルダ作成
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, timestamp)
    
    print("=" * 50)
    print("🐕 犬画像中央配置ツール")
    print("=" * 50)
    print(f"出力サイズ: {OUTPUT_SIZE}x{OUTPUT_SIZE}px")
    print(f"パディング: {PADDING_RATIO * 100}%")
    print(f"バックアップ先: {backup_path}")
    print("=" * 50)
    
    total_processed = 0
    total_errors = 0
    
    for dog_folder in DOG_FOLDERS:
        dog_path = os.path.join(base_dir, dog_folder)
        
        if not os.path.exists(dog_path):
            print(f"⚠ フォルダが見つかりません: {dog_folder}")
            continue
        
        print(f"\n📁 {dog_folder}")
        
        for expression in EXPRESSIONS:
            img_name = f"{expression}.png"
            img_path = os.path.join(dog_path, img_name)
            
            if not os.path.exists(img_path):
                print(f"  ⚠ {img_name} が見つかりません")
                continue
            
            try:
                # バックアップ
                backup_dog_dir = os.path.join(backup_path, dog_folder)
                os.makedirs(backup_dog_dir, exist_ok=True)
                shutil.copy2(img_path, os.path.join(backup_dog_dir, img_name))
                
                # 画像処理
                img = Image.open(img_path)
                original_size = img.size
                
                result = center_and_pad_image(img, OUTPUT_SIZE, PADDING_RATIO)
                
                # 保存
                result.save(img_path, 'PNG', optimize=True)
                
                print(f"  ✓ {img_name} ({original_size[0]}x{original_size[1]} → {OUTPUT_SIZE}x{OUTPUT_SIZE})")
                total_processed += 1
                
            except Exception as e:
                print(f"  ✗ {img_name} エラー: {e}")
                total_errors += 1
    
    print("\n" + "=" * 50)
    print(f"✅ 処理完了: {total_processed}枚")
    if total_errors > 0:
        print(f"❌ エラー: {total_errors}枚")
    print(f"💾 バックアップ: {backup_path}")
    print("=" * 50)


def preview_single(dog_folder, expression="neutral"):
    """
    単一画像のプレビュー処理（テスト用）
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    img_path = os.path.join(base_dir, dog_folder, f"{expression}.png")
    
    if not os.path.exists(img_path):
        print(f"画像が見つかりません: {img_path}")
        return
    
    img = Image.open(img_path)
    print(f"元画像サイズ: {img.size}")
    
    bbox = get_content_bbox(img)
    if bbox:
        print(f"コンテンツ領域: {bbox}")
        print(f"コンテンツサイズ: {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]}")
    
    result = center_and_pad_image(img, OUTPUT_SIZE, PADDING_RATIO)
    
    # プレビュー保存
    preview_path = os.path.join(base_dir, f"_preview_{dog_folder}_{expression}.png")
    result.save(preview_path, 'PNG')
    print(f"プレビュー保存: {preview_path}")


def restore_from_backup(backup_timestamp):
    """
    バックアップから元画像を復元
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backup_path = os.path.join(base_dir, BACKUP_FOLDER, backup_timestamp)
    
    if not os.path.exists(backup_path):
        print(f"Backup not found: {backup_path}")
        return False
    
    print(f"Restoring from: {backup_path}")
    
    for dog_folder in DOG_FOLDERS:
        backup_dog_dir = os.path.join(backup_path, dog_folder)
        target_dog_dir = os.path.join(base_dir, dog_folder)
        
        if not os.path.exists(backup_dog_dir):
            continue
        
        for filename in os.listdir(backup_dog_dir):
            if filename.endswith('.png'):
                src = os.path.join(backup_dog_dir, filename)
                dst = os.path.join(target_dog_dir, filename)
                shutil.copy2(src, dst)
                print(f"  Restored: {dog_folder}/{filename}")
    
    print("Restore complete!")
    return True


if __name__ == "__main__":
    import sys
    
    # Windows コンソール用 UTF-8 設定
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    if len(sys.argv) > 1 and sys.argv[1] == "--preview":
        # プレビューモード: python center_dogs.py --preview dog_01_shiba neutral
        dog = sys.argv[2] if len(sys.argv) > 2 else "dog_01_shiba"
        expr = sys.argv[3] if len(sys.argv) > 3 else "neutral"
        preview_single(dog, expr)
    elif len(sys.argv) > 1 and sys.argv[1] == "--run":
        # 確認なしで実行
        process_all_dogs()
    elif len(sys.argv) > 2 and sys.argv[1] == "--restore":
        # バックアップから復元: python center_dogs.py --restore 20260116_225518
        restore_from_backup(sys.argv[2])
    else:
        # 全処理モード
        print("\n[!] All dog images will be processed.")
        print("Original images will be backed up.")
        response = input("Continue? (y/N): ")
        
        if response.lower() == 'y':
            process_all_dogs()
        else:
            print("Cancelled.")
