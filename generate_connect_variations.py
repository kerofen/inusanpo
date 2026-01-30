"""
接続完了音 5パターン生成
"""
import requests
from pathlib import Path
import os

# プロキシを無効化
os.environ['NO_PROXY'] = '*'
os.environ['no_proxy'] = '*'
for key in ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']:
    os.environ.pop(key, None)

API_KEY = 'sk_3c4369ebcfbc8ef5dec5285f28a5be7f7ce41591a31aca4f'
API_URL = 'https://api.elevenlabs.io/v1/sound-generation'

output_dir = Path(__file__).parent / 'assets' / 'audio' / 'se'

variations = [
    {'name': 'se_connect_poko', 'prompt': 'cute poko sound, soft water drop bubble pop, very short 0.15s, kawaii game SFX, gentle and satisfying'},
    {'name': 'se_connect_pon', 'prompt': 'cute pon sound, soft rubber bounce pop, very short 0.15s, kawaii game SFX, bouncy and playful'},
    {'name': 'se_connect_pan', 'prompt': 'cute pan sound, light crisp pop snap, very short 0.15s, kawaii game SFX, bright and cheerful'},
    {'name': 'se_connect_pyu', 'prompt': 'cute pyu sound, soft squeaky toy squeak, very short 0.2s, kawaii game SFX, adorable and fun'},
    {'name': 'se_connect_pikon', 'prompt': 'cute pikon sound, gentle chime ding, very short 0.2s, kawaii game SFX, light bell tone, satisfying'},
]

headers = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json'
}

print("=" * 40)
print("接続完了音 5パターン生成")
print("=" * 40)

for i, v in enumerate(variations, 1):
    output_path = output_dir / f"{v['name']}.mp3"
    print(f"[{i}/5] {v['name']}...")
    
    data = {
        'text': v['prompt'],
        'duration_seconds': 0.5,
        'prompt_influence': 0.5
    }
    
    response = requests.post(API_URL, headers=headers, json=data)
    
    if response.status_code == 200:
        with open(output_path, 'wb') as f:
            f.write(response.content)
        print(f"  OK: {output_path.name}")
    else:
        print(f"  ERROR: {response.status_code} - {response.text[:100]}")

print("=" * 40)
print("Done!")
