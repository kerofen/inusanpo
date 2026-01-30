#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
切り抜き画像の縁チェック
非透過ピクセルが縁に接している画像をリストアップ
"""

from pathlib import Path
from PIL import Image

BASE_DIR = Path(r"C:\Users\janne\Documents\APP-KEROFEN\inusanpo")
CHAR_DIR = BASE_DIR / "assets" / "characters"


def edge_contacts(image_path):
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    pixels = img.load()
    edges = set()

    for x in range(w):
        if pixels[x, 0][3] > 0:
            edges.add("top")
        if pixels[x, h - 1][3] > 0:
            edges.add("bottom")
    for y in range(h):
        if pixels[0, y][3] > 0:
            edges.add("left")
        if pixels[w - 1, y][3] > 0:
            edges.add("right")

    return edges


def main():
    suspects = []
    for folder in sorted(CHAR_DIR.iterdir()):
        if not folder.is_dir() or not folder.name.startswith("dog_"):
            continue
        for image_path in sorted(folder.glob("*.png")):
            edges = edge_contacts(image_path)
            if edges:
                suspects.append((str(image_path), edges))

    if not suspects:
        print("Edge check: OK (no edge-touching pixels found)")
        return

    print("Edge check: Possible clipping candidates:")
    for path, edges in suspects:
        edge_list = ", ".join(sorted(edges))
        print(f" - {path}  [{edge_list}]")


if __name__ == "__main__":
    main()
