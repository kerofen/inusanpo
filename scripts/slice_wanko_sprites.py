"""
ワンコ画像切り抜きスクリプト
4×4グリッドの画像から個別のスプライトを切り出します
"""

from PIL import Image
import os

# 入力フォルダと出力フォルダ
INPUT_DIR = "../assets/gazou/wanko"
OUTPUT_DIR = "../assets/gazou/wanko/sliced"

# 各画像ファイルに含まれる犬種（上から順に）
DOG_BREEDS = {
    "1.png": ["shiba", "pug", "toypoodle", "husky"],
    "2-1.png": ["golden", "corgi", "dalmatian", "chihuahua"],
    "2-2.png": ["golden_alt", "corgi_alt", "dalmatian_alt", "boston"],
    "3-1.png": ["schnauzer", "doberman", "stbernard", "whippet"],
    "3-2.png": ["schnauzer_alt", "doberman_alt", "stbernard_alt", "whippet_alt"],
    "4.png": ["bernese", "samoyed", "weimaraner", "cavalier"],
    "5.png": ["jackrussell", "sheltie", "bulldog", "blackshiba"],
}

# 表情（左から順に）
EXPRESSIONS = ["normal", "happy", "sad", "excited"]


def slice_image(input_path: str, output_dir: str, breeds: list[str]):
    """4×4グリッド画像を16個の個別画像に切り分ける"""
    
    img = Image.open(input_path)
    width, height = img.size
    
    # 1セルのサイズを計算
    cell_width = width // 4
    cell_height = height // 4
    
    print(f"処理中: {input_path}")
    print(f"  画像サイズ: {width}x{height}")
    print(f"  セルサイズ: {cell_width}x{cell_height}")
    
    for row, breed in enumerate(breeds):
        for col, expression in enumerate(EXPRESSIONS):
            # 切り抜き範囲を計算
            left = col * cell_width
            top = row * cell_height
            right = left + cell_width
            bottom = top + cell_height
            
            # 切り抜き
            cropped = img.crop((left, top, right, bottom))
            
            # ファイル名を生成
            filename = f"{breed}_{expression}.png"
            output_path = os.path.join(output_dir, filename)
            
            # 保存
            cropped.save(output_path, "PNG")
            print(f"  保存: {filename}")


def main():
    # スクリプトのディレクトリを基準にパスを解決
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_dir = os.path.normpath(os.path.join(script_dir, INPUT_DIR))
    output_dir = os.path.normpath(os.path.join(script_dir, OUTPUT_DIR))
    
    # 出力フォルダを作成
    os.makedirs(output_dir, exist_ok=True)
    print(f"出力先: {output_dir}\n")
    
    # 各画像を処理
    for filename, breeds in DOG_BREEDS.items():
        input_path = os.path.join(input_dir, filename)
        
        if os.path.exists(input_path):
            slice_image(input_path, output_dir, breeds)
            print()
        else:
            print(f"⚠️ ファイルが見つかりません: {input_path}\n")
    
    # 結果を表示
    total_files = len([f for f in os.listdir(output_dir) if f.endswith('.png')])
    print(f"✅ 完了！{total_files}個のスプライトを生成しました")
    print(f"📁 保存先: {output_dir}")


if __name__ == "__main__":
    main()
