# -*- coding: utf-8 -*-
"""
ゴールデンワンコをキンピカにするスクリプト
"""

from PIL import Image, ImageEnhance, ImageFilter
import os
import sys

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# パス設定
BASE_DIR = r"C:\Users\janne\Documents\APP-KEROFEN\inusanpo"
GOLDEN_DIR = os.path.join(BASE_DIR, "assets", "characters", "dog_29_goldenwanko")
BACKUP_DIR = os.path.join(GOLDEN_DIR, "_backup")

EXPRESSIONS = ["neutral", "happy", "sad", "excited"]


def make_golden_sparkle(img):
    """
    画像をキンピカのゴールドに変換
    """
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    # オリジナルのアルファチャンネルを保存
    r, g, b, a = img.split()
    
    # RGB画像として処理
    rgb_img = Image.merge('RGB', (r, g, b))
    
    # 1. 彩度を少し上げる
    enhancer = ImageEnhance.Color(rgb_img)
    rgb_img = enhancer.enhance(1.3)
    
    # 2. 明るさを上げる
    enhancer = ImageEnhance.Brightness(rgb_img)
    rgb_img = enhancer.enhance(1.15)
    
    # 3. コントラストを少し上げる
    enhancer = ImageEnhance.Contrast(rgb_img)
    rgb_img = enhancer.enhance(1.1)
    
    # 4. ゴールドのオーバーレイを追加
    gold_overlay = Image.new('RGB', rgb_img.size, (255, 215, 0))  # ゴールド色
    
    # ブレンド（ソフトライト風）
    result = Image.blend(rgb_img, gold_overlay, 0.25)
    
    # 5. さらに黄金色を強調
    r2, g2, b2 = result.split()
    
    # 赤と緑を少し上げて、青を下げる（ゴールド感アップ）
    r2 = r2.point(lambda x: min(255, int(x * 1.1)))
    g2 = g2.point(lambda x: min(255, int(x * 1.05)))
    b2 = b2.point(lambda x: int(x * 0.7))
    
    result = Image.merge('RGB', (r2, g2, b2))
    
    # 6. 最終的な輝き調整
    enhancer = ImageEnhance.Brightness(result)
    result = enhancer.enhance(1.1)
    
    # アルファチャンネルを戻す
    r3, g3, b3 = result.split()
    final = Image.merge('RGBA', (r3, g3, b3, a))
    
    return final


def add_sparkle_effect(img):
    """
    キラキラエフェクトを追加（シンプル版）
    """
    # この関数は将来的にキラキラパーティクルを追加できます
    # 今はゴールド変換のみ
    return make_golden_sparkle(img)


def process_golden_wanko():
    """
    ゴールデンワンコの全画像をキンピカに変換
    """
    print("=" * 50)
    print("✨ ゴールデンワンコ キンピカ化 ✨")
    print("=" * 50)
    
    # バックアップフォルダ作成
    os.makedirs(BACKUP_DIR, exist_ok=True)
    
    for expr in EXPRESSIONS:
        img_path = os.path.join(GOLDEN_DIR, f"{expr}.png")
        
        if not os.path.exists(img_path):
            print(f"  ⚠ {expr}.png not found")
            continue
        
        # バックアップ
        backup_path = os.path.join(BACKUP_DIR, f"{expr}.png")
        img = Image.open(img_path)
        img.save(backup_path, 'PNG')
        print(f"  📦 Backup: {expr}.png")
        
        # キンピカ変換
        golden_img = add_sparkle_effect(img)
        
        # 保存
        golden_img.save(img_path, 'PNG', optimize=True)
        print(f"  ✨ Golden: {expr}.png")
    
    print("\n" + "=" * 50)
    print("✅ 完了！キンピカワンコの誕生！")
    print("=" * 50)


if __name__ == "__main__":
    process_golden_wanko()
