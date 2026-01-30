"""
ワンコ画像アセット整理スクリプト
切り抜いた画像を game.js の DOG_TYPES に合わせて整理します
"""

import os
import shutil

# パス設定
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
SOURCE_DIR = os.path.join(PROJECT_ROOT, "assets", "gazou", "wanko", "sliced")
DEST_DIR = os.path.join(PROJECT_ROOT, "assets", "characters")

# 生成画像ファイル名 → DOG_TYPES ID のマッピング
# 注: 一部の犬種は画像がない場合がある
DOG_MAPPING = {
    # バッチ1 (1.png)
    "shiba": {"id": 1, "name": "しばいぬ"},
    "pug": {"id": 2, "name": "パグ"},
    "toypoodle": {"id": 3, "name": "トイプードル"},
    "husky": {"id": 4, "name": "ハスキー"},
    
    # バッチ2-1, 2-2
    "golden": {"id": 5, "name": "ゴールデンレトリバー"},
    "corgi": {"id": 7, "name": "コーギー"},
    "dalmatian": {"id": 8, "name": "ダルメシアン"},
    "chihuahua": {"id": 9, "name": "チワワ"},
    "boston": {"id": 15, "name": "フレンチブルドッグ"},  # 近い犬種
    
    # バッチ3-1, 3-2
    "schnauzer": {"id": 16, "name": "シュナウザー"},
    "doberman": {"id": 17, "name": "ドーベルマン"},
    "stbernard": {"id": 21, "name": "セントバーナード"},
    "whippet": {"id": 22, "name": "ボルゾイ"},  # 細長い顔が似ている
    
    # バッチ4
    "bernese": {"id": 23, "name": "バーニーズ"},
    "samoyed": {"id": 20, "name": "北海道犬"},  # 白くてもふもふ
    "weimaraner": {"id": 13, "name": "ラブラドール"},  # 近い犬種
    "cavalier": {"id": 11, "name": "ビーグル"},  # 垂れ耳が似ている
    
    # バッチ5
    "jackrussell": {"id": 12, "name": "ボーダーコリー"},  # 白茶模様
    "sheltie": {"id": 10, "name": "ポメラニアン"},  # ふわふわ
    "bulldog": {"id": 6, "name": "ブルドッグ"},
    "blackshiba": {"id": 24, "name": "白柴犬"},  # 黒柴を特別枠に（IDは変更検討）
}

# 表情のマッピング
EXPRESSIONS = {
    "normal": "neutral",
    "happy": "happy",
    "sad": "sad",
    "excited": "excited",
}


def organize_assets():
    """アセットを整理する"""
    
    # 出力ディレクトリを作成
    os.makedirs(DEST_DIR, exist_ok=True)
    
    print(f"元フォルダ: {SOURCE_DIR}")
    print(f"出力先: {DEST_DIR}")
    print()
    
    processed = 0
    skipped = 0
    
    # 各犬種のフォルダを作成してコピー
    for source_name, dog_info in DOG_MAPPING.items():
        dog_id = dog_info["id"]
        dog_name = dog_info["name"]
        
        # フォルダを作成
        dog_folder = os.path.join(DEST_DIR, f"dog_{dog_id:02d}_{source_name}")
        os.makedirs(dog_folder, exist_ok=True)
        
        print(f"ID {dog_id:2d}: {dog_name} ({source_name})")
        
        # 各表情の画像をコピー
        for src_expr, dest_expr in EXPRESSIONS.items():
            # 通常版
            src_file = f"{source_name}_{src_expr}.png"
            src_path = os.path.join(SOURCE_DIR, src_file)
            
            if os.path.exists(src_path):
                dest_file = f"{dest_expr}.png"
                dest_path = os.path.join(dog_folder, dest_file)
                shutil.copy2(src_path, dest_path)
                print(f"  {src_expr} -> {dest_expr}.png")
                processed += 1
            else:
                # _alt版を試す
                alt_file = f"{source_name}_alt_{src_expr}.png"
                alt_path = os.path.join(SOURCE_DIR, alt_file)
                
                if os.path.exists(alt_path):
                    dest_file = f"{dest_expr}.png"
                    dest_path = os.path.join(dog_folder, dest_file)
                    shutil.copy2(alt_path, dest_path)
                    print(f"  {src_expr} (alt) -> {dest_expr}.png")
                    processed += 1
                else:
                    print(f"  [SKIP] {src_expr} - ファイルなし")
                    skipped += 1
        
        print()
    
    print("=" * 50)
    print(f"完了: {processed}ファイルを整理しました")
    print(f"スキップ: {skipped}ファイル")
    print(f"出力先: {DEST_DIR}")


def create_asset_config():
    """game.js用のアセット設定を生成"""
    
    config_lines = ["// 犬種アセット設定（自動生成）", "const DOG_ASSETS = {"]
    
    for source_name, dog_info in DOG_MAPPING.items():
        dog_id = dog_info["id"]
        dog_folder = f"dog_{dog_id:02d}_{source_name}"
        
        config_lines.append(f"    {dog_id}: {{")
        config_lines.append(f'        folder: "{dog_folder}",')
        config_lines.append(f'        expressions: ["neutral", "happy", "sad", "excited"],')
        config_lines.append("    },")
    
    config_lines.append("};")
    
    config_path = os.path.join(PROJECT_ROOT, "assets", "characters", "dog_assets.js")
    with open(config_path, "w", encoding="utf-8") as f:
        f.write("\n".join(config_lines))
    
    print(f"\nアセット設定ファイル生成: {config_path}")


if __name__ == "__main__":
    organize_assets()
    create_asset_config()
