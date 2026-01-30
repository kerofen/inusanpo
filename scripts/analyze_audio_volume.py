#!/usr/bin/env python3
"""
音声ファイルのラウドネス(dBFS)を測定し、推奨音量を計算するスクリプト
"""

import os
import sys
import json
from pathlib import Path

# Windows コンソールのUTF-8対応
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

from pydub import AudioSegment

# プロジェクトルート
PROJECT_ROOT = Path(__file__).parent.parent

# 音声ファイルのディレクトリ
BGM_DIR = PROJECT_ROOT / "assets" / "audio" / "bgm"
SE_DIR = PROJECT_ROOT / "assets" / "audio" / "se"

# カテゴリ別の目標音量範囲
CATEGORY_TARGETS = {
    "bgm": (0.35, 0.45),          # BGMは控えめ
    "ui_se": (0.30, 0.40),        # UIタップ等
    "gameplay_se": (0.45, 0.55),  # ゲームプレイ中のSE
    "result_se": (0.55, 0.65),    # クリア・ゲームオーバー等
    "special_se": (0.60, 0.70),   # 実績・アンロック等
}

# game.jsのAUDIO_MAPのキーとカテゴリのマッピング
KEY_CATEGORY_MAP = {
    # BGM
    "bgm_title": "bgm",
    "bgm_select": "bgm",
    "bgm_story": "bgm",
    "bgm_challenge": "bgm",
    "bgm_clear": "bgm",
    "bgm_gameover": "bgm",
    # UI SE
    "sfx_ui_tap": "ui_se",
    "sfx_ui_toggle": "ui_se",
    # ゲームプレイSE
    "sfx_draw_start": "gameplay_se",
    "sfx_draw_step": "gameplay_se",  # 特別に小さめ
    "sfx_connect": "gameplay_se",
    "sfx_error": "gameplay_se",
    "sfx_reset": "gameplay_se",
    "sfx_hint": "gameplay_se",
    # 結果SE
    "sfx_clear": "result_se",
    "sfx_gameover": "result_se",
    "sfx_challenge_combo": "result_se",
    # 特別SE
    "sfx_achievement": "special_se",
    "sfx_unlock_item": "special_se",
    "sfx_medal": "special_se",
}

# sfx_draw_stepは繰り返し再生されるので特別に小さめにする
SPECIAL_ADJUSTMENTS = {
    "sfx_draw_step": 0.6,  # 目標音量の60%に
    "sfx_ui_toggle": 0.9,  # 少し控えめに
}


def analyze_audio_file(file_path: Path) -> dict:
    """音声ファイルを分析してdBFSを返す"""
    try:
        audio = AudioSegment.from_file(str(file_path))
        dbfs = audio.dBFS
        duration_ms = len(audio)
        return {
            "file": file_path.name,
            "path": str(file_path.relative_to(PROJECT_ROOT)),
            "dBFS": round(dbfs, 2),
            "duration_ms": duration_ms,
            "success": True,
        }
    except Exception as e:
        return {
            "file": file_path.name,
            "path": str(file_path),
            "error": str(e),
            "success": False,
        }


def calculate_recommended_volume(dbfs: float, category: str, key: str = None) -> float:
    """
    dBFSと目標カテゴリから推奨音量を計算
    
    ロジック:
    - dBFSが高い（0に近い）→ 音量を下げる
    - dBFSが低い（-30等）→ 音量を上げる
    - 基準点: -18 dBFS を中央値として扱う
    """
    target_min, target_max = CATEGORY_TARGETS.get(category, (0.4, 0.6))
    target_mid = (target_min + target_max) / 2
    
    # 基準dBFS（この値のファイルは目標音量の中央値になる）
    reference_dbfs = -18.0
    
    # dBFSの差から補正係数を計算
    # 6dBの差は音量を約2倍にする感覚なので、3dBごとに10%調整
    dbfs_diff = reference_dbfs - dbfs
    adjustment = dbfs_diff / 30.0  # ±30dBで±1.0の調整
    
    # 推奨音量を計算
    recommended = target_mid + (adjustment * (target_max - target_min))
    
    # 特別な調整が必要なキー
    if key and key in SPECIAL_ADJUSTMENTS:
        recommended *= SPECIAL_ADJUSTMENTS[key]
    
    # 範囲内にクランプ
    recommended = max(0.1, min(1.0, recommended))
    
    return round(recommended, 2)


