#!/usr/bin/env python3
"""
ElevenLabs APIを使用してジャンプ音のSEを生成するスクリプト
"""
import os
import requests
import json

# APIキーを設定
API_KEY = "sk_3c4369ebcfbc8ef5dec5285f28a5be7f7ce41591a31aca4f"

# 出力パス
output_path = "assets/audio/se/se_jump.mp3"

# 出力ディレクトリが存在するか確認
os.makedirs(os.path.dirname(output_path), exist_ok=True)

# プロキシ設定を無効化
os.environ.pop('HTTP_PROXY', None)
os.environ.pop('HTTPS_PROXY', None)
os.environ.pop('http_proxy', None)
os.environ.pop('https_proxy', None)

# ElevenLabs APIエンドポイント
url = "https://api.elevenlabs.io/v1/sound-generation"

headers = {
    "xi-api-key": API_KEY,
    "Content-Type": "application/json"
}

data = {
    "text": "video game jump sound effect, cute bouncy hop, 8-bit retro style, short and snappy",
    "duration_seconds": 0.5
}

# プロキシなしでセッションを作成
session = requests.Session()
session.proxies = {}

# ジャンプ音の効果音を生成
print("ジャンプ音のSEを生成中...")
try:
    response = session.post(url, headers=headers, json=data, timeout=60, stream=True)
    response.raise_for_status()
    
    # ファイルに保存
    with open(output_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                f.write(chunk)
    
    print(f"成功: ジャンプ音のSEを {output_path} に保存しました！")
except requests.exceptions.RequestException as e:
    print(f"エラーが発生しました: {e}")
    print("プロキシ設定を確認するか、ElevenLabsのウェブサイトから直接生成してください。")
    raise
