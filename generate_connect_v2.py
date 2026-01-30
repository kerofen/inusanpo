"""
繋がった時の効果音 5パターン生成 (v2)
se_tile_trace系統（pokopoko bubble pop）をベースに
より達成感・気持ちよさを感じるかわいい音
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

# se_tile_trace系統（pokopoko bubble pop）をベースに
# 繋がった時の達成感・気持ちよさを加えたバリエーション
variations = [
    {
        'name': 'se_connect_v2_pokon',
        'prompt': 'cute pokon bubble pop sound, soft bouncy satisfying pop, pokopoko style, very short 0.2s, kawaii game SFX, adorable single pop with tiny sparkle, rewarding feel'
    },
    {
        'name': 'se_connect_v2_puyon',
        'prompt': 'cute puyon jelly bounce sound, soft squishy bubble pop, pokopoko style, very short 0.2s, kawaii game SFX, adorable elastic bounce pop, satisfying and gentle'
    },
    {
        'name': 'se_connect_v2_pirun',
        'prompt': 'cute pirun sparkle pop sound, soft bubble pop with tiny bell shimmer, pokopoko style, very short 0.2s, kawaii game SFX, light magical pop, cheerful and rewarding'
    },
    {
        'name': 'se_connect_v2_koron',
        'prompt': 'cute koron round pop sound, soft marble bubble pop, pokopoko style, very short 0.2s, kawaii game SFX, gentle rolling pop, cozy and satisfying'
    },
    {
        'name': 'se_connect_v2_poyoyon',
        'prompt': 'cute poyoyon bouncy pop sound, soft springy bubble bounce, pokopoko style, very short 0.25s, kawaii game SFX, playful double bounce pop, happy and addictive'
    },
]

headers = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json'
}

print("=" * 50)
print("繋がった時の効果音 5パターン生成 (v2)")
print("se_tile_trace系統 - かわいい＆気持ちいい音")
print("=" * 50)

for i, v in enumerate(variations, 1):
    output_path = output_dir / f"{v['name']}.mp3"
    print(f"\n[{i}/5] {v['name']}")
    print(f"  プロンプト: {v['prompt'][:60]}...")
    
    data = {
        'text': v['prompt'],
        'duration_seconds': 0.5,
        'prompt_influence': 0.5
    }
    
    response = requests.post(API_URL, headers=headers, json=data)
    
    if response.status_code == 200:
        with open(output_path, 'wb') as f:
            f.write(response.content)
        print(f"  [OK] 生成完了: {output_path.name}")
    else:
        print(f"  [ERROR] {response.status_code} - {response.text[:100]}")

print("\n" + "=" * 50)
print("完了！以下のファイルを聞き比べてください：")
for v in variations:
    print(f"  - {v['name']}.mp3")
print("=" * 50)