def main():
    print("=" * 60)
    print("音声ファイル ラウドネス測定")
    print("=" * 60)
    
    results = {
        "bgm": [],
        "se": [],
    }
    
    # BGMファイルを分析
    print("\n📀 BGM ファイル分析中...")
    if BGM_DIR.exists():
        for audio_file in sorted(BGM_DIR.iterdir()):
            if audio_file.suffix.lower() in [".mp3", ".wav", ".ogg"]:
                result = analyze_audio_file(audio_file)
                if result["success"]:
                    result["recommended_volume"] = calculate_recommended_volume(
                        result["dBFS"], "bgm"
                    )
                results["bgm"].append(result)
                status = "✓" if result["success"] else "✗"
                print(f"  {status} {result['file']}")
    
    # SEファイルを分析
    print("\n🔊 SE ファイル分析中...")
    if SE_DIR.exists():
        for audio_file in sorted(SE_DIR.iterdir()):
            if audio_file.suffix.lower() in [".mp3", ".wav", ".ogg"]:
                result = analyze_audio_file(audio_file)
                if result["success"]:
                    # SEはデフォルトでgameplay_seカテゴリとして計算
                    result["recommended_volume"] = calculate_recommended_volume(
                        result["dBFS"], "gameplay_se"
                    )
                results["se"].append(result)
                status = "✓" if result["success"] else "✗"
                print(f"  {status} {result['file']}")
    
    # 統計情報
    print("\n" + "=" * 60)
    print("📊 統計情報")
    print("=" * 60)
    
    all_dbfs = []
    for category in ["bgm", "se"]:
        category_dbfs = [r["dBFS"] for r in results[category] if r.get("success")]
        if category_dbfs:
            avg = sum(category_dbfs) / len(category_dbfs)
            min_dbfs = min(category_dbfs)
            max_dbfs = max(category_dbfs)
            all_dbfs.extend(category_dbfs)
            print(f"\n{category.upper()}:")
            print(f"  ファイル数: {len(category_dbfs)}")
            print(f"  平均 dBFS: {avg:.2f}")
            print(f"  最小 dBFS: {min_dbfs:.2f}")
            print(f"  最大 dBFS: {max_dbfs:.2f}")
            print(f"  差分: {max_dbfs - min_dbfs:.2f} dB")
    
    if all_dbfs:
        print(f"\n全体:")
        print(f"  平均 dBFS: {sum(all_dbfs) / len(all_dbfs):.2f}")
        print(f"  範囲: {min(all_dbfs):.2f} ~ {max(all_dbfs):.2f}")
    
    # 詳細結果を表示
    print("\n" + "=" * 60)
    print("📋 詳細結果")
    print("=" * 60)
    
    for category in ["bgm", "se"]:
        print(f"\n{category.upper()}:")
        print("-" * 50)
        for r in sorted(results[category], key=lambda x: x.get("dBFS", -100)):
            if r["success"]:
                print(f"  {r['file']:<40} {r['dBFS']:>7.2f} dBFS → 推奨: {r['recommended_volume']:.2f}")
            else:
                print(f"  {r['file']:<40} エラー: {r.get('error', 'Unknown')}")
    
    # game.js用の推奨設定を生成
    print("\n" + "=" * 60)
    print("🎮 game.js AUDIO_MAP 用推奨音量設定")
    print("=" * 60)
    
    # ファイル名からキーを逆引きするマップを作成
    file_to_result = {}
    for category in ["bgm", "se"]:
        for r in results[category]:
            if r["success"]:
                file_to_result[r["file"]] = r
    
    # 現在のAUDIO_MAPのファイルマッピング（game.jsから抽出した情報）
    audio_map_files = {
        "bgm_title": "bgm_title_comicalnichijo.mp3",
        "bgm_select": "bgm_menu_puzzle_cooking.mp3",
        "bgm_story": "bgm_game_honobono.mp3",
        "bgm_challenge": "bgm_game_honobono.mp3",
        "bgm_clear": "bgm_clear_tailwag.wav",
        "bgm_gameover": "bgm_gameover_waltz.wav",
        "sfx_ui_tap": "se_button_tap.mp3",
        "sfx_ui_toggle": "se_button_tap.mp3",
        "sfx_draw_start": "se_tile_trace.mp3",
        "sfx_draw_step": "se_tile_trace.mp3",
        "sfx_connect": "se_connect_v2_koron.mp3",
        "sfx_error": "se_gameover_v2_puu.mp3",
        "sfx_reset": "se_connect_v2_pokon.mp3",
        "sfx_hint": "se_clear_v2_kirakira.mp3",
        "sfx_clear": "se_clear_v2_pyurun.mp3",
        "sfx_gameover": "se_gameover_v2_koron.mp3",
        "sfx_challenge_combo": "se_connect_v2_poyoyon.mp3",
        "sfx_achievement": "se_clear_v2_pikon.mp3",
        "sfx_unlock_item": "シャキーン2.mp3",
        "sfx_medal": "se_clear_v2_pikon.mp3",
    }
    
    print("\n// 推奨音量設定（dBFSに基づく自動計算）")
    recommended_settings = {}
    for key, filename in audio_map_files.items():
        category = KEY_CATEGORY_MAP.get(key, "gameplay_se")
        if filename in file_to_result:
            dbfs = file_to_result[filename]["dBFS"]
            volume = calculate_recommended_volume(dbfs, category, key)
            recommended_settings[key] = {
                "file": filename,
                "dBFS": dbfs,
                "category": category,
                "volume": volume,
            }
            print(f"{key}: {volume:.2f}  // {filename} ({dbfs:.2f} dBFS)")
        else:
            print(f"{key}: ファイル未検出 ({filename})")
    
    # JSONで出力
    output_file = PROJECT_ROOT / "scripts" / "audio_analysis_result.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump({
            "analysis": results,
            "recommended_settings": recommended_settings,
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 詳細結果を保存: {output_file}")
    
    return recommended_settings


if __name__ == "__main__":
    main()
