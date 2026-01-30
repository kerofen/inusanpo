# -*- coding: utf-8 -*-
"""
新しい犬キャラクター画像切り抜きスクリプト
12種類の犬を各4表情で切り抜いて保存（犬21〜32）
"""

from PIL import Image
from pathlib import Path
import sys

# Windows コンソール用 UTF-8 設定
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ベースパス
BASE_DIR = Path(r"C:\Users\janne\Documents\APP-KEROFEN\inusanpo")
SOURCE_DIR = BASE_DIR / "assets" / "characters"  # 新画像はここにある
OUTPUT_DIR = BASE_DIR / "assets" / "characters"

# 表情の順序（左から右へ）
EXPRESSIONS = ["neutral", "happy", "sad", "excited"]

# 新しい犬種リスト（12種）
NEW_DOG_LIST = [
    # ID, 英名, 日本語名
    (21, "chipoo", "チワプー"),
    (22, "dachshund", "ダックスフンド"),
    (23, "bichon", "ビションフリーゼ"),
    (24, "pomeranian", "ポメラニアン"),
    (25, "chowchow", "チャウチャウ"),
    (26, "newfoundland", "ニューファンドランド"),
    (27, "sharpei", "シャーペイ"),
    (28, "chinesecrested", "チャイニーズクレステッド"),
    (29, "goldenwanko", "ゴールデンワンコ"),
    (30, "bordercollie", "ボーダーコリー"),
    (31, "beagle", "ビーグル"),
    (32, "maltese", "マルチーズ"),
]

# 各画像ファイルと犬種のマッピング
# 全て 4x4 グリッド（4犬種 × 4表情）
NEW_IMAGE_CONFIG = {
    # 6.png: チワプー、ダックスフンド、ビションフリーゼ、ポメラニアン
    "6.png": {
        "dogs": ["chipoo", "dachshund", "bichon", "pomeranian"]
    },
    # 7.png: チャウチャウ、ニューファンドランド、シャーペイ、チャイニーズクレステッド
    "7.png": {
        "dogs": ["chowchow", "newfoundland", "sharpei", "chinesecrested"]
    },
    # 8.png: ゴールデンワンコ、ボーダーコリー、ビーグル、マルチーズ
    "8.png": {
        "dogs": ["goldenwanko", "bordercollie", "beagle", "maltese"]
    },
}

# セルから内側に切り込む量
INSET_PX = 1

# 微調整用（必要に応じて追加）
ADJUSTMENTS = {}


def main():
    print("=" * 60)
    print("NEW DOG CHARACTER IMAGE SLICER (21-32)")
    print("=" * 60)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 犬種ごとの出力先マッピングを作成
    dog_info = {dog_en: (dog_id, dog_ja) for dog_id, dog_en, dog_ja in NEW_DOG_LIST}
    
    all_results = []
    processed_dogs = set()
    
    # 各画像を処理
    for file_name, config in NEW_IMAGE_CONFIG.items():
        print(f"\n[File] {file_name}")
        source_path = SOURCE_DIR / file_name
        
        if not source_path.exists():
            print(f"  WARNING: File not found: {source_path}")
            continue
        
        img = Image.open(source_path)
        width, height = img.size
        dogs = config["dogs"]
        
        # 全て 4x4 グリッド
        rows, cols = 4, 4
        cell_width = width // cols
        cell_height = height // rows
        
        print(f"  Image size: {width}x{height}, Grid: {rows}x{cols}")
        print(f"  Cell size: {cell_width}x{cell_height}, Inset: {INSET_PX}px")
        
        for dog_idx, dog_en in enumerate(dogs):
            dog_id, dog_ja = dog_info[dog_en]
            print(f"  [{dog_id:02d}] {dog_ja} ({dog_en})")
            
            # 出力フォルダを作成（連番で命名）
            dog_folder = OUTPUT_DIR / f"dog_{str(dog_id).zfill(2)}_{dog_en}"
            dog_folder.mkdir(parents=True, exist_ok=True)
            
            for expr_idx, expression in enumerate(EXPRESSIONS):
                # 切り抜き座標を計算（内側に1px切り込む）
                base_left = expr_idx * cell_width + INSET_PX
                base_top = dog_idx * cell_height + INSET_PX
                base_right = base_left + cell_width - (INSET_PX * 2)
                base_bottom = base_top + cell_height - (INSET_PX * 2)

                # 個別微調整
                adj = ADJUSTMENTS.get((dog_en, expression), {})
                left = base_left + adj.get("left", 0)
                top = base_top + adj.get("top", 0)
                right = base_right - adj.get("right", 0)
                bottom = base_bottom - adj.get("bottom", 0)

                # 安全チェック
                left = max(0, left)
                top = max(0, top)
                right = min(width, right)
                bottom = min(height, bottom)

                # 切り抜き
                cell = img.crop((left, top, right, bottom))
                
                # 保存
                output_path = dog_folder / f"{expression}.png"
                cell.save(output_path, "PNG")
                
                all_results.append({
                    "id": dog_id,
                    "dog_ja": dog_ja,
                    "dog": dog_en,
                    "expression": expression,
                    "path": str(output_path),
                    "size": cell.size
                })
                print(f"      {expression}: {cell.size[0]}x{cell.size[1]}")
            
            processed_dogs.add(dog_en)
    
    print("\n" + "=" * 60)
    print(f"COMPLETE! Processed {len(processed_dogs)} new dog breeds")
    print("=" * 60)
    
    return all_results, len(processed_dogs)


if __name__ == "__main__":
    results, count = main()
