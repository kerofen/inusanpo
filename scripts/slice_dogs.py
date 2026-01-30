# -*- coding: utf-8 -*-
"""
犬キャラクター画像切り抜きスクリプト
20種類の犬を各4表情で切り抜いて保存
"""

from PIL import Image
from pathlib import Path

# ベースパス
BASE_DIR = Path(r"C:\Users\janne\Documents\APP-KEROFEN\inusanpo")
SOURCE_DIR = BASE_DIR / "assets" / "gazou" / "wanko"
OUTPUT_DIR = BASE_DIR / "assets" / "characters"

# 表情の順序（左から右へ）
EXPRESSIONS = ["neutral", "happy", "sad", "excited"]

# 犬種リスト（20種）- 出力順序
DOG_LIST = [
    # ID, 英名, 日本語名
    (1, "shiba", "柴犬"),
    (2, "pug", "パグ"),
    (3, "toypoodle", "トイプードル"),
    (4, "husky", "ハスキー"),
    (5, "golden", "ゴールデンレトリバー"),
    (6, "corgi", "コーギー"),
    (7, "dalmatian", "ダルメシアン"),
    (8, "chihuahua", "チワワ"),
    (9, "schnauzer", "シュナウザー"),
    (10, "doberman", "ドーベルマン"),
    (11, "stbernard", "セントバーナード"),
    (12, "borzoi", "ボルゾイ"),
    (13, "bernese", "バーニーズ"),
    (14, "samoyed", "サモエド"),
    (15, "greatdane", "グレートデン"),
    (16, "cavalier", "キャバリア"),
    (17, "jackrussell", "ジャックラッセルテリア"),
    (18, "papillon", "パピヨン"),
    (19, "bulldog", "ブルドッグ"),
    (20, "blackshiba", "黒柴"),
]

# 各画像ファイルと犬種のマッピング（実際の内容に基づく）
# 全て 4x4 グリッド
IMAGE_CONFIG = {
    # 1.png: 柴犬、パグ、トイプードル、ハスキー
    "1.png": {
        "dogs": ["shiba", "pug", "toypoodle", "husky"]
    },
    # 2-2.png: ゴールデン、コーギー、ダルメシアン、チワワ（ユーザー指定バージョン）
    "2-2.png": {
        "dogs": ["golden", "corgi", "dalmatian", "chihuahua"]
    },
    # 3-2.png: シュナウザー、ドーベルマン、セントバーナード、ボルゾイ（ユーザー指定バージョン）
    "3-2.png": {
        "dogs": ["schnauzer", "doberman", "stbernard", "borzoi"]
    },
    # 4.png: バーニーズ、サモエド、グレートデン、キャバリア
    "4.png": {
        "dogs": ["bernese", "samoyed", "greatdane", "cavalier"]
    },
    # 5.png: ジャックラッセル、パピヨン、ブルドッグ、黒柴
    "5.png": {
        "dogs": ["jackrussell", "papillon", "bulldog", "blackshiba"]
    },
}

# セルから内側に切り込む量（隣の犬の混入を防止）
INSET_PX = 1

# 微調整用の追加トリム量（必要な犬だけ設定）
# 例:
# ADJUSTMENTS = {
#     ("dalmatian", "sad"): {"left": 0, "top": 0, "right": 2, "bottom": 0},
#     ("corgi", "sad"): {"left": 0, "top": 3, "right": 0, "bottom": 0},
# }
ADJUSTMENTS = {
    # ゴミ・隣の混入対策（指定犬を上下左右10px追加カット）
    ("shiba", "neutral"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("shiba", "happy"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("shiba", "sad"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("shiba", "excited"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    # トイプードル：左右をシビアに（表情ごとに微調整）
    ("toypoodle", "neutral"): {"left": 16, "right": 2, "top": 0, "bottom": 0},
    ("toypoodle", "happy"): {"left": 16, "right": 6, "top": 0, "bottom": 0},
    ("toypoodle", "sad"): {"left": 16, "right": 16, "top": 0, "bottom": 0},
    ("toypoodle", "excited"): {"left": 6, "right": 16, "top": 0, "bottom": 0},
    ("dalmatian", "neutral"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("dalmatian", "happy"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("dalmatian", "sad"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("dalmatian", "excited"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    # チワワ：耳を切らない（上は削らず）、下の余白を詰めて中心寄せ
    ("chihuahua", "neutral"): {"left": 2, "right": 2, "top": -1, "bottom": 32},
    ("chihuahua", "happy"): {"left": 2, "right": 2, "top": -1, "bottom": 32},
    ("chihuahua", "sad"): {"left": 2, "right": 2, "top": -1, "bottom": 32},
    ("chihuahua", "excited"): {"left": 2, "right": 2, "top": -1, "bottom": 32},
    ("stbernard", "neutral"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("stbernard", "happy"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("stbernard", "sad"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("stbernard", "excited"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("bernese", "neutral"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("bernese", "happy"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("bernese", "sad"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("bernese", "excited"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("greatdane", "neutral"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("greatdane", "happy"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("greatdane", "sad"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("greatdane", "excited"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("cavalier", "neutral"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("cavalier", "happy"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("cavalier", "sad"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("cavalier", "excited"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("papillon", "neutral"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("papillon", "happy"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("papillon", "sad"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
    ("papillon", "excited"): {"left": 10, "right": 10, "top": 10, "bottom": 10},
}

def main():
    print("=" * 60)
    print("DOG CHARACTER IMAGE SLICER - FINAL")
    print("=" * 60)
    
    # 既存のcharactersフォルダをクリア（dog_で始まるフォルダのみ）
    if OUTPUT_DIR.exists():
        import shutil
        for item in OUTPUT_DIR.iterdir():
            if item.is_dir() and item.name.startswith("dog_"):
                shutil.rmtree(item)
                print(f"  Deleted: {item.name}")
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 犬種ごとの出力先マッピングを作成
    dog_info = {dog_en: (dog_id, dog_ja) for dog_id, dog_en, dog_ja in DOG_LIST}
    
    all_results = []
    processed_dogs = set()
    
    # 各画像を処理
    for file_name, config in IMAGE_CONFIG.items():
        print(f"\n[File] {file_name}")
        source_path = SOURCE_DIR / file_name
        
        if not source_path.exists():
            print(f"  WARNING: File not found: {file_name}")
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

                # 切り抜き（透過処理はしない）
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
    print(f"COMPLETE! Processed {len(processed_dogs)} dog breeds")
    print("=" * 60)
    
    # 処理されなかった犬種を確認
    all_dogs = {dog_en for _, dog_en, _ in DOG_LIST}
    missing = all_dogs - processed_dogs
    if missing:
        print(f"\nWARNING: Missing dogs: {missing}")
    
    return all_results, len(processed_dogs)

if __name__ == "__main__":
    results, count = main()
