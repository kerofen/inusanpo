# -*- coding: utf-8 -*-
"""
ダルメシアン画像の修正スクリプト
下部の余分な部分を除去
"""

from PIL import Image
from pathlib import Path

BASE_DIR = Path(r"C:\Users\janne\Documents\APP-KEROFEN\inusanpo")
SOURCE_DIR = BASE_DIR / "assets" / "gazou" / "wanko"
OUTPUT_DIR = BASE_DIR / "assets" / "characters" / "dog_07_dalmatian"

EXPRESSIONS = ["neutral", "happy", "sad", "excited"]

def remove_black_background(img, threshold=30):
    """黒背景を透過に変換"""
    img = img.convert("RGBA")
    datas = list(img.getdata())
    new_data = []
    
    for item in datas:
        if item[0] < threshold and item[1] < threshold and item[2] < threshold:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(item)
    
    img.putdata(new_data)
    return img

def crop_to_content(img, padding=10):
    """透過部分を除いた実際のコンテンツ領域にクロップ"""
    bbox = img.getbbox()
    if bbox:
        left = max(0, bbox[0] - padding)
        top = max(0, bbox[1] - padding)
        right = min(img.width, bbox[2] + padding)
        bottom = min(img.height, bbox[3] + padding)
        return img.crop((left, top, right, bottom))
    return img

def main():
    print("Fixing Dalmatian images...")
    
    # 2-2.pngから再切り抜き
    source_path = SOURCE_DIR / "2-2.png"
    img = Image.open(source_path)
    
    width, height = img.size
    cell_width = width // 4
    cell_height = height // 4
    
    # ダルメシアンは3行目（インデックス2）
    dog_idx = 2
    
    for expr_idx, expression in enumerate(EXPRESSIONS):
        left = expr_idx * cell_width
        top = dog_idx * cell_height
        right = left + cell_width
        # 下を少しカット（チワワの耳が入らないように）
        bottom = top + cell_height - 30
        
        cell = img.crop((left, top, right, bottom))
        cell = remove_black_background(cell)
        cell = crop_to_content(cell, padding=10)
        
        output_path = OUTPUT_DIR / f"{expression}.png"
        cell.save(output_path, "PNG")
        print(f"  {expression}: {cell.size[0]}x{cell.size[1]}")
    
    print("Done!")

if __name__ == "__main__":
    main()
