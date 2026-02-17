"""
肉球画像中央配置スクリプト
- 透明部分を検出して肉球を画像中央に配置
- 元画像はバックアップを取る
"""

from PIL import Image
import os
import shutil
from datetime import datetime

# 設定
BACKUP_FOLDER = "_backup_originals"
INPUT_FOLDER = "individual"

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


def center_image(img):
    """
    画像を元のサイズのキャンバス中央に配置
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    original_width, original_height = img.size
    
    # 不透明部分のバウンディングボックスを取得
    bbox = get_content_bbox(img)
    
    if bbox is None:
        print("  警告: 画像が完全に透明です")
        return img
    
    left, top, right, bottom = bbox
    content_width = right - left
    content_height = bottom - top
    
    # コンテンツ部分をクロップ
    content = img.crop(bbox)
    
    # 新しいキャンバス（透明、元の画像と同じサイズ）
    result = Image.new('RGBA', (original_width, original_height), (0, 0, 0, 0))
    
    # 中央に配置
    paste_x = (original_width - content_width) // 2
    paste_y = (original_height - content_height) // 2
    
    result.paste(content, (paste_x, paste_y), content)
    
    # オフセット情報を計算
    original_center_x = (left + right) // 2
    original_center_y = (top + bottom) // 2
    new_center_x = original_width // 2
    new_center_y = original_height // 2
    offset_x = new_center_x - original_center_x
    offset_y = new_center_y - original_center_y
    
    return result, offset_x, offset_y


def process_all_paws():
    """
    全肉球画像を処理
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_dir = os.path.join(base_dir, INPUT_FOLDER)
    backup_dir = os.path.join(base_dir, BACKUP_FOLDER)
    
    # バックアップフォルダ作成
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, timestamp)
    os.makedirs(backup_path, exist_ok=True)
    
    print("=" * 50)
    print("肉球画像中央配置ツール")
    print("=" * 50)
    print(f"入力フォルダ: {input_dir}")
    print(f"バックアップ先: {backup_path}")
    print("=" * 50)
    
    total_processed = 0
    total_errors = 0
    
    # PNGファイルを処理
    for filename in sorted(os.listdir(input_dir)):
        if not filename.endswith('.png'):
            continue
        
        img_path = os.path.join(input_dir, filename)
        
        try:
            # バックアップ
            shutil.copy2(img_path, os.path.join(backup_path, filename))
            
            # 画像処理
            img = Image.open(img_path)
            original_size = img.size
            
            bbox = get_content_bbox(img)
            if bbox:
                print(f"\n{filename}:")
                print(f"  元のコンテンツ位置: ({bbox[0]}, {bbox[1]}) - ({bbox[2]}, {bbox[3]})")
                
                result, offset_x, offset_y = center_image(img)
                
                # 保存
                result.save(img_path, 'PNG', optimize=True)
                
                print(f"  移動量: X={offset_x:+d}px, Y={offset_y:+d}px")
                print(f"  完了")
                total_processed += 1
            else:
                print(f"  {filename}: 透明画像のためスキップ")
                
        except Exception as e:
            print(f"  {filename} エラー: {e}")
            total_errors += 1
    
    print("\n" + "=" * 50)
    print(f"処理完了: {total_processed}枚")
    if total_errors > 0:
        print(f"エラー: {total_errors}枚")
    print(f"バックアップ: {backup_path}")
    print("=" * 50)


def preview_single(filename):
    """
    単一画像のプレビュー処理（テスト用）
    """
    base_dir = os.path.dirname(os.path.abspath(__file__))
    img_path = os.path.join(base_dir, INPUT_FOLDER, filename)
    
    if not os.path.exists(img_path):
        print(f"画像が見つかりません: {img_path}")
        return
    
    img = Image.open(img_path)
    print(f"画像サイズ: {img.size}")
    
    bbox = get_content_bbox(img)
    if bbox:
        print(f"コンテンツ領域: ({bbox[0]}, {bbox[1]}) - ({bbox[2]}, {bbox[3]})")
        print(f"コンテンツサイズ: {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]}")
        
        # 中央からのオフセットを計算
        img_center_x = img.size[0] // 2
        img_center_y = img.size[1] // 2
        content_center_x = (bbox[0] + bbox[2]) // 2
        content_center_y = (bbox[1] + bbox[3]) // 2
        
        print(f"画像中央: ({img_center_x}, {img_center_y})")
        print(f"コンテンツ中央: ({content_center_x}, {content_center_y})")
        print(f"ズレ: X={content_center_x - img_center_x}px, Y={content_center_y - img_center_y}px")
    
    result, offset_x, offset_y = center_image(img)
    
    # プレビュー保存
    preview_path = os.path.join(base_dir, f"_preview_{filename}")
    result.save(preview_path, 'PNG')
    print(f"プレビュー保存: {preview_path}")


if __name__ == "__main__":
    import sys
    
    # Windows コンソール用 UTF-8 設定
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    if len(sys.argv) > 1 and sys.argv[1] == "--preview":
        # プレビューモード: python center_paws.py --preview paw_gold_bone.png
        filename = sys.argv[2] if len(sys.argv) > 2 else "paw_gold_bone.png"
        preview_single(filename)
    elif len(sys.argv) > 1 and sys.argv[1] == "--run":
        # 確認なしで実行
        process_all_paws()
    else:
        # 全処理モード
        print("\n全ての肉球画像を中央配置します。")
        print("元画像はバックアップされます。")
        response = input("続行しますか？ (y/N): ")
        
        if response.lower() == 'y':
            process_all_paws()
        else:
            print("キャンセルしました。")
