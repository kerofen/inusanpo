"""
ワンこねくと用SE生成スクリプト
ElevenLabs Sound Effects APIを使用
"""

import requests
import os
from pathlib import Path

API_KEY = "sk_3c4369ebcfbc8ef5dec5285f28a5be7f7ce41591a31aca4f"
API_URL = "https://api.elevenlabs.io/v1/sound-generation"

# 出力先ディレクトリ
OUTPUT_DIR = Path(__file__).parent / "assets" / "audio" / "se"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 生成する効果音の定義
SOUND_EFFECTS = [
    {
        "name": "se_button_tap",
        "prompt": "soft cute button tap click sound, gentle pop, very short 0.2s, high-quality game UI SFX, subtle and pleasant, not annoying, minimal",
        "duration_seconds": 0.5
    },
    {
        "name": "se_tile_trace", 
        "prompt": "cute bubble pop sound, pokopoko, soft bouncy cartoon sound, very short 0.15s, high-quality game SFX, adorable and addictive, kawaii style, single pop",
        "duration_seconds": 0.5
    },
    {
        "name": "se_match_connect",
        "prompt": "cute success pop sound, cheerful pon, satisfying soft balloon pop, short 0.3s, high-quality game SFX, adorable and rewarding, kawaii celebration tone",
        "duration_seconds": 1.0
    }
]

def generate_sound_effect(prompt: str, output_path: Path, duration: float = 1.0):
    """ElevenLabs APIを使用して効果音を生成"""
    headers = {
        "xi-api-key": API_KEY,
        "Content-Type": "application/json"
    }
    
    data = {
        "text": prompt,
        "duration_seconds": duration,
        "prompt_influence": 0.5
    }
    
    print(f"生成中: {output_path.name}")
    print(f"  プロンプト: {prompt}")
    
    response = requests.post(API_URL, headers=headers, json=data)
    
    if response.status_code == 200:
        with open(output_path, "wb") as f:
            f.write(response.content)
        print(f"  [OK] Done: {output_path}")
        return True
    else:
        print(f"  [ERROR] {response.status_code} - {response.text}")
        return False

def main():
    print("=" * 50)
    print("ワンこねくと SE生成")
    print("=" * 50)
    
    success_count = 0
    
    for se in SOUND_EFFECTS:
        output_path = OUTPUT_DIR / f"{se['name']}.mp3"
        if output_path.exists():
            print(f"[SKIP] {output_path.name} already exists")
            success_count += 1
            continue
        if generate_sound_effect(se["prompt"], output_path, se["duration_seconds"]):
            success_count += 1
        print()
    
    print("=" * 50)
    print(f"完了: {success_count}/{len(SOUND_EFFECTS)} ファイル生成")
    print(f"出力先: {OUTPUT_DIR}")
    print("=" * 50)

if __name__ == "__main__":
    main()
