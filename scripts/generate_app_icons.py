#!/usr/bin/env python3
"""
アプリアイコン生成スクリプト
既存の1024x1024アイコンからiOS/Android向け全サイズを生成する
"""

import os
import json
import shutil
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_ICON = os.path.join(
    BASE_DIR, "ios", "App", "App", "Assets.xcassets",
    "AppIcon.appiconset", "AppIcon-512@2x.png"
)

# --- iOS ---
IOS_OUTPUT_DIR = os.path.join(
    BASE_DIR, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset"
)

# Xcode 15+ uses a single 1024x1024 universal icon.
# Only this file is referenced in Contents.json.
IOS_SIZES = {
    "AppIcon-512@2x.png": 1024,
}

IOS_CONTENTS_JSON = {
    "images": [
        {
            "filename": "AppIcon-512@2x.png",
            "idiom": "universal",
            "platform": "ios",
            "size": "1024x1024"
        }
    ],
    "info": {
        "author": "xcode",
        "version": 1
    }
}

# --- Android ---
ANDROID_RES_DIR = os.path.join(
    BASE_DIR, "android", "app", "src", "main", "res"
)

ANDROID_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

ANDROID_PLAYSTORE_SIZE = 512


def resize_icon(source_img, size, output_path):
    """高品質リサイズでアイコンを生成"""
    resized = source_img.resize((size, size), Image.LANCZOS)
    resized.save(output_path, "PNG", optimize=True)
    print(f"  Created: {os.path.basename(output_path)} ({size}x{size})")


def generate_ios_icons(source_img):
    """iOS用アイコンを生成"""
    print("\n=== iOS Icons ===")
    os.makedirs(IOS_OUTPUT_DIR, exist_ok=True)

    for filename, size in IOS_SIZES.items():
        output_path = os.path.join(IOS_OUTPUT_DIR, filename)
        resize_icon(source_img, size, output_path)

    contents_path = os.path.join(IOS_OUTPUT_DIR, "Contents.json")
    with open(contents_path, "w") as f:
        json.dump(IOS_CONTENTS_JSON, f, indent=2)
    print(f"  Updated: Contents.json")


def generate_android_icons(source_img):
    """Android用アイコンを生成"""
    print("\n=== Android Icons ===")

    for folder, size in ANDROID_SIZES.items():
        folder_path = os.path.join(ANDROID_RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)

        for name in ["ic_launcher.png", "ic_launcher_round.png"]:
            output_path = os.path.join(folder_path, name)
            resize_icon(source_img, size, output_path)

        fg_path = os.path.join(folder_path, "ic_launcher_foreground.png")
        fg_size = int(size * 108 / 48)
        canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        dog_resized = source_img.resize((size, size), Image.LANCZOS)
        offset = (fg_size - size) // 2
        canvas.paste(dog_resized, (offset, offset))
        canvas.save(fg_path, "PNG", optimize=True)
        print(f"  Created: {folder}/ic_launcher_foreground.png ({fg_size}x{fg_size})")

    playstore_dir = os.path.join(ANDROID_RES_DIR, "..", "playstore")
    os.makedirs(playstore_dir, exist_ok=True)
    playstore_path = os.path.join(playstore_dir, "ic_launcher-playstore.png")
    resize_icon(source_img, ANDROID_PLAYSTORE_SIZE, playstore_path)


def generate_web_icons(source_img):
    """Web/PWA用アイコンも生成"""
    print("\n=== Web/PWA Icons ===")
    public_dir = os.path.join(BASE_DIR, "public")
    os.makedirs(public_dir, exist_ok=True)

    web_sizes = {
        "favicon.png": 32,
        "icon-192.png": 192,
        "icon-512.png": 512,
    }
    for filename, size in web_sizes.items():
        output_path = os.path.join(public_dir, filename)
        resize_icon(source_img, size, output_path)


def main():
    if not os.path.exists(SOURCE_ICON):
        print(f"Error: Source icon not found: {SOURCE_ICON}")
        return

    print(f"Source: {SOURCE_ICON}")
    source_img = Image.open(SOURCE_ICON).convert("RGBA")
    print(f"Size: {source_img.size[0]}x{source_img.size[1]}")

    generate_ios_icons(source_img)
    generate_android_icons(source_img)
    generate_web_icons(source_img)

    print("\n=== Done! ===")
    print(f"iOS icons:     {IOS_OUTPUT_DIR}")
    print(f"Android icons: {ANDROID_RES_DIR}")
    print(f"Web icons:     {os.path.join(BASE_DIR, 'public')}")


if __name__ == "__main__":
    main()
