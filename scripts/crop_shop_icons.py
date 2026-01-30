"""
ショップアイコンを4分割して切り抜くスクリプト
2x2グリッドの画像から個別アイコンを抽出
"""

from PIL import Image
import os

def crop_shop_icons():
    # 入力ファイル
    input_path = r"c:\Users\janne\Documents\APP-KEROFEN\inusanpo\assets\icon\shop\freepik__22ui__20155 (1).png"
    output_dir = r"c:\Users\janne\Documents\APP-KEROFEN\inusanpo\assets\icon\shop"
    
    # 画像を開く
    img = Image.open(input_path)
    width, height = img.size
    print(f"元画像サイズ: {width}x{height}")
    
    # 2x2グリッドなので、半分に分割
    half_w = width // 2
    half_h = height // 2
    
    # 各アイコンの位置と出力ファイル名
    icons = [
        # (left, top, right, bottom), filename
        ((0, 0, half_w, half_h), "pack_premium.png"),        # 左上：王冠
        ((half_w, 0, width, half_h), "pack_customize.png"),   # 右上：パレット
        ((0, half_h, half_w, height), "pack_noads.png"),      # 左下：NO ADS
        ((half_w, half_h, width, height), "pack_dog.png"),    # 右下：箱入り犬
    ]
    
    for (box, filename) in icons:
        # 切り抜き
        cropped = img.crop(box)
        
        # 透過を維持して保存
        output_path = os.path.join(output_dir, filename)
        cropped.save(output_path, "PNG")
        print(f"保存完了: {filename} ({cropped.size[0]}x{cropped.size[1]})")

if __name__ == "__main__":
    crop_shop_icons()
    print("\n✅ 全アイコンの切り抜きが完了しました！")
