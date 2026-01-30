"""
シーン用SE生成
1. クリア画面「やったー！」用 - 嬉しい達成感のある音
2. ゲームオーバー画面「おしかったね！」用 - 残念だけどかわいい音
各5パターン
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

# クリア画面「やったー！」用 - 嬉しい達成感、かわいいキラキラ
clear_variations = [
    {
        'name': 'se_clear_v2_pyurun',
        'prompt': 'cute pyurun celebration sound, happy sparkle chime with soft bubble pop, kawaii victory jingle, very short 0.4s, adorable and rewarding, gentle magical shimmer'
    },
    {
        'name': 'se_clear_v2_kirakira',
        'prompt': 'cute kirakira sparkle sound, soft twinkle bells with gentle pop, kawaii success chime, very short 0.5s, bright and cheerful, magical star shimmer'
    },
    {
        'name': 'se_clear_v2_poyopiyo',
        'prompt': 'cute poyopiyo bouncy success sound, happy bubble bounce with tiny chime, kawaii celebration, very short 0.4s, playful and satisfying, gentle victory pop'
    },
    {
        'name': 'se_clear_v2_fuwakirun',
        'prompt': 'cute fuwakirun floaty success sound, soft dreamy sparkle with gentle pop, kawaii achievement, very short 0.5s, fluffy and magical, warm happy chime'
    },
    {
        'name': 'se_clear_v2_pikon',
        'prompt': 'cute pikon level up sound, cheerful ding with soft bubble shimmer, kawaii clear chime, very short 0.4s, bright achievement tone, adorable success'
    },
]

# ゲームオーバー画面「おしかったね！」用 - 残念だけどかわいい、励ましの感じ
gameover_variations = [
    {
        'name': 'se_gameover_v2_shuun',
        'prompt': 'cute shuun disappointed sound, soft descending bubble pop, kawaii gentle fail, very short 0.4s, sad but adorable, encouraging undertone'
    },
    {
        'name': 'se_gameover_v2_poyon',
        'prompt': 'cute poyon soft deflate sound, gentle bouncy descend, kawaii try again, very short 0.4s, not harsh, sympathetic and cute'
    },
    {
        'name': 'se_gameover_v2_funyaa',
        'prompt': 'cute funyaa gentle sigh sound, soft air release with tiny pop, kawaii oops, very short 0.4s, warm and forgiving, not discouraging'
    },
    {
        'name': 'se_gameover_v2_koron',
        'prompt': 'cute koron tumble sound, soft rolling marble descend, kawaii stumble, very short 0.4s, gentle and sympathetic, encouraging retry feel'
    },
    {
        'name': 'se_gameover_v2_puu',
        'prompt': 'cute puu soft deflate sound, gentle balloon release, kawaii almost, very short 0.3s, not sad but encouraging, warm and soft'
    },
]

headers = {
    'xi-api-key': API_KEY,
    'Content-Type': 'application/json'
}

def generate_sounds(variations, category_name):
    print(f"\n{'='*50}")
    print(f"{category_name}")
    print(f"{'='*50}")
    
    for i, v in enumerate(variations, 1):
        output_path = output_dir / f"{v['name']}.mp3"
        print(f"\n[{i}/{len(variations)}] {v['name']}")
        print(f"  プロンプト: {v['prompt'][:50]}...")
        
        data = {
            'text': v['prompt'],
            'duration_seconds': 1.0,
            'prompt_influence': 0.5
        }
        
        response = requests.post(API_URL, headers=headers, json=data)
        
        if response.status_code == 200:
            with open(output_path, 'wb') as f:
                f.write(response.content)
            print(f"  [OK] 生成完了: {output_path.name}")
        else:
            print(f"  [ERROR] {response.status_code} - {response.text[:100]}")

# クリア用SE生成
generate_sounds(clear_variations, "クリア画面「やったー！」用SE (5パターン)")

# ゲームオーバー用SE生成
generate_sounds(gameover_variations, "ゲームオーバー画面「おしかったね！」用SE (5パターン)")

print("\n" + "=" * 50)
print("完了！以下のファイルを聞き比べてください：")
print("\n【クリア用】")
for v in clear_variations:
    print(f"  - {v['name']}.mp3")
print("\n【ゲームオーバー用】")
for v in gameover_variations:
    print(f"  - {v['name']}.mp3")
print("=" * 50)
