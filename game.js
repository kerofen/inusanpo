/**
 * ワンこねくと - 桜井イズム適用版
 * プレイヤー中心主義・手触りとテンポ・視認性を重視
 */

import Phaser from 'phaser';
import { LevelGenerator } from './levelGenerator.js';
import { HapticManager } from './HapticManager.js';
import { AdManager } from './AdManager.js';
import { PurchaseManager } from './PurchaseManager.js';
import { Browser } from '@capacitor/browser';

// AudioContext警告・エラーを抑制（ユーザー操作後に正常に開始されるため無害）
// 音声ファイルのデコードエラーも抑制（SEを作り直すため）
if (typeof window !== 'undefined' && window.console) {
    const originalWarn = console.warn;
    const originalError = console.error;
    
    const shouldSuppress = (message) => {
        const msg = message.toLowerCase();
        return msg.includes('audiocontext was not allowed to start') || 
               msg.includes('must be resumed (or created) after a user gesture') ||
               msg.includes('blocked call to navigator.vibrate') ||
               msg.includes('error decoding audio') ||
               msg.includes('unable to decode audio data') ||
               msg.includes('failed to process file') ||
               (msg.includes('audio') && msg.includes('error'));
    };
    
    console.warn = function(...args) {
        const message = args.join(' ');
        if (shouldSuppress(message)) return;
        originalWarn.apply(console, args);
    };
    
    console.error = function(...args) {
        const message = args.join(' ');
        if (shouldSuppress(message)) return;
        originalError.apply(console, args);
    };
}

// ========================================
// ★ テストモード設定（本番リリース前にfalseにすること！）
// ========================================
// true: 以下の全ての機能が有効になる
//   - 全ワンコ・ずかん・きせかえ・テーマをアンロック
//   - チュートリアルをスキップ
// false: 通常のアンロック条件とチュートリアルを適用
const TEST_MODE = false;

// 下位互換性のためのエイリアス
const TEST_MODE_UNLOCK_ALL = TEST_MODE;

// ========================================
// サウンド管理（BGM/SEの一元コントロール）
// ========================================
class AudioManager {
    static bgmEnabled = true;
    static seEnabled = true;
    static bgmVolume = 1.0;  // BGM音量（0.0 〜 1.0）
    static seVolume = 1.0;   // SE音量（0.0 〜 1.0）
    static currentBgmKey = null;
    static currentBgmSound = null;
    static lastScene = null;
    static lastRequestedBgm = null;
    static unlocked = false;
     static pendingBgm = null;
     static unlockListenerAttached = false;
     static globalUnlockEvents = ['pointerdown', 'touchstart', 'mousedown', 'keydown'];
    // 音量設定: dBFS実測値に基づいて補正
    // 計算式: volume = base × 10^((-18 - dBFS) / 40)
    // 測定日: 2026-01-29 by analyze_audio_volume.py
    static AUDIO_MAP = {
        // 🎵 BGM - 基準音量0.35 (SEより控えめに)
        bgm_title: { path: './assets/audio/bgm/bgm_title_comicalnichijo.mp3', volume: 0.32, loop: true },      // -16.37 dBFS
        bgm_select: { path: './assets/audio/bgm/bgm_menu_puzzle_cooking.mp3', volume: 0.22, loop: true },      // -10.37 dBFS (大きい→下げる)
        bgm_story: { path: './assets/audio/bgm/bgm_game_honobono.mp3', volume: 0.36, loop: true },             // -18.46 dBFS
        bgm_challenge: { path: './assets/audio/bgm/bgm_game_honobono.mp3', volume: 0.36, loop: true },         // -18.46 dBFS
        
        // 🔘 UI SE - 基準音量0.50 (ファイルが非常に小さいので大幅に補正)
        sfx_ui_tap: { path: './assets/audio/se/se_button_tap.mp3', volume: 0.95 },      // -40.04 dBFS (小さい→最大近くまで上げる)
        sfx_ui_toggle: { path: './assets/audio/se/se_button_tap.mp3', volume: 0.85 },   // -40.04 dBFS (toggleも上げる)
        
        // 🎮 ゲームプレイSE - 基準音量0.55
        sfx_draw_start: { path: './assets/audio/se/se_tile_trace.mp3', volume: 0.59 },  // -11.93 dBFS (1.5倍に調整)
        sfx_draw_step: { path: './assets/audio/se/se_tile_trace.mp3', volume: 0.33 },   // -11.93 dBFS (1.5倍に調整)
        sfx_connect: { path: './assets/audio/se/se_connect_v2_koron.mp3', volume: 1.35 },   // -24.30 dBFS (1.5倍に調整)
        sfx_reset: { path: './assets/audio/se/se_connect_v2_pokon.mp3', volume: 0.62 },     // -20.21 dBFS
        sfx_hint: { path: './assets/audio/se/se_clear_v2_kirakira.mp3', volume: 0.85 },     // -28.44 dBFS (小さい→上げる)
        
        // 🏆 結果SE - 基準音量0.65 (印象的に)
        sfx_clear: { path: './assets/audio/se/se_clear_v2_pyurun.mp3', volume: 0.90 },          // -26.79 dBFS (小さい→上げる)
        sfx_gameover: { path: './assets/audio/se/se_gameover_v2_koron.mp3', volume: 0.57 },     // -15.61 dBFS (大きい→下げる)
        sfx_challenge_combo: { path: './assets/audio/se/se_connect_v2_poyoyon.mp3', volume: 0.85 }, // -24.97 dBFS (小さい→上げる)
        
        // ✨ 特別SE - 基準音量0.70 (達成感を演出)
        sfx_achievement: { path: './assets/audio/se/se_clear_v2_pikon.mp3', volume: 0.90 },     // -23.50 dBFS (小さい→上げる)
        sfx_unlock_item: { path: './assets/audio/se/シャキーン2.mp3', volume: 0.35 },            // -18.40 dBFS (半分に調整)
        sfx_medal: { path: './assets/audio/se/se_clear_v2_pikon.mp3', volume: 0.90 },           // -23.50 dBFS (小さい→上げる)
    };

    static preload(scene) {
        // 読み込み済みファイルを追跡
        this.loadedAudioFiles = this.loadedAudioFiles || new Set();
        
        // エラーハンドリングを追加
        scene.load.on('filecomplete-audio', (key) => {
            this.loadedAudioFiles.add(key);
        });
        
        // 読み込みエラーをキャッチ（ファイルが存在しない場合など）
        scene.load.on('loaderror', (file) => {
            // 音声ファイルの読み込みエラーを無視（SEを作り直すため）
            if (file.type === 'audio' || file.key?.startsWith('sfx_') || file.key?.startsWith('bgm_')) {
                // エラーをコンソールに出力しない
                return;
            }
        });
        
        // デコードエラーもキャッチ
        scene.load.on('filecomplete', (key, type) => {
            if (type === 'audio') {
                this.loadedAudioFiles.add(key);
            }
        });
        
        Object.entries(this.AUDIO_MAP).forEach(([key, meta]) => {
            try {
                scene.load.audio(key, meta.path);
            } catch (err) {
                // エラーを無視
            }
        });
    }

    static ensureUnlocked(scene) {
        const soundSystem = scene?.sound;
        if (!scene?.input || !soundSystem) return;

        const contextState = soundSystem.context?.state;
        const needsUnlock = soundSystem.locked || contextState === 'suspended';

        // 🔊 デバッグ: AudioContextの状態をログ出力
        console.log('🔊 AudioManager.ensureUnlocked:', {
            contextState,
            soundLocked: soundSystem.locked,
            needsUnlock,
            unlocked: this.unlocked,
            listenerAttached: this.unlockListenerAttached
        });

        if (!needsUnlock && this.unlocked) return;
        if (this.unlockListenerAttached) return;

        const self = this;
        
        const removeGlobalListeners = () => {
            if (typeof window === 'undefined') return;
            self.globalUnlockEvents.forEach(evt => {
                window.removeEventListener(evt, tryUnlock, true);
            });
        };

        // 🔧 修正: 非同期関数に変更してresume()の完了を待つ
        const tryUnlock = async (event) => {
            console.log('🔊 tryUnlock called:', event?.type);
            self.unlockListenerAttached = false;
            removeGlobalListeners();
            
            const snd = scene.sound;
            if (!snd) return;

            console.log('🔊 Current context state:', snd.context?.state, 'locked:', snd.locked);

            // ユーザー操作が確実に発生していることを確認
            // eventが存在する場合のみAudioContextをresume
            if (snd.context?.state === 'suspended') {
                console.log('🔊 Attempting to resume AudioContext...');
                try {
                    // ユーザー操作イベント内でresumeを呼ぶことで警告を回避
                    if (event && event.type) {
                        await snd.context.resume();
                        console.log('🔊 AudioContext resumed successfully! State:', snd.context?.state);
                    }
                } catch (err) {
                    console.log('🔊 AudioContext resume failed:', err);
                }
            }
            
            // PhaserのSound Managerのロック解除
            // 🔧 修正: 複数回試行してロック解除を確実に行う
            if (snd.locked) {
                try {
                    // Phaserのunlockを呼ぶ
                    snd.unlock();
                    
                    // ロック解除を待つ（最大500ms）
                    for (let i = 0; i < 10; i++) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                        if (!snd.locked) {
                            console.log('🔊 Sound unlocked after', (i + 1) * 50, 'ms');
                            break;
                        }
                    }
                } catch (err) {
                    console.debug('Sound unlock failed', err);
                }
            }

            // 🔧 修正: AudioContextがrunningならlockedに関係なく再生を試みる
            const contextRunning = snd.context?.state === 'running';
            const isRunning = contextRunning && !snd.locked;
            console.log('🔊 After unlock attempt - context state:', snd.context?.state, 'locked:', snd.locked, 'isRunning:', isRunning);

            // AudioContextがrunningなら、lockedでも再生を試みる（iOS対策）
            if (contextRunning) {
                console.log('🔊 AudioContext is running! Unlocking AudioManager...');
                self.unlocked = true;
                if (self.pendingBgm) {
                    console.log('🔊 Playing pending BGM:', self.pendingBgm.key);
                    const pending = self.pendingBgm;
                    self.pendingBgm = null;
                    // 少し遅延してから再生（iOS対策）
                    setTimeout(() => {
                        self.playBgm(pending.scene, pending.key, pending.config);
                    }, 100);
                }
            } else {
                console.log('🔊 AudioContext still not running, will retry on next interaction');
                // 次のインタラクションで再試行
                self.ensureUnlocked(scene);
            }
        };

        scene.input.once('pointerdown', tryUnlock);
        scene.input.once('pointerup', tryUnlock);

        if (typeof window !== 'undefined') {
            this.globalUnlockEvents.forEach(evt => {
                window.addEventListener(evt, tryUnlock, { once: true, passive: true, capture: true });
            });
        }

        this.unlockListenerAttached = true;
    }

    static applySettings(settings = {}) {
        this.bgmEnabled = settings.bgmEnabled !== false;
        this.seEnabled = settings.seEnabled !== false;
        this.bgmVolume = typeof settings.bgmVolume === 'number' ? settings.bgmVolume : 1.0;
        this.seVolume = typeof settings.seVolume === 'number' ? settings.seVolume : 1.0;
        if (!this.bgmEnabled) this.stopBgm(0);
        // 既存のBGMに音量を適用
        if (this.currentBgmSound && this.currentBgmSound.isPlaying) {
            const meta = this.AUDIO_MAP[this.currentBgmKey];
            const baseVol = meta?.volume ?? 0.6;
            this.currentBgmSound.setVolume(baseVol * this.bgmVolume);
        }
    }

    static playBgm(scene, key, config = {}) {
        this.lastScene = scene;
        this.lastRequestedBgm = key;
        if (!this.bgmEnabled || !scene?.sound) return;

        const soundSystem = scene.sound;
        const contextState = soundSystem.context?.state;
        
        // 🔧 修正: AudioContextがsuspendedの場合のみペンディング
        // lockedでもcontextがrunningなら再生を試みる（iOS対策）
        if (contextState === 'suspended') {
            this.pendingBgm = { scene, key, config };
            this.ensureUnlocked(scene);
            return;
        }
        
        // AudioManagerがまだunlockedでない場合も、contextがrunningなら再生を試みる
        if (!this.unlocked && contextState === 'running') {
            this.unlocked = true;
            console.log('🔊 AudioManager auto-unlocked because context is running');
        }

        if (this.currentBgmKey === key && !config.forceRestart) return;
        this.stopBgm(200);
        const meta = this.AUDIO_MAP[key];
        if (!meta) return;
        
        // 音声ファイルが読み込まれているかチェック（loadedAudioFilesが未定義の場合はチェックをスキップ）
        if (this.loadedAudioFiles && !this.loadedAudioFiles.has(key)) {
            // ファイルが存在しない場合は再生しない（エラーを出さない）
            return;
        }
        
        try {
            // 音声ファイルが存在するかチェック
            if (!scene.cache.audio.exists(key)) {
                return;
            }
            
            const baseVol = meta.volume ?? 0.6;
            const sound = soundSystem.add(key, {
                loop: meta.loop !== false,
                volume: baseVol * this.bgmVolume,  // 音量設定を適用
                ...config
            });
            sound.play();
            this.currentBgmSound = sound;
            this.currentBgmKey = key;
        } catch (err) {
            // エラーを無視（ファイルが存在しない場合やデコードエラーなど）
        }
    }

    static stopBgm(fade = 150) {
        if (this.currentBgmSound) {
            const snd = this.currentBgmSound;
            const scene = this.lastScene;
            if (fade > 0 && scene && scene.tweens) {
                scene.tweens.add({
                    targets: snd,
                    volume: 0,
                    duration: fade,
                    onComplete: () => snd.stop()
                });
            } else {
                snd.stop();
            }
        }
        this.currentBgmSound = null;
        this.currentBgmKey = null;
    }

    static playSfx(scene, key, config = {}) {
        const soundSystem = scene?.sound;
        if (!soundSystem) return;
        
        // 🔧 修正: AudioContextがsuspendedの場合のみ待機
        // lockedでもcontextがrunningなら再生を試みる（iOS対策）
        const contextState = soundSystem.context?.state;
        if (contextState === 'suspended') {
            soundSystem.once(Phaser.Sound.Events.UNLOCKED, () => this.playSfx(scene, key, config));
            return;
        }
        
        if (!this.seEnabled) return;
        const meta = this.AUDIO_MAP[key];
        if (!meta) return;
        
        // 音声ファイルが読み込まれているかチェック（loadedAudioFilesが未定義の場合はチェックをスキップ）
        if (this.loadedAudioFiles && !this.loadedAudioFiles.has(key)) {
            // ファイルが存在しない場合は再生しない（エラーを出さない）
            return;
        }
        
        try {
            // 音声ファイルが存在するかチェック
            if (!scene.cache.audio.exists(key)) {
                return;
            }
            
            const baseVol = meta.volume ?? 0.6;
            soundSystem.play(key, {
                volume: baseVol * this.seVolume,  // 音量設定を適用
                ...config
            });
        } catch (err) {
            // エラーを無視（ファイルが存在しない場合やデコードエラーなど）
        }
    }

    static setBgmEnabled(enabled) {
        this.bgmEnabled = enabled;
        if (!enabled) {
            this.stopBgm(150);
            this.pendingBgm = null;
        } else if (this.lastScene && this.lastRequestedBgm) {
            this.playBgm(this.lastScene, this.lastRequestedBgm);
        }
    }

    static setSeEnabled(enabled) {
        this.seEnabled = enabled;
    }

    // 🔊 BGM音量を設定（0.0 〜 1.0）
    static setBgmVolume(volume) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        // 再生中のBGMに即座に反映
        if (this.currentBgmSound && this.currentBgmSound.isPlaying) {
            const meta = this.AUDIO_MAP[this.currentBgmKey];
            const baseVol = meta?.volume ?? 0.6;
            this.currentBgmSound.setVolume(baseVol * this.bgmVolume);
        }
    }

    // 🔊 SE音量を設定（0.0 〜 1.0）
    static setSeVolume(volume) {
        this.seVolume = Math.max(0, Math.min(1, volume));
    }

    // 🔧 ユーザージェスチャー時に確実にAudioContextをアンロックする
    // Safariなどの厳しいブラウザ対策
    static async unlockFromUserGesture(scene) {
        const snd = scene?.sound;
        if (!snd || !snd.context) return;

        console.log('🔊 unlockFromUserGesture called, context state:', snd.context.state);

        // AudioContextがsuspendedの場合はresumeを試みる
        if (snd.context.state === 'suspended') {
            try {
                await snd.context.resume();
                console.log('🔊 AudioContext resumed! New state:', snd.context.state);
            } catch (err) {
                console.log('🔊 Resume failed:', err);
            }
        }

        // PhaserのSoundManagerがロックされている場合はアンロック
        if (snd.locked) {
            try {
                snd.unlock();
            } catch (err) {
                console.debug('Sound unlock failed', err);
            }
        }

        // アンロック状態を更新
        if (snd.context.state === 'running' && !snd.locked) {
            this.unlocked = true;
            console.log('🔊 AudioManager unlocked successfully!');
            
            // 保留中のBGMがあれば再生
            if (this.pendingBgm) {
                console.log('🔊 Playing pending BGM:', this.pendingBgm.key);
                const pending = this.pendingBgm;
                this.pendingBgm = null;
                this.playBgm(pending.scene, pending.key, pending.config);
            }
        }
    }
}

// ========================================
// クリア状態の保存・読込
// ========================================

/**
 * クリア済みステージのIDリストを読み込む
 */
function loadClearedStages() {
    try {
        const saved = localStorage.getItem('inusanpo_cleared');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error('クリア状態の読み込みに失敗:', e);
        return [];
    }
}

/**
 * ステージをクリア済みとして保存
 */
function saveClearedStage(stageId) {
    try {
        const cleared = loadClearedStages();
        if (!cleared.includes(stageId)) {
            cleared.push(stageId);
            localStorage.setItem('inusanpo_cleared', JSON.stringify(cleared));
            console.log(`✅ ステージ ${stageId} クリア保存！`);
        }
    } catch (e) {
        console.error('クリア状態の保存に失敗:', e);
    }
}

// ========================================
// 基本設定
// ========================================
const CONFIG = {
    GRID_SIZE: 6,
    CELL_PADDING: 6,
    CORNER_RADIUS: 8,
};

// セーフエリア（ノッチ・ホームインジケータ対応）
const SAFE = {
    TOP: 50,
    BOTTOM: 34,
};

// カラーパレット
const PALETTE = {
    // 背景
    sky: 0x87CEEB,      // 明るい空色
    grass: 0x8FBC8F,
    grassDark: 0x6B8E6B,
    ground: 0xDEB887,
    groundDark: 0xC4A573,
    wood: 0x8B7355,
    woodDark: 0x6B5344,

    // セル
    cellBg: 0xFFFAF0,
    cellOutline: 0x4A4A4A,

    // UI
    uiBg: 0xFFFDF5,
    uiOutline: 0x5D4E37,
    textDark: '#4A4A4A',
    textLight: '#FFFFFF',
};

// ========================================
// 共通テキストスタイル（桜井イズム：視覚的階層の徹底）
// ========================================
// 【階層】大タイトル > 見出し > セクション > 本文 > 小
// 重要度が高いほど：大きく、太く、縁取りを強く
const TEXT_STYLE = {
    // ★ 大タイトル（ゲーム名、クリア！など最重要）
    title: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '32px',
        color: PALETTE.textDark,
        stroke: '#FFFFFF',
        strokeThickness: 6,
        shadow: { offsetX: 2, offsetY: 3, color: '#00000033', blur: 4, fill: true },
    },
    // ★ 見出し（画面タイトル：ショップ、せってい等）
    heading: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '20px',
        color: PALETTE.textDark,
        stroke: '#FFFFFF',
        strokeThickness: 3,
    },
    // ★ セクションタイトル（にくきゅうカラー、せかいのテーマ等）
    // かわいい縁取り＋ちょっとした影で「区切り」を強調
    section: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '16px',
        color: '#5D4037',
        stroke: '#FFFFFF',
        strokeThickness: 4,
        shadow: { offsetX: 1, offsetY: 2, color: '#00000022', blur: 2, fill: true },
    },
    // ★ 本文（説明テキスト、通常の文）
    body: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '16px',
        color: PALETTE.textDark,
    },
    // ★ 小さいテキスト（補足、ラベル）
    small: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '12px',
        color: '#666666',
    },
    // ★ ボタンテキスト（大）
    button: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '22px',
        color: '#FFFFFF',
        stroke: '#00000055',
        strokeThickness: 4,
        shadow: { offsetX: 1, offsetY: 2, color: '#00000044', blur: 2, fill: true },
    },
    // ★ ボタンテキスト（小）
    buttonSmall: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '18px',
        color: '#FFFFFF',
        stroke: '#00000044',
        strokeThickness: 3,
    },
    // ★ スコア・数字（存在感！）
    score: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '48px',
        color: '#FFD700',
        stroke: '#8B4513',
        strokeThickness: 5,
        shadow: { offsetX: 2, offsetY: 3, color: '#00000044', blur: 4, fill: true },
    },
    // ★ ラッキー・特殊演出用
    special: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '24px',
        color: '#FFD700',
        stroke: '#8B4513',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#FFD70066', blur: 8, fill: true },
    },
    // ★ 警告・ゲームオーバー用
    warning: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '28px',
        color: '#FF6B6B',
        stroke: '#FFFFFF',
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: '#FF000044', blur: 4, fill: true },
    },
    // ★ 成功メッセージ用
    success: {
        fontFamily: 'KeiFont, sans-serif',
        fontSize: '24px',
        color: '#4CAF50',
        stroke: '#FFFFFF',
        strokeThickness: 4,
        shadow: { offsetX: 1, offsetY: 2, color: '#00800033', blur: 4, fill: true },
    },
};

// ========================================
// 🎯 桜井イズム：ボタンの「手触り」統一ユーティリティ
// ========================================
const ButtonUtils = {
    /**
     * ボタンに統一されたフィードバックを適用
     * @param {Phaser.Scene} scene - シーン
     * @param {Phaser.GameObjects.Container} btn - ボタンコンテナ
     * @param {Function} callback - クリック時のコールバック
     * @param {Object} options - オプション
     */
    addFeedback(scene, btn, callback, options = {}) {
        const {
            scaleDown = 0.92,     // 押下時の縮小
            scaleBounce = 1.08,   // 離した時の膨らみ
            duration = 40,        // アニメーション時間
            haptic = 'Light',     // Hapticスタイル（Light/Medium/Heavy/null）
            preventDouble = true, // 連打防止
        } = options;
        
        let isProcessing = false;
        
        btn.setInteractive({ useHandCursor: true });
        
        // 押下：ぎゅっと縮む + Haptic
        btn.on('pointerdown', () => {
            if (preventDouble && isProcessing) return;
            scene.tweens.add({
                targets: btn,
                scale: scaleDown,
                duration: duration,
                ease: 'Quad.easeOut'
            });
            if (haptic) HapticManager.impact(haptic);
        });
        
        // 離す：ぽんっと弾けてからコールバック
        btn.on('pointerup', () => {
            if (preventDouble && isProcessing) return;
            isProcessing = true;

            scene.tweens.add({
                targets: btn,
                scale: scaleBounce,
                duration: duration * 2,
                ease: 'Back.easeOut',
                onComplete: () => {
                    scene.tweens.add({
                        targets: btn,
                        scale: 1,
                        duration: duration * 1.5,
                        ease: 'Sine.easeOut',
                        onComplete: () => {
                            AudioManager.playSfx(scene, 'sfx_ui_tap');
                            if (callback) callback();
                            // 少し遅延して連打防止解除
                            scene.time.delayedCall(150, () => {
                                isProcessing = false;
                            });
                        }
                    });
                }
            });
        });
        
        // ボタン外に出たら元に戻す
        btn.on('pointerout', () => {
            scene.tweens.add({
                targets: btn,
                scale: 1,
                duration: duration,
                ease: 'Quad.easeOut'
            });
        });
        
        return btn;
    },
    
    /**
     * 標準的なボタンを作成
     * @param {Phaser.Scene} scene - シーン
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {string} text - ボタンテキスト
     * @param {number} color - ボタン色
     * @param {Function} callback - クリック時のコールバック
     * @param {Object} options - オプション
     */
    create(scene, x, y, text, color, callback, options = {}) {
        const {
            width = 150,
            height = 48,  // 🎯 モバイル基準: 48px以上
            fontSize = '20px',
            radius = 12,
        } = options;
        
        const btn = scene.add.container(x, y);
        
        // 背景
        const bg = scene.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
        
        // 縁取り
        bg.lineStyle(3, 0x00000033, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
        
        // ハイライト（上部）
        const highlight = scene.add.graphics();
        highlight.fillStyle(0xFFFFFF, 0.2);
        highlight.fillRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height / 3, radius - 2);
        
        // テキスト
        const txt = scene.add.text(0, 0, text, {
            ...TEXT_STYLE.button,
            fontSize: fontSize
        }).setOrigin(0.5);
        
        btn.add([bg, highlight, txt]);
        btn.setSize(width, height);
        
        // フィードバック適用
        this.addFeedback(scene, btn, callback, options);
        
        return btn;
    },
    
    /**
     * 小さめのサブボタンを作成
     */
    createSmall(scene, x, y, text, color, callback, options = {}) {
        return this.create(scene, x, y, text, color, callback, {
            width: 120,
            height: 44,
            fontSize: '16px',
            radius: 10,
            ...options
        });
    },
    
    /**
     * アイコンボタンを作成（設定ボタン等）
     */
    createIcon(scene, x, y, icon, color, callback, options = {}) {
        const {
            size = 48,
            fontSize = '24px',
            radius = 12,
        } = options;
        
        const btn = scene.add.container(x, y);
        
        const bg = scene.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-size / 2, -size / 2, size, size, radius);
        
        const iconText = scene.add.text(0, 0, icon, {
            fontSize: fontSize
        }).setOrigin(0.5);
        
        btn.add([bg, iconText]);
        btn.setSize(size, size);
        
        this.addFeedback(scene, btn, callback, { haptic: 'Light', ...options });
        
        return btn;
    }
};

// ========================================
// ========================================
// 🐕 犬種定義（32種類のワンコたち）- 桜井イズム準拠
// 初期から使える: 1〜4（柴犬、パグ、トイプードル、ハスキー）
// 5〜28, 30〜32は実績解放
// 29: ゴールデンワンコは特殊（ステージ選択で1/50遭遇）
// ========================================
const DOG_TYPES = {
    // 01: 柴犬
    1: {
        name: '柴犬',
        color: 0xD2691E,
        accentColor: 0xFFDAAB,
        earType: 'pointed',
        eyeType: 'round',
        feature: 'none',
    },
    // 02: パグ
    2: {
        name: 'パグ',
        color: 0xC4A77D,
        accentColor: 0xFFE4C4,
        earType: 'floppy',
        eyeType: 'big',
        feature: 'wrinkle',
    },
    // 03: トイプードル
    3: {
        name: 'トイプードル',
        color: 0x8B4513,
        accentColor: 0xDEB887,
        earType: 'curly',
        eyeType: 'round',
        feature: 'fluffy',
    },
    // 04: ハスキー
    4: {
        name: 'ハスキー',
        color: 0x708090,
        accentColor: 0xFFFFFF,
        earType: 'pointed',
        eyeType: 'almond',
        feature: 'mask',
    },
    // 05: ゴールデンレトリバー
    5: {
        name: 'ゴールデンレトリバー',
        color: 0xDAA520,
        accentColor: 0xFFF8DC,
        earType: 'floppy',
        eyeType: 'gentle',
        feature: 'none',
    },
    // 06: コーギー
    6: {
        name: 'コーギー',
        color: 0xCD853F,
        accentColor: 0xFFFFFF,
        earType: 'big_pointed',
        eyeType: 'round',
        feature: 'short_legs',
    },
    // 07: ダルメシアン
    7: {
        name: 'ダルメシアン',
        color: 0xFFFFFF,
        accentColor: 0x333333,
        earType: 'floppy',
        eyeType: 'round',
        feature: 'spots',
    },
    // 08: チワワ
    8: {
        name: 'チワワ',
        color: 0x333333,
        accentColor: 0xFFFFFF,
        earType: 'huge',
        eyeType: 'huge',
        feature: 'tiny',
    },
    // 09: シュナウザー
    9: {
        name: 'シュナウザー',
        color: 0x696969,
        accentColor: 0xC0C0C0,
        earType: 'folded',
        eyeType: 'bushy',
        feature: 'beard',
    },
    // 10: ドーベルマン
    10: {
        name: 'ドーベルマン',
        color: 0x1C1C1C,
        accentColor: 0xCD853F,
        earType: 'cropped',
        eyeType: 'sharp',
        feature: 'tan_points',
    },
    // 11: セントバーナード
    11: {
        name: 'セントバーナード',
        color: 0xCD853F,
        accentColor: 0xFFFFFF,
        earType: 'floppy',
        eyeType: 'droopy',
        feature: 'saint_pattern',
    },
    // 12: ボルゾイ
    12: {
        name: 'ボルゾイ',
        color: 0xFFFAF0,
        accentColor: 0xF5DEB3,
        earType: 'elegant',
        eyeType: 'noble',
        feature: 'long_nose',
    },
    // 13: バーニーズ
    13: {
        name: 'バーニーズ',
        color: 0x1C1C1C,
        accentColor: 0xFFFFFF,
        earType: 'floppy',
        eyeType: 'gentle',
        feature: 'bernese_pattern',
    },
    // 14: サモエド
    14: {
        name: 'サモエド',
        color: 0xFFFFF0,
        accentColor: 0xFFFFFF,
        earType: 'pointed',
        eyeType: 'round',
        feature: 'fluffy_white',
    },
    // 15: グレートデン
    15: {
        name: 'グレートデン',
        color: 0xD2B48C,
        accentColor: 0x1C1C1C,
        earType: 'floppy',
        eyeType: 'gentle',
        feature: 'huge_dog',
    },
    // 16: キャバリア
    16: {
        name: 'キャバリア',
        color: 0xCD853F,
        accentColor: 0xFFFFFF,
        earType: 'long_curly',
        eyeType: 'round',
        feature: 'spaniel',
    },
    // 17: ジャックラッセルテリア
    17: {
        name: 'ジャックラッセルテリア',
        color: 0xFFFFFF,
        accentColor: 0xCD853F,
        earType: 'folded',
        eyeType: 'round',
        feature: 'terrier',
    },
    // 18: パピヨン
    18: {
        name: 'パピヨン',
        color: 0xFFFFFF,
        accentColor: 0x8B4513,
        earType: 'butterfly',
        eyeType: 'round',
        feature: 'butterfly_ears',
    },
    // 19: ブルドッグ
    19: {
        name: 'ブルドッグ',
        color: 0xD2B48C,
        accentColor: 0xFFFFFF,
        earType: 'rose',
        eyeType: 'droopy',
        feature: 'underbite',
    },
    // 20: 黒柴（隠し犬種！）
    20: {
        name: '黒柴',
        color: 0x1C1C1C,
        accentColor: 0xFFDAAB,
        earType: 'pointed',
        eyeType: 'round',
        feature: 'black_shiba',
        isSecret: true,
    },
    // ====== 新犬種（21-32）======
    // 21: チワプー
    21: {
        name: 'チワプー',
        color: 0x808080,
        accentColor: 0xC0C0C0,
        earType: 'curly',
        eyeType: 'round',
        feature: 'fluffy',
    },
    // 22: ダックスフンド
    22: {
        name: 'ダックスフンド',
        color: 0x1C1C1C,
        accentColor: 0xCD853F,
        earType: 'long_floppy',
        eyeType: 'round',
        feature: 'long_body',
    },
    // 23: ビションフリーゼ
    23: {
        name: 'ビションフリーゼ',
        color: 0xFFFFFF,
        accentColor: 0xFFFAF0,
        earType: 'hidden',
        eyeType: 'round',
        feature: 'cotton_ball',
    },
    // 24: ポメラニアン
    24: {
        name: 'ポメラニアン',
        color: 0xFFFAF0,
        accentColor: 0xFFFFFF,
        earType: 'pointed',
        eyeType: 'round',
        feature: 'fluffy_white',
    },
    // 25: チャウチャウ
    25: {
        name: 'チャウチャウ',
        color: 0xCD853F,
        accentColor: 0xDEB887,
        earType: 'small_pointed',
        eyeType: 'small',
        feature: 'lion_mane',
    },
    // 26: ニューファンドランド
    26: {
        name: 'ニューファンドランド',
        color: 0x1C1C1C,
        accentColor: 0x333333,
        earType: 'floppy',
        eyeType: 'gentle',
        feature: 'giant_fluffy',
    },
    // 27: シャーペイ
    27: {
        name: 'シャーペイ',
        color: 0xD2B48C,
        accentColor: 0xDEB887,
        earType: 'tiny',
        eyeType: 'small',
        feature: 'wrinkle',
    },
    // 28: チャイニーズクレステッド（隠し！）
    28: {
        name: 'チャイニーズクレステッド',
        color: 0xDEB887,
        accentColor: 0xFFFFFF,
        earType: 'huge',
        eyeType: 'almond',
        feature: 'hairless',
        isSecret: true,
    },
    // 29: ゴールデンワンコ（でんせつワンコ！ゴールデンレトリバーを連れてチャレンジモードで遭遇）
    29: {
        name: 'ゴールデンワンコ',
        color: 0xFFD700,
        accentColor: 0xFFF8DC,
        earType: 'floppy',
        eyeType: 'sparkle',
        feature: 'golden_sparkle',
        isSecret: true,
        isLegendary: true,
    },
    // 30: ボーダーコリー
    30: {
        name: 'ボーダーコリー',
        color: 0x1C1C1C,
        accentColor: 0xFFFFFF,
        earType: 'semi_erect',
        eyeType: 'smart',
        feature: 'border_pattern',
    },
    // 31: ビーグル
    31: {
        name: 'ビーグル',
        color: 0xCD853F,
        accentColor: 0xFFFFFF,
        earType: 'long_floppy',
        eyeType: 'round',
        feature: 'beagle_pattern',
    },
    // 32: マルチーズ（隠し！コンプリート報酬！）
    32: {
        name: 'マルチーズ',
        color: 0xFFFFFF,
        accentColor: 0xFFFAF0,
        earType: 'hidden',
        eyeType: 'round',
        feature: 'silky_white',
        isSecret: true,
    },
    // ========================================
    // ✨ 伝説ワンコ（でんせつワンコ！超レア！）
    // ========================================
    // 33: チクワ（伝説ワンコ！）
    33: {
        name: 'チクワ',
        color: 0xDEB887,
        accentColor: 0xFFE4C4,
        earType: 'erect',
        eyeType: 'round',
        feature: 'chikuwa',
        isSecret: true,
        isLegendary: true,
    },
    // 34: ふわもこキング（伝説ワンコ！）
    34: {
        name: 'ふわもこキング',
        color: 0xFFFAFA,
        accentColor: 0xFFB6C1,
        earType: 'hidden',
        eyeType: 'sparkle',
        feature: 'fluffy_king',
        isSecret: true,
        isLegendary: true,
    },
    // 35: グレートデデン（伝説ワンコ！サイボーグ！）
    35: {
        name: 'グレートデデン',
        color: 0x708090,
        accentColor: 0x00FFFF,
        earType: 'erect',
        eyeType: 'cyber',
        feature: 'cyborg',
        isSecret: true,
        isLegendary: true,
    },
    // 36: セントバナナード（伝説ワンコ！）
    36: {
        name: 'セントバナナード',
        color: 0xFFE135,
        accentColor: 0x8B4513,
        earType: 'floppy',
        eyeType: 'round',
        feature: 'banana',
        isSecret: true,
        isLegendary: true,
    },
    // 37: 武者犬（伝説ワンコ！）
    37: {
        name: '武者犬',
        color: 0x8B0000,
        accentColor: 0xFFD700,
        earType: 'erect',
        eyeType: 'fierce',
        feature: 'samurai',
        isSecret: true,
        isLegendary: true,
    },
    // 38: 炎の犬（伝説ワンコ！）
    38: {
        name: '炎の犬',
        color: 0xFF4500,
        accentColor: 0xFFFFFF,
        earType: 'hidden',
        eyeType: 'flame',
        feature: 'fire',
        isSecret: true,
        isLegendary: true,
    },
    // 39: かいじゅう（伝説ワンコ！）
    39: {
        name: 'かいじゅう',
        color: 0x228B22,
        accentColor: 0x90EE90,
        earType: 'hidden',
        eyeType: 'cute',
        feature: 'kigurumi',
        isSecret: true,
        isLegendary: true,
    },
    // 40: ゴリラ（伝説ワンコ！）
    40: {
        name: 'ゴリラ',
        color: 0x2F4F4F,
        accentColor: 0x696969,
        earType: 'round',
        eyeType: 'powerful',
        feature: 'gorilla',
        isSecret: true,
        isLegendary: true,
    },
};

// ========================================
// ✨ でんせつワンコ遭遇条件定義
// チャレンジモード専用！超超超レアな遭遇イベント
// ========================================
const LEGEND_ENCOUNTERS = {
    // 29: ゴールデンワンコ（ゴールデンレトリバーを連れている時）
    29: {
        id: 29,
        name: 'ゴールデンワンコ',
        requiredDogId: 5,  // ゴールデンレトリバー
        requiredCostume: null,
        probability: 1/100,
        encounterMessage: 'まばゆいひかりが…！',
        unlockMessage: 'ゴールデンワンコが\nなかまになった！',
        description: 'ゴールデンレトリバーを連れて\nチャレンジモードで出会える',
    },
    // 33: チクワ（チワワを連れている時）
    33: {
        id: 33,
        name: 'チクワ',
        requiredDogId: 8,  // チワワ
        requiredCostume: null,
        probability: 1/100,
        encounterMessage: 'チクワのかおりが…！',
        unlockMessage: 'チクワが\nなかまになった！',
        description: 'チワワを連れて\nチャレンジモードで出会える',
    },
    // 34: ふわもこキング犬（王冠を装着している時）
    34: {
        id: 34,
        name: 'ふわもこキング',
        requiredDogId: null,
        requiredCostume: 'crown_gold',  // 王冠
        probability: 1/100,
        encounterMessage: 'おうさまのオーラが…！',
        unlockMessage: 'ふわもこキングが\nなかまになった！',
        description: 'おうかんを装着して\nチャレンジモードで出会える',
    },
    // 35: グレートデデン（グレートデンを連れている時）
    35: {
        id: 35,
        name: 'グレートデデン',
        requiredDogId: 15,  // グレートデン
        requiredCostume: null,
        probability: 1/100,
        encounterMessage: 'きょだいなかげが…！',
        unlockMessage: 'グレートデデンが\nなかまになった！',
        description: 'グレートデンを連れて\nチャレンジモードで出会える',
    },
    // 36: セントバナナード（セントバーナードを連れている時）
    36: {
        id: 36,
        name: 'セントバナナード',
        requiredDogId: 11,  // セントバーナード
        requiredCostume: null,
        probability: 1/100,
        encounterMessage: 'バナナのにおいが…！',
        unlockMessage: 'セントバナナードが\nなかまになった！',
        description: 'セントバーナードを連れて\nチャレンジモードで出会える',
    },
    // 37: 武者犬（柴犬を連れている時）
    37: {
        id: 37,
        name: '武者犬',
        requiredDogId: 1,  // 柴犬
        requiredCostume: null,
        probability: 1/100,
        encounterMessage: 'いにしえのつわものが…！',
        unlockMessage: '武者犬が\nなかまになった！',
        description: '柴犬を連れて\nチャレンジモードで出会える',
    },
    // 38: 炎の犬（サモエドを連れている時）
    38: {
        id: 38,
        name: '炎の犬',
        requiredDogId: 14,  // サモエド
        requiredCostume: null,
        probability: 1/100,
        encounterMessage: 'ほのおのいぶきが…！',
        unlockMessage: '炎の犬が\nなかまになった！',
        description: 'サモエドを連れて\nチャレンジモードで出会える',
    },
    // 39: かいじゅう（ハスキーを連れている時）
    39: {
        id: 39,
        name: 'かいじゅう',
        requiredDogId: 4,  // ハスキー
        requiredCostume: null,
        probability: 1/100,
        encounterMessage: 'とおくでほえごえが…！',
        unlockMessage: 'かいじゅうが\nなかまになった！',
        description: 'ハスキーを連れて\nチャレンジモードで出会える',
    },
    // 40: ゴリラ（誰でも！超超超レア！）
    40: {
        id: 40,
        name: 'ゴリラ',
        requiredDogId: null,
        requiredCostume: null,
        probability: 1/500,  // 超超超レア！
        encounterMessage: 'ジャングルのかぜが…！',
        unlockMessage: 'ゴリラが\nなかまになった！',
        description: 'チャレンジモードで\nまれに出会える（1/500）',
    },
};

// ========================================
// 🐕 犬種画像アセット設定（桜井イズム：視認性最優先）
// 32種類のワンコたち
// ========================================
const DOG_ASSETS = {
    1:  { folder: 'dog_01_shiba',      name: '柴犬',               hasImage: true },
    2:  { folder: 'dog_02_pug',        name: 'パグ',               hasImage: true },
    3:  { folder: 'dog_03_toypoodle',  name: 'トイプードル',       hasImage: true },
    4:  { folder: 'dog_04_husky',      name: 'ハスキー',           hasImage: true },
    5:  { folder: 'dog_05_golden',     name: 'ゴールデンレトリバー', hasImage: true },
    6:  { folder: 'dog_06_corgi',      name: 'コーギー',           hasImage: true },
    7:  { folder: 'dog_07_dalmatian',  name: 'ダルメシアン',       hasImage: true },
    8:  { folder: 'dog_08_chihuahua',  name: 'チワワ',             hasImage: true },
    9:  { folder: 'dog_09_schnauzer',  name: 'シュナウザー',       hasImage: true },
    10: { folder: 'dog_10_doberman',   name: 'ドーベルマン',       hasImage: true },
    11: { folder: 'dog_11_stbernard',  name: 'セントバーナード',   hasImage: true },
    12: { folder: 'dog_12_borzoi',     name: 'ボルゾイ',           hasImage: true },
    13: { folder: 'dog_13_bernese',    name: 'バーニーズ',         hasImage: true },
    14: { folder: 'dog_14_samoyed',    name: 'サモエド',           hasImage: true },
    15: { folder: 'dog_15_greatdane',  name: 'グレートデン',       hasImage: true },
    16: { folder: 'dog_16_cavalier',   name: 'キャバリア',         hasImage: true },
    17: { folder: 'dog_17_jackrussell', name: 'ジャックラッセルテリア', hasImage: true },
    18: { folder: 'dog_18_papillon',   name: 'パピヨン',           hasImage: true },
    19: { folder: 'dog_19_bulldog',    name: 'ブルドッグ',         hasImage: true },
    20: { folder: 'dog_20_blackshiba', name: '黒柴',               hasImage: true },
    // 新しい犬種（21-32）
    21: { folder: 'dog_21_chipoo',     name: 'チワプー',           hasImage: true },
    22: { folder: 'dog_22_dachshund',  name: 'ダックスフンド',     hasImage: true },
    23: { folder: 'dog_23_bichon',     name: 'ビションフリーゼ',   hasImage: true },
    24: { folder: 'dog_24_pomeranian', name: 'ポメラニアン',       hasImage: true },
    25: { folder: 'dog_25_chowchow',   name: 'チャウチャウ',       hasImage: true },
    26: { folder: 'dog_26_newfoundland', name: 'ニューファンドランド', hasImage: true },
    27: { folder: 'dog_27_sharpei',    name: 'シャーペイ',         hasImage: true },
    28: { folder: 'dog_28_chinesecrested', name: 'チャイニーズクレステッド', hasImage: true },
    29: { folder: 'dog_29_goldenwanko', name: 'ゴールデンワンコ',  hasImage: true },
    30: { folder: 'dog_30_bordercollie', name: 'ボーダーコリー',   hasImage: true },
    31: { folder: 'dog_31_beagle',     name: 'ビーグル',           hasImage: true },
    32: { folder: 'dog_32_maltese',    name: 'マルチーズ',         hasImage: true },
    // ✨ 伝説ワンコ（でんせつワンコ！）
    33: { folder: 'legend_02_chikuwa',       name: 'チクワ',           hasImage: true },
    34: { folder: 'legend_03_fuwamokoking',  name: 'ふわもこキング',   hasImage: true },
    35: { folder: 'legend_04_greatdeden',    name: 'グレートデデン',   hasImage: true, expressionMap: { neutral: 'happy', happy: 'excited' } },
    36: { folder: 'legend_05_sentobanana-do', name: 'セントバナナード', hasImage: true },
    37: { folder: 'legend_17_mushainu',      name: '武者犬',           hasImage: true },
    38: { folder: 'legend_18_rengoku',       name: '炎の犬',           hasImage: true },
    39: { folder: 'legend_20_kigurumi',      name: 'かいじゅう',       hasImage: true },
    40: { folder: 'legend_21_gorilla',       name: 'ゴリラ',           hasImage: true },
};

// 表情タイプ
const DOG_EXPRESSIONS = ['neutral', 'happy', 'sad', 'excited'];

// ========================================
// 実績定義
// ========================================
// ========================================
// 🏆 実績定義（32種類の犬に対応）- 桜井イズム準拠
// 初期から使える犬: 柴犬(1)〜ハスキー(4) の4種
// 実績解放: ゴールデンレトリバー(5)〜マルチーズ(32)
// ゴールデンワンコ(29)は特殊：ステージ選択で1/50で遭遇
// ========================================
const ACHIEVEMENTS = {
    // ====== ステージクリア系（10種）======
    // 段階的に達成感を得られる設計
    // 05: ゴールデンレトリバー（★チュートリアル用：ステージ1クリアで解放）
    golden: {
        id: 'golden',
        dogId: 5,
        name: 'ゴールデンレトリバー解放',
        description: 'ステージ1をクリア',
        condition: { type: 'total_clears', value: 1 },
    },
    // 06: コーギー
    corgi: {
        id: 'corgi',
        dogId: 6,
        name: 'コーギー解放',
        description: '合計10ステージクリア',
        condition: { type: 'total_clears', value: 10 },
    },
    // 07: ダルメシアン
    dalmatian: {
        id: 'dalmatian',
        dogId: 7,
        name: 'ダルメシアン解放',
        description: '合計15ステージクリア',
        condition: { type: 'total_clears', value: 15 },
    },
    // 08: チワワ
    chihuahua: {
        id: 'chihuahua',
        dogId: 8,
        name: 'チワワ解放',
        description: '合計20ステージクリア',
        condition: { type: 'total_clears', value: 20 },
    },
    // 09: シュナウザー
    schnauzer: {
        id: 'schnauzer',
        dogId: 9,
        name: 'シュナウザー解放',
        description: '合計30ステージクリア',
        condition: { type: 'total_clears', value: 30 },
    },
    // 10: ドーベルマン
    doberman: {
        id: 'doberman',
        dogId: 10,
        name: 'ドーベルマン解放',
        description: '合計40ステージクリア',
        condition: { type: 'total_clears', value: 40 },
    },
    // 11: セントバーナード
    stbernard: {
        id: 'stbernard',
        dogId: 11,
        name: 'セントバーナード解放',
        description: '合計50ステージクリア',
        condition: { type: 'total_clears', value: 50 },
    },
    // 12: ボルゾイ
    borzoi: {
        id: 'borzoi',
        dogId: 12,
        name: 'ボルゾイ解放',
        description: '合計60ステージクリア',
        condition: { type: 'total_clears', value: 60 },
    },
    // 13: バーニーズ
    bernese: {
        id: 'bernese',
        dogId: 13,
        name: 'バーニーズ解放',
        description: '合計80ステージクリア',
        condition: { type: 'total_clears', value: 80 },
    },
    // 14: サモエド
    samoyed: {
        id: 'samoyed',
        dogId: 14,
        name: 'サモエド解放',
        description: '合計100ステージクリア',
        condition: { type: 'total_clears', value: 100 },
    },
    // ====== 累計ピース系（6種）======
    // 遊んでいるうちに自然に達成
    // 15: グレートデン
    greatdane: {
        id: 'greatdane',
        dogId: 15,
        name: 'グレートデン解放',
        description: '累計100ピース消す',
        condition: { type: 'total_pieces', value: 100 },
    },
    // 16: キャバリア
    cavalier: {
        id: 'cavalier',
        dogId: 16,
        name: 'キャバリア解放',
        description: '累計200ピース消す',
        condition: { type: 'total_pieces', value: 200 },
    },
    // 17: ジャックラッセルテリア
    jackrussell: {
        id: 'jackrussell',
        dogId: 17,
        name: 'ジャックラッセルテリア解放',
        description: '累計300ピース消す',
        condition: { type: 'total_pieces', value: 300 },
    },
    // 18: パピヨン
    papillon: {
        id: 'papillon',
        dogId: 18,
        name: 'パピヨン解放',
        description: '累計400ピース消す',
        condition: { type: 'total_pieces', value: 400 },
    },
    // 19: ブルドッグ
    bulldog: {
        id: 'bulldog',
        dogId: 19,
        name: 'ブルドッグ解放',
        description: '累計500ピース消す',
        condition: { type: 'total_pieces', value: 500 },
    },
    // 20: 黒柴
    blackshiba: {
        id: 'blackshiba',
        dogId: 20,
        name: '黒柴解放',
        description: '累計600ピース消す',
        condition: { type: 'total_pieces', value: 600 },
    },
    // ====== チャレンジモード連勝系（10種）======
    // 上級者向けの腕試し！段階的に難易度UP
    // 21: チワプー
    chipoo: {
        id: 'chipoo',
        dogId: 21,
        name: 'チワプー解放',
        description: 'チャレンジ5連勝',
        condition: { type: 'challenge_streak', value: 5 },
    },
    // 22: ダックスフンド
    dachshund: {
        id: 'dachshund',
        dogId: 22,
        name: 'ダックスフンド解放',
        description: 'チャレンジ10連勝',
        condition: { type: 'challenge_streak', value: 10 },
    },
    // 23: ビションフリーゼ
    bichon: {
        id: 'bichon',
        dogId: 23,
        name: 'ビションフリーゼ解放',
        description: 'チャレンジ20連勝',
        condition: { type: 'challenge_streak', value: 20 },
    },
    // 24: ポメラニアン
    pomeranian: {
        id: 'pomeranian',
        dogId: 24,
        name: 'ポメラニアン解放',
        description: 'チャレンジ30連勝',
        condition: { type: 'challenge_streak', value: 30 },
    },
    // 25: チャウチャウ
    chowchow: {
        id: 'chowchow',
        dogId: 25,
        name: 'チャウチャウ解放',
        description: 'チャレンジ50連勝',
        condition: { type: 'challenge_streak', value: 50 },
    },
    // 26: ニューファンドランド
    newfoundland: {
        id: 'newfoundland',
        dogId: 26,
        name: 'ニューファンドランド解放',
        description: 'チャレンジ100連勝',
        condition: { type: 'challenge_streak', value: 100 },
    },
    // 27: シャーペイ
    sharpei: {
        id: 'sharpei',
        dogId: 27,
        name: 'シャーペイ解放',
        description: 'チャレンジ150連勝',
        condition: { type: 'challenge_streak', value: 150 },
    },
    // 28: チャイニーズクレステッド
    chinesecrested: {
        id: 'chinesecrested',
        dogId: 28,
        name: 'チャイニーズクレステッド解放',
        description: 'チャレンジ200連勝',
        condition: { type: 'challenge_streak', value: 200 },
    },
    // 30: ボーダーコリー
    bordercollie: {
        id: 'bordercollie',
        dogId: 30,
        name: 'ボーダーコリー解放',
        description: 'チャレンジ250連勝',
        condition: { type: 'challenge_streak', value: 250 },
    },
    // 31: ビーグル
    beagle: {
        id: 'beagle',
        dogId: 31,
        name: 'ビーグル解放',
        description: 'チャレンジ300連勝',
        condition: { type: 'challenge_streak', value: 300 },
    },
    // ====== 連続ログイン系（1種）======
    // 32: マルチーズ - 毎日遊んでくれる人へのご褒美
    maltese: {
        id: 'maltese',
        dogId: 32,
        name: 'マルチーズ解放',
        description: '7日連続ログイン',
        condition: { type: 'consecutive_logins', value: 7 },
    },
    // ====== 特殊枠 ======
    // 29: ゴールデンワンコ - ステージ選択で1/50の確率で遭遇！
    // ※実績ではなく、ゲーム内イベントで解放される特殊犬種
    // goldenwanko は ACHIEVEMENTS には含めない（特殊処理）
};

// ========================================
// 🎀 衣装実績定義（COSTUME_ITEMSと連動）
// ========================================
const COSTUME_ACHIEVEMENTS = {
    // ===== 頭につけるもの =====
    crown_gold: {
        id: 'costume_crown_gold',
        costumeId: 'crown_gold',
        name: 'おうかん解放',
        description: 'おさんぽメダル15枚ためる',
        condition: { type: 'medals', value: 15 },
    },
    hat_straw: {
        id: 'costume_hat_straw',
        costumeId: 'hat_straw',
        name: 'むぎわらぼうし解放',
        description: 'おさんぽメダル15枚ためる',
        condition: { type: 'medals', value: 15 },
    },
    beret: {
        id: 'costume_beret',
        costumeId: 'beret',
        name: 'ベレーぼう解放',
        description: 'おさんぽメダル15枚ためる',
        condition: { type: 'medals', value: 15 },
    },
    flower_sakura: {
        id: 'costume_flower_sakura',
        costumeId: 'flower_sakura',
        name: 'さくら解放',
        description: 'おさんぽメダル15枚ためる',
        condition: { type: 'medals', value: 15 },
    },
    flower_sunflower: {
        id: 'costume_flower_sunflower',
        costumeId: 'flower_sunflower',
        name: 'ひまわり解放',
        description: 'おさんぽメダル15枚ためる',
        condition: { type: 'medals', value: 15 },
    },
    // ===== 首につけるもの =====
    ribbon_red: {
        id: 'costume_ribbon_red',
        costumeId: 'ribbon_red',
        name: 'あかリボン解放',
        description: 'おさんぽメダル15枚ためる',
        condition: { type: 'medals', value: 15 },
    },
    // ===== 顔につけるもの =====
    glasses_star: {
        id: 'costume_glasses_star',
        costumeId: 'glasses_star',
        name: 'ほしメガネ解放',
        description: 'おさんぽメダル15枚ためる',
        condition: { type: 'medals', value: 15 },
    },
    glasses: {
        id: 'costume_glasses',
        costumeId: 'glasses',
        name: 'サングラス解放',
        description: 'おさんぽメダル15枚ためる',
        condition: { type: 'medals', value: 15 },
    },
};

// ========================================
// 🎯 桜井イズム：「きょうのおさんぽ」定義
// 命令形ではなく提案形で、義務感ではなく「できたらうれしい」トーンに
// ★ 1日3枚メダルを獲得できる！（3つのミッションをランダム選出）
// ★ 比較的簡単なものを多めに用意
// ========================================
const DAILY_MISSIONS = [
    // ===== 簡単（すぐ達成できる） =====
    { id: 'play_1', name: 'おさんぽする', target: 1, type: 'clear', difficulty: 'easy' },
    { id: 'challenge_try', name: 'エンドレスであそぶ', target: 1, type: 'challenge_try', difficulty: 'easy' },
    
    // ===== 普通（少し頑張る） =====
    { id: 'play_2', name: '2回おさんぽする', target: 2, type: 'clear', difficulty: 'normal' },
    { id: 'challenge_1', name: 'エンドレスで1回クリア', target: 1, type: 'challenge', difficulty: 'normal' },
    { id: 'perfect_1', name: 'ノーミスでクリアする', target: 1, type: 'perfect', difficulty: 'normal' },
    
    // ===== ちょいムズ（やりがいあり） =====
    { id: 'play_3', name: '3回おさんぽする', target: 3, type: 'clear', difficulty: 'hard' },
    { id: 'challenge_3', name: 'エンドレスで3回クリア', target: 3, type: 'challenge', difficulty: 'hard' },
];

// ========================================
// 肉球カラー定義（16種類の可愛い肉球！）
// ========================================
const PAW_COLORS = {
    // 🐾 桜井イズム：デフォルトは「こげちゃ」！どんな色のマスにも合う＆かわいい
    brown: { name: 'こげちゃ', color: 0x8B6914, imageKey: 'paw_brown', suffix: 'bone' },
    pink: { name: 'ピンク', color: 0xFFB6C1, imageKey: 'paw_pink', suffix: 'heart', unlockCondition: 'clear_10_stages' },
    red: { name: 'あか', color: 0xFF6B6B, imageKey: 'paw_red', suffix: 'heart', unlockCondition: 'clear_15_stages' },
    blue: { name: 'あお', color: 0x6BB3FF, imageKey: 'paw_blue', suffix: 'heart', unlockCondition: 'challenge_3_streak' },
    cyan: { name: 'みずいろ', color: 0x00CED1, imageKey: 'paw_cyan', suffix: 'bone', unlockCondition: 'clear_20_stages' },
    green: { name: 'みどり', color: 0x7ED957, imageKey: 'paw_green', suffix: 'star', unlockCondition: 'clear_25_stages' },
    purple: { name: 'むらさき', color: 0xB19CD9, imageKey: 'paw_purple', suffix: 'star', unlockCondition: 'challenge_5_streak' },
    orange: { name: 'オレンジ', color: 0xFF9F45, imageKey: 'paw_orange', suffix: 'heart', unlockCondition: 'clear_30_stages' },
    gold: { name: 'きん', color: 0xFFD700, imageKey: 'paw_gold', suffix: 'bone', unlockCondition: 'clear_40_stages' },
    gray: { name: 'グレー', color: 0x808080, imageKey: 'paw_gray', suffix: 'bone', unlockCondition: 'use_all_4_dogs' },
    lavender: { name: 'ラベンダー', color: 0xE6E6FA, imageKey: 'paw_lavender', suffix: 'bone', unlockCondition: 'challenge_7_streak' },
    lime: { name: 'ライム', color: 0x32CD32, imageKey: 'paw_lime', suffix: 'bone', unlockCondition: 'challenge_12_streak' },
    teal: { name: 'ティール', color: 0x008080, imageKey: 'paw_teal', suffix: 'bone', unlockCondition: 'challenge_15_streak' },
    magenta: { name: 'マゼンタ', color: 0xFF00FF, imageKey: 'paw_magenta', suffix: 'sparkle', unlockCondition: 'clear_50_stages' },
    yellow: { name: 'きいろ', color: 0xFFD700, imageKey: 'paw_yellow', suffix: 'star', unlockCondition: 'challenge_10_streak' },
    rainbow: { name: 'にじいろ', color: 'rainbow', imageKey: 'paw_rainbow', suffix: 'sparkle', unlockCondition: 'all_paws_unlocked' },
};

// ========================================
// 背景テーマ定義
// ========================================
const THEMES = {
    default: { name: 'こうえん', sky: 0x87CEEB, ground: 0x90EE90, image: 'theme_kouen' },
    beach: { name: 'うみ', sky: 0x00BFFF, ground: 0xF5DEB3, unlockCondition: 'clear_20_stages', image: 'theme_umi' },
    snow: { name: 'ゆき', sky: 0xE0FFFF, ground: 0xFFFFFF, unlockCondition: 'challenge_5_streak', image: 'theme_yuki' },
    sunset: { name: 'ゆうやけ', sky: 0xFF7F50, ground: 0x8B4513, unlockCondition: 'clear_30_stages', image: 'theme_yuuyake' }, // TODO: ゴールデンワンコ実装後に'golden_3_times'に戻す
    night: { name: 'よる', sky: 0x191970, ground: 0x2F4F4F, unlockCondition: 'challenge_4_streak', image: 'theme_yoru' },
    // ★ 新テーマ（チャレンジモードで解放！）
    sakura: { name: 'さくら', sky: 0xFFE4E1, ground: 0xFFB6C1, unlockCondition: 'challenge_6_streak', icon: '🌸', image: 'theme_sakura' },
    fireworks: { name: 'はなび', sky: 0x0D1B2A, ground: 0x1B263B, unlockCondition: 'challenge_8_streak', icon: '🎆', image: 'theme_hanabi' },
    rainbow: { name: 'にじ', sky: 0x87CEEB, ground: 0x98FB98, unlockCondition: 'challenge_14_streak', icon: '🌈', image: 'theme_nizi' },
    starry: { name: 'ほしぞら', sky: 0x0B0B45, ground: 0x1a1a5c, unlockCondition: 'challenge_20_streak', icon: '⭐', image: 'theme_hosizora' },
};

// ========================================
// ワンコのきせかえアイテム定義
// ========================================
const COSTUME_ITEMS = {
    // ===== 頭につけるもの =====
    crown_gold: {
        name: 'おうかん',
        icon: '👑',
        type: 'hat',
        position: 'head',
        imageKey: 'costume_crown_gold',
        unlockCondition: 'medals_15',
        description: 'きらきらのおうかん',
    },
    hat_straw: {
        name: 'むぎわらぼうし',
        icon: '👒',
        type: 'hat',
        position: 'head',
        imageKey: 'costume_hat_straw',
        unlockCondition: 'medals_15',
        description: 'なつのひざし対策！',
        offsetY: -18,  // 下に下げる（デフォルト-28）
    },
    beret: {
        name: 'ベレーぼう',
        icon: '🎨',
        type: 'hat',
        position: 'head',
        imageKey: 'costume_beret',
        unlockCondition: 'medals_15',
        description: 'アーティストきどり',
    },
    flower_sakura: {
        name: 'さくら',
        icon: '🌸',
        type: 'flower',
        position: 'ear',  // 右耳に小さくつける
        imageKey: 'costume_flower_sakura',
        unlockCondition: 'medals_15',
        description: 'はるのかおり',
        offsetX: 14,   // 右耳の位置
        offsetY: -20,  // 耳の高さ
        customScale: 0.07,  // 小さめ
    },
    flower_sunflower: {
        name: 'ひまわり',
        icon: '🌻',
        type: 'flower',
        position: 'ear',  // 右耳に小さくつける
        imageKey: 'costume_flower_sunflower',
        unlockCondition: 'medals_15',
        description: 'なつのおひさま！',
        offsetX: 14,   // 右耳の位置
        offsetY: -20,  // 耳の高さ
        customScale: 0.07,  // 小さめ
    },

    // ===== 首につけるもの =====
    ribbon_red: {
        name: 'あかリボン',
        icon: '🎀',
        type: 'accessory',
        position: 'neck',
        imageKey: 'costume_ribbon_red',
        unlockCondition: 'medals_15',
        description: 'かわいい赤いリボン',
        offsetY: 28,   // 首元にもっと下げる
    },

    // ===== 顔につけるもの =====
    glasses_star: {
        name: 'ほしメガネ',
        icon: '⭐',
        type: 'glasses',
        position: 'face',
        imageKey: 'costume_glasses_star',
        unlockCondition: 'medals_15',
        description: 'キラキラほしメガネ',
        customScale: 0.14,  // 2まわり大きく（デフォルト0.08）
    },
    glasses: {
        name: 'サングラス',
        icon: '🕶️',
        type: 'glasses',
        position: 'face',
        imageKey: 'costume_glasses',
        unlockCondition: 'medals_15',
        description: 'クールにきめよう',
        customScale: 0.14,  // 2まわり大きく（デフォルト0.08）
    },

};

// ========================================
// 課金パッケージ定義（行動経済学に基づく最適化）
// ========================================
// 🎯 松竹梅効果 + アンカリング + デコイ効果を活用
// 
// 【構成の意図】
// 1. プレミアムセットを最上位に配置（アンカリング）
// 2. 広告消し480円、いろどり980円でセットがお得に見える
//    → プレミアムセット1160円（1460円の約21%OFF）が「超お得」に
// 3. ワンちゃん単品300円でマイクロトランザクション誘導
//    → 一度課金すると心理的ハードルが下がる
// ========================================
const SHOP_ITEMS = {
    // ★ ヒーロー商品（最も売りたい）
    // 単品合計: 480+980=1460円 → セット価格1160円で約21%OFF
    deluxe: {
        id: 'deluxe',
        storeProductId: 'com.kerofen.inusanpo.deluxe',
        name: 'プレミアムセット',
        description: '広告けし＋いろどりパック まとめておとく！',
        fallbackPrice: '¥1,160',
        icon: '👑',
        iconKey: 'pack_premium',
        color: 0xFFD700,
        badge: '🔥 一番人気！',
        isHero: true,
    },
    // ★ 中間価格帯
    allCustomize: {
        id: 'allCustomize',
        storeProductId: 'com.kerofen.inusanpo.customize',
        name: 'いろどりパック',
        description: '肉球カラーやきせかえ、\nテーマをぜんぶ解放！',
        fallbackPrice: '¥980',
        icon: '🎨',
        iconKey: 'pack_customize',
        color: 0xE91E63,
    },
    // ★ デコイ（いろどりより高いのに単機能）
    adFree: {
        id: 'adFree',
        storeProductId: 'com.kerofen.inusanpo.remove_ads',
        name: 'こうこくけし',
        description: 'すべての広告を削除します',
        fallbackPrice: '¥480',
        icon: '🔇',
        iconKey: 'pack_noads',
        color: 0x4CAF50,
    },
    // ★ マイクロトランザクション（購入ハードルを下げる）
    singleDog: {
        id: 'singleDog',
        storeProductId: 'com.kerofen.inusanpo.single_dog',
        name: 'ワンコを迎える',
        description: 'すきなワンコを１匹えらべる！',
        fallbackPrice: '¥300',
        icon: '🐕',
        iconKey: 'pack_dog',
        color: 0xFF9800,
        isSingleDog: true,
    },
};

// ========================================
// ゲームデータ管理
// ========================================
class GameData {
    static STORAGE_KEY = 'wantsunagi_data';

    static getDefaultData() {
        // 🎯 桜井イズム：「出会った日」で愛着を深める
        const today = new Date().toISOString().split('T')[0];  // YYYY-MM-DD
        return {
            unlockedDogs: [1, 2, 3, 4],
            dogUnlockDates: { 1: today, 2: today, 3: today, 4: today },  // 出会った日を記録
            selectedDogs: [1, 2, 3, 4],
            achievements: {},
            stats: {
                totalClears: 0,
                challengeHighScore: 0,
                challengeCurrentStreak: 0,
                maxComboCount: 0,
                goldenClears: 0,
                dogUsage: {},
                // ========== 新規統計項目（犬種解放条件用） ==========
                totalPieces: 0,              // 累計消しピース数
                consecutiveClears: 0,        // 現在の連続クリア数
                maxConsecutiveClears: 0,     // 最大連続クリア数
                consecutiveLogins: 0,        // 連続ログイン日数
                lastLoginDate: null,         // 最終ログイン日
                noMissClears: 0,             // ノーミス(ミスなし)クリア累計
                currentNoMissStreak: 0,      // 現在のノーミス連続数
                themeClears: {},             // テーマ別クリア数 { night: 5, snow: 3, ... }
                dayOfWeekClears: {},         // 曜日別クリア数 { 0: 5, 1: 3, ... } (0=日曜)
                dogSpecificClears: {},       // 犬種別クリア数 { 1: 50, 2: 30, ... }
            },
            dogLevels: {},
            daily: {
                lastLogin: null,
                missions: [],
                progress: {},
            },
            customize: {
                pawColor: null,
                theme: 'default',
                equippedCostumes: [],  // 装備中のきせかえ（複数可）
            },
            // ★ おさんぽメダル＆スタンプラリー
            rewards: {
                medals: 0,              // 累計メダル枚数
                stamps: [],             // 今週のスタンプ（曜日インデックス0-6）
                stampWeekStart: null,   // 今週の開始日
                weeklyBonusClaimed: false, // 週間ボーナス受取済み
                totalWeeklyComplete: 0, // 週間完走回数（累計）
                unlockedCostumes: [],   // 解放済みきせかえID
            },
            // 🎀 衣装実績
            costumeAchievements: {},
            settings: {
                bgmEnabled: true,
                seEnabled: true,
                bgmVolume: 1.0,
                seVolume: 1.0,
            },
            purchases: {
                adFree: false,
                allDogs: false,
                allCustomize: false,
                deluxe: false,
                limitedDogs: [],
            },
            // ★ チュートリアル状態管理
            tutorial: {
                completed: false,     // チュートリアル完了フラグ
                step: 0,              // 現在のチュートリアルステップ
                inProgress: false,    // チュートリアル進行中フラグ
            },
        };
    }

    static load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                if (data.settings) {
                    if (typeof data.settings.bgmEnabled === 'undefined' && typeof data.settings.bgm !== 'undefined') {
                        data.settings.bgmEnabled = data.settings.bgm !== false;
                    }
                    if (typeof data.settings.seEnabled === 'undefined' && typeof data.settings.se !== 'undefined') {
                        data.settings.seEnabled = data.settings.se !== false;
                    }
                    // 音量設定のマイグレーション（古いセーブデータ対応）
                    if (typeof data.settings.bgmVolume !== 'number') {
                        data.settings.bgmVolume = 1.0;
                    }
                    if (typeof data.settings.seVolume !== 'number') {
                        data.settings.seVolume = 1.0;
                    }
                }
                // チュートリアル設定のマイグレーション（既存ユーザー対応）
                if (!data.tutorial) {
                    const hasPlayed = data.stats && data.stats.totalClears > 0;
                    data.tutorial = {
                        completed: hasPlayed,
                        step: 0,
                        inProgress: false,
                    };
                }
                return { ...this.getDefaultData(), ...data };
            }
        } catch (e) {
            console.error('データ読み込みエラー:', e);
        }
        return this.getDefaultData();
    }

    static save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('データ保存エラー:', e);
        }
    }

    static isDogUnlocked(data, dogId) {
        // ★ テストモードは先頭の TEST_MODE_UNLOCK_ALL で制御
        if (TEST_MODE_UNLOCK_ALL) return true;
        
        if (data.purchases?.allDogs) return true;
        return data.unlockedDogs.includes(dogId);
    }

    static isAdFree(data) {
        return data.purchases?.adFree || data.purchases?.deluxe;
    }

    static updateStats(data, type, value = 1, extra = null) {
        // stats初期化（既存データ互換性のため）
        if (!data.stats.totalPieces) data.stats.totalPieces = 0;
        if (!data.stats.consecutiveClears) data.stats.consecutiveClears = 0;
        if (!data.stats.maxConsecutiveClears) data.stats.maxConsecutiveClears = 0;
        if (!data.stats.noMissClears) data.stats.noMissClears = 0;
        if (!data.stats.currentNoMissStreak) data.stats.currentNoMissStreak = 0;
        if (!data.stats.themeClears) data.stats.themeClears = {};
        if (!data.stats.dayOfWeekClears) data.stats.dayOfWeekClears = {};
        if (!data.stats.dogSpecificClears) data.stats.dogSpecificClears = {};
        if (!data.stats.consecutiveLogins) data.stats.consecutiveLogins = 0;

        switch (type) {
            case 'clear':
                data.stats.totalClears += value;
                // 連続クリアも更新
                data.stats.consecutiveClears += value;
                if (data.stats.consecutiveClears > data.stats.maxConsecutiveClears) {
                    data.stats.maxConsecutiveClears = data.stats.consecutiveClears;
                }
                break;
            case 'clear_reset':
                // ゲームオーバー時に連続クリアをリセット
                data.stats.consecutiveClears = 0;
                data.stats.currentNoMissStreak = 0;
                break;
            case 'challenge_clear':
                data.stats.challengeCurrentStreak += value;
                if (data.stats.challengeCurrentStreak > data.stats.challengeHighScore) {
                    data.stats.challengeHighScore = data.stats.challengeCurrentStreak;
                }
                break;
            case 'challenge_reset':
                data.stats.challengeCurrentStreak = 0;
                break;
            case 'golden':
                data.stats.goldenClears += value;
                break;
            case 'dog_usage':
                if (!data.stats.dogUsage[value]) data.stats.dogUsage[value] = 0;
                data.stats.dogUsage[value]++;
                break;
            // ========== 新規統計タイプ ==========
            case 'pieces':
                // ピース消去数を加算
                data.stats.totalPieces += value;
                break;
            case 'no_miss_clear':
                // ノーミスクリア（ミスなしでクリア）
                data.stats.currentNoMissStreak += value;
                data.stats.noMissClears += value;
                break;
            case 'miss':
                // ミス時にノーミス連続をリセット
                data.stats.currentNoMissStreak = 0;
                break;
            case 'theme_clear':
                // テーマ別クリア (extra = テーマ名)
                if (extra) {
                    if (!data.stats.themeClears[extra]) data.stats.themeClears[extra] = 0;
                    data.stats.themeClears[extra] += value;
                }
                break;
            case 'day_clear':
                // 今日の曜日でクリア
                const dayOfWeek = new Date().getDay();
                if (!data.stats.dayOfWeekClears[dayOfWeek]) data.stats.dayOfWeekClears[dayOfWeek] = 0;
                data.stats.dayOfWeekClears[dayOfWeek] += value;
                break;
            case 'dog_clear':
                // 犬種別クリア (extra = 犬種ID)
                if (extra) {
                    if (!data.stats.dogSpecificClears[extra]) data.stats.dogSpecificClears[extra] = 0;
                    data.stats.dogSpecificClears[extra] += value;
                }
                break;
            case 'login':
                // ログイン処理（連続ログイン判定）
                const today = new Date().toDateString();
                const lastLogin = data.stats.lastLoginDate;
                if (lastLogin) {
                    const lastDate = new Date(lastLogin);
                    const todayDate = new Date(today);
                    const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
                    if (diffDays === 1) {
                        // 昨日もログインしていた→連続ログイン継続
                        data.stats.consecutiveLogins += 1;
                    } else if (diffDays > 1) {
                        // 途切れた→リセット
                        data.stats.consecutiveLogins = 1;
                    }
                    // diffDays === 0 の場合は同日なので何もしない
                } else {
                    // 初回ログイン
                    data.stats.consecutiveLogins = 1;
                }
                data.stats.lastLoginDate = today;
                break;
        }
        this.save(data);
    }

    static checkAchievements(data) {
        const newUnlocks = [];

        // stats初期化（既存データ互換性のため）
        if (!data.stats.totalPieces) data.stats.totalPieces = 0;
        if (!data.stats.maxConsecutiveClears) data.stats.maxConsecutiveClears = 0;
        if (!data.stats.consecutiveLogins) data.stats.consecutiveLogins = 0;
        if (!data.stats.noMissClears) data.stats.noMissClears = 0;
        if (!data.stats.themeClears) data.stats.themeClears = {};
        if (!data.stats.dayOfWeekClears) data.stats.dayOfWeekClears = {};
        if (!data.stats.dogSpecificClears) data.stats.dogSpecificClears = {};

        Object.values(ACHIEVEMENTS).forEach(achievement => {
            if (data.achievements[achievement.id]) return;

            let unlocked = false;
            const cond = achievement.condition;

            switch (cond.type) {
                case 'challenge_streak':
                    unlocked = data.stats.challengeHighScore >= cond.value;
                    break;
                case 'total_clears':
                    unlocked = data.stats.totalClears >= cond.value;
                    break;
                case 'golden_clears':
                    unlocked = data.stats.goldenClears >= cond.value;
                    break;
                case 'use_all_dogs':
                    const usage = data.stats.dogUsage;
                    unlocked = [1, 2, 3, 4].every(d => usage[d] >= 1);
                    break;
                // ========== 新規実績条件タイプ ==========
                case 'total_pieces':
                    // 累計ピース消去数
                    unlocked = data.stats.totalPieces >= cond.value;
                    break;
                case 'max_combo':
                    // 最大コンボ数
                    unlocked = data.stats.maxComboCount >= cond.value;
                    break;
                case 'consecutive_clears':
                    // 連続クリア数
                    unlocked = data.stats.maxConsecutiveClears >= cond.value;
                    break;
                case 'consecutive_logins':
                    // 連続ログイン日数
                    unlocked = data.stats.consecutiveLogins >= cond.value;
                    break;
                case 'theme_clears':
                    // テーマ別クリア数
                    const themeCount = data.stats.themeClears[cond.theme] || 0;
                    unlocked = themeCount >= cond.value;
                    break;
                case 'no_miss_clears':
                    // ノーミスクリア累計数
                    unlocked = data.stats.noMissClears >= cond.value;
                    break;
                case 'day_of_week_clears':
                    // 特定曜日のクリア数 (cond.day = 曜日, 0=日曜)
                    const dayCount = data.stats.dayOfWeekClears[cond.day] || 0;
                    unlocked = dayCount >= cond.value;
                    break;
                case 'weekly_complete':
                    // 週間スタンプコンプリート回数
                    const weeklyComplete = data.rewards?.totalWeeklyComplete || 0;
                    unlocked = weeklyComplete >= cond.value;
                    break;
                case 'dog_specific_clears':
                    // 特定犬種でのクリア数 (cond.dogId = 犬種ID)
                    const dogCount = data.stats.dogSpecificClears[cond.dogId] || 0;
                    unlocked = dogCount >= cond.value;
                    break;
            }

            if (unlocked) {
                data.achievements[achievement.id] = true;
                if (achievement.dogId && !data.unlockedDogs.includes(achievement.dogId)) {
                    data.unlockedDogs.push(achievement.dogId);
                    // 🎯 桜井イズム：出会った日を記録（思い出になる）
                    if (!data.dogUnlockDates) data.dogUnlockDates = {};
                    data.dogUnlockDates[achievement.dogId] = new Date().toISOString().split('T')[0];
                }
                newUnlocks.push(achievement);
            }
        });

        return newUnlocks;
    }

    // ★ にくきゅうカラー解放チェック（16種類の可愛い肉球！）
    static checkNikukyuUnlocks(data) {
        // デフォルトはbrown（こげちゃ）
        if (!data.unlockedNikukyuColors) data.unlockedNikukyuColors = ['brown'];
        // 旧defaultをbrownに移行
        if (data.unlockedNikukyuColors.includes('default') && !data.unlockedNikukyuColors.includes('brown')) {
            data.unlockedNikukyuColors.push('brown');
        }
        
        const newUnlocks = [];
        const stats = data.stats;
        const medals = data.rewards?.medals || 0;

        // 🌈 まずレインボー以外のカラーをチェック
        Object.entries(PAW_COLORS).forEach(([key, colorData]) => {
            if (key === 'rainbow') return; // レインボーは後で特別チェック
            if (data.unlockedNikukyuColors.includes(key)) return;
            if (!colorData.unlockCondition) return;  // デフォルトは条件なし

            let unlocked = false;
            const cond = colorData.unlockCondition;

            // メダル条件
            if (cond.startsWith('medals_')) {
                const required = parseInt(cond.split('_')[1]);
                unlocked = medals >= required;
            }
            // 犬種使用条件
            else if (cond === 'use_all_4_dogs') {
                const usage = stats.dogUsage || {};
                unlocked = [1, 2, 3, 4].every(d => (usage[d] || 0) >= 1);
            }
            // その他の条件
            else {
                switch (cond) {
                    case 'clear_10_stages': unlocked = stats.totalClears >= 10; break;
                    case 'clear_15_stages': unlocked = stats.totalClears >= 15; break;
                    case 'clear_20_stages': unlocked = stats.totalClears >= 20; break;
                    case 'clear_25_stages': unlocked = stats.totalClears >= 25; break;
                    case 'clear_30_stages': unlocked = stats.totalClears >= 30; break;
                    case 'clear_40_stages': unlocked = stats.totalClears >= 40; break;
                    case 'clear_50_stages': unlocked = stats.totalClears >= 50; break;
                    case 'challenge_3_streak': unlocked = stats.challengeHighScore >= 3; break;
                    case 'challenge_5_streak': unlocked = stats.challengeHighScore >= 5; break;
                    case 'challenge_7_streak': unlocked = stats.challengeHighScore >= 7; break;
                    case 'challenge_10_streak': unlocked = stats.challengeHighScore >= 10; break;
                    case 'challenge_12_streak': unlocked = stats.challengeHighScore >= 12; break;
                    case 'challenge_15_streak': unlocked = stats.challengeHighScore >= 15; break;
                }
            }

            if (unlocked) {
                data.unlockedNikukyuColors.push(key);
                newUnlocks.push({ type: 'nikukyu', key, ...colorData });
            }
        });

        // 🌈 レインボー特別条件：全ての肉球カラー（rainbow以外）を獲得済み
        if (!data.unlockedNikukyuColors.includes('rainbow')) {
            const allOtherPaws = Object.keys(PAW_COLORS).filter(k => k !== 'rainbow');
            const hasAllPaws = allOtherPaws.every(k => data.unlockedNikukyuColors.includes(k));
            if (hasAllPaws) {
                data.unlockedNikukyuColors.push('rainbow');
                newUnlocks.push({ type: 'nikukyu', key: 'rainbow', ...PAW_COLORS.rainbow });
            }
        }

        return newUnlocks;
    }

    // ★ テーマ解放チェック
    static checkThemeUnlocks(data) {
        if (!data.unlockedThemes) data.unlockedThemes = ['default'];
        
        const newUnlocks = [];
        const stats = data.stats;
        const medals = data.rewards?.medals || 0;
        const weeklyComplete = data.rewards?.totalWeeklyComplete || 0;

        Object.entries(THEMES).forEach(([key, themeData]) => {
            if (data.unlockedThemes.includes(key)) return;
            if (!themeData.unlockCondition) return;  // デフォルトは条件なし

            let unlocked = false;
            const cond = themeData.unlockCondition;

            // メダル条件
            if (cond.startsWith('medals_')) {
                const required = parseInt(cond.split('_')[1]);
                unlocked = medals >= required;
            }
            // スタンプ完走条件
            else if (cond.startsWith('stamp_complete_')) {
                const required = parseInt(cond.split('_')[2]);
                unlocked = weeklyComplete >= required;
            }
            // 既存条件
            else {
                switch (cond) {
                    case 'clear_20_stages': unlocked = stats.totalClears >= 20; break;
                    case 'clear_30_stages': unlocked = stats.totalClears >= 30; break;
                    case 'challenge_4_streak': unlocked = stats.challengeHighScore >= 4; break;
                    case 'challenge_5_streak': unlocked = stats.challengeHighScore >= 5; break;
                    case 'challenge_6_streak': unlocked = stats.challengeHighScore >= 6; break;
                    case 'challenge_8_streak': unlocked = stats.challengeHighScore >= 8; break;
                    case 'challenge_14_streak': unlocked = stats.challengeHighScore >= 14; break;
                    case 'challenge_20_streak': unlocked = stats.challengeHighScore >= 20; break;
                    case 'golden_3_times': unlocked = stats.goldenClears >= 3; break;
                    case 'use_all_4_dogs':
                        const usage = stats.dogUsage;
                        unlocked = [1, 2, 3, 4].every(d => usage[d] >= 1);
                        break;
                }
            }

            if (unlocked) {
                data.unlockedThemes.push(key);
                newUnlocks.push({ type: 'theme', key, ...themeData });
            }
        });

        return newUnlocks;
    }

    // ★ 全アイテム解放チェック（ワンコ・衣装・にくきゅう・テーマ）
    static checkAllUnlocks(data) {
        const allUnlocks = [];

        // ワンコ解放チェック
        const dogUnlocks = this.checkAchievements(data);
        dogUnlocks.forEach(a => {
            if (a.dogId) {
                allUnlocks.push({ type: 'dog', dogId: a.dogId, ...a });
            }
        });

        // にくきゅうカラー解放チェック
        const nikukyuUnlocks = this.checkNikukyuUnlocks(data);
        allUnlocks.push(...nikukyuUnlocks);

        // テーマ解放チェック
        const themeUnlocks = this.checkThemeUnlocks(data);
        allUnlocks.push(...themeUnlocks);

        return allUnlocks;
    }
}

// ========================================
// デイリーミッション管理
// ========================================
class DailyManager {
    static checkAndResetDaily(data) {
        const today = new Date().toDateString();

        if (data.daily.lastLogin !== today) {
            // 日付が変わったらリセット
            data.daily.lastLogin = today;
            data.daily.progress = {};
            data.daily.medalsClaimedToday = [];  // 🆕 各ミッションのメダル取得状態（配列に変更）

            // 🎯 桜井イズム：3つのミッションを難易度バランスよく選出！
            // 簡単1つ、普通1つ、ランダム1つ
            // ★ 同じtypeのミッションが被らないように！（例：おさんぽするが複数出ない）
            const easyMissions = DAILY_MISSIONS.filter(m => m.difficulty === 'easy');
            const normalMissions = DAILY_MISSIONS.filter(m => m.difficulty === 'normal');
            const allMissions = [...DAILY_MISSIONS];
            
            const shuffleArray = arr => [...arr].sort(() => Math.random() - 0.5);
            
            const selectedMissions = [];
            const usedTypes = [];  // 使用済みのtypeを追跡
            
            // 簡単ミッションから1つ（typeが被らないもの）
            const shuffledEasy = shuffleArray(easyMissions);
            const easy = shuffledEasy.find(m => !usedTypes.includes(m.type));
            if (easy) {
                selectedMissions.push(easy.id);
                usedTypes.push(easy.type);
            }
            
            // 普通ミッションから1つ（typeが被らないもの）
            const shuffledNormal = shuffleArray(normalMissions);
            const normal = shuffledNormal.find(m => !usedTypes.includes(m.type));
            if (normal) {
                selectedMissions.push(normal.id);
                usedTypes.push(normal.type);
            }
            
            // 残りからランダムで1つ（IDとtypeが被らないもの）
            const remaining = shuffleArray(allMissions).filter(m => 
                !selectedMissions.includes(m.id) && !usedTypes.includes(m.type)
            );
            if (remaining.length > 0) {
                selectedMissions.push(remaining[0].id);
                usedTypes.push(remaining[0].type);
            }
            
            data.daily.missions = selectedMissions;

            // 今日のワンコをランダムに選択
            data.daily.todaysDog = data.selectedDogs[Math.floor(Math.random() * data.selectedDogs.length)];

            GameData.save(data);
        }

        return data;
    }

    static getTodaysMissions(data) {
        const missions = [];
        const missionIds = data.daily.missions || [];

        missionIds.forEach(id => {
            const mission = DAILY_MISSIONS.find(m => m.id === id);
            if (mission) {
                missions.push({
                    ...mission,
                    progress: data.daily.progress[id] || 0,
                    completed: (data.daily.progress[id] || 0) >= mission.target,
                });
            }
        });

        return missions;
    }

    static updateProgress(data, type, value = 1) {
        const missionIds = data.daily.missions || [];

        missionIds.forEach(id => {
            const mission = DAILY_MISSIONS.find(m => m.id === id);
            if (mission && mission.type === type) {
                if (!data.daily.progress[id]) data.daily.progress[id] = 0;
                data.daily.progress[id] += value;
            }
        });

        GameData.save(data);
    }

    // ★ 全ミッション達成チェック
    static areAllMissionsComplete(data) {
        const missions = this.getTodaysMissions(data);
        if (missions.length === 0) return false;
        return missions.every(m => m.completed);
    }

    // 🆕 特定ミッションの達成チェック
    static isMissionComplete(data, missionId) {
        const missions = this.getTodaysMissions(data);
        const mission = missions.find(m => m.id === missionId);
        return mission ? mission.completed : false;
    }

    // 🆕 特定ミッションのメダルが獲得済みかチェック
    static isMedalClaimed(data, missionId) {
        if (!data.daily.medalsClaimedToday) data.daily.medalsClaimedToday = [];
        return data.daily.medalsClaimedToday.includes(missionId);
    }

    // 🆕 獲得可能なメダル数を取得（完了済み＆未獲得のミッション数）
    static getClaimableMedalCount(data) {
        const missions = this.getTodaysMissions(data);
        if (!data.daily.medalsClaimedToday) data.daily.medalsClaimedToday = [];
        return missions.filter(m => m.completed && !data.daily.medalsClaimedToday.includes(m.id)).length;
    }

    // ★ メダル獲得（個別ミッション達成時）
    static awardMedalForMission(data, missionId) {
        if (!this.isMissionComplete(data, missionId)) return { awarded: false };
        if (this.isMedalClaimed(data, missionId)) return { awarded: false };

        // メダル獲得！
        if (!data.rewards) data.rewards = { medals: 0, stamps: [], stampWeekStart: null, weeklyBonusClaimed: false, totalWeeklyComplete: 0, unlockedCostumes: [] };
        if (!data.daily.medalsClaimedToday) data.daily.medalsClaimedToday = [];
        
        data.rewards.medals = (data.rewards.medals || 0) + 1;
        data.daily.medalsClaimedToday.push(missionId);

        // 3つ全部達成したらスタンプも追加
        if (this.areAllMissionsComplete(data) && data.daily.medalsClaimedToday.length >= 3) {
            this.addTodayStamp(data);
        }

        // きせかえ解放チェック
        const newUnlocks = this.checkCostumeUnlocks(data);

        GameData.save(data);

        return {
            awarded: true,
            totalMedals: data.rewards.medals,
            newCostumes: newUnlocks,
            stampCount: data.rewards.stamps?.length || 0,
        };
    }

    // ★ メダル獲得（旧：全ミッション達成時 - 互換性のため残す）
    static awardMedalIfComplete(data) {
        const claimable = this.getClaimableMedalCount(data);
        if (claimable === 0) return { awarded: false };

        // 獲得可能なミッションのメダルを全て獲得
        const missions = this.getTodaysMissions(data);
        if (!data.daily.medalsClaimedToday) data.daily.medalsClaimedToday = [];
        
        let awardedCount = 0;
        missions.forEach(m => {
            if (m.completed && !data.daily.medalsClaimedToday.includes(m.id)) {
                if (!data.rewards) data.rewards = { medals: 0, stamps: [], stampWeekStart: null, weeklyBonusClaimed: false, totalWeeklyComplete: 0, unlockedCostumes: [] };
                data.rewards.medals = (data.rewards.medals || 0) + 1;
                data.daily.medalsClaimedToday.push(m.id);
                awardedCount++;
            }
        });

        if (awardedCount === 0) return { awarded: false };

        // 3つ全部達成したらスタンプも追加
        if (this.areAllMissionsComplete(data) && data.daily.medalsClaimedToday.length >= 3) {
            this.addTodayStamp(data);
        }

        // きせかえ解放チェック
        const newUnlocks = this.checkCostumeUnlocks(data);

        GameData.save(data);

        return {
            awarded: true,
            awardedCount: awardedCount,
            totalMedals: data.rewards.medals,
            newCostumes: newUnlocks,
            stampCount: data.rewards.stamps?.length || 0,
        };
    }

    // ★ 今日のスタンプを追加
    static addTodayStamp(data) {
        if (!data.rewards) data.rewards = { medals: 0, stamps: [], stampWeekStart: null, weeklyBonusClaimed: false, totalWeeklyComplete: 0, unlockedCostumes: [] };

        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=日曜, 1=月曜...

        // 週の開始をチェック（月曜始まり）
        const monday = this.getMondayOfWeek(now);
        const mondayStr = monday.toDateString();

        if (data.rewards.stampWeekStart !== mondayStr) {
            // 新しい週！リセット
            data.rewards.stamps = [];
            data.rewards.stampWeekStart = mondayStr;
            data.rewards.weeklyBonusClaimed = false;
        }

        // 今日のスタンプを追加（重複防止）
        const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月=0, 日=6
        if (!data.rewards.stamps.includes(todayIndex)) {
            data.rewards.stamps.push(todayIndex);
        }
    }

    // ★ 月曜日を取得
    static getMondayOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    // ★ 週間ボーナス（7日スタンプコンプリート）チェック
    static checkWeeklyBonus(data) {
        if (!data.rewards) return { canClaim: false };
        if (data.rewards.weeklyBonusClaimed) return { canClaim: false, alreadyClaimed: true };
        if (data.rewards.stamps.length < 7) return { canClaim: false, current: data.rewards.stamps.length };

        return { canClaim: true, current: 7 };
    }

    // ★ 週間ボーナスを受け取る
    static claimWeeklyBonus(data) {
        const check = this.checkWeeklyBonus(data);
        if (!check.canClaim) return { success: false };

        data.rewards.weeklyBonusClaimed = true;
        data.rewards.totalWeeklyComplete = (data.rewards.totalWeeklyComplete || 0) + 1;

        // ボーナスメダル3枚！
        data.rewards.medals = (data.rewards.medals || 0) + 3;

        // 特別きせかえ解放チェック
        const newUnlocks = this.checkCostumeUnlocks(data);

        GameData.save(data);

        return {
            success: true,
            bonusMedals: 3,
            totalMedals: data.rewards.medals,
            totalWeeklyComplete: data.rewards.totalWeeklyComplete,
            newCostumes: newUnlocks,
        };
    }

    // ★ きせかえ解放チェック
    static checkCostumeUnlocks(data) {
        if (!data.rewards) return [];
        if (!data.rewards.unlockedCostumes) data.rewards.unlockedCostumes = [];
        if (!data.costumeAchievements) data.costumeAchievements = {};

        const newUnlocks = [];
        const medals = data.rewards.medals || 0;
        const weeklyComplete = data.rewards.totalWeeklyComplete || 0;

        Object.entries(COSTUME_ITEMS).forEach(([id, item]) => {
            if (data.rewards.unlockedCostumes.includes(id)) return;

            let unlocked = false;
            const cond = item.unlockCondition;

            if (cond.startsWith('medals_')) {
                const required = parseInt(cond.split('_')[1]);
                unlocked = medals >= required;
            } else if (cond.startsWith('stamp_complete_')) {
                const required = parseInt(cond.split('_')[2]);
                unlocked = weeklyComplete >= required;
            }

            if (unlocked) {
                data.rewards.unlockedCostumes.push(id);
                // 🎀 衣装実績を記録
                const achievementId = `costume_${id}`;
                if (COSTUME_ACHIEVEMENTS[id]) {
                    data.costumeAchievements[achievementId] = {
                        unlockedAt: new Date().toISOString(),
                        costumeId: id,
                    };
                }
                newUnlocks.push({ id, ...item });
            }
        });

        return newUnlocks;
    }

    // ★ きせかえが解放されているか
    static isCostumeUnlocked(data, costumeId) {
        // ★ テストモードは先頭の TEST_MODE_UNLOCK_ALL で制御
        if (TEST_MODE_UNLOCK_ALL) return true;
        
        if (!data.rewards?.unlockedCostumes) return false;
        return data.rewards.unlockedCostumes.includes(costumeId);
    }

    // ★ スタンプラリー情報取得
    static getStampRallyInfo(data) {
        if (!data.rewards) {
            return { stamps: [], weekStart: null, daysRemaining: 7, canClaimBonus: false };
        }

        const now = new Date();
        const monday = this.getMondayOfWeek(now);
        const mondayStr = monday.toDateString();

        // 週が変わっていたらリセット
        if (data.rewards.stampWeekStart !== mondayStr) {
            return { stamps: [], weekStart: mondayStr, daysRemaining: 7, canClaimBonus: false };
        }

        const stamps = data.rewards.stamps || [];
        const sundayEnd = new Date(monday);
        sundayEnd.setDate(sundayEnd.getDate() + 6);

        const daysRemaining = Math.max(0, 7 - stamps.length);
        const canClaimBonus = stamps.length >= 7 && !data.rewards.weeklyBonusClaimed;

        return {
            stamps,
            weekStart: mondayStr,
            daysRemaining,
            canClaimBonus,
            totalWeeklyComplete: data.rewards.totalWeeklyComplete || 0,
        };
    }
}

// グローバルゲームデータ
let gameData = GameData.load();
AudioManager.applySettings(gameData.settings);

let LEVELS = [];

// ========================================
// シェアユーティリティ（Web Share API）
// ========================================
class ShareUtils {
    // ゲームのURL（GitHub PagesやCapacitor用に適宜変更）
    static GAME_URL = 'https://kerofen.github.io/inusanpo/';

    // シェアテキストを生成
    static buildShareText(mode, score, isNewRecord = false) {
        const emoji = '🐕';
        let text = `${emoji} いぬさんぽ ${emoji}\n`;

        switch (mode) {
            case 'normal':
                text += `ステージ ${score + 1} をクリアしたよ！\n`;
                break;
            case 'challenge':
                text += `チャレンジモードで ${score} ステージ突破！\n`;
                if (isNewRecord) {
                    text += `🎉 NEW RECORD! 🎉\n`;
                }
                break;
            case 'gameover':
                text += `チャレンジモードで ${score} ステージ クリア！\n`;
                if (isNewRecord) {
                    text += `🎉 NEW RECORD! 🎉\n`;
                }
                break;
        }

        text += `\n▼ あそんでみてね！\n${this.GAME_URL}`;
        return text;
    }

    // シェア実行
    static async share(mode, score, isNewRecord = false) {
        const text = this.buildShareText(mode, score, isNewRecord);

        const shareData = {
            title: 'いぬさんぽ',
            text: text,
            url: this.GAME_URL
        };

        // Web Share API が使えるか確認
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                return { success: true, method: 'share' };
            } catch (err) {
                // ユーザーがキャンセルした場合
                if (err.name === 'AbortError') {
                    return { success: false, method: 'cancelled' };
                }
                console.error('シェアエラー:', err);
            }
        }

        // フォールバック: クリップボードにコピー
        try {
            await navigator.clipboard.writeText(text);
            return { success: true, method: 'clipboard' };
        } catch (err) {
            console.error('クリップボードエラー:', err);
            return { success: false, method: 'error' };
        }
    }

    // シェアボタンを作成（Phaserシーン用）
    static createShareButton(scene, x, y, mode, score, isNewRecord = false) {
        const btn = scene.add.container(x, y);

        // 背景
        const bg = scene.add.graphics();
        bg.fillStyle(0x1DA1F2, 1); // Twitter風ブルー
        bg.fillRoundedRect(-50, -18, 100, 36, 8);
        bg.lineStyle(2, PALETTE.cellOutline, 1);
        bg.strokeRoundedRect(-50, -18, 100, 36, 8);

        // アイコン画像
        const icon = scene.add.image(-28, 0, 'icon_share');
        const iconScale = 22 / Math.max(icon.width, icon.height);
        icon.setScale(iconScale);

        // テキスト
        const txt = scene.add.text(8, 0, 'シェア', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#FFFFFF',
        }).setOrigin(0.5);

        btn.add([bg, icon, txt]);
        btn.setSize(100, 36);
        btn.setInteractive({ useHandCursor: true });

        // クリック時の処理
        btn.on('pointerup', async () => {
            AudioManager.playSfx(scene, 'sfx_ui_tap');
            const result = await this.share(mode, score, isNewRecord);

            if (result.success && result.method === 'clipboard') {
                // クリップボードにコピーした旨を表示
                const toast = scene.add.text(x, y - 50, 'コピーしました！', {
                    fontFamily: 'KeiFont, sans-serif',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    backgroundColor: '#333333',
                    padding: { x: 10, y: 5 },
                }).setOrigin(0.5);

                scene.tweens.add({
                    targets: toast,
                    alpha: 0,
                    y: y - 70,
                    duration: 1500,
                    onComplete: () => toast.destroy()
                });
            }
        });

        // ホバーエフェクト
        btn.on('pointerover', () => {
            scene.tweens.add({ targets: btn, scale: 1.05, duration: 100 });
        });
        btn.on('pointerout', () => {
            scene.tweens.add({ targets: btn, scale: 1, duration: 100 });
        });

        return btn;
    }
}

// ========================================
// 描画ユーティリティ（手描き風）
// ========================================
class DrawUtils {
    // 手描き風の丸角四角形（アウトライン付き）
    static roundedRect(graphics, x, y, w, h, r, fillColor, outlineColor = PALETTE.cellOutline, outlineWidth = 2) {
        // 塗り
        graphics.fillStyle(fillColor, 1);
        graphics.fillRoundedRect(x, y, w, h, r);

        // アウトライン
        graphics.lineStyle(outlineWidth, outlineColor, 1);
        graphics.strokeRoundedRect(x, y, w, h, r);
    }

    // 手描き風の円
    static circle(graphics, x, y, radius, fillColor, outlineColor = PALETTE.cellOutline, outlineWidth = 2) {
        graphics.fillStyle(fillColor, 1);
        graphics.fillCircle(x, y, radius);
        graphics.lineStyle(outlineWidth, outlineColor, 1);
        graphics.strokeCircle(x, y, radius);
    }

    // 草のクラスター
    static grassCluster(scene, x, y, scale = 1) {
        const g = scene.add.graphics();
        const blades = Phaser.Math.Between(3, 5);

        for (let i = 0; i < blades; i++) {
            const bx = x + (i - blades / 2) * 6 * scale;
            const h = Phaser.Math.Between(12, 20) * scale;
            const lean = Phaser.Math.Between(-3, 3) * scale;

            g.lineStyle(2 * scale, PALETTE.grassDark, 1);
            g.beginPath();
            g.moveTo(bx, y);
            g.lineTo(bx + lean, y - h);
            g.strokePath();
        }

        return g;
    }

    // 花
    static flower(scene, x, y, color = 0xFFFFFF) {
        const container = scene.add.container(x, y);

        // 花びら
        const petals = scene.add.graphics();
        petals.fillStyle(color, 1);
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const px = Math.cos(angle) * 6;
            const py = Math.sin(angle) * 6;
            petals.fillCircle(px, py, 5);
        }

        // 中心
        const center = scene.add.graphics();
        center.fillStyle(0xFFD700, 1);
        center.fillCircle(0, 0, 4);

        container.add([petals, center]);
        return container;
    }

    // 木
    static tree(scene, x, y, scale = 1) {
        const container = scene.add.container(x, y);

        // 幹
        const trunk = scene.add.graphics();
        trunk.fillStyle(PALETTE.wood, 1);
        trunk.fillRect(-8 * scale, -20 * scale, 16 * scale, 40 * scale);
        trunk.lineStyle(2, PALETTE.woodDark, 1);
        trunk.strokeRect(-8 * scale, -20 * scale, 16 * scale, 40 * scale);

        // 葉っぱ（丸いかたまり）
        const leaves = scene.add.graphics();
        leaves.fillStyle(PALETTE.grass, 1);
        leaves.fillCircle(0, -50 * scale, 35 * scale);
        leaves.fillCircle(-25 * scale, -35 * scale, 25 * scale);
        leaves.fillCircle(25 * scale, -35 * scale, 25 * scale);
        leaves.lineStyle(2, PALETTE.grassDark, 1);
        leaves.strokeCircle(0, -50 * scale, 35 * scale);

        container.add([trunk, leaves]);
        return container;
    }

    // 犬小屋
    static dogHouse(scene, x, y, scale = 1) {
        const container = scene.add.container(x, y);

        // 本体
        const body = scene.add.graphics();
        body.fillStyle(PALETTE.wood, 1);
        body.fillRect(-40 * scale, -30 * scale, 80 * scale, 60 * scale);
        body.lineStyle(2, PALETTE.woodDark, 1);
        body.strokeRect(-40 * scale, -30 * scale, 80 * scale, 60 * scale);

        // 屋根
        const roof = scene.add.graphics();
        roof.fillStyle(0xCD5C5C, 1);
        roof.beginPath();
        roof.moveTo(-50 * scale, -30 * scale);
        roof.lineTo(0, -70 * scale);
        roof.lineTo(50 * scale, -30 * scale);
        roof.closePath();
        roof.fillPath();
        roof.lineStyle(2, 0x8B0000, 1);
        roof.strokePath();

        // 入口
        const door = scene.add.graphics();
        door.fillStyle(PALETTE.woodDark, 1);
        door.fillCircle(0, 10 * scale, 20 * scale);
        door.fillRect(-20 * scale, 10 * scale, 40 * scale, 20 * scale);

        container.add([body, roof, door]);
        return container;
    }

    // 柵
    static fence(scene, x, y, width, scale = 1) {
        const g = scene.add.graphics();
        const posts = Math.floor(width / (20 * scale));

        // 横板
        g.fillStyle(PALETTE.wood, 1);
        g.fillRect(x, y - 25 * scale, width, 8 * scale);
        g.fillRect(x, y - 10 * scale, width, 8 * scale);
        g.lineStyle(2, PALETTE.woodDark, 1);
        g.strokeRect(x, y - 25 * scale, width, 8 * scale);
        g.strokeRect(x, y - 10 * scale, width, 8 * scale);

        // 縦の支柱
        for (let i = 0; i <= posts; i++) {
            const px = x + i * (width / posts);
            g.fillStyle(PALETTE.wood, 1);
            g.fillRect(px - 4 * scale, y - 35 * scale, 8 * scale, 40 * scale);
            g.lineStyle(2, PALETTE.woodDark, 1);
            g.strokeRect(px - 4 * scale, y - 35 * scale, 8 * scale, 40 * scale);
        }

        return g;
    }

    // かわいい犬アイコン（スプライト版 & Graphics拡張版）
    static dogIcon(scene, x, y, scale = 1, breedIdOrKey = null, overrideColor = null) {
        // 現在の選択を取得（デフォルトは柴犬）
        let breedId = breedIdOrKey;
        if (!breedId && typeof breedIdOrKey !== 'number') {
            breedId = localStorage.getItem('selectedDog') || 'shiba';
        }

        // 定義から探す
        let breed = DOG_BREEDS.find(b => b.id === breedId);

        // 見つからない場合、breedIdOrKeyが既存のスプライトキーや色かもしれないので互換性チェック
        if (!breed) {
            // 文字列かつ画像があるならスプライトとして扱う
            if (typeof breedIdOrKey === 'string' && scene.textures.exists(breedIdOrKey)) {
                breed = { type: 'sprite', key: breedIdOrKey };
            }
            // 数値なら色として扱う（デフォルト形状）
            else if (typeof breedIdOrKey === 'number') {
                breed = { type: 'graphics', variant: 'default', colors: { body: breedIdOrKey, face: breedIdOrKey, ears: breedIdOrKey } };
            }
            // それ以外はデフォルト（柴犬）
            else {
                breed = DOG_BREEDS[0];
            }
        }

        // 色の上書き処理
        let colors = breed.colors ? { ...breed.colors } : { body: 0xDEB887, face: 0xDEB887, ears: 0xDEB887 };
        if (overrideColor !== null) {
            colors = { body: overrideColor, face: overrideColor, ears: overrideColor };
        }

        // スプライト描画
        if (breed.type === 'sprite' && scene.textures.exists(breed.key)) {
            const sprite = scene.add.image(x, y, breed.key);
            const frame = scene.textures.getFrame(breed.key);
            const textureWidth = frame ? frame.width : sprite.width;
            const targetSizePx = 70 * scale;
            const s = targetSizePx / textureWidth;
            sprite.setScale(s);

            if (overrideColor !== null) {
                sprite.setTint(overrideColor);
            }
            return sprite;
        }

        // Graphics描画
        const container = scene.add.container(x, y);
        const variant = breed.variant || 'default';

        // 共通パーツ（体）
        const body = scene.add.graphics();
        body.fillStyle(colors.body, 1);
        body.fillEllipse(0, 15 * scale, 30 * scale, 20 * scale);
        body.lineStyle(2, PALETTE.cellOutline, 1);
        body.strokeEllipse(0, 15 * scale, 30 * scale, 20 * scale);
        container.add(body);

        if (variant === 'chihuahua') {
            // チワワ：大きな立ち耳、丸い頭
            const ears = scene.add.graphics();
            ears.fillStyle(colors.ears, 1);
            ears.lineStyle(2, PALETTE.cellOutline, 1);

            // 左耳（三角）
            ears.beginPath();
            ears.moveTo(-12 * scale, -12 * scale);
            ears.lineTo(-24 * scale, -28 * scale);
            ears.lineTo(-4 * scale, -20 * scale);
            ears.closePath();
            ears.fillPath();
            ears.strokePath();

            // 右耳
            ears.beginPath();
            ears.moveTo(12 * scale, -12 * scale);
            ears.lineTo(24 * scale, -28 * scale);
            ears.lineTo(4 * scale, -20 * scale);
            ears.closePath();
            ears.fillPath();
            ears.strokePath();
            container.add(ears);

            const face = scene.add.graphics();
            face.fillStyle(colors.face, 1);
            face.fillCircle(0, -4 * scale, 21 * scale);
            face.lineStyle(2, PALETTE.cellOutline, 1);
            face.strokeCircle(0, -4 * scale, 21 * scale);
            container.add(face);

        } else if (variant === 'dachshund') {
            // ダックス：大きな垂れ耳
            const ears = scene.add.graphics();
            ears.fillStyle(colors.ears, 1);
            ears.lineStyle(2, PALETTE.cellOutline, 1);

            // 左耳（垂れ）
            ears.fillEllipse(-20 * scale, -2 * scale, 12 * scale, 28 * scale);
            ears.strokeEllipse(-20 * scale, -2 * scale, 12 * scale, 28 * scale);
            // 右耳
            ears.fillEllipse(20 * scale, -2 * scale, 12 * scale, 28 * scale);
            ears.strokeEllipse(20 * scale, -2 * scale, 12 * scale, 28 * scale);
            container.add(ears);

            const face = scene.add.graphics();
            face.fillStyle(colors.face, 1);
            face.fillCircle(0, -6 * scale, 22 * scale);
            face.lineStyle(2, PALETTE.cellOutline, 1);
            face.strokeCircle(0, -6 * scale, 22 * scale);
            container.add(face);

        } else {
            // デフォルト（柴犬風グラフィック）
            const ears = scene.add.graphics();
            ears.fillStyle(colors.ears, 1);
            ears.fillEllipse(-18 * scale, -20 * scale, 12 * scale, 18 * scale);
            ears.fillEllipse(18 * scale, -20 * scale, 12 * scale, 18 * scale);
            ears.lineStyle(2, PALETTE.cellOutline, 1);
            ears.strokeEllipse(-18 * scale, -20 * scale, 12 * scale, 18 * scale);
            ears.strokeEllipse(18 * scale, -20 * scale, 12 * scale, 18 * scale);
            container.add(ears);

            const face = scene.add.graphics();
            face.fillStyle(colors.face, 1);
            face.fillCircle(0, -5 * scale, 22 * scale);
            face.lineStyle(2, PALETTE.cellOutline, 1);
            face.strokeCircle(0, -5 * scale, 22 * scale);
            container.add(face);
        }

        // 顔パーツ共通
        const eyes = scene.add.graphics();
        eyes.fillStyle(PALETTE.cellOutline, 1);
        eyes.fillCircle(-8 * scale, -8 * scale, 4 * scale);
        eyes.fillCircle(8 * scale, -8 * scale, 4 * scale);
        // ハイライト
        eyes.fillStyle(0xFFFFFF, 1);
        eyes.fillCircle(-6 * scale, -10 * scale, 1.5 * scale);
        eyes.fillCircle(10 * scale, -10 * scale, 1.5 * scale);

        const nose = scene.add.graphics();
        nose.fillStyle(PALETTE.cellOutline, 1);
        nose.fillCircle(0, 0, 4 * scale);

        const mouth = scene.add.graphics();
        mouth.lineStyle(2, PALETTE.cellOutline, 1);
        mouth.beginPath();
        mouth.moveTo(0, 4 * scale);
        mouth.lineTo(0, 8 * scale);
        mouth.moveTo(-6 * scale, 10 * scale);
        mouth.lineTo(0, 14 * scale);
        mouth.lineTo(6 * scale, 10 * scale);
        mouth.strokePath();

        container.add([eyes, nose, mouth]);
        return container;
    }
    // 肉球マーク（スプライト版）
    static pawPrint(scene, x, y, color, size = 16) {
        // スプライトがロードされていればスプライトを使用
        if (scene.textures.exists('paw_print')) {
            const sprite = scene.add.image(x, y, 'paw_print');
            // 1024px画像を指定サイズに縮小
            const targetSize = size * 2;
            const scale = targetSize / sprite.width;
            sprite.setScale(scale);
            if (color !== undefined) {
                sprite.setTint(color);
            }
            return sprite;
        }

        // フォールバック: グラフィックス描画
        const container = scene.add.container(x, y);
        const g = scene.add.graphics();

        // メインパッド
        g.fillStyle(color, 1);
        g.fillEllipse(0, 3, size * 0.6, size * 0.5);

        // 指パッド
        const pads = [
            { x: -size * 0.35, y: -size * 0.2 },
            { x: -size * 0.12, y: -size * 0.35 },
            { x: size * 0.12, y: -size * 0.35 },
            { x: size * 0.35, y: -size * 0.2 },
        ];

        pads.forEach(p => {
            g.fillCircle(p.x, p.y, size * 0.18);
        });

        container.add(g);
        return container;
    }
}

// ========================================
// 犬顔レンダラー（画像優先・フォールバックはグラフィックス描画）
// ========================================
class DogFaceRenderer {
    /**
     * 犬の顔を描画（画像があれば画像、なければグラフィックス）
     * @param {Phaser.Scene} scene 
     * @param {number} x 
     * @param {number} y 
     * @param {number} type - DOG_TYPESのID
     * @param {number} size - 表示サイズ（デフォルト25）
     * @param {string} expression - 表情（neutral/happy/sad/excited）
     * @param {number} level - レベル（未使用）
     * @returns {Phaser.GameObjects.Container}
     */
    static draw(scene, x, y, type, size = 25, expression = 'neutral', level = 1) {
        const dog = DOG_TYPES[type];
        if (!dog) return scene.add.container(x, y);

        const container = scene.add.container(x, y);
        const asset = DOG_ASSETS[type];
        
        // 🎯 桜井イズム: 画像があれば画像を使用（視認性最優先！）
        const imageKey = `dog_${type}_${expression}`;
        if (asset?.hasImage && scene.textures.exists(imageKey)) {
            // 画像ベースの描画
            const displaySize = size * 2.2; // 画像は大きめに
            const img = scene.add.image(0, 0, imageKey);
            img.setDisplaySize(displaySize, displaySize);
            container.add(img);
            
            // ★ きせかえ描画
            const scale = size / 25;
            this.drawCostumes(scene, container, scale);
            
            return container;
        }
        
        // フォールバック: グラフィックスで描画
        return this.drawWithGraphics(scene, x, y, type, size, expression, level);
    }
    
    /**
     * グラフィックスで犬の顔を描画（フォールバック用）
     */
    static drawWithGraphics(scene, x, y, type, size = 25, expression = 'neutral', level = 1) {
        const dog = DOG_TYPES[type];
        if (!dog) return scene.add.container(x, y);

        const container = scene.add.container(x, y);
        const g = scene.add.graphics();
        const scale = size / 25;

        // 耳を先に描画（顔の後ろに）
        this.drawEars(g, dog, scale);

        // 顔のベース
        g.fillStyle(dog.color, 1);
        g.fillCircle(0, 0, 22 * scale);
        g.lineStyle(2 * scale, 0x000000, 0.3);
        g.strokeCircle(0, 0, 22 * scale);

        // 顔の特徴（犬種別）
        this.drawFeature(g, dog, scale);

        // マズル（口周り）
        g.fillStyle(dog.accentColor, 1);
        g.fillEllipse(0, 8 * scale, 14 * scale, 10 * scale);

        // 目
        this.drawEyes(g, dog, scale, expression, level);

        // 鼻
        g.fillStyle(0x333333, 1);
        g.fillCircle(0, 6 * scale, 4 * scale);

        // 口（表情によって変化）
        this.drawMouth(g, scale, expression);

        container.add(g);

        // ★ きせかえ描画（桜井イズム：集めた報酬を見せびらかす！）
        this.drawCostumes(scene, container, scale);

        return container;
    }

    // ★ きせかえ描画（画像ベース対応）
    static drawCostumes(scene, container, scale) {
        const equippedCostumes = gameData.customize?.equippedCostumes || [];
        if (equippedCostumes.length === 0) return;

        equippedCostumes.forEach(costumeId => {
            const costume = COSTUME_ITEMS[costumeId];
            if (!costume) return;

            // 画像ベースのきせかえ
            if (costume.imageKey && scene.textures.exists(costume.imageKey)) {
                const costumeImage = scene.add.image(0, 0, costume.imageKey);
                
                // デフォルト値を設定
                let defaultX = 0;
                let defaultY = 0;
                let defaultScale = 0.10;
                
                // ポジションに応じたデフォルト配置
                switch (costume.position) {
                    case 'head':
                        // 頭の上（帽子など）
                        defaultY = -28;
                        defaultScale = 0.12;
                        break;
                    case 'ear':
                        // 右耳につける（花など）
                        defaultX = 14;
                        defaultY = -20;
                        defaultScale = 0.07;
                        break;
                    case 'neck':
                        // 首元（リボン、マフラーなど）
                        defaultY = 16;
                        defaultScale = 0.10;
                        break;
                    case 'face':
                        // 顔（メガネなど）
                        defaultY = -4;
                        defaultScale = 0.08;
                        break;
                    case 'body':
                        // 体（バッジなど）
                        defaultY = 8;
                        defaultX = 12;
                        defaultScale = 0.08;
                        break;
                }
                
                // カスタム設定があれば上書き
                const finalX = (costume.offsetX !== undefined ? costume.offsetX : defaultX) * scale;
                const finalY = (costume.offsetY !== undefined ? costume.offsetY : defaultY) * scale;
                const finalScale = costume.customScale !== undefined ? costume.customScale : defaultScale;
                
                costumeImage.setX(finalX);
                costumeImage.setY(finalY);
                costumeImage.setScale(scale * finalScale);
                
                container.add(costumeImage);
            }
        });
    }

    static drawEars(g, dog, scale) {
        const earType = dog.earType || 'pointed';
        g.fillStyle(dog.color, 1);

        switch (earType) {
            case 'pointed':
                // 三角耳（柴犬、ハスキー）
                g.beginPath();
                g.moveTo(-18 * scale, -8 * scale);
                g.lineTo(-12 * scale, -28 * scale);
                g.lineTo(-6 * scale, -10 * scale);
                g.closePath();
                g.fillPath();
                g.beginPath();
                g.moveTo(18 * scale, -8 * scale);
                g.lineTo(12 * scale, -28 * scale);
                g.lineTo(6 * scale, -10 * scale);
                g.closePath();
                g.fillPath();
                break;

            case 'floppy':
                // 垂れ耳（パグ、ゴールデン）
                g.fillEllipse(-18 * scale, 0, 10 * scale, 16 * scale);
                g.fillEllipse(18 * scale, 0, 10 * scale, 16 * scale);
                break;

            case 'curly':
                // カーリー耳（トイプードル）
                g.fillCircle(-16 * scale, -8 * scale, 10 * scale);
                g.fillCircle(16 * scale, -8 * scale, 10 * scale);
                g.fillCircle(-20 * scale, -4 * scale, 6 * scale);
                g.fillCircle(20 * scale, -4 * scale, 6 * scale);
                break;

            case 'huge':
                // 巨大耳（チワワ）
                g.beginPath();
                g.moveTo(-16 * scale, -5 * scale);
                g.lineTo(-26 * scale, -30 * scale);
                g.lineTo(-6 * scale, -12 * scale);
                g.closePath();
                g.fillPath();
                g.beginPath();
                g.moveTo(16 * scale, -5 * scale);
                g.lineTo(26 * scale, -30 * scale);
                g.lineTo(6 * scale, -12 * scale);
                g.closePath();
                g.fillPath();
                break;

            case 'big_pointed':
                // 大きな三角耳（コーギー）
                g.beginPath();
                g.moveTo(-16 * scale, -6 * scale);
                g.lineTo(-18 * scale, -32 * scale);
                g.lineTo(-4 * scale, -10 * scale);
                g.closePath();
                g.fillPath();
                g.beginPath();
                g.moveTo(16 * scale, -6 * scale);
                g.lineTo(18 * scale, -32 * scale);
                g.lineTo(4 * scale, -10 * scale);
                g.closePath();
                g.fillPath();
                break;

            case 'rose':
                // ローズ耳（ブルドッグ）
                g.fillEllipse(-18 * scale, -10 * scale, 8 * scale, 10 * scale);
                g.fillEllipse(18 * scale, -10 * scale, 8 * scale, 10 * scale);
                break;

            case 'small_pointed':
                // 小さな三角耳（ポメラニアン）
                g.beginPath();
                g.moveTo(-14 * scale, -10 * scale);
                g.lineTo(-10 * scale, -22 * scale);
                g.lineTo(-6 * scale, -12 * scale);
                g.closePath();
                g.fillPath();
                g.beginPath();
                g.moveTo(14 * scale, -10 * scale);
                g.lineTo(10 * scale, -22 * scale);
                g.lineTo(6 * scale, -12 * scale);
                g.closePath();
                g.fillPath();
                break;

            // ========== 新規耳タイプ（11〜24犬種用） ==========
            case 'long_floppy':
                // 長い垂れ耳（ビーグル、ダックス）
                g.fillEllipse(-20 * scale, 5 * scale, 10 * scale, 20 * scale);
                g.fillEllipse(20 * scale, 5 * scale, 10 * scale, 20 * scale);
                break;

            case 'semi_floppy':
                // 半分垂れ耳（ボーダーコリー）
                g.beginPath();
                g.moveTo(-18 * scale, -8 * scale);
                g.lineTo(-14 * scale, -22 * scale);
                g.lineTo(-8 * scale, -10 * scale);
                g.closePath();
                g.fillPath();
                // 先端を折り曲げ
                g.fillEllipse(-16 * scale, -18 * scale, 6 * scale, 8 * scale);
                g.beginPath();
                g.moveTo(18 * scale, -8 * scale);
                g.lineTo(14 * scale, -22 * scale);
                g.lineTo(8 * scale, -10 * scale);
                g.closePath();
                g.fillPath();
                g.fillEllipse(16 * scale, -18 * scale, 6 * scale, 8 * scale);
                break;

            case 'bat':
                // コウモリ耳（フレンチブルドッグ）
                g.beginPath();
                g.moveTo(-14 * scale, -5 * scale);
                g.lineTo(-20 * scale, -28 * scale);
                g.lineTo(-6 * scale, -8 * scale);
                g.closePath();
                g.fillPath();
                g.beginPath();
                g.moveTo(14 * scale, -5 * scale);
                g.lineTo(20 * scale, -28 * scale);
                g.lineTo(6 * scale, -8 * scale);
                g.closePath();
                g.fillPath();
                // 耳の中（ピンク）
                g.fillStyle(0xFFB6C1, 0.5);
                g.beginPath();
                g.moveTo(-13 * scale, -8 * scale);
                g.lineTo(-17 * scale, -22 * scale);
                g.lineTo(-9 * scale, -10 * scale);
                g.closePath();
                g.fillPath();
                g.beginPath();
                g.moveTo(13 * scale, -8 * scale);
                g.lineTo(17 * scale, -22 * scale);
                g.lineTo(9 * scale, -10 * scale);
                g.closePath();
                g.fillPath();
                g.fillStyle(dog.color, 1);
                break;

            case 'folded':
                // 折れ耳（シュナウザー）
                g.beginPath();
                g.moveTo(-16 * scale, -8 * scale);
                g.lineTo(-12 * scale, -20 * scale);
                g.lineTo(-6 * scale, -10 * scale);
                g.closePath();
                g.fillPath();
                // 折れ曲がり部分
                g.fillEllipse(-12 * scale, -16 * scale, 8 * scale, 6 * scale);
                g.beginPath();
                g.moveTo(16 * scale, -8 * scale);
                g.lineTo(12 * scale, -20 * scale);
                g.lineTo(6 * scale, -10 * scale);
                g.closePath();
                g.fillPath();
                g.fillEllipse(12 * scale, -16 * scale, 8 * scale, 6 * scale);
                break;

            case 'cropped':
                // クロップ耳（ドーベルマン）- シャープに立った耳
                g.beginPath();
                g.moveTo(-14 * scale, -6 * scale);
                g.lineTo(-10 * scale, -32 * scale);
                g.lineTo(-6 * scale, -8 * scale);
                g.closePath();
                g.fillPath();
                g.beginPath();
                g.moveTo(14 * scale, -6 * scale);
                g.lineTo(10 * scale, -32 * scale);
                g.lineTo(6 * scale, -8 * scale);
                g.closePath();
                g.fillPath();
                break;

            case 'elegant':
                // エレガントな垂れ耳（ボルゾイ）
                g.fillEllipse(-22 * scale, 0, 8 * scale, 22 * scale);
                g.fillEllipse(22 * scale, 0, 8 * scale, 22 * scale);
                // 耳の毛
                g.fillStyle(dog.accentColor, 0.6);
                g.fillEllipse(-24 * scale, 8 * scale, 6 * scale, 14 * scale);
                g.fillEllipse(24 * scale, 8 * scale, 6 * scale, 14 * scale);
                g.fillStyle(dog.color, 1);
                break;
        }
    }

    static drawFeature(g, dog, scale) {
        switch (dog.feature) {
            case 'mask':
                // ハスキーのマスク模様
                g.fillStyle(dog.accentColor, 1);
                g.fillEllipse(0, 2 * scale, 16 * scale, 18 * scale);
                break;

            case 'wrinkle':
                // パグのシワ
                g.lineStyle(1.5 * scale, 0x000000, 0.2);
                g.beginPath();
                g.moveTo(-8 * scale, -8 * scale);
                g.lineTo(-4 * scale, -6 * scale);
                g.strokePath();
                g.beginPath();
                g.moveTo(8 * scale, -8 * scale);
                g.lineTo(4 * scale, -6 * scale);
                g.strokePath();
                break;

            case 'fluffy':
                // トイプードルのフワフワ
                g.fillStyle(dog.color, 1);
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const fx = Math.cos(angle) * 18 * scale;
                    const fy = Math.sin(angle) * 18 * scale;
                    g.fillCircle(fx, fy, 6 * scale);
                }
                break;

            case 'golden':
                // ゴールデンの輝き（特別感）
                g.fillStyle(0xFFD700, 0.3);
                g.fillCircle(0, 0, 26 * scale);
                break;

            case 'spots':
                // ダルメシアンの斑点
                g.fillStyle(dog.accentColor, 1);
                g.fillCircle(-10 * scale, -8 * scale, 4 * scale);
                g.fillCircle(8 * scale, -12 * scale, 3 * scale);
                g.fillCircle(12 * scale, 4 * scale, 3 * scale);
                g.fillCircle(-14 * scale, 6 * scale, 2 * scale);
                break;

            case 'fluffy_face':
                // ポメラニアンのフワフワ顔
                g.fillStyle(dog.accentColor, 1);
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    const fx = Math.cos(angle) * 20 * scale;
                    const fy = Math.sin(angle) * 20 * scale;
                    g.fillCircle(fx, fy, 5 * scale);
                }
                break;

            // ========== 新規特徴タイプ（11〜24犬種用） ==========
            case 'tricolor':
                // ビーグルのトライカラー模様
                g.fillStyle(dog.accentColor, 1);
                g.fillEllipse(0, 5 * scale, 14 * scale, 12 * scale);
                // 背中の黒模様
                g.fillStyle(0x1C1C1C, 1);
                g.fillEllipse(0, -14 * scale, 12 * scale, 8 * scale);
                break;

            case 'border_pattern':
                // ボーダーコリーの白黒パターン
                g.fillStyle(dog.accentColor, 1);
                g.fillEllipse(0, 6 * scale, 16 * scale, 14 * scale);
                // 頭頂部の黒ライン
                g.fillStyle(dog.color, 1);
                g.fillEllipse(0, -12 * scale, 10 * scale, 8 * scale);
                break;

            case 'friendly':
                // ラブラドールの優しい雰囲気（ほんのり光）
                g.fillStyle(0xFFFACD, 0.2);
                g.fillCircle(0, 0, 24 * scale);
                break;

            case 'long_body':
                // ダックスの長い体を表現（顔を少し横長に）
                g.fillStyle(dog.accentColor, 1);
                g.fillEllipse(0, 8 * scale, 16 * scale, 10 * scale);
                break;

            case 'bat_face':
                // フレブルの平たい顔
                g.fillStyle(dog.accentColor, 1);
                g.fillEllipse(0, 4 * scale, 18 * scale, 12 * scale);
                // シワ
                g.lineStyle(1 * scale, 0x000000, 0.15);
                g.beginPath();
                g.arc(0, -4 * scale, 8 * scale, 0.5, Math.PI - 0.5, false);
                g.strokePath();
                break;

            case 'beard':
                // シュナウザーのひげ
                g.fillStyle(dog.accentColor, 1);
                // まゆげ
                g.fillEllipse(-10 * scale, -10 * scale, 8 * scale, 4 * scale);
                g.fillEllipse(10 * scale, -10 * scale, 8 * scale, 4 * scale);
                // ひげ
                g.fillEllipse(0, 10 * scale, 14 * scale, 10 * scale);
                break;

            case 'tan_points':
                // ドーベルマンのタンポイント
                g.fillStyle(dog.accentColor, 1);
                g.fillEllipse(0, 6 * scale, 14 * scale, 10 * scale);
                // 眉マーク
                g.fillCircle(-8 * scale, -10 * scale, 4 * scale);
                g.fillCircle(8 * scale, -10 * scale, 4 * scale);
                break;

            case 'akita_mask':
                // 秋田犬の白いマスク
                g.fillStyle(dog.accentColor, 1);
                g.fillEllipse(0, 4 * scale, 18 * scale, 16 * scale);
                break;

            case 'brindle':
                // 甲斐犬の虎毛模様
                g.lineStyle(2 * scale, dog.accentColor, 0.5);
                for (let i = -2; i <= 2; i++) {
                    g.beginPath();
                    g.moveTo((i * 6 - 3) * scale, -16 * scale);
                    g.lineTo((i * 6 + 3) * scale, 16 * scale);
                    g.strokePath();
                }
                break;

            case 'thick_fur':
                // 北海道犬の厚い毛
                g.fillStyle(dog.accentColor, 0.4);
                for (let i = 0; i < 10; i++) {
                    const angle = (i / 10) * Math.PI * 2;
                    const fx = Math.cos(angle) * 22 * scale;
                    const fy = Math.sin(angle) * 22 * scale;
                    g.fillCircle(fx, fy, 4 * scale);
                }
                break;

            case 'saint_pattern':
                // セントバーナードの模様
                g.fillStyle(dog.accentColor, 1);
                g.fillEllipse(0, 5 * scale, 16 * scale, 14 * scale);
                // 顔の縦ライン
                g.fillStyle(dog.color, 0.8);
                g.fillRoundedRect(-3 * scale, -18 * scale, 6 * scale, 20 * scale, 2 * scale);
                break;

            case 'long_nose':
                // ボルゾイの長い鼻
                g.fillStyle(dog.accentColor, 1);
                g.fillEllipse(0, 10 * scale, 12 * scale, 14 * scale);
                break;

            case 'bernese_pattern':
                // バーニーズのトリコロール
                g.fillStyle(dog.accentColor, 1);
                g.fillEllipse(0, 6 * scale, 16 * scale, 12 * scale);
                // 茶色のアクセント
                g.fillStyle(0xCD853F, 1);
                g.fillCircle(-10 * scale, -8 * scale, 4 * scale);
                g.fillCircle(10 * scale, -8 * scale, 4 * scale);
                break;

            case 'pure_white':
                // しろしばの純白＋特別感
                g.fillStyle(0xFFFFFF, 0.4);
                g.fillCircle(0, 0, 26 * scale);
                // キラキラエフェクト
                g.fillStyle(0xFFD700, 0.3);
                g.fillCircle(-12 * scale, -12 * scale, 3 * scale);
                g.fillCircle(14 * scale, -8 * scale, 2 * scale);
                g.fillCircle(8 * scale, 14 * scale, 2 * scale);
                break;
        }
    }

    static drawEyes(g, dog, scale, expression, level) {
        const eyeType = dog.eyeType || 'round';
        g.fillStyle(0x000000, 1);

        // レベルによる特別な目
        if (level >= 10 && expression === 'happy') {
            expression = 'sparkle';
        } else if (level >= 5 && expression === 'happy' && Math.random() > 0.5) {
            expression = 'wink';
        }

        switch (expression) {
            case 'happy':
                // にっこり（^-^）
                g.lineStyle(3 * scale, 0x000000, 1);
                g.beginPath();
                g.arc(-8 * scale, -4 * scale, 5 * scale, Math.PI, 0, false);
                g.strokePath();
                g.beginPath();
                g.arc(8 * scale, -4 * scale, 5 * scale, Math.PI, 0, false);
                g.strokePath();
                break;

            case 'wink':
                // ウインク
                g.lineStyle(3 * scale, 0x000000, 1);
                g.beginPath();
                g.arc(-8 * scale, -4 * scale, 5 * scale, Math.PI, 0, false);
                g.strokePath();
                // 右目は普通
                g.fillStyle(0x000000, 1);
                g.fillCircle(8 * scale, -4 * scale, 4 * scale);
                g.fillStyle(0xFFFFFF, 1);
                g.fillCircle(10 * scale, -6 * scale, 1.5 * scale);
                break;

            case 'sparkle':
                // キラキラ目（★）
                g.fillStyle(0x000000, 1);
                g.fillCircle(-8 * scale, -4 * scale, 5 * scale);
                g.fillCircle(8 * scale, -4 * scale, 5 * scale);
                g.fillStyle(0xFFFFFF, 1);
                g.fillCircle(-6 * scale, -6 * scale, 2 * scale);
                g.fillCircle(10 * scale, -6 * scale, 2 * scale);
                g.fillCircle(-10 * scale, -2 * scale, 1 * scale);
                g.fillCircle(6 * scale, -2 * scale, 1 * scale);
                break;

            default:
                // 通常の目（eyeTypeによって変化）
                if (eyeType === 'big' || eyeType === 'huge') {
                    // 大きな目（パグ、チワワ）
                    g.fillCircle(-8 * scale, -4 * scale, 5 * scale);
                    g.fillCircle(8 * scale, -4 * scale, 5 * scale);
                } else if (eyeType === 'almond') {
                    // アーモンド型（ハスキー）
                    g.fillEllipse(-8 * scale, -4 * scale, 5 * scale, 4 * scale);
                    g.fillEllipse(8 * scale, -4 * scale, 5 * scale, 4 * scale);
                } else if (eyeType === 'smart') {
                    // 賢そうな目（ボーダーコリー）
                    g.fillEllipse(-8 * scale, -4 * scale, 4 * scale, 3 * scale);
                    g.fillEllipse(8 * scale, -4 * scale, 4 * scale, 3 * scale);
                    // まゆげ風のライン
                    g.lineStyle(1.5 * scale, 0x000000, 0.4);
                    g.beginPath();
                    g.moveTo(-12 * scale, -8 * scale);
                    g.lineTo(-4 * scale, -7 * scale);
                    g.strokePath();
                    g.beginPath();
                    g.moveTo(12 * scale, -8 * scale);
                    g.lineTo(4 * scale, -7 * scale);
                    g.strokePath();
                } else if (eyeType === 'gentle') {
                    // 優しい目（ゴールデン、ラブラドール、バーニーズ）
                    g.fillEllipse(-8 * scale, -3 * scale, 4 * scale, 4 * scale);
                    g.fillEllipse(8 * scale, -3 * scale, 4 * scale, 4 * scale);
                } else if (eyeType === 'bushy') {
                    // まゆげが濃い目（シュナウザー）
                    g.fillCircle(-8 * scale, -4 * scale, 3 * scale);
                    g.fillCircle(8 * scale, -4 * scale, 3 * scale);
                } else if (eyeType === 'sharp') {
                    // 鋭い目（ドーベルマン）
                    g.fillEllipse(-8 * scale, -4 * scale, 4 * scale, 3 * scale);
                    g.fillEllipse(8 * scale, -4 * scale, 4 * scale, 3 * scale);
                    // 眉のアクセント
                    g.lineStyle(2 * scale, 0x000000, 0.6);
                    g.beginPath();
                    g.moveTo(-12 * scale, -9 * scale);
                    g.lineTo(-5 * scale, -7 * scale);
                    g.strokePath();
                    g.beginPath();
                    g.moveTo(12 * scale, -9 * scale);
                    g.lineTo(5 * scale, -7 * scale);
                    g.strokePath();
                } else if (eyeType === 'wild') {
                    // 野性的な目（甲斐犬）
                    g.fillEllipse(-7 * scale, -5 * scale, 4 * scale, 3 * scale);
                    g.fillEllipse(7 * scale, -5 * scale, 4 * scale, 3 * scale);
                } else if (eyeType === 'noble') {
                    // 凛々しい目（秋田犬、ボルゾイ）
                    g.fillEllipse(-8 * scale, -4 * scale, 4 * scale, 4 * scale);
                    g.fillEllipse(8 * scale, -4 * scale, 4 * scale, 4 * scale);
                } else if (eyeType === 'droopy') {
                    // 垂れ目（ブルドッグ、セントバーナード）
                    g.fillEllipse(-8 * scale, -2 * scale, 5 * scale, 4 * scale);
                    g.fillEllipse(8 * scale, -2 * scale, 5 * scale, 4 * scale);
                } else {
                    // デフォルト丸目
                    g.fillCircle(-8 * scale, -4 * scale, 4 * scale);
                    g.fillCircle(8 * scale, -4 * scale, 4 * scale);
                }
                // ハイライト
                g.fillStyle(0xFFFFFF, 1);
                g.fillCircle(-6 * scale, -6 * scale, 1.5 * scale);
                g.fillCircle(10 * scale, -6 * scale, 1.5 * scale);
        }
    }

    static drawMouth(g, scale, expression) {
        g.lineStyle(2 * scale, 0x000000, 0.8);

        if (expression === 'happy' || expression === 'wink' || expression === 'sparkle') {
            // 笑顔
            g.beginPath();
            g.arc(0, 10 * scale, 6 * scale, 0.2, Math.PI - 0.2, false);
            g.strokePath();
        } else {
            // 通常
            g.beginPath();
            g.moveTo(-4 * scale, 12 * scale);
            g.lineTo(0, 14 * scale);
            g.lineTo(4 * scale, 12 * scale);
            g.strokePath();
        }
    }
}

// ========================================
// 肉球描画クラス（桜井イズム：かわいい＝正義！）
// ========================================
class PawPrint {
    static draw(scene, x, y, color = 0xFFB6C1, size = 16, alpha = 1) {
        const container = scene.add.container(x, y);

        // レインボーの場合
        if (color === 'rainbow') {
            const colors = [0xFF6B6B, 0xFFD700, 0x90EE90, 0x87CEEB, 0xDDA0DD];
            color = colors[Math.floor(Math.random() * colors.length)];
        }

        // 色を分解してハイライト/シャドウ色を計算
        const r = (color >> 16) & 0xFF;
        const g = (color >> 8) & 0xFF;
        const b = color & 0xFF;
        const highlightColor = Phaser.Display.Color.GetColor(
            Math.min(255, r + 60),
            Math.min(255, g + 60),
            Math.min(255, b + 60)
        );
        const shadowColor = Phaser.Display.Color.GetColor(
            Math.max(0, r - 40),
            Math.max(0, g - 40),
            Math.max(0, b - 40)
        );

        // 🐾 影（ぷにっと立体感）
        const shadow = scene.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillEllipse(size * 0.05, size * 0.3, size * 0.55, size * 0.45);
        const shadowToes = [
            { x: -size * 0.28, y: -size * 0.2 },
            { x: -size * 0.08, y: -size * 0.35 },
            { x: size * 0.12, y: -size * 0.35 },
            { x: size * 0.32, y: -size * 0.2 },
        ];
        shadowToes.forEach(pos => {
            shadow.fillCircle(pos.x, pos.y, size * 0.16);
        });
        container.add(shadow);

        // 🐾 メインの肉球
        const main = scene.add.graphics();
        main.fillStyle(color, 1);

        // メインパッド（ハート型っぽい楕円）
        main.fillEllipse(0, size * 0.18, size * 0.52, size * 0.42);

        // 指パッド（4つのぷにぷに）
        const toePositions = [
            { x: -size * 0.3, y: -size * 0.22, sz: 0.17 },
            { x: -size * 0.1, y: -size * 0.38, sz: 0.16 },
            { x: size * 0.1, y: -size * 0.38, sz: 0.16 },
            { x: size * 0.3, y: -size * 0.22, sz: 0.17 },
        ];
        toePositions.forEach(pos => {
            main.fillCircle(pos.x, pos.y, size * pos.sz);
        });
        container.add(main);

        // 🌟 ハイライト（きらきら感）
        const highlight = scene.add.graphics();
        highlight.fillStyle(highlightColor, 0.6);

        // メインパッドのハイライト
        highlight.fillEllipse(-size * 0.12, size * 0.08, size * 0.2, size * 0.15);

        // 指パッドのハイライト（小さなキラキラ）
        toePositions.forEach(pos => {
            highlight.fillCircle(pos.x - size * 0.05, pos.y - size * 0.05, size * 0.06);
        });
        container.add(highlight);

        // ✨ キラキラポイント（最上位の輝き）
        const sparkle = scene.add.graphics();
        sparkle.fillStyle(0xFFFFFF, 0.8);
        sparkle.fillCircle(-size * 0.15, size * 0.05, size * 0.08);
        sparkle.fillCircle(-size * 0.2, -size * 0.3, size * 0.04);
        container.add(sparkle);

        container.setAlpha(alpha);
        return container;
    }

    // 🐾 スプライト版肉球描画（超かわいい画像アセット使用！）
    static drawSprite(scene, x, y, pawKey, size = 16, alpha = 1) {
        // 画像が存在するか確認
        if (!scene.textures.exists(pawKey)) {
            // フォールバック：Graphics版を使用
            return this.draw(scene, x, y, 0x8B6914, size, alpha);
        }

        const sprite = scene.add.image(x, y, pawKey);
        // アスペクト比を維持しながらサイズ調整
        const texture = scene.textures.get(pawKey);
        const frame = texture.get();
        const scale = size / Math.max(frame.width, frame.height);
        sprite.setScale(scale);
        sprite.setAlpha(alpha);
        return sprite;
    }
}

// ========================================
// ブートシーン（画像アセット対応版）
// ========================================
class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }

    preload() {
        console.log('🐕 ワンこねくと - 画像アセット読み込み中...');
        
        // 🎯 桜井イズム: 読み込み中も退屈させない
        const { width, height } = this.scale;
        
        // プログレスバー背景
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0xFFE4E1, 1);
        progressBox.fillRoundedRect(width / 2 - 100, height / 2 + 50, 200, 20, 10);
        
        // プログレスバー本体
        const progressBar = this.add.graphics();
        
        // 読み込みテキスト（ワンこねくとと同じスタイル）
        const loadText = this.add.text(width / 2, height / 2 + 30, 'ワンコたちをよんでいます...', {
            ...TEXT_STYLE.title,
            fontSize: '18px',
        }).setOrigin(0.5);
        
        // プログレス更新
        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xFFB6C1, 1);
            progressBar.fillRoundedRect(width / 2 - 98, height / 2 + 52, 196 * value, 16, 8);
        });
        
        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadText.destroy();
            console.log('✅ 画像アセット読み込み完了！');
        });

        // 🎵 サウンドアセット（BGM/SE）を一括プリロード
        AudioManager.preload(this);

        // 🐕 犬種画像をプリロード（存在するもののみ）
        Object.entries(DOG_ASSETS).forEach(([dogId, asset]) => {
            if (asset.hasImage && asset.folder) {
                DOG_EXPRESSIONS.forEach(expr => {
                    const key = `dog_${dogId}_${expr}`;
                    // ★ expressionMapがある場合は対応するファイルを読み込む（グレートデデン等）
                    const actualExpr = asset.expressionMap?.[expr] || expr;
                    const path = `./assets/characters/${asset.folder}/${actualExpr}.png`;
                    this.load.image(key, path);
                });
            }
        });

        // 🎨 タイトル画面用画像をプリロード
        this.load.image('title_bg', './assets/title/titlehaikei.png');
        this.load.image('title_logo', './assets/title/titlelogo.png');

        // 🏠 メインメニュー背景画像をプリロード
        this.load.image('mainmenu_bg', './assets/mainmenu/haikei.png');

        // 📱 各画面の背景画像をプリロード
        this.load.image('erabu_bg', './assets/mainmenu/erabu.png');
        this.load.image('zukan_bg', './assets/mainmenu/zukan.png');
        this.load.image('kisekae_bg', './assets/mainmenu/kisekae.png');
        this.load.image('shop_bg', './assets/mainmenu/shop.png');
        this.load.image('settei_bg', './assets/mainmenu/settei.png');

        // 🎲 おさんぽマス画像をプリロード（1マス分の画像）
        this.load.image('masu', './assets/osanpo/masu_single.png');

        // 🐾 おさんぽレベル選択画面の背景
        this.load.image('osanpo_select_bg', './assets/osanpo/selectgamen.png');

        // 🌍 せかいテーマ背景画像をプリロード
        this.load.image('theme_kouen', './assets/kisekae/kouen/kouen.png');
        this.load.image('theme_umi', './assets/kisekae/kouen/umi.png');
        this.load.image('theme_yuki', './assets/kisekae/kouen/yuki.png');
        this.load.image('theme_yuuyake', './assets/kisekae/kouen/yuuyake.png');
        this.load.image('theme_yoru', './assets/kisekae/kouen/yoru.png');
        this.load.image('theme_sakura', './assets/kisekae/kouen/sakura.png');
        this.load.image('theme_hanabi', './assets/kisekae/kouen/hanabi.png');
        this.load.image('theme_nizi', './assets/kisekae/kouen/nizi.png');
        this.load.image('theme_hosizora', './assets/kisekae/kouen/hosizora.png');

        // 🎀 きせかえアイテム画像をプリロード
        this.load.image('costume_ribbon_red', './assets/kisekae/isyou/ribbon_red.png');
        this.load.image('costume_crown_gold', './assets/kisekae/isyou/crown_gold.png');
        this.load.image('costume_glasses_star', './assets/kisekae/isyou/glasses_star.png');
        this.load.image('costume_flower_sakura', './assets/kisekae/isyou/flower_sakura.png');
        this.load.image('costume_beret', './assets/kisekae/isyou/beret.png');
        this.load.image('costume_flower_sunflower', './assets/kisekae/isyou/flower_sunflower.png');
        this.load.image('costume_hat_straw', './assets/kisekae/isyou/hat_straw.png');
        this.load.image('costume_glasses', './assets/kisekae/isyou/glasses.png');

        // 🎨 UIアイコン画像をプリロード（inu1スタイル）
        this.load.image('icon_settings', './assets/icon/inu1/settings.png');
        this.load.image('icon_music', './assets/icon/inu1/music.png');
        this.load.image('icon_sound', './assets/icon/inu1/sound.png');
        this.load.image('icon_vibration', './assets/icon/inu1/vibration.png');
        this.load.image('icon_back', './assets/icon/inu1/back.png');
        this.load.image('icon_refresh', './assets/icon/inu1/refresh.png');
        this.load.image('icon_hint', './assets/icon/inu1/hint.png');
        this.load.image('icon_play', './assets/icon/inu1/play.png');
        this.load.image('icon_pause', './assets/icon/inu1/pause.png');
        this.load.image('icon_star', './assets/icon/inu1/star.png');
        this.load.image('icon_lock', './assets/icon/inu1/lock.png');
        this.load.image('icon_coin', './assets/icon/inu1/coin.png');
        this.load.image('icon_paw', './assets/icon/inu1/paw.png');
        this.load.image('icon_heart', './assets/icon/inu1/heart.png');
        this.load.image('icon_share', './assets/icon/inu1/share.png');

        // 🐾 メニューアイコン画像をプリロード
        this.load.image('menu_osanpo', './assets/icon/menu/osanpo.png');
        this.load.image('menu_endless', './assets/icon/menu/endless.png');
        this.load.image('menu_settings', './assets/icon/menu/settings.png');
        this.load.image('menu_erabu', './assets/icon/menu/erabu.png');
        this.load.image('menu_zukan', './assets/icon/menu/zukan.png');
        this.load.image('menu_kisekae', './assets/icon/menu/kisekae.png');
        this.load.image('menu_shop', './assets/icon/menu/shop.png');
        this.load.image('menu_color', './assets/icon/menu/color.png');
        this.load.image('menu_costume', './assets/icon/menu/ribbon.png');
        this.load.image('menu_theme', './assets/icon/menu/theme.png');

        // 🛒 ショップパックアイコンをプリロード
        this.load.image('pack_premium', './assets/icon/shop/pack_premium.png');
        this.load.image('pack_customize', './assets/icon/shop/pack_customize.png');
        this.load.image('pack_noads', './assets/icon/shop/pack_noads.png');
        this.load.image('pack_dog', './assets/icon/shop/pack_dog.png');

        // 🐾 肉球カラー画像をプリロード（16種類の可愛い肉球！）
        Object.entries(PAW_COLORS).forEach(([key, data]) => {
            const imagePath = `./assets/nikukyu/individual/paw_${key}_${data.suffix}.png`;
            this.load.image(data.imageKey, imagePath);
        });
    }

    create() {
        const { width, height } = this.scale;

        this.textures.each((texture) => {
            texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
        });

        // 🎯 広告・課金マネージャーを初期化（バックグラウンドで実行）
        this.initializeMonetization();

        // 背景（水色のみ）
        this.add.rectangle(0, 0, width, height, PALETTE.sky).setOrigin(0);

        // 4匹の犬（DogFaceRenderer使用）
        const dogsY = height / 2 - 40;
        const selectedDogs = [1, 2, 3, 4];
        this.dogs = [];

        selectedDogs.forEach((dogType, i) => {
            const x = width * (0.2 + i * 0.2);
            const dog = DogFaceRenderer.draw(this, x, dogsY, dogType, 18, 'happy');
            this.dogs.push(dog);

            // バウンスアニメーション（時間差）
            this.tweens.add({
                targets: dog,
                y: dogsY - 10,
                duration: 400 + i * 50,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 100
            });
        });

        // タイトル（画面幅に応じてサイズ調整）
        const loadTitleSize = Math.min(width * 0.08, 28);
        this.add.text(width / 2, height / 2 + 30, 'ワンこねくと', {
            ...TEXT_STYLE.title,
            fontSize: `${loadTitleSize}px`,
        }).setOrigin(0.5);

        // ステータステキスト
        this.statusText = this.add.text(width / 2, height / 2 + 70, 'よみこみちゅう...', {
            ...TEXT_STYLE.body,
            fontSize: '16px',
        }).setOrigin(0.5);

        // 肉球プログレス（PawPrint使用）
        this.pawProgress = this.add.container(width / 2, height / 2 + 110);

        // レベル生成開始
        this.time.delayedCall(300, () => this.initializeLevels());
    }

    initializeLevels() {
        const TOTAL = 100;
        if (typeof LevelGenerator !== 'undefined') {
            // 固定シードを使用して、毎回同じステージを生成する
            const FIXED_SEED = 20260126;
            const gen = new LevelGenerator(6, FIXED_SEED);
            LEVELS = [];
            const used = new Set();
            let fails = 0;

            const batch = () => {
                let count = 0;
                while (count < 25 && LEVELS.length < TOTAL) {
                    const diff = LEVELS.length < 30 ? 1 : LEVELS.length < 70 ? 2 : 3;
                    const lv = gen.generate({ difficulty: diff, maxAttempts: 50 });
                    if (lv) {
                        const hash = lv.snacks.map(s => `${s.row},${s.col},${s.type}`).sort().join('|');
                        if (!used.has(hash)) {
                            used.add(hash);
                            lv.id = LEVELS.length + 1;
                            LEVELS.push(lv);
                            fails = 0;
                        } else fails++;
                    } else fails++;
                    if (fails > 30) { used.clear(); fails = 0; }
                    count++;
                }

                this.statusText.setText(`ステージ生成中... ${LEVELS.length}/${TOTAL}`);

                // 肉球でプログレス表示（PawPrint使用）
                this.pawProgress.removeAll(true);
                const pawCount = Math.floor(LEVELS.length / 10);
                for (let i = 0; i < pawCount; i++) {
                    const dogType = (i % 4) + 1;
                    const color = DOG_TYPES[dogType]?.color || 0xFFB6C1;
                    const paw = PawPrint.draw(this, (i - 4.5) * 25, 0, color, 12);
                    this.pawProgress.add(paw);
                }

                if (LEVELS.length < TOTAL) {
                    setTimeout(batch, 10);
                } else {
                    this.statusText.setText('かんりょう！');
                    this.time.delayedCall(600, () => this.scene.start('TitleScene'));
                }
            };
            batch();
        } else {
            // フォールバック
            LEVELS = [{
                id: 1, gridSize: 6, pathCount: 4, snacks: [
                    { row: 0, col: 0, type: 1 }, { row: 5, col: 5, type: 1 },
                    { row: 0, col: 5, type: 2 }, { row: 5, col: 0, type: 2 },
                    { row: 2, col: 0, type: 3 }, { row: 3, col: 5, type: 3 },
                    { row: 3, col: 0, type: 4 }, { row: 2, col: 5, type: 4 },
                ]
            }];
            this.scene.start('TitleScene');
        }
    }

    /**
     * 広告・課金マネージャーを初期化
     * バックグラウンドで非同期実行し、ゲーム起動をブロックしない
     */
    async initializeMonetization() {
        try {
            // 広告マネージャー初期化
            await AdManager.initialize();
            console.log('✅ AdManager 初期化完了');

            // 課金マネージャー初期化
            await PurchaseManager.initialize();
            console.log('✅ PurchaseManager 初期化完了');
            
            // 広告削除状態をゲームデータに同期
            if (PurchaseManager.isAdsRemoved && PurchaseManager.isAdsRemoved()) {
                AdManager.removeAds();
                gameData.purchases.adFree = true;
                GameData.save(gameData);
            }

            // 広告削除イベントをリッスン（課金完了時）
            window.addEventListener('adsRemoved', () => {
                AdManager.removeAds();
                gameData.purchases.adFree = true;
                GameData.save(gameData);
            });

        } catch (error) {
            console.warn('⚠️ 広告・課金初期化エラー（Web環境では正常）:', error.message);
        }
    }
}

// ========================================
// タイトルシーン
// ========================================
// タイトルシーン（桜井イズム完全版）
// ========================================
class TitleScene extends Phaser.Scene {
    constructor() { super({ key: 'TitleScene' }); }

    create() {
        const { width, height } = this.scale;

        // デイリーチェック＆リセット
        gameData = DailyManager.checkAndResetDaily(gameData);
        GameData.save(gameData);

        AudioManager.ensureUnlocked(this);
        HapticManager.ensureUserGestureListener();

        // tutorialオブジェクトが存在しない場合は初期化
        if (!gameData.tutorial) {
            gameData.tutorial = { completed: false, step: 0, inProgress: false };
            GameData.save(gameData);
        }

        AudioManager.playBgm(this, 'bgm_title');

        // ===== 🎨 桜井イズム：3秒で世界観を伝える =====
        
        // 1. 背景画像（画面いっぱいに表示）
        this.createBackground();

        // 2. タイトルロゴ（中央上に堂々と配置、動かさない）
        this.createLogo();

        // 3. 設定ボタン（右上）
        this.createSettingsButton();

        // 4. 「ゲーム開始」テキスト（白字で点滅、犬の下あたり）
        this.createStartText();

        // 5. バージョン表示
        this.createVersionText();

        this.cameras.main.fadeIn(500);
    }

    // ========== 1. 背景画像 ==========
    createBackground() {
        const { width, height } = this.scale;

        // 背景画像を画面サイズに合わせて表示
        const bg = this.add.image(width / 2, height / 2, 'title_bg');
        
        // 画面を覆うようにスケーリング（cover方式）
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale);
    }

    // ========== 2. タイトルロゴ（中央上に堂々と配置）==========
    createLogo() {
        const { width, height } = this.scale;

        // ロゴを配置
        const logoY = height * 0.35;
        const logo = this.add.image(width / 2, logoY, 'title_logo');
        
        // ロゴのサイズ調整（1.3倍の大きさ）
        const targetWidth = width * 1.1;
        const logoScale = targetWidth / logo.width;
        logo.setScale(logoScale);
        logo.setDepth(10);
        
        // 動かさない - 堂々と静止
    }

    // ========== 3. 設定ボタン（右上）==========
    createSettingsButton() {
        const { width } = this.scale;
        const topY = SAFE.TOP + 12;
        const btnSize = 50;
        const btn = this.add.container(width - 20 - btnSize / 2, topY + btnSize / 2);

        // 影
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillCircle(2, 3, btnSize / 2);
        btn.add(shadow);

        // 背景（半透明の白）
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.85);
        bg.fillCircle(0, 0, btnSize / 2);
        bg.lineStyle(2.5, 0xD4A574, 1);
        bg.strokeCircle(0, 0, btnSize / 2);
        btn.add(bg);

        // 歯車アイコン（新メニューアイコン使用）
        const icon = this.add.image(0, 0, 'menu_settings');
        const iconScale = (btnSize * 0.65) / Math.max(icon.width, icon.height);
        icon.setScale(iconScale);
        btn.add(icon);

        btn.setSize(btnSize, btnSize);
        btn.setInteractive({ useHandCursor: true });
        btn.setDepth(20);

        // フィードバック
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.1, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.9, duration: 40 });
            HapticManager.selection();
            AudioManager.playSfx(this, 'sfx_ui_tap');
        });
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, scale: 1, duration: 80 });
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('SettingsScene'));
        });
    }

    // ========== 4. 「ゲーム開始」テキスト（白字で点滅、犬の下あたり）==========
    createStartText() {
        const { width, height } = this.scale;

        // 犬の顔の下あたりに配置（画面の75%くらいの位置）
        const textY = height * 0.78;

        // タップエリア（画面下部全体をタップ可能に）
        const hitArea = this.add.rectangle(width / 2, textY, width, 150, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        // 「はじめる」テキスト（ワンこねくとと同じスタイル）
        const startText = this.add.text(width / 2, textY, '▶ はじめる', {
            ...TEXT_STYLE.title,
            fontSize: '28px',
        }).setOrigin(0.5).setDepth(20);

        // 🎯 桜井イズム：点滅アニメーション（目立つように！）
        this.tweens.add({
            targets: startText,
            alpha: { from: 1, to: 0.3 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // タップ時の処理
        hitArea.on('pointerdown', () => {
            // 点滅を止めて強調
            this.tweens.killTweensOf(startText);
            startText.setAlpha(1);
            
            // テキストを拡大
            this.tweens.add({
                targets: startText,
                scale: 1.2,
                duration: 100,
                yoyo: true,
            });
            
            HapticManager.impact('Medium');
        });

        hitArea.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                // ★ チュートリアル未完了時はチュートリアルを開始（テストモード時はスキップ）
                if (!TEST_MODE && !gameData.tutorial.completed) {
                    gameData.tutorial.inProgress = true;
                    gameData.tutorial.step = 0;
                    GameData.save(gameData);
                    
                    this.scene.start('GameScene', { 
                        stage: 1, 
                        mode: 'story',
                        tutorialMode: true 
                    });
                } else {
                    this.scene.start('MainMenuScene');
                }
            });
        });
    }

    // ========== 5. バージョン表示 ==========
    createVersionText() {
        const { width, height } = this.scale;
        
        this.add.text(width / 2, height - SAFE.BOTTOM - 10, 'Ver 1.0.0', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '12px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setAlpha(0.7).setDepth(15);
    }

    // ========== 4. メインボタン「ゲームをはじめる」（下部配置、犬に被らない！） ==========
    createStartButton() {
        const { width, height } = this.scale;

        // 🎯 桜井イズム：メインボタンは1つだけ。最高に目立つ！
        // 背景画像の犬たちは画面中央〜下部にいるので、ボタンは最下部に配置
        const btnW = width - 50;
        const btnH = 70;
        const cornerR = btnH / 2;

        // 画面最下部（セーフエリア考慮、犬に被らない位置）
        const playY = height - SAFE.BOTTOM - btnH / 2 - 30;

        const btn = this.add.container(width / 2, playY);
        btn.setDepth(20);

        // ===== 深いドロップシャドウ（立体感の要！）=====
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillRoundedRect(-btnW / 2 + 5, -btnH / 2 + 8, btnW, btnH, cornerR);
        btn.add(shadow);

        // ===== 下部の濃いオレンジ（ベベル効果）=====
        const bottomLayer = this.add.graphics();
        bottomLayer.fillStyle(0xD84315, 1);
        bottomLayer.fillRoundedRect(-btnW / 2, -btnH / 2 + 5, btnW, btnH, cornerR);
        btn.add(bottomLayer);

        // ===== メイン背景（オレンジ）=====
        const bg = this.add.graphics();
        bg.fillStyle(0xFF7043, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH - 5, cornerR);
        btn.add(bg);

        // ===== 上部ハイライト（ツヤ感）=====
        const highlight = this.add.graphics();
        highlight.fillStyle(0xFFAB91, 0.6);
        highlight.fillRoundedRect(-btnW / 2 + 8, -btnH / 2 + 4, btnW - 16, btnH * 0.35, cornerR * 0.6);
        btn.add(highlight);

        // ===== 最上部の光沢ライン =====
        const gloss = this.add.graphics();
        gloss.fillStyle(0xFFFFFF, 0.35);
        gloss.fillRoundedRect(-btnW / 2 + 15, -btnH / 2 + 5, btnW - 30, 10, 5);
        btn.add(gloss);

        // ===== 縁取り（白、太め）=====
        const border = this.add.graphics();
        border.lineStyle(4, 0xFFFFFF, 0.7);
        border.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH - 5, cornerR);
        btn.add(border);

        // ===== テキスト「ゲームをはじめる」（大きく、太く、影付き）=====
        const txtShadow = this.add.text(2, 2, '▶ ゲームをはじめる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '28px',
            color: '#BF360C',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        btn.add(txtShadow);

        const txt = this.add.text(0, 0, '▶ ゲームをはじめる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '28px',
            color: '#FFFFFF',
            fontStyle: 'bold',
            stroke: '#E64A19',
            strokeThickness: 4,
        }).setOrigin(0.5);
        btn.add(txt);

        btn.setSize(btnW, btnH);
        btn.setInteractive({ useHandCursor: true });

        // 🎯 気持ちいいフィードバック！
        const baseY = playY;
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.05, duration: 100, ease: 'Back.easeOut' }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 100 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, y: baseY + 5, scale: 0.97, duration: 50 });
            HapticManager.impact('Medium');
        });
        btn.on('pointerup', () => {
            this.tweens.add({
                targets: btn,
                y: baseY,
                scale: 1.08,
                duration: 100,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({ targets: btn, scale: 1, duration: 80 });
                }
            });
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                // ★ チュートリアル未完了時はチュートリアルを開始（テストモード時はスキップ）
                if (!TEST_MODE && !gameData.tutorial.completed) {
                    gameData.tutorial.inProgress = true;
                    gameData.tutorial.step = 0;
                    GameData.save(gameData);
                    
                    this.scene.start('GameScene', { 
                        stage: 1, 
                        mode: 'story',
                        tutorialMode: true 
                    });
                } else {
                    this.scene.start('MainMenuScene');
                }
            });
        });

        // ボタンの微妙なパルスアニメーション（注目を引く）
        this.tweens.add({
            targets: btn,
            scale: { from: 1, to: 1.02 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    // ========== [LEGACY] 以下は古いメソッド - 将来的に削除予定 ==========
    // createDogs, createDailyMission, 旧createStartButtonは画像ベースの新実装に置き換え済み

    // ========== 3. ワンコたち（芝生の上に大きく！）- LEGACY ==========
    createDogs() {
        const { width, height } = this.scale;
        
        // 芝生エリアの上に配置（地面に立っているように）
        const groundLineY = height * 0.52;  // 芝生と空の境界線付近
        const dogsY = groundLineY - 5;  // 少し浮かせて立っているように

        // 選択中の4犬種を表示
        const selectedDogs = gameData.selectedDogs;
        this.dogContainers = [];

        // 配置パターン: 大きさと位置をバラけさせて自然に
        const dogPositions = [
            { x: 0.18, scale: 32, offsetY: 0 },      // 左端
            { x: 0.38, scale: 38, offsetY: -15 },    // 左中央（大きめ、前に）
            { x: 0.62, scale: 36, offsetY: -10 },    // 右中央
            { x: 0.85, scale: 30, offsetY: 5 },      // 右端（小さめ、後ろに）
        ];

        for (let i = 0; i < 4; i++) {
            const dogType = selectedDogs[i] || (i + 1);
            const pos = dogPositions[i];
            const x = width * pos.x;
            const y = dogsY + pos.offsetY;

            // 🐕 大きなワンコを描画！
            const dog = DogFaceRenderer.draw(this, x, y, dogType, pos.scale, 'happy');
            this.dogContainers.push({ dog, x, y, type: dogType, baseY: y });

            // 影を追加（地面に立っている感）
            const shadow = this.add.ellipse(x, y + pos.scale + 5, pos.scale * 1.5, pos.scale * 0.4, 0x000000, 0.15);
            shadow.setDepth(-1);

            // 🎯 タップで愛着！「わん！」と反応
            const hitSize = pos.scale * 2.5;
            const hitArea = this.add.rectangle(x, y, hitSize, hitSize, 0x000000, 0)
                .setInteractive({ useHandCursor: true });
            
            const baseY = y;
            hitArea.on('pointerdown', () => {
                this.tweens.killTweensOf(dog);
                
                // 🐕 ぴょんぴょん！
                this.tweens.add({
                    targets: dog,
                    y: baseY - 25,
                    duration: 100,
                    yoyo: true,
                    repeat: 2,
                    ease: 'Quad.easeOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: dog,
                            y: baseY - 8,
                            duration: 600 + i * 100,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }
                });
                
                // 「わん！」吹き出し
                const bark = this.add.text(x, y - pos.scale - 20, 'わん！', {
                    fontSize: '16px',
                    fontFamily: 'KeiFont, sans-serif',
                    color: '#5D4037',
                    backgroundColor: '#FFFFFF',
                    padding: { x: 10, y: 5 },
                    stroke: '#FFB6C1',
                    strokeThickness: 2,
                }).setOrigin(0.5).setScale(0);
                
                this.tweens.add({
                    targets: bark,
                    scale: 1.2,
                    y: y - pos.scale - 45,
                    duration: 200,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: bark,
                            alpha: 0,
                            y: bark.y - 20,
                            scale: 0.8,
                            duration: 400,
                            delay: 400,
                            onComplete: () => bark.destroy()
                        });
                    }
                });
                
                // ハートも出す
                for (let h = 0; h < 3; h++) {
                    const heart = this.add.text(
                        x + Phaser.Math.Between(-20, 20), 
                        y - pos.scale * 0.5, 
                        '♥', 
                        { fontSize: `${18 + h * 4}px`, color: '#FF6B8A' }
                    ).setOrigin(0.5).setScale(0);
                    
                    this.tweens.add({
                        targets: heart,
                        y: heart.y - 50 - h * 15,
                        scale: { from: 0, to: 1.3 },
                        alpha: { from: 1, to: 0 },
                        duration: 700,
                        delay: h * 100,
                        ease: 'Cubic.easeOut',
                        onComplete: () => heart.destroy()
                    });
                }
                
                HapticManager.selection();
                AudioManager.playSfx(this, 'sfx_ui_tap');
            });

            // バウンスアニメーション（生き生きとした動き！）
            this.tweens.add({
                targets: dog,
                y: baseY - 8,
                duration: 600 + i * 100,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 200
            });

            // 影もアニメーション
            this.tweens.add({
                targets: shadow,
                scaleX: { from: 1, to: 1.1 },
                scaleY: { from: 1, to: 0.9 },
                duration: 600 + i * 100,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 200
            });
        }

        // 時々ハートが飛ぶ演出
        this.time.addEvent({
            delay: 3000,
            callback: () => {
                const idx = Phaser.Math.Between(0, 3);
                const pos = dogPositions[idx];
                const x = width * pos.x;
                const y = groundLineY + pos.offsetY;
                
                const heart = this.add.text(x, y - pos.scale * 0.3, '♥', {
                    fontSize: '20px',
                    color: '#FF6B8A'
                }).setOrigin(0.5).setAlpha(0);

                this.tweens.add({
                    targets: heart,
                    y: heart.y - 40,
                    alpha: { from: 1, to: 0 },
                    scale: { from: 0.5, to: 1.5 },
                    duration: 800,
                    onComplete: () => heart.destroy()
                });
            },
            loop: true
        });
    }

    // ========== 4. きょうのおさんぽ（3ミッションサマリー） ==========
    createDailyMission() {
        const { width, height } = this.scale;
        const missions = DailyManager.getTodaysMissions(gameData);

        if (missions.length === 0) return;

        // 🆕 3ミッションの達成状況
        const completedCount = missions.filter(m => m.completed).length;
        const claimedCount = (gameData.daily.medalsClaimedToday || []).length;
        const canGetMedal = DailyManager.getClaimableMedalCount(gameData) > 0;

        const boxX = 20;
        const boxY = height * 0.58;
        const boxW = width - 40;
        const boxH = 75; // 少しコンパクトに

        // ===== カード影（深め）=====
        const shadow = this.add.graphics();
        shadow.fillStyle(0x5D4037, 0.25);
        shadow.fillRoundedRect(boxX + 4, boxY + 5, boxW, boxH, 16);

        // ===== カード背景 =====
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFBF0, 0.98);
        bg.fillRoundedRect(boxX, boxY, boxW, boxH, 16);
        
        // 上部のアクセント帯（金または茶色）
        const accentColor = completedCount === 3 ? 0xFFD700 : 0xD4A574;
        bg.fillStyle(accentColor, 1);
        bg.fillRoundedRect(boxX, boxY, boxW, 6, { tl: 16, tr: 16, bl: 0, br: 0 });

        // 縁取り
        bg.lineStyle(2.5, accentColor, 1);
        bg.strokeRoundedRect(boxX, boxY, boxW, boxH, 16);

        // ===== タイトル「きょうのおさんぽ」=====
        this.add.text(boxX + 20, boxY + 22, '🐾 きょうのおさんぽ', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '15px',
            color: '#5D4037',
            fontStyle: 'bold',
        }).setOrigin(0, 0.5);

        // ===== メダル獲得状況（3つの丸で表示）=====
        const circleStartX = width - boxX - 80;
        const circleY = boxY + 22;
        const circleR = 10;
        const circleGap = 26;

        for (let i = 0; i < 3; i++) {
            const cx = circleStartX + i * circleGap;
            const circleGfx = this.add.graphics();
            
            if (i < claimedCount) {
                // 獲得済み：金色塗りつぶし
                circleGfx.fillStyle(0xFFD700, 1);
                circleGfx.fillCircle(cx, circleY, circleR);
                this.add.text(cx, circleY, '🏅', {
                    fontSize: '12px',
                }).setOrigin(0.5);
            } else if (i < completedCount) {
                // 達成済み＆未獲得：緑枠
                circleGfx.fillStyle(0x4CAF50, 0.3);
                circleGfx.fillCircle(cx, circleY, circleR);
                circleGfx.lineStyle(2, 0x4CAF50, 1);
                circleGfx.strokeCircle(cx, circleY, circleR);
                this.add.text(cx, circleY, '✓', {
                    fontFamily: 'KeiFont, sans-serif',
                    fontSize: '12px',
                    color: '#4CAF50',
                    fontStyle: 'bold',
                }).setOrigin(0.5);
            } else {
                // 未達成：グレー枠
                circleGfx.fillStyle(0xE0E0E0, 0.5);
                circleGfx.fillCircle(cx, circleY, circleR);
                circleGfx.lineStyle(2, 0xBDBDBD, 1);
                circleGfx.strokeCircle(cx, circleY, circleR);
            }
        }

        // ===== サブテキスト =====
        let subText = '';
        let subColor = '#888888';
        if (claimedCount === 3) {
            subText = '🎉 今日のミッション完了！';
            subColor = '#FFD700';
        } else if (canGetMedal) {
            subText = '✨ メダルがもらえるよ！';
            subColor = '#4CAF50';
        } else {
            subText = `メインメニューで確認 →`;
            subColor = '#8B7355';
        }

        this.add.text(width / 2, boxY + 52, subText, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '12px',
            color: subColor,
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);
    }

    // ========== 4. メインボタン「ゲームをはじめる」（巨大で立体的！押したくなる！） ==========
    createStartButton() {
        const { width, height } = this.scale;

        // 🎯 桜井イズム：メインボタンは1つだけ。最高に目立つ！
        const btnW = width - 50;
        const btnH = 80;  // より大きく！
        const cornerR = btnH / 2;  // 完全な丸み

        const playY = height * 0.82;  // 地面エリアの中央付近

        const btn = this.add.container(width / 2, playY);

        // ===== 深いドロップシャドウ（立体感の要！）=====
        const shadow = this.add.graphics();
        shadow.fillStyle(0x5D4037, 0.5);  // 茶色い影
        shadow.fillRoundedRect(-btnW / 2 + 5, -btnH / 2 + 10, btnW, btnH, cornerR);
        btn.add(shadow);

        // ===== 下部の濃いオレンジ（ベベル効果）=====
        const bottomLayer = this.add.graphics();
        bottomLayer.fillStyle(0xD84315, 1);  // ダークオレンジ
        bottomLayer.fillRoundedRect(-btnW / 2, -btnH / 2 + 6, btnW, btnH, cornerR);
        btn.add(bottomLayer);

        // ===== メイン背景（オレンジグラデーション）=====
        const bg = this.add.graphics();
        // 上部は明るいオレンジ
        bg.fillStyle(0xFF7043, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH - 6, cornerR);
        btn.add(bg);

        // ===== 上部ハイライト（ツヤ感）=====
        const highlight = this.add.graphics();
        highlight.fillStyle(0xFFAB91, 0.6);  // 薄いオレンジ
        highlight.fillRoundedRect(-btnW / 2 + 8, -btnH / 2 + 4, btnW - 16, btnH * 0.35, cornerR * 0.6);
        btn.add(highlight);

        // ===== 最上部の光沢ライン =====
        const gloss = this.add.graphics();
        gloss.fillStyle(0xFFFFFF, 0.35);
        gloss.fillRoundedRect(-btnW / 2 + 15, -btnH / 2 + 6, btnW - 30, 12, 6);
        btn.add(gloss);

        // ===== 縁取り（白、太め）=====
        const border = this.add.graphics();
        border.lineStyle(5, 0xFFFFFF, 0.7);
        border.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH - 6, cornerR);
        btn.add(border);

        // ===== テキスト「ゲームをはじめる」（大きく、太く、影付き）=====
        // テキストシャドウ
        const txtShadow = this.add.text(2, 3, '▶ ゲームをはじめる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '32px',
            color: '#BF360C',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        btn.add(txtShadow);

        // メインテキスト
        const txt = this.add.text(0, 0, '▶ ゲームをはじめる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '32px',
            color: '#FFFFFF',
            fontStyle: 'bold',
            stroke: '#E64A19',
            strokeThickness: 5,
        }).setOrigin(0.5);
        btn.add(txt);

        btn.setSize(btnW, btnH);
        btn.setInteractive({ useHandCursor: true });

        // 🎯 気持ちいいフィードバック！
        const baseY = playY;
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.06, duration: 100, ease: 'Back.easeOut' }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 100 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, y: baseY + 6, scale: 0.97, duration: 50 });
            HapticManager.impact('Medium');
        });
        btn.on('pointerup', () => {
            this.tweens.add({
                targets: btn,
                y: baseY,
                scale: 1.1,
                duration: 100,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({ targets: btn, scale: 1, duration: 80 });
                }
            });
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('MainMenuScene');
            });
        });

        // ボタンの微妙なパルスアニメーション（注目を引く）
        this.tweens.add({
            targets: btn,
            scale: { from: 1, to: 1.03 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    // プライマリボタン生成（視認性1番目・最も目立つ）
    createPrimaryButton(x, y, text, color, w, h, cb) {
        const btn = this.add.container(x, y);

        // 影（深めで立体感）
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.22);
        shadow.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 12);
        btn.add(shadow);

        // 背景（鮮やか）
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
        bg.lineStyle(3, 0xFFFFFF, 0.6);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
        btn.add(bg);

        // テキスト（太く・読みやすく！）
        const txt = this.add.text(0, 0, text, {
            ...TEXT_STYLE.button,
            fontSize: '22px',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        btn.add(txt);

        btn.setSize(w, h);
        btn.setInteractive({ useHandCursor: true });

        // 🎯 桜井イズム：気持ちいいフィードバック！+ Haptic
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.06, duration: 80, ease: 'Back.easeOut' }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, y: y + 4, scale: 0.94, duration: 40 });
            HapticManager.impact('Light');  // ぷにっ
        });
        btn.on('pointerup', () => {
            this.tweens.add({ 
                targets: btn, 
                y: y, 
                scale: 1.08, 
                duration: 80,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({ targets: btn, scale: 1, duration: 60 });
                }
            });
            cb();
        });

        return btn;
    }

    // ========== 6. 下部ナビ（軽やかで統一感のあるアイコン） ==========
    createImportantButtons() {
        const { width, height } = this.scale;

        // 4つのボタン（画像アイコンで統一）
        const buttons = [
            { iconKey: 'menu_erabu', label: 'えらぶ', scene: 'DogSelectScene' },
            { iconKey: 'menu_zukan', label: 'ずかん', scene: 'ZukanScene' },
            { iconKey: 'menu_kisekae', label: 'きせかえ', scene: 'CustomizeScene' },
            { iconKey: 'menu_shop', label: 'ショップ', scene: 'ShopScene' },
        ];

        // 画面幅に応じてボタンサイズと余白を自動調整
        const safeWidth = width - SAFE.LEFT - SAFE.RIGHT - 20;
        const desiredSize = 86;
        const minSize = 64;
        const computedSize = (safeWidth / buttons.length) - 12;
        const btnSize = Phaser.Math.Clamp(Math.min(desiredSize, computedSize), minSize, desiredSize);
        const totalWidth = buttons.length * btnSize;
        const gap = (width - totalWidth) / (buttons.length + 1);

        // ナビの位置（大きさに応じて上げる）
        const navY = height - SAFE.BOTTOM - (btnSize * 0.4) - 40;

        buttons.forEach((btnData, i) => {
            const x = gap + (btnSize / 2) + i * (btnSize + gap);
            this.createNavButton(x, navY, btnSize, btnData);
        });
    }

    // ナビボタン生成（画像アイコン対応）
    createNavButton(x, y, size, data) {
        const btn = this.add.container(x, y);

        const circleRadius = size / 2;

        // 影（軽め）
        const shadow = this.add.graphics();
        shadow.fillStyle(0x5D4037, 0.25);
        shadow.fillCircle(3, 4, circleRadius + 4);
        btn.add(shadow);

        // 背景（クリーム色、立体感）
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFBF0, 1);
        bg.fillCircle(0, 0, circleRadius);
        // 上部ハイライト
        bg.fillStyle(0xFFFFFF, 0.45);
        bg.fillEllipse(0, -circleRadius / 3, size * 0.65, size * 0.38);
        // 縁取り
        bg.lineStyle(3, 0xD4A574, 1);
        bg.strokeCircle(0, 0, circleRadius);
        btn.add(bg);

        // アイコン（画像アイコン使用）
        const icon = this.add.image(0, -4, data.iconKey);
        const iconScale = (size * 0.68) / Math.max(icon.width, icon.height);
        icon.setScale(iconScale);
        btn.add(icon);

        // テロップ用プレート
        const labelBgHeight = size * 0.38;
        const labelBgWidth = size * 1.05;
        const labelBgY = circleRadius + 10;
        const labelBg = this.add.graphics();
        labelBg.fillStyle(0xFFF4D7, 0.95);
        labelBg.fillRoundedRect(-labelBgWidth / 2, labelBgY, labelBgWidth, labelBgHeight, labelBgHeight / 2);
        labelBg.lineStyle(2, 0xD4A574, 0.6);
        labelBg.strokeRoundedRect(-labelBgWidth / 2, labelBgY, labelBgWidth, labelBgHeight, labelBgHeight / 2);
        btn.add(labelBg);

        // ラベル（下に配置、読みやすく）
        const label = this.add.text(0, labelBgY + labelBgHeight / 2, data.label, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: `${Math.round(size * 0.32)}px`,
            color: '#5D4037',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 6,
        }).setOrigin(0.5);
        label.setShadow(0, 2, 'rgba(0,0,0,0.2)', 2, true, false);
        btn.add(label);

        btn.setSize(size, size + labelBgHeight + 40);
        btn.setInteractive({ useHandCursor: true });

        // フィードバック
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.12, y: y - 3, duration: 80, ease: 'Back.easeOut' }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, y: y, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.92, duration: 40 });
            HapticManager.selection();
            AudioManager.playSfx(this, 'sfx_ui_tap');
        });
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, scale: 1, duration: 80 });
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start(data.scene));
        });

        return btn;
    }

    // セカンダリボタン生成（視認性2番目・メインより控えめ）
    createSecondaryButton(x, y, text, color, w, h, scene, isShop = false) {
        const btn = this.add.container(x, y);

        // 影（浅め）
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + 3, w, h, 10);
        btn.add(shadow);

        // 背景
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
        bg.lineStyle(2, 0xFFFFFF, 0.5);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        btn.add(bg);

        // ショップは✨キラキラ
        if (isShop) {
            const sparkleL = this.add.text(-w / 2 + 10, 0, '✨', { fontSize: '10px' }).setOrigin(0.5);
            const sparkleR = this.add.text(w / 2 - 10, 0, '✨', { fontSize: '10px' }).setOrigin(0.5);
            btn.add([sparkleL, sparkleR]);

            this.tweens.add({
                targets: [sparkleL, sparkleR],
                alpha: { from: 1, to: 0.3 },
                yoyo: true,
                repeat: -1,
                duration: 500,
            });
        }

        // テキスト（メインより小さめ）
        const txt = this.add.text(0, 0, text, {
            ...TEXT_STYLE.buttonSmall,
            fontSize: '13px',
            color: isShop ? '#5D4037' : '#FFFFFF',
        }).setOrigin(0.5);
        btn.add(txt);

        btn.setSize(w, h);
        btn.setInteractive({ useHandCursor: true });

        // 🎯 桜井イズム：全ボタンに統一されたフィードバック
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.05, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, y: y + 2, scale: 0.95, duration: 40 });
            HapticManager.impact('Light');  // ぷにっ
        });
        btn.on('pointerup', () => {
            this.tweens.add({ 
                targets: btn, 
                y: y, 
                scale: 1.06, 
                duration: 80,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({ targets: btn, scale: 1, duration: 60 });
                }
            });
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start(scene));
        });

        return btn;
    }

    // 旧createSettingsButton は削除（左上に統合済み）

    // ========== ボタン生成ヘルパー ==========

    createMainButton(x, y, text, color, w, h, cb) {
        const btn = this.add.container(x, y);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 12);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
        bg.lineStyle(3, 0xFFFFFF, 0.5);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);

        const txt = this.add.text(0, 0, text, {
            ...TEXT_STYLE.button,
            fontSize: h > 55 ? '26px' : '22px',
        }).setOrigin(0.5);

        btn.add([shadow, bg, txt]);
        btn.setSize(w, h);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.05, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => this.tweens.add({ targets: btn, y: y + 4, duration: 50 }));
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, y: y, duration: 80 });
            cb();
        });

        return btn;
    }

    createSubButton(x, y, text, color, w, h, cb) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
        bg.lineStyle(2, 0xFFFFFF, 0.4);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

        const txt = this.add.text(0, 0, text, {
            ...TEXT_STYLE.buttonSmall,
            fontSize: '13px',
            align: 'center',
            lineSpacing: -2,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(w, h);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.05, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', cb);

        return btn;
    }

    createIconButton(x, y, icon, label, cb) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.9);
        bg.fillCircle(0, 0, 28);
        bg.lineStyle(2, 0xCCCCCC, 1);
        bg.strokeCircle(0, 0, 28);

        const iconTxt = this.add.text(0, -2, icon, { fontSize: '24px' }).setOrigin(0.5);
        const labelTxt = this.add.text(0, 38, label, {
            fontSize: '10px',
            color: '#666666',
        }).setOrigin(0.5);

        btn.add([bg, iconTxt, labelTxt]);
        btn.setSize(56, 56);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.1, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', cb);

        return btn;
    }

    // 🛒 大きなショップボタン（桜井イズム：課金は「快適さ」を買うもの）
    createBigShopButton(x, y) {
        const btn = this.add.container(x, y);
        const w = 200;
        const h = 50;

        // ゴールドグラデーション風シャドウ
        const shadow = this.add.graphics();
        shadow.fillStyle(0xCC9900, 0.4);
        shadow.fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 25);
        btn.add(shadow);

        // メイン背景（ゴールド）
        const bg = this.add.graphics();
        bg.fillGradientStyle(0xFFD700, 0xFFD700, 0xFFC107, 0xFFC107, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 25);
        bg.lineStyle(3, 0xFFFFFF, 0.6);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 25);
        btn.add(bg);

        // ✨ キラキラエフェクト（左）
        const sparkleL = this.add.text(-w / 2 + 20, 0, '✨', { fontSize: '16px' }).setOrigin(0.5);
        btn.add(sparkleL);

        // 🛒 アイコン
        const icon = this.add.text(-35, 0, '🛒', { fontSize: '22px' }).setOrigin(0.5);
        btn.add(icon);

        // テキスト
        const txt = this.add.text(15, 0, 'ショップ', {
            ...TEXT_STYLE.button,
            fontSize: '20px',
            color: '#5D4037',
        }).setOrigin(0.5);
        btn.add(txt);

        // ✨ キラキラエフェクト（右）
        const sparkleR = this.add.text(w / 2 - 20, 0, '✨', { fontSize: '16px' }).setOrigin(0.5);
        btn.add(sparkleR);

        btn.setSize(w, h);
        btn.setInteractive({ useHandCursor: true });

        // 🌟 キラキラアニメーション
        this.tweens.add({
            targets: [sparkleL, sparkleR],
            alpha: { from: 1, to: 0.3 },
            scale: { from: 1, to: 1.3 },
            yoyo: true,
            repeat: -1,
            duration: 600,
            ease: 'Sine.easeInOut'
        });

        // 🎯 ホバー＆押下のフィードバック
        btn.on('pointerover', () => {
            this.tweens.add({ targets: btn, scale: 1.08, duration: 100, ease: 'Back.easeOut' });
        });
        btn.on('pointerout', () => {
            this.tweens.add({ targets: btn, scale: 1, duration: 100 });
        });
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, y: y + 3, scale: 0.97, duration: 50 });
        });
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, y: y, scale: 1, duration: 80 });
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('ShopScene'));
        });

        return btn;
    }
}


// ========================================
// メインメニュー（ゲームをはじめる押下後）
// ========================================
class MainMenuScene extends Phaser.Scene {
    constructor() { super({ key: 'MainMenuScene' }); }

    init(data) {
        // ★ チュートリアルモード
        this.tutorialMode = data?.tutorialMode || false;
        this.tutorialStep = 0;
        this.tutorialContainer = null;
        // ボタン参照を保存（チュートリアルで使用）
        this.menuButtons = {};
    }

    create() {
        const { width, height } = this.scale;

        AudioManager.playBgm(this, 'bgm_select');

        // 背景
        this.createBackground();

        // ヘッダー
        this.createHeader();

        // 🆕 きょうのおさんぽ（上部）
        this.createDailyMissions();

        // メインメニューボタン（中央：おさんぽ＆エンドレス、下部：サブ4つ）
        this.createMenuButtons();

        this.cameras.main.fadeIn(300);

        // ★ チュートリアルモードの場合、説明を表示（ただし完了済みなら表示しない）
        if (this.tutorialMode && !gameData.tutorial.completed) {
            this.time.delayedCall(500, () => {
                this.startMenuTutorial();
            });
        }
    }

    createBackground() {
        const { width, height } = this.scale;

        // メインメニュー背景画像を表示
        const bgImage = this.add.image(width / 2, height / 2, 'mainmenu_bg');
        
        // 画像を画面サイズに合わせてスケール（アスペクト比を維持）
        const scaleX = width / bgImage.width;
        const scaleY = height / bgImage.height;
        const scale = Math.max(scaleX, scaleY); // 画面を覆うように拡大
        bgImage.setScale(scale);
        
        // 画像を背景レイヤーに配置
        bgImage.setDepth(0);
    }

    createHeader() {
        const { width } = this.scale;
        // 🎯 視覚的階層: ヘッダーは80%に小型化、余白を確保
        const headerY = SAFE.TOP + 20;  // より上に詰めて空の背景を広く

        // 戻るボタン（小型化）
        this.createBackButton(42, headerY);

        // タイトル（小型化 + 軽やかに）
        this.add.text(width / 2, headerY, '🐾 メインメニュー', {
            ...TEXT_STYLE.heading,
            fontSize: '17px',  // 80%縮小
        }).setOrigin(0.5);
    }

    createBackButton(x, y) {
        const btn = this.add.container(x, y);

        // 🎯 80%縮小: 76x32 → 60x26
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.85);  // やや透明で軽やか
        bg.fillRoundedRect(-30, -13, 60, 26, 8);
        bg.lineStyle(1.5, DOG_TYPES[3].color, 0.7);  // 細い枠線
        bg.strokeRoundedRect(-30, -13, 60, 26, 8);

        // 桜井イズム: KeiFont + 縁取りで統一感
        const txt = this.add.text(0, 0, '← もどる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '11px',  // 80%縮小
            fontStyle: 'bold',
            color: '#5D4037',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(60, 26);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('TitleScene'));
        });

        return btn;
    }

    // ========================================
    // 🆕 きょうのおさんぽ（デイリーミッション3つ）
    // 🎯 グラスモーフィズム + スリムデザイン
    // ========================================
    createDailyMissions() {
        const { width, height } = this.scale;
        const missions = DailyManager.getTodaysMissions(gameData);
        
        if (missions.length === 0) return;

        // 🎯 レイアウト計算：画面を3ゾーンに分割（余白を多めに）
        // ヘッダー縮小分、より多くの空を見せる
        const contentTop = SAFE.TOP + 50;  // ヘッダー分のみ
        const contentBottom = height - SAFE.BOTTOM - 15;
        const contentHeight = contentBottom - contentTop;
        
        // 3ゾーン分割（上:デイリー、中:メイン、下:サブ）
        // 🎯 余白を詰めて、各ゾーンをコンパクトに: デイリー:メイン:サブ = 0.85 : 1.2 : 1.0
        const totalRatio = 0.85 + 1.2 + 1.0;
        const dailyZoneH = contentHeight * (0.85 / totalRatio);
        const mainZoneH = contentHeight * (1.2 / totalRatio);
        
        // 🎯 カードをよりスリムに（高さを抑える）
        const cardX = 24;
        const cardH = Math.min(105, dailyZoneH - 10);  // より低く
        const cardY = contentTop + (dailyZoneH - cardH) / 2;
        const cardW = width - 48;
        
        // メインボタンのY座標を保存（createMenuButtonsで使用）
        this.mainZoneCenterY = contentTop + dailyZoneH + mainZoneH / 2;
        this.subZoneCenterY = contentTop + dailyZoneH + mainZoneH + (contentHeight - dailyZoneH - mainZoneH) / 2;

        // ★ チュートリアル用：きょうのおさんぽカードの位置を保存
        this.menuButtons.dailyCard = { x: cardX, y: cardY, w: cardW, h: cardH };

        // ===== 🎯 グラスモーフィズム背景（影は控えめに） =====
        const shadow = this.add.graphics();
        shadow.fillStyle(0x5D4037, 0.08);  // より控えめな影
        shadow.fillRoundedRect(cardX + 2, cardY + 2, cardW, cardH, 14);

        // ===== 🎯 半透明背景（グラスモーフィズム風） =====
        const bg = this.add.graphics();
        // メインの半透明背景
        bg.fillStyle(0xFFFFFF, 0.55);  // 透明感のある白
        bg.fillRoundedRect(cardX, cardY, cardW, cardH, 14);
        
        // 上部のほんのりグラデーション効果
        bg.fillStyle(0xFFFFFF, 0.25);
        bg.fillRoundedRect(cardX, cardY, cardW, cardH * 0.4, { tl: 14, tr: 14, bl: 0, br: 0 });
        
        // 🎯 細い枠線（控えめに）
        const completedCount = missions.filter(m => m.completed).length;
        const accentColor = completedCount === 3 ? 0xFFD700 : 0xC4A06A;
        bg.lineStyle(1.5, accentColor, 0.6);  // より細く、控えめに
        bg.strokeRoundedRect(cardX, cardY, cardW, cardH, 14);

        // ===== タイトル「きょうのおさんぽ」+ メダル状況（1行に統合）=====
        const claimedCount = (gameData.daily.medalsClaimedToday || []).length;
        
        // 🎯 タイトルを控えめに、小さく
        this.add.text(cardX + 14, cardY + 14, '🐾 きょうのおさんぽ', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',  // より小さく
            color: '#6D5847',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 1.5,
        }).setOrigin(0, 0.5);

        // メダル状況（右寄せ）
        this.add.text(cardX + cardW - 14, cardY + 14, `🏅 ${claimedCount}/3`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '12px',
            color: claimedCount === 3 ? '#DAA520' : '#8B7355',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 1.5,
        }).setOrigin(1, 0.5);

        // ===== 3つのミッション表示（よりコンパクトに） =====
        const missionStartY = cardY + 30;
        const missionH = 22;  // より低く
        const missionGap = 3;  // より詰めて

        missions.forEach((mission, index) => {
            const y = missionStartY + index * (missionH + missionGap);
            this.createMissionRow(cardX + 10, y, cardW - 20, missionH, mission, index);
        });
    }

    // ===== ミッション1行を作成（コンパクト版） =====
    createMissionRow(x, y, w, h, mission, index) {
        const isClaimed = DailyManager.isMedalClaimed(gameData, mission.id);
        const canClaim = mission.completed && !isClaimed;

        // 🎯 行背景（より控えめに）
        const rowBg = this.add.graphics();
        if (isClaimed) {
            rowBg.fillStyle(0xFFD700, 0.12);
        } else if (mission.completed) {
            rowBg.fillStyle(0x4CAF50, 0.15);
        } else {
            rowBg.fillStyle(0x8B7355, 0.08);
        }
        rowBg.fillRoundedRect(x, y, w, h, 6);

        // 🎯 進捗表示の改善：アイコン化＆強弱
        const statusX = x + 22;
        
        if (isClaimed) {
            // 獲得済み：メダルアイコン
            this.add.text(statusX, y + h / 2, '🏅', {
                fontSize: '12px',
            }).setOrigin(0.5);
        } else if (mission.completed) {
            // 達成済み：チェックマーク（大きく目立つ）
            this.add.text(statusX, y + h / 2, '✓', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '13px',
                color: '#4CAF50',
                fontStyle: 'bold',
            }).setOrigin(0.5);
        } else {
            // 🎯 未達成：進捗バー風のビジュアル表示
            const progress = mission.progress;
            const target = mission.target;
            const ratio = Math.min(progress / target, 1);
            
            // ミニプログレスバー
            const barW = 26;
            const barH = 6;
            const barBg = this.add.graphics();
            barBg.fillStyle(0x8B7355, 0.2);
            barBg.fillRoundedRect(statusX - barW/2, y + h/2 - barH/2, barW, barH, 3);
            barBg.fillStyle(0x4CAF50, 0.8);
            barBg.fillRoundedRect(statusX - barW/2, y + h/2 - barH/2, barW * ratio, barH, 3);
            
            // 数字（バーの下に小さく）
            this.add.text(statusX, y + h/2 + 7, `${progress}/${target}`, {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '8px',
                color: '#8B7355',
            }).setOrigin(0.5);
        }

        // ミッション名（文字で表示 - 桜井イズム）
        const nameX = x + 44;
        const nameColor = isClaimed ? '#A89888' : (mission.completed ? '#4CAF50' : '#5D4037');
        const nameStyle = isClaimed ? 'normal' : 'bold';
        
        this.add.text(nameX, y + h / 2, mission.name, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '11px',  // より小さく
            color: nameColor,
            fontStyle: nameStyle,
            stroke: '#FFFFFF',
            strokeThickness: 1,
        }).setOrigin(0, 0.5);

        // 獲得ボタン（達成済み＆未獲得の場合）
        if (canClaim) {
            const btnW = 50;  // より小さく
            const btnH = 18;
            const btnX = x + w - btnW - 4;
            const btnY = y + (h - btnH) / 2;

            const btn = this.add.container(btnX + btnW / 2, btnY + btnH / 2);

            // ボタン背景
            const btnBg = this.add.graphics();
            btnBg.fillStyle(0xFFD700, 1);
            btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
            btnBg.fillStyle(0xFFEC8B, 0.5);
            btnBg.fillRoundedRect(-btnW / 2 + 2, -btnH / 2 + 2, btnW - 4, btnH * 0.4, 5);
            btn.add(btnBg);

            const btnText = this.add.text(0, 0, 'GET!', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '10px',
                color: '#5D4037',
                fontStyle: 'bold',
            }).setOrigin(0.5);
            btn.add(btnText);

            btn.setSize(btnW, btnH);
            btn.setInteractive({ useHandCursor: true });

            this.tweens.add({
                targets: btn,
                scale: { from: 1, to: 1.08 },
                duration: 350,
                yoyo: true,
                repeat: -1,
            });

            btn.on('pointerdown', () => {
                this.tweens.add({ targets: btn, scale: 0.9, duration: 50 });
                HapticManager.impact('Light');
            });

            btn.on('pointerup', () => {
                const result = DailyManager.awardMedalForMission(gameData, mission.id);
                if (result.awarded) {
                    this.scene.start('MedalCelebrationScene', {
                        totalMedals: result.totalMedals,
                        newCostumes: result.newCostumes,
                        stampCount: result.stampCount,
                        returnScene: 'MainMenuScene',
                    });
                }
            });
        }
    }

    createMenuButtons() {
        const { width, height } = this.scale;
        
        // 🎯 レイアウト：createDailyMissionsで計算したゾーン中心を使用
        const centerY = this.mainZoneCenterY || height * 0.46;
        const subY = this.subZoneCenterY || height * 0.80;  // フッターアイコン位置

        // メインボタン（サイズ維持、存在感強調）
        const mainBtnW = (width - 60) / 2;  // 少し広く
        const mainBtnH = 105;  // 少し高く
        const mainGap = 12;

        // 🎯 おさんぽ（緑を芝生と差別化：より青みがかったティール系に）
        const osanpoBtn = this.createMainMenuButton(
            width / 2 - mainBtnW / 2 - mainGap / 2,
            centerY - 12,
            mainBtnW,
            mainBtnH,
            'menu_osanpo',
            'おさんぽ',
            0x26A69A,  // ティール系の緑（芝生の黄緑と差別化）
            0x00897B,  // 下部グラデーション色
            () => {
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => this.scene.start('SelectScene'));
            }
        );
        this.menuButtons.osanpo = osanpoBtn;

        // おさんぽの説明テキスト
        this.add.text(width / 2 - mainBtnW / 2 - mainGap / 2, centerY - 12 + mainBtnH / 2 + 14, '全100ステージ', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '11px',
            color: '#1B5E50',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        // エンドレス（オレンジ系を維持）
        this.createMainMenuButton(
            width / 2 + mainBtnW / 2 + mainGap / 2,
            centerY - 12,
            mainBtnW,
            mainBtnH,
            'menu_endless',
            'エンドレス',
            0xFF7043,  // 暖かみのあるオレンジ
            0xE64A19,  // 下部グラデーション色
            () => {
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => this.scene.start('GameScene', { mode: 'challenge' }));
            }
        );

        // エンドレスの説明テキスト
        this.add.text(width / 2 + mainBtnW / 2 + mainGap / 2, centerY - 12 + mainBtnH / 2 + 14, '1ミスでおわり！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '11px',
            color: '#BF360C',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        // 🎯 サブボタン（押しやすいサイズに）
        const subBtnSize = 62;  // 押しやすい大きさ
        const subGap = 10;
        
        const subButtons = [
            { iconKey: 'menu_erabu', label: 'えらぶ', scene: 'DogSelectScene', color: 0xFFB6C1 },
            { iconKey: 'menu_zukan', label: 'ずかん', scene: 'ZukanScene', color: 0xADD8E6 },
            { iconKey: 'menu_kisekae', label: 'きせかえ', scene: 'CustomizeScene', color: 0xDDA0DD },
            { iconKey: 'menu_shop', label: 'ショップ', scene: 'ShopScene', color: 0xFFD700 },
        ];

        const totalSubWidth = subButtons.length * subBtnSize + (subButtons.length - 1) * subGap;
        const subStartX = (width - totalSubWidth) / 2 + subBtnSize / 2;

        subButtons.forEach((btnData, i) => {
            const x = subStartX + i * (subBtnSize + subGap);
            const btn = this.createSubMenuButton(x, subY, subBtnSize, btnData);
            // ★ チュートリアル用にボタン参照を保存
            if (btnData.scene === 'DogSelectScene') {
                this.menuButtons.erabu = btn;
                this.menuButtons.erabuPos = { x, y: subY };
            }
            if (btnData.scene === 'CustomizeScene') {
                this.menuButtons.kisekae = btn;
                this.menuButtons.kisekaePos = { x, y: subY };
            }
        });
    }

    // 🎯 メインボタン（立体感強化版）
    createMainMenuButton(x, y, w, h, iconKey, label, color, colorDark, callback) {
        const btn = this.add.container(x, y);

        // 🎯 ドロップシャドウ強化（複数レイヤーで深みを出す）
        const shadowOuter = this.add.graphics();
        shadowOuter.fillStyle(0x000000, 0.08);
        shadowOuter.fillRoundedRect(-w / 2 + 6, -h / 2 + 10, w, h, 18);
        btn.add(shadowOuter);
        
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.18);
        shadow.fillRoundedRect(-w / 2 + 3, -h / 2 + 6, w, h, 16);
        btn.add(shadow);

        // 🎯 背景（グラデーション風：下部を暗く）
        const bg = this.add.graphics();
        // 下半分（暗い色）
        bg.fillStyle(colorDark, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
        // 上半分（明るい色でオーバーレイ）
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h * 0.65, { tl: 18, tr: 18, bl: 0, br: 0 });
        
        // 🎯 光沢効果（上部のハイライト）
        bg.fillStyle(0xFFFFFF, 0.35);
        bg.fillRoundedRect(-w / 2 + 8, -h / 2 + 5, w - 16, h * 0.25, 12);
        // 追加の光沢（より鮮やかに）
        bg.fillStyle(0xFFFFFF, 0.15);
        bg.fillRoundedRect(-w / 2 + 4, -h / 2 + 2, w - 8, h * 0.4, 14);
        
        // 🎯 縁取り（白い縁でポップに）
        bg.lineStyle(3.5, 0xFFFFFF, 0.6);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);
        btn.add(bg);

        // アイコン（画像アイコン使用）
        const icon = this.add.image(0, -18, iconKey);
        const iconScale = (h * 0.42) / Math.max(icon.width, icon.height);
        icon.setScale(iconScale);
        btn.add(icon);

        // ラベル（桜井イズム: buttonスタイル準拠）
        const labelText = this.add.text(0, 26, label, {
            ...TEXT_STYLE.button,
            fontSize: '21px',
            stroke: '#00000066',
            strokeThickness: 4,
        }).setOrigin(0.5);
        btn.add(labelText);

        btn.setSize(w, h);
        btn.setInteractive({ useHandCursor: true });

        // フィードバック
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.06, duration: 100, ease: 'Back.easeOut' }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 100 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, y: y + 5, scale: 0.96, duration: 50 });
            HapticManager.impact('Light');
        });
        btn.on('pointerup', () => {
            this.tweens.add({
                targets: btn,
                y: y,
                scale: 1.05,
                duration: 100,
                ease: 'Back.easeOut',
                onComplete: () => this.tweens.add({ targets: btn, scale: 1, duration: 80 })
            });
            callback();
        });

        return btn;
    }

    // 🎯 サブボタン（押しやすいサイズ）
    createSubMenuButton(x, y, size, data) {
        const btn = this.add.container(x, y);

        // 影
        const shadow = this.add.graphics();
        shadow.fillStyle(0x5D4037, 0.2);
        shadow.fillCircle(2, 3, size / 2);
        btn.add(shadow);

        // 背景
        const bg = this.add.graphics();
        bg.fillStyle(data.color, 1);
        bg.fillCircle(0, 0, size / 2);
        // ハイライト
        bg.fillStyle(0xFFFFFF, 0.35);
        bg.fillEllipse(0, -size / 6, size * 0.52, size * 0.28);
        // 縁取り
        bg.lineStyle(2.5, 0xFFFFFF, 0.55);
        bg.strokeCircle(0, 0, size / 2);
        btn.add(bg);

        // アイコン（画像アイコン使用）
        const icon = this.add.image(0, -2, data.iconKey);
        const iconScale = (size * 0.54) / Math.max(icon.width, icon.height);
        icon.setScale(iconScale);
        btn.add(icon);

        // ラベル
        const labelText = this.add.text(0, size / 2 + 13, data.label, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '11px',
            color: '#5D4037',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 2.5,
        }).setOrigin(0.5);
        btn.add(labelText);

        btn.setSize(size, size + 24);
        btn.setInteractive({ useHandCursor: true });

        // フィードバック
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.1, y: y - 2, duration: 80, ease: 'Back.easeOut' }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, y: y, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.92, duration: 40 });
            HapticManager.selection();
            AudioManager.playSfx(this, 'sfx_ui_tap');
        });
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, scale: 1, duration: 80 });
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start(data.scene));
        });

        return btn;
    }

    // ========================================
    // ★ チュートリアル機能（メインメニュー用）
    // ========================================
    startMenuTutorial() {
        this.tutorialStep = 0;
        this.showMenuTutorialStep();
    }

    showMenuTutorialStep() {
        const { width, height } = this.scale;
        const steps = [
            {
                text: 'ここがメインメニューだよ！',
                subText: 'いろんな遊び方ができるよ',
                highlightType: 'none'
            },
            {
                text: '「きょうのおさんぽ」を達成しよう！',
                subText: 'クリアするとおさんぽメダルがもらえるよ',
                highlightType: 'daily'
            },
            {
                text: '「おさんぽ」でステージに挑戦！',
                subText: '全100ステージあるよ',
                highlightType: 'osanpo'
            },
            {
                text: '「きせかえ」でおしゃれしよう！',
                subText: 'おさんぽメダルでこうかんできるよ',
                highlightType: 'kisekae'
            },
            {
                text: '「えらぶ」でワンコを変えよう！',
                subText: 'さっきゲットしたワンコを設定してみよう',
                highlightType: 'erabu'
            }
        ];

        if (this.tutorialStep >= steps.length) {
            // ★ メインメニュー説明完了：えらぶ画面で続きの誘導へ
            gameData.tutorial.inProgress = true;
            GameData.save(gameData);

            this.hideTutorialOverlay();
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                // 「えらぶ」画面へ（チュートリアル継続）
                this.scene.start('DogSelectScene', { tutorialMode: true });
            });
            return;
        }

        const step = steps[this.tutorialStep];
        this.showTutorialOverlay(step);
    }

    showTutorialOverlay(step) {
        const { width, height } = this.scale;
        
        // 既存のオーバーレイを削除
        this.hideTutorialOverlay();

        // オーバーレイコンテナ
        this.tutorialContainer = this.add.container(0, 0).setDepth(1000);

        // 半透明の黒背景
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, width, height);
        this.tutorialContainer.add(overlay);

        // ハイライト
        if (step.highlightType === 'osanpo' && this.menuButtons.osanpo) {
            this.highlightButton(this.menuButtons.osanpo);
        } else if (step.highlightType === 'erabu' && this.menuButtons.erabu) {
            this.highlightButtonCircle(this.menuButtons.erabuPos);
        } else if (step.highlightType === 'daily' && this.menuButtons.dailyCard) {
            this.highlightRect(this.menuButtons.dailyCard);
        } else if (step.highlightType === 'kisekae' && this.menuButtons.kisekae) {
            this.highlightButtonCircle(this.menuButtons.kisekaePos);
        }

        // 説明テキスト用の背景
        const textBgY = height * 0.78;
        const textBg = this.add.graphics();
        textBg.fillStyle(0xFFFFFF, 0.95);
        textBg.fillRoundedRect(30, textBgY - 50, width - 60, 120, 16);
        this.tutorialContainer.add(textBg);

        // メインテキスト
        const mainText = this.add.text(width / 2, textBgY - 15, step.text, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '22px',
            color: '#5D4037',
            fontStyle: 'bold',
            wordWrap: { width: width - 80 },
            align: 'center',
        }).setOrigin(0.5);
        this.tutorialContainer.add(mainText);

        // サブテキスト
        const subText = this.add.text(width / 2, textBgY + 18, step.subText, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '15px',
            color: '#8D6E63',
            wordWrap: { width: width - 80 },
            align: 'center',
        }).setOrigin(0.5);
        this.tutorialContainer.add(subText);

        // 「タップしてつづける」テキスト
        const tapText = this.add.text(width / 2, textBgY + 52, '▼ タップしてつづける', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#A1887F',
        }).setOrigin(0.5);
        this.tutorialContainer.add(tapText);

        // 点滅アニメーション
        this.tweens.add({
            targets: tapText,
            alpha: { from: 1, to: 0.4 },
            duration: 600,
            yoyo: true,
            repeat: -1,
        });

        // タップで次へ
        const hitArea = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        this.tutorialContainer.add(hitArea);

        hitArea.on('pointerdown', () => {
            HapticManager.selection();
            AudioManager.playSfx(this, 'sfx_ui_tap');
            this.tutorialStep++;
            this.showMenuTutorialStep();
        });
    }

    highlightButton(btn) {
        // ボタンをオーバーレイの前面に持ってくる
        const bounds = btn.getBounds();
        
        // 光るエフェクト
        const glow = this.add.graphics();
        glow.fillStyle(0xFFFFFF, 0.3);
        glow.fillRoundedRect(bounds.x - 10, bounds.y - 10, bounds.width + 20, bounds.height + 20, 20);
        this.tutorialContainer.add(glow);

        // パルスアニメーション
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.3, to: 0.6 },
            duration: 500,
            yoyo: true,
            repeat: -1,
        });
    }

    highlightButtonCircle(pos) {
        // 円形ボタン用のハイライト
        const glow = this.add.graphics();
        glow.fillStyle(0xFFFFFF, 0.3);
        glow.fillCircle(pos.x, pos.y, 45);
        this.tutorialContainer.add(glow);

        // パルスアニメーション
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.3, to: 0.6 },
            scaleX: { from: 1, to: 1.1 },
            scaleY: { from: 1, to: 1.1 },
            duration: 500,
            yoyo: true,
            repeat: -1,
        });
    }

    highlightRect(rect) {
        // 矩形カード用のハイライト
        const glow = this.add.graphics();
        glow.fillStyle(0xFFFFFF, 0.3);
        glow.fillRoundedRect(rect.x - 5, rect.y - 5, rect.w + 10, rect.h + 10, 18);
        glow.lineStyle(3, 0xFFD54F, 1);
        glow.strokeRoundedRect(rect.x - 5, rect.y - 5, rect.w + 10, rect.h + 10, 18);
        this.tutorialContainer.add(glow);

        // パルスアニメーション
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.3, to: 0.6 },
            duration: 500,
            yoyo: true,
            repeat: -1,
        });
    }

    hideTutorialOverlay() {
        if (this.tutorialContainer) {
            this.tutorialContainer.destroy();
            this.tutorialContainer = null;
        }
    }
}

// ========================================
// モード選択（旧・互換性のため残す）
// ========================================
class ModeSelectScene extends Phaser.Scene {
    constructor() { super({ key: 'ModeSelectScene' }); }

    create() {
        const { width, height } = this.scale;

        AudioManager.playBgm(this, 'bgm_select');

        // 背景
        this.add.rectangle(0, 0, width, height, PALETTE.sky).setOrigin(0);
        const ground = this.add.graphics();
        ground.fillStyle(PALETTE.ground, 1);
        ground.fillRect(0, height * 0.6, width, height * 0.4);

        // ヘッダー
        const headerY = SAFE.TOP + 32;
        const headerBg = this.add.graphics();
        headerBg.fillStyle(PALETTE.uiBg, 0.95);
        headerBg.fillRect(0, 0, width, headerY + 50);

        // 戻るボタン
        this.createBackButton(50, headerY);

        // タイトル
        this.add.text(width / 2, headerY, '🎮 モードをえらぶ', {
            ...TEXT_STYLE.heading,
            fontSize: '22px',
        }).setOrigin(0.5);

        // モード選択ボタン
        const centerY = height * 0.42;
        const btnW = width - 60;
        const btnH = 100;
        const gap = 20;

        // ========== おさんぽ（メイン）==========
        this.createModeButton(
            width / 2, centerY - btnH / 2 - gap / 2,
            btnW, btnH,
            '🎯 おさんぽ',
            '全100ステージ',
            0x4CAF50,  // 緑
            () => {
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => this.scene.start('SelectScene'));
            }
        );

        // ========== エンドレス（サブ）==========
        this.createModeButton(
            width / 2, centerY + btnH / 2 + gap / 2,
            btnW, btnH,
            '🔥 エンドレス',
            '⚠️ 1ミスでおわり！どこまでいける？',
            0xFF5722,  // オレンジ赤
            () => {
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => this.scene.start('GameScene', { mode: 'challenge' }));
            }
        );

        this.cameras.main.fadeIn(300);
    }

    createBackButton(x, y) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRoundedRect(-38, -16, 76, 32, 10);
        bg.lineStyle(2.5, DOG_TYPES[3].color, 1);
        bg.strokeRoundedRect(-38, -16, 76, 32, 10);

        // 桜井イズム: KeiFont + 縁取りで統一感
        const txt = this.add.text(0, 0, '← もどる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#5D4037',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(76, 32);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('TitleScene'));
        });

        return btn;
    }

    createModeButton(x, y, w, h, title, subtitle, color, callback) {
        const btn = this.add.container(x, y);

        // 影
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 20);
        btn.add(shadow);

        // 背景
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
        bg.lineStyle(4, 0xFFFFFF, 0.5);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
        btn.add(bg);

        // ハイライト
        const highlight = this.add.graphics();
        highlight.fillStyle(0xFFFFFF, 0.2);
        highlight.fillRoundedRect(-w / 2 + 10, -h / 2 + 5, w - 20, 20, 10);
        btn.add(highlight);

        // タイトル
        const titleText = this.add.text(0, -15, title, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '26px',
            color: '#FFFFFF',
            fontStyle: 'bold',
            stroke: Phaser.Display.Color.IntegerToColor(color).darken(30).color,
            strokeThickness: 3,
        }).setOrigin(0.5);
        btn.add(titleText);

        // サブタイトル
        const subText = this.add.text(0, 20, subtitle, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#FFFFFF',
            stroke: '#00000044',
            strokeThickness: 2,
        }).setOrigin(0.5);
        btn.add(subText);

        btn.setSize(w, h);
        btn.setInteractive({ useHandCursor: true });

        // フィードバック
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.03, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, y: y + 4, scale: 0.97, duration: 40 });
            HapticManager.impact('Light');
        });
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, y: y, scale: 1.05, duration: 80, ease: 'Back.easeOut' });
            callback();
        });

        // 登場アニメーション
        btn.setScale(0);
        this.tweens.add({
            targets: btn,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut',
            delay: title.includes('ステージ') ? 100 : 200,
        });

        return btn;
    }
}

// ========================================
// ステージセレクト（ノッチ対応版）
// ========================================
class SelectScene extends Phaser.Scene {
    constructor() { super({ key: 'SelectScene' }); this.page = 0; this.perPage = 12; }

    create() {
        const { width, height } = this.scale;

        AudioManager.playBgm(this, 'bgm_select');

        // セーフエリア計算
        const headerY = SAFE.TOP + 32;  // ノッチ回避
        const headerH = 56;

        // 背景画像（selectgamen.png）
        const bg = this.add.image(width / 2, height / 2, 'osanpo_select_bg');
        // 画面全体に合わせてスケーリング
        bg.setDisplaySize(width, height);

        // ヘッダー背景は削除（背景画像を活かす）

        // 戻るボタン（視認性良く！）
        this.createBackButton(50, headerY + 2);

        // タイトル（メインメニューと統一）
        this.add.text(width / 2, headerY + 2, '🐾 おさんぽ', {
            ...TEXT_STYLE.heading,
            fontSize: '22px',
        }).setOrigin(0.5);

        this.createGrid();
        this.createPagination();

        this.cameras.main.fadeIn(300);
    }

    createBackButton(x, y) {
        const btn = this.add.container(x, y);

        // 背景（見やすい明るい色に！）
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);  // 白背景で視認性アップ
        bg.fillRoundedRect(-38, -16, 76, 32, 10);
        bg.lineStyle(2.5, DOG_TYPES[3].color, 1);  // 茶色の枠線
        bg.strokeRoundedRect(-38, -16, 76, 32, 10);

        // 桜井イズム: KeiFont + 縁取りで統一感
        const txt = this.add.text(0, 0, '← もどる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#5D4037',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(76, 32);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('MainMenuScene'));
        });

        return btn;
    }

    createGrid() {
        const { width, height } = this.scale;
        const cols = 3, cardW = 90, cardH = 100, gap = 10;
        const totalW = cols * cardW + (cols - 1) * gap;
        const startX = (width - totalW) / 2;  // 中央揃え

        // ノッチ回避：グリッド開始位置を調整
        const headerBottom = SAFE.TOP + 90;
        const footerTop = height - SAFE.BOTTOM - 55;  // ページネーション用スペース
        const availableH = footerTop - headerBottom;

        // グリッドを利用可能エリアの中央に配置
        const rows = Math.ceil(this.perPage / cols);
        const totalGridH = rows * cardH + (rows - 1) * gap;
        const startY = headerBottom + (availableH - totalGridH) / 2 + cardH / 2;

        const start = this.page * this.perPage;
        const end = Math.min(start + this.perPage, LEVELS.length);

        for (let i = start; i < end; i++) {
            const li = i - start;
            const col = li % cols, row = Math.floor(li / cols);
            const x = startX + col * (cardW + gap) + cardW / 2;
            const y = startY + row * (cardH + gap);

            this.createCard(x, y, cardW, cardH, i);
        }
    }

    createCard(x, y, w, h, levelIndex) {
        const card = this.add.container(x, y);
        const level = LEVELS[levelIndex];
        const stageId = levelIndex + 1;
        const isCleared = loadClearedStages().includes(stageId);

        // 影
        const shadow = this.add.graphics();
        shadow.fillStyle(0x888888, 0.2);
        shadow.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
        shadow.x = 3;
        shadow.y = 3;

        // 背景（クリア済みは金色系）
        const bg = this.add.graphics();
        if (isCleared) {
            bg.fillStyle(0xFFFAE6, 1);  // 淡いゴールド
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            bg.lineStyle(2, 0xFFD700, 1);  // 金色の枠
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
        } else {
            bg.fillStyle(PALETTE.cellBg, 1);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            bg.lineStyle(2, PALETTE.cellOutline, 1);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
        }

        // 番号
        const num = this.add.text(0, -h / 2 + 16, `${levelIndex + 1}`, {
            fontSize: '16px',
            fontStyle: 'bold',
            color: PALETTE.textDark,
        }).setOrigin(0.5);

        // ミニプレビュー
        const preview = this.createPreview(level, 42);

        card.add([shadow, bg, num, preview]);

        // クリア済みマーク（★）
        if (isCleared) {
            const clearMark = this.add.text(w / 2 - 12, -h / 2 + 8, '★', {
                fontSize: '18px',
                color: '#FFD700',
            }).setOrigin(0.5);
            card.add(clearMark);
        }
        card.setSize(w, h);
        card.setInteractive({ useHandCursor: true });

        card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.08, y: y - 3, duration: 80 }));
        card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, y: y, duration: 80 }));
        card.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('GameScene', { mode: 'normal', levelIndex }));
        });

        // 登場アニメ
        card.setScale(0);
        this.tweens.add({
            targets: card,
            scale: 1,
            duration: 200,
            delay: (levelIndex % this.perPage) * 30,
            ease: 'Back.easeOut'
        });

        return card;
    }

    createPreview(level, size) {
        const container = this.add.container(0, 15);
        const cell = size / 6;
        const off = -size / 2;
        const selectedDogs = gameData.selectedDogs;

        const bg = this.add.graphics();
        bg.fillStyle(PALETTE.grass, 0.3);
        bg.fillRoundedRect(off - 2, off - 2, size + 4, size + 4, 4);
        container.add(bg);

        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                const cx = off + c * cell + cell / 2;
                const cy = off + r * cell + cell / 2;
                const snack = level.snacks.find(s => s.row === r && s.col === c);

                const dot = this.add.graphics();
                if (snack) {
                    // 選択中の犬種にマッピング
                    const dogType = selectedDogs[(snack.type - 1) % selectedDogs.length];
                    const color = DOG_TYPES[dogType]?.color || 0xDEB887;
                    dot.fillStyle(color, 1);
                    dot.fillCircle(cx, cy, cell * 0.35);
                    dot.lineStyle(1, PALETTE.cellOutline, 1);
                    dot.strokeCircle(cx, cy, cell * 0.35);
                } else {
                    dot.fillStyle(PALETTE.cellBg, 1);
                    dot.fillCircle(cx, cy, cell * 0.2);
                }
                container.add(dot);
            }
        }
        return container;
    }

    createPagination() {
        const { width, height } = this.scale;
        const total = Math.ceil(LEVELS.length / this.perPage);

        // ノッチ回避：下部セーフエリアを考慮
        const footerY = height - SAFE.BOTTOM - 30;

        // ページ番号（視認性良く・背景付き）
        const pageBg = this.add.graphics();
        pageBg.fillStyle(0xFFFFFF, 0.9);
        pageBg.fillRoundedRect(width / 2 - 70, footerY - 16, 140, 32, 8);

        this.add.text(width / 2, footerY, `${this.page + 1} / ${total}`, {
            fontSize: '16px',
            fontStyle: 'bold',
            color: PALETTE.textDark
        }).setOrigin(0.5);

        // 前へボタン
        if (this.page > 0) {
            const prevBtn = this.add.container(width / 2 - 50, footerY);
            const prevBg = this.add.graphics();
            prevBg.fillStyle(DOG_TYPES[2].color, 1);
            prevBg.fillCircle(0, 0, 14);
            const prevTxt = this.add.text(0, 0, '◀', {
                fontSize: '14px', color: '#FFFFFF'
            }).setOrigin(0.5);
            prevBtn.add([prevBg, prevTxt]);
            prevBtn.setSize(28, 28);
            prevBtn.setInteractive({ useHandCursor: true });
            prevBtn.on('pointerover', () => this.tweens.add({ targets: prevBtn, scale: 1.15, duration: 80 }));
            prevBtn.on('pointerout', () => this.tweens.add({ targets: prevBtn, scale: 1, duration: 80 }));
            prevBtn.on('pointerup', () => { this.page--; this.scene.restart(); });
        }

        // 次へボタン
        if (this.page < total - 1) {
            const nextBtn = this.add.container(width / 2 + 50, footerY);
            const nextBg = this.add.graphics();
            nextBg.fillStyle(DOG_TYPES[1].color, 1);
            nextBg.fillCircle(0, 0, 14);
            const nextTxt = this.add.text(0, 0, '▶', {
                fontSize: '14px', color: '#FFFFFF'
            }).setOrigin(0.5);
            nextBtn.add([nextBg, nextTxt]);
            nextBtn.setSize(28, 28);
            nextBtn.setInteractive({ useHandCursor: true });
            nextBtn.on('pointerover', () => this.tweens.add({ targets: nextBtn, scale: 1.15, duration: 80 }));
            nextBtn.on('pointerout', () => this.tweens.add({ targets: nextBtn, scale: 1, duration: 80 }));
            nextBtn.on('pointerup', () => { this.page++; this.scene.restart(); });
        }
    }
}

// ========================================
// ゲームシーン（DOG_TYPESベース・ゴールデン対応）
// ========================================
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    init(data) {
        this.mode = data.mode || 'normal';
        this.lvIndex = data.levelIndex || 0;
        this.chalScore = data.challengeScore || 0;
        this.hasGolden = false;
        this.existingTypes = [];
        // ★ チュートリアルモード
        this.tutorialMode = data.tutorialMode || false;
        this.tutorialStep = 0;
        this.tutorialOverlay = null;
        this.tutorialContainer = null;
    }

    create() {
        const { width, height } = this.scale;

        const bgmKey = this.mode === 'challenge' ? 'bgm_challenge' : 'bgm_story';
        AudioManager.playBgm(this, bgmKey);

        // 🆕 エンドレスモード挑戦時のミッション進捗更新（最初のステージのみ）
        if (this.mode === 'challenge' && this.chalScore === 0) {
            DailyManager.updateProgress(gameData, 'challenge_try');
        }

        this.createBackground();
        this.loadLevel();
        this.createGrid();
        this.createUI();
        this.setupInput();
        this.playEntryAnim();

        this.cameras.main.fadeIn(300);

        // ✨ でんせつワンコ遭遇演出
        if (this.legendEncounter) {
            this.time.delayedCall(500, () => {
                this.showLegendEncounterEffect();
            });
        }

        // ★ チュートリアルモードの場合、説明を表示
        if (this.tutorialMode) {
            this.time.delayedCall(800, () => {
                this.startTutorial();
            });
        }
    }

    // ✨ でんせつワンコ遭遇演出
    showLegendEncounterEffect() {
        const { width, height } = this.scale;
        
        // 一時的に入力を無効化
        this.input.enabled = false;
        
        // オーバーレイ
        const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.7)
            .setDepth(1000);
        
        // キラキラエフェクト
        for (let i = 0; i < 20; i++) {
            const star = this.add.text(
                Phaser.Math.Between(50, width - 50),
                Phaser.Math.Between(100, height - 100),
                '✨',
                { fontSize: Phaser.Math.Between(20, 40) + 'px' }
            ).setOrigin(0.5).setDepth(1001).setAlpha(0);
            
            this.tweens.add({
                targets: star,
                alpha: { from: 0, to: 1 },
                scale: { from: 0, to: 1.2 },
                duration: 500,
                delay: i * 50,
                yoyo: true,
                onComplete: () => star.destroy()
            });
        }
        
        // 遭遇メッセージ
        const msgText = this.add.text(width/2, height * 0.4, this.legendEncounter.encounterMessage, {
            fontFamily: 'KeiFont',
            fontSize: '36px',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(1002).setAlpha(0).setScale(0.5);
        
        this.tweens.add({
            targets: msgText,
            alpha: 1,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
        
        // でんせつワンコ名
        const legendName = this.add.text(width/2, height * 0.55, `【${this.legendEncounter.name}】`, {
            fontFamily: 'KeiFont',
            fontSize: '28px',
            color: '#FFFFFF',
            stroke: '#8B0000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5).setDepth(1002).setAlpha(0);
        
        this.tweens.add({
            targets: legendName,
            alpha: 1,
            duration: 500,
            delay: 300
        });
        
        // 説明
        const descText = this.add.text(width/2, height * 0.65, 'パズルをクリアして\nなかまにしよう！', {
            fontFamily: 'KeiFont',
            fontSize: '22px',
            color: '#FFFFFF',
            stroke: '#000',
            strokeThickness: 2,
            align: 'center'
        }).setOrigin(0.5).setDepth(1002).setAlpha(0);
        
        this.tweens.add({
            targets: descText,
            alpha: 1,
            duration: 500,
            delay: 600
        });
        
        // 自動で閉じる
        this.time.delayedCall(2500, () => {
            this.tweens.add({
                targets: [overlay, msgText, legendName, descText],
                alpha: 0,
                duration: 300,
                onComplete: () => {
                    overlay.destroy();
                    msgText.destroy();
                    legendName.destroy();
                    descText.destroy();
                    this.input.enabled = true;
                }
            });
        });
    }

    createBackground() {
        const { width, height } = this.scale;
        const theme = THEMES[gameData.customize.theme] || THEMES.default;

        // ノッチ回避を考慮した位置計算
        const headerH = SAFE.TOP + 60;
        const footerTop = height - SAFE.BOTTOM - 60;

        // 🌍 背景画像があれば使用、なければフォールバック
        if (theme.image && this.textures.exists(theme.image)) {
            const bg = this.add.image(width / 2, height / 2, theme.image);
            // 画面にフィット（縦横比維持してカバー）
            const scaleX = width / bg.width;
            const scaleY = height / bg.height;
            const scale = Math.max(scaleX, scaleY);
            bg.setScale(scale);
            bg.setDepth(-1);  // 最背面に
        } else {
            // フォールバック: 旧来のグラデーション
            // 空
            this.add.rectangle(0, 0, width, height, theme.sky).setOrigin(0);

            // 地面（ヘッダー下から）
            const ground = this.add.graphics();
            ground.fillStyle(theme.ground, 1);
            ground.fillRect(0, headerH, width, height - headerH);
        }

        // 芝生マット（グリッドと同じ計算で中央配置・上下左右の隙間を均等に）
        const hdrH = SAFE.TOP + 60;
        const ftrH = SAFE.BOTTOM + 60;
        const pad = 20;
        const availH = height - hdrH - ftrH - pad;
        const availW = width - pad * 2;
        const gridSz = Math.min(availW, availH);
        const gridX = (width - gridSz) / 2;
        const gridY = hdrH + (availH - gridSz) / 2;
        
        // グリッドの周りに均等なマージンを持たせる
        const grassMargin = 8;
        const grassX = gridX - grassMargin;
        const grassY = gridY - grassMargin;
        const grassW = gridSz + grassMargin * 2;
        const grassH = gridSz + grassMargin * 2;
        
        const grassMat = this.add.graphics();
        grassMat.fillStyle(PALETTE.grass, 0.85);  // 背景画像が見えるよう少し透過
        grassMat.fillRoundedRect(grassX, grassY, grassW, grassH, 14);
        grassMat.lineStyle(2, PALETTE.grassDark, 1);
        grassMat.strokeRoundedRect(grassX, grassY, grassW, grassH, 14);
    }

    loadLevel() {
        if (this.mode === 'challenge') {
            if (typeof LevelGenerator !== 'undefined') {
                const gen = new LevelGenerator(6);
                const diff = Math.min(3, 1 + Math.floor(this.chalScore / 5));
                this.level = gen.generate({ difficulty: diff, maxAttempts: 50 }) || LEVELS[Phaser.Math.Between(0, LEVELS.length - 1)];
            } else {
                this.level = LEVELS[Phaser.Math.Between(0, LEVELS.length - 1)];
            }
        } else {
            this.level = LEVELS[this.lvIndex];
        }

        // ✨ でんせつワンコ遭遇判定（チャレンジモード専用！）
        this.legendEncounter = null;
        this.hasGolden = false;
        
        if (this.mode === 'challenge') {
            const encounter = this.checkLegendEncounter();
            if (encounter) {
                this.legendEncounter = encounter;
                console.log(`✨ でんせつワンコ遭遇！ ${encounter.name}`);
            }
        }

        // グリッド初期化
        this.grid = [];
        for (let r = 0; r < 6; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 6; c++) {
                this.grid[r][c] = { type: 0, isEnd: false, pathType: 0 };
            }
        }

        // レベルのsnacksをコピー
        const snacks = JSON.parse(JSON.stringify(this.level.snacks));

        // 選択された犬種にマッピング
        const selectedDogs = gameData.selectedDogs;
        snacks.forEach(s => {
            s.type = selectedDogs[(s.type - 1) % selectedDogs.length];
        });

        // ✨ でんせつワンコ遭遇時：ランダムなペアの1つを伝説ワンコに置き換え
        if (this.legendEncounter) {
            // 同じtypeのペアを探す
            const typeGroups = {};
            snacks.forEach((s, idx) => {
                if (!typeGroups[s.type]) typeGroups[s.type] = [];
                typeGroups[s.type].push(idx);
            });
            
            // ペアになっているタイプからランダムに選択
            const pairedTypes = Object.keys(typeGroups).filter(t => typeGroups[t].length >= 2);
            if (pairedTypes.length > 0) {
                const targetType = parseInt(pairedTypes[Math.floor(Math.random() * pairedTypes.length)]);
                const targetIndices = typeGroups[targetType];
                
                // このペアの両方を伝説ワンコに置き換え
                targetIndices.forEach(idx => {
                    snacks[idx].type = this.legendEncounter.id;
                    snacks[idx].isLegend = true;
                });
                
                this.legendTargetType = this.legendEncounter.id;
                console.log(`✨ でんせつワンコをマスに配置: ${this.legendEncounter.name}`);
            }
        }

        // 存在するタイプを記録
        this.existingTypes = [...new Set(snacks.map(s => s.type))];

        // グリッドに配置
        snacks.forEach(s => {
            this.grid[s.row][s.col] = { type: s.type, isEnd: true, pathType: s.type, isLegend: s.isLegend };
        });
        this.levelSnacks = snacks;

        // パスとトレイル初期化（存在するタイプのみ）
        this.paths = {};
        this.trails = {};
        this.existingTypes.forEach(t => {
            this.paths[t] = [];
            this.trails[t] = [];
        });

        this.drawing = false;
        this.curType = null;
        this.lastCell = null;
    }

    // ✨ でんせつワンコ遭遇判定（チャレンジモード専用）
    checkLegendEncounter() {
        const selectedDogs = gameData.selectedDogs || [];
        const equippedCostume = gameData.equippedCostumes?.hat || null;
        
        // すべての伝説ワンコをチェック
        for (const legendId of Object.keys(LEGEND_ENCOUNTERS)) {
            const legend = LEGEND_ENCOUNTERS[legendId];
            
            // すでに解放済みならスキップ
            if (GameData.isDogUnlocked(gameData, legend.id)) {
                continue;
            }
            
            // 条件チェック
            let conditionMet = false;
            
            if (legend.requiredDogId !== null) {
                // 特定の犬を連れている必要がある
                conditionMet = selectedDogs.includes(legend.requiredDogId);
            } else if (legend.requiredCostume !== null) {
                // 特定の衣装を装着している必要がある
                conditionMet = equippedCostume === legend.requiredCostume;
            } else {
                // 条件なし（ゴリラ等）
                conditionMet = true;
            }
            
            if (!conditionMet) continue;
            
            // 確率判定
            if (Math.random() < legend.probability) {
                return legend;
            }
        }
        
        return null;
    }

    createGrid() {
        const { width, height } = this.scale;
        // ノッチ回避：createUIと同じ値を使用
        const hdrH = SAFE.TOP + 60;
        const ftrH = SAFE.BOTTOM + 60;
        const pad = 20;
        const availH = height - hdrH - ftrH - pad;
        const availW = width - pad * 2;
        const gridSz = Math.min(availW, availH);

        this.cellSz = (gridSz - CONFIG.CELL_PADDING * 7) / 6;
        this.gridX = (width - gridSz) / 2 + CONFIG.CELL_PADDING;
        this.gridY = hdrH + (availH - gridSz) / 2 + CONFIG.CELL_PADDING;

        // セル
        this.cellCon = this.add.container(0, 0);
        this.cells = [];

        for (let r = 0; r < 6; r++) {
            this.cells[r] = [];
            for (let c = 0; c < 6; c++) {
                const x = this.gridX + c * (this.cellSz + CONFIG.CELL_PADDING);
                const y = this.gridY + r * (this.cellSz + CONFIG.CELL_PADDING);

                const cell = this.add.container(x, y);

                // マス画像を使用
                const bg = this.add.image(this.cellSz / 2, this.cellSz / 2, 'masu');
                bg.setDisplaySize(this.cellSz, this.cellSz);

                const fill = this.add.graphics();

                cell.add([bg, fill]);
                cell.setData('fill', fill);
                cell.setData('bg', bg);
                this.cells[r][c] = cell;
                this.cellCon.add(cell);
            }
        }

        // トレイル
        this.trailCon = this.add.container(0, 0);

        // 犬顔アイコン（DogFaceRenderer使用）
        this.dogCon = this.add.container(0, 0);
        this.dogIcons = {};

        this.levelSnacks.forEach(s => {
            const x = this.gridX + s.col * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
            const y = this.gridY + s.row * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;

            const dogFace = DogFaceRenderer.draw(this, x, y, s.type, this.cellSz * 0.4, 'neutral');
            this.dogCon.add(dogFace);
            this.dogIcons[`${s.row},${s.col}`] = { container: dogFace, type: s.type };
            
            // ✨ でんせつワンコはキラキラエフェクト追加！
            if (LEGEND_ENCOUNTERS[s.type]) {
                this.addLegendarySparkle(dogFace, this.cellSz * 0.4);
            }
        });
    }
    
    // ✨ でんせつワンコ用キラキラエフェクト（ゲーム画面用）
    addLegendarySparkle(container, size) {
        const sparkleSize = Math.max(8, size * 0.25);
        const sparklePositions = [
            { x: -size * 0.6, y: -size * 0.5 },
            { x: size * 0.6, y: -size * 0.4 },
            { x: -size * 0.5, y: size * 0.5 },
            { x: size * 0.5, y: size * 0.6 },
            { x: 0, y: -size * 0.7 },
        ];
        
        sparklePositions.forEach((pos, i) => {
            const sparkle = this.add.text(pos.x, pos.y, '✦', {
                fontSize: `${sparkleSize}px`,
                color: '#FFD700',
            }).setOrigin(0.5).setAlpha(0);
            container.add(sparkle);
            
            // キラキラアニメーション（ずらして開始）
            this.tweens.add({
                targets: sparkle,
                alpha: { from: 0, to: 1 },
                scale: { from: 0.5, to: 1.3 },
                duration: 800,
                delay: i * 200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
    }

    playEntryAnim() {
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                const cell = this.cells[r][c];
                const origY = cell.y;
                cell.y = origY - 40;
                cell.alpha = 0;

                this.tweens.add({
                    targets: cell,
                    y: origY,
                    alpha: 1,
                    duration: 250,
                    delay: (r + c) * 20,
                    ease: 'Back.easeOut'
                });
            }
        }

        this.dogCon.list.forEach((dogIcon, i) => {
            const originalScale = dogIcon.scaleX; // 元のスケールを保存
            dogIcon.setScale(0);
            this.tweens.add({
                targets: dogIcon,
                scaleX: originalScale,
                scaleY: originalScale,
                duration: 300,
                delay: 280 + i * 35,
                ease: 'Back.easeOut'
            });
        });
    }

    createUI() {
        const { width, height } = this.scale;

        // ノッチ回避を考慮した位置計算
        const headerY = SAFE.TOP + 30;  // ヘッダー中心Y
        const headerH = SAFE.TOP + 60;  // ヘッダー高さ
        const footerY = height - SAFE.BOTTOM - 37;  // フッター中心Y（ボタン大型化対応）
        const footerTop = height - SAFE.BOTTOM - 75;  // フッター上端（ボタン大型化対応）

        // ヘッダー背景（ノッチ回避）
        const header = this.add.graphics();
        header.fillStyle(PALETTE.uiBg, 1);
        header.fillRect(0, 0, width, headerH);
        header.lineStyle(2, PALETTE.uiOutline, 1);
        header.lineBetween(0, headerH, width, headerH);

        const hideBackButton = this.tutorialMode && !gameData.tutorial?.completed;

        if (!hideBackButton) {
            // 戻るボタン（視認性良く！）
            this.createBackBtn(48, headerY, () => {
                if (this.mode === 'challenge') {
                    this.showConfirm();
                } else {
                    this.cameras.main.fadeOut(300);
                    this.time.delayedCall(300, () => this.scene.start('SelectScene'));
                }
            });
        }

        // レベル表示（メインメニューと統一）
        const lvTxt = this.mode === 'challenge' ? `🔥 ステージ ${this.chalScore + 1}` : `🐾 ステージ ${this.lvIndex + 1}`;
        this.add.text(width / 2, headerY, lvTxt, {
            ...TEXT_STYLE.heading,
            fontSize: '22px',
        }).setOrigin(0.5);

        // 進捗表示（ヘッダー下）
        this.progContainer = this.add.container(width / 2, headerH + 10);
        this.updateProgress();

        // フッター背景（ノッチ回避）
        const footer = this.add.graphics();
        footer.fillStyle(PALETTE.uiBg, 1);
        footer.fillRect(0, footerTop, width, height - footerTop);
        footer.lineStyle(2, PALETTE.uiOutline, 1);
        footer.lineBetween(0, footerTop, width, footerTop);

        // リセットボタン（中央）
        this.createResetBtn(width / 2, footerY, () => this.resetLevel());

        // 🔊 BGMトグル（左側）- 音符アイコン
        this.bgmBtn = this.createToggleButton(60, footerY, 'icon_music', gameData.settings?.bgmEnabled !== false, (on) => {
            gameData.settings = gameData.settings || {};
            gameData.settings.bgmEnabled = on;
            AudioManager.setBgmEnabled(on);
            GameData.save(gameData);
        });

        // 🔈 SEトグル（右側）- スピーカーアイコン
        this.seBtn = this.createToggleButton(width - 60, footerY, 'icon_sound', gameData.settings?.seEnabled !== false, (on) => {
            gameData.settings = gameData.settings || {};
            gameData.settings.seEnabled = on;
            AudioManager.setSeEnabled(on);
            GameData.save(gameData);
        });
    }

    // 戻るボタン（メインメニューと統一スタイル！）
    createBackBtn(x, y, cb) {
        const btn = this.add.container(x, y);

        // 背景（白背景 + 角丸 + 茶色枠線でメインメニューと統一）
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRoundedRect(-38, -16, 76, 32, 10);
        bg.lineStyle(2.5, DOG_TYPES[3].color, 1);
        bg.strokeRoundedRect(-38, -16, 76, 32, 10);

        // 桜井イズム: KeiFont + 縁取りで統一感
        const txt = this.add.text(0, 0, '← もどる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#5D4037',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(76, 32);
        btn.setInteractive({ useHandCursor: true });

        // 🎯 桜井イズム：ボタンの心地よいフィードバック
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.92, duration: 40 });
            HapticManager.impact('Light');
        });
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, scale: 1, duration: 80 });
            AudioManager.playSfx(this, 'sfx_ui_tap');
            cb();
        });

        return btn;
    }

    // リセットボタン（視認性重視！）
    createResetBtn(x, y, cb) {
        const btn = this.add.container(x, y);
        const btnSize = 60;  // 🎯 視認性向上: 60x60px

        // 背景（白で視認性アップ）
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 15);
        bg.lineStyle(2, 0x666666, 1);
        bg.strokeRoundedRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 15);

        // リセットアイコン（画像）
        const icon = this.add.image(0, 0, 'icon_refresh');
        const iconScale = (btnSize * 0.6) / Math.max(icon.width, icon.height);
        icon.setScale(iconScale);

        btn.add([bg, icon]);
        btn.setSize(btnSize, btnSize);
        btn.setInteractive({ useHandCursor: true });

        // 🎯 桜井イズム：リセットは特別なフィードバック（回転！）
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.1, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.88, duration: 40 });
            HapticManager.impact('Medium');
        });
        btn.on('pointerup', () => {
            // くるっと回転してリセット感
            this.tweens.add({ 
                targets: icon, 
                rotation: -Math.PI * 2, 
                duration: 300,
                ease: 'Cubic.easeOut',
                onComplete: () => { icon.rotation = 0; }
            });
            this.tweens.add({ targets: btn, scale: 1, duration: 80 });
            AudioManager.playSfx(this, 'sfx_reset');
            cb();
        });

        return btn;
    }

    createToggleButton(x, y, iconKey, isOn, cb) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        const updateBg = (on) => {
            bg.clear();
            // 視認性アップ：ONは緑、OFFはグレー（枠線付き）
            bg.fillStyle(on ? 0x4CAF50 : 0x888888, 1);
            bg.fillRoundedRect(-30, -24, 60, 48, 12);
            bg.lineStyle(2, on ? 0x2E7D32 : 0x555555, 1);
            bg.strokeRoundedRect(-30, -24, 60, 48, 12);
        };
        updateBg(isOn);

        // アイコン画像
        const icon = this.add.image(0, 0, iconKey);
        const iconScale = 36 / Math.max(icon.width, icon.height);
        icon.setScale(iconScale);

        btn.add([bg, icon]);
        btn.setSize(60, 48);
        btn.setInteractive({ useHandCursor: true });
        btn.setData('on', isOn);

        // 🎯 桜井イズム：トグルボタンも心地よいフィードバック
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.9, duration: 40 });
            HapticManager.selection();  // カチッ
            AudioManager.playSfx(this, 'sfx_ui_tap');
        });
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, scale: 1.1, duration: 60, yoyo: true });
            const newState = !btn.getData('on');
            btn.setData('on', newState);
            updateBg(newState);
            cb(newState);
        });

        return btn;
    }

    setupInput() {
        this.input.on('pointerdown', p => this.onDown(p));
        this.input.on('pointermove', p => this.onMove(p));
        this.input.on('pointerup', () => this.onUp());
    }

    onDown(p) {
        const cell = this.getCell(p.x, p.y);
        if (!cell) return;

        const { row, col } = cell;
        const data = this.grid[row][col];

        // おやつから開始
        if (data.isEnd) {
            this.startDraw(data.type, row, col);
            this.showDog(p.x, p.y);
            HapticManager.impact('Light'); // ぷにっ
        }
        // 既存経路から開始
        else if (data.pathType > 0) {
            this.startFromPath(data.pathType, row, col);
            this.showDog(p.x, p.y);
            HapticManager.impact('Light'); // ぷにっ
        }
    }

    onMove(p) {
        if (!this.drawing) return;
        const cell = this.getCell(p.x, p.y);
        if (cell) this.continueDraw(cell.row, cell.col);
        if (this.dog) this.dog.setPosition(p.x, p.y - 55);
    }

    onUp() {
        if (this.mode === 'challenge' && this.drawing && this.curType) {
            if (!this.pathComplete(this.curType)) {
                this.cameras.main.shake(300, 0.02);
                this.cameras.main.flash(200, 255, 100, 100);
                AudioManager.playSfx(this, 'sfx_gameover');
                this.time.delayedCall(500, () => this.scene.start('GameOverScene', { score: this.chalScore }));
                return;
            }
        }
        this.drawing = false;
        this.curType = null;
        this.lastCell = null;
        this.hideDog();
    }

    getCell(x, y) {
        // 🎯 桜井イズム：セル吸着ヒステリシス
        // 一度セルに入ったら、中心から離れにくくする（操作ミス軽減）
        const hysteresis = this.cellSz * 0.15;  // 吸着余裕
        
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                const cx = this.gridX + c * (this.cellSz + CONFIG.CELL_PADDING);
                const cy = this.gridY + r * (this.cellSz + CONFIG.CELL_PADDING);
                
                // 現在のセルにいる場合は、より広い範囲でヒット判定
                const isCurrentCell = this.lastCell && this.lastCell.row === r && this.lastCell.col === c;
                const margin = isCurrentCell ? hysteresis : 0;
                
                if (x >= cx - margin && x <= cx + this.cellSz + margin && 
                    y >= cy - margin && y <= cy + this.cellSz + margin) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }

    startDraw(type, row, col) {
        this.clearPath(type);
        this.drawing = true;
        this.curType = type;
        this.lastCell = { row, col };
        this.paths[type].push({ row, col });
        AudioManager.playSfx(this, 'sfx_draw_start');

        const key = `${row},${col}`;
        if (this.dogIcons[key]) {
            this.tweens.add({
                targets: this.dogIcons[key].container,
                scaleX: 1.2,
                scaleY: 0.8,
                duration: 80,
                yoyo: true
            });
        }
    }

    startFromPath(type, row, col) {
        const path = this.paths[type];
        const idx = path.findIndex(p => p.row === row && p.col === col);
        if (idx === -1) return;

        path.splice(idx + 1).forEach(p => {
            if (!this.grid[p.row][p.col].isEnd) this.grid[p.row][p.col].pathType = 0;
        });
        this.trails[type] = this.trails[type].slice(0, idx);

        this.drawing = true;
        this.curType = type;
        this.lastCell = { row, col };
        this.renderPaths();
    }

    continueDraw(row, col) {
        if (!this.drawing || !this.curType) return;
        const { row: lr, col: lc } = this.lastCell;
        if (row === lr && col === lc) return;
        if (Math.abs(row - lr) + Math.abs(col - lc) !== 1) return;

        const data = this.grid[row][col];
        const path = this.paths[this.curType];

        // バックトラック
        if (path.length >= 2) {
            const prev = path[path.length - 2];
            if (prev.row === row && prev.col === col) {
                const rem = path.pop();
                if (!this.grid[rem.row][rem.col].isEnd) this.grid[rem.row][rem.col].pathType = 0;
                this.trails[this.curType].pop();
                this.lastCell = { row, col };
                this.updateProgress();
                this.renderPaths();
                return;
            }
        }

        if (data.pathType > 0 && data.pathType !== this.curType) {
            AudioManager.playSfx(this, 'sfx_error');
            return;
        }

        // ゴール
        if (data.isEnd && data.type === this.curType) {
            if (path[0].row === row && path[0].col === col) return;
            path.push({ row, col });
            this.lastCell = { row, col };

            const key = `${row},${col}`;
            if (this.dogIcons[key]) {
                this.tweens.add({
                    targets: this.dogIcons[key].container,
                    scale: 1.3,
                    duration: 150,
                    yoyo: true,
                    ease: 'Back.easeOut'
                });
            }

            // 接続エフェクト
            this.showConnectEffect(row, col);

            this.updateProgress();
            this.renderPaths(); // Changed `this.render()` to `this.renderPaths()` to match existing method
            
            // ★ チュートリアルモード：ペア接続時の進行処理
            if (this.tutorialMode && this.onTutorialPairConnected) {
                this.onTutorialPairConnected();
            }
            
            this.checkClear();
            HapticManager.impact('Medium'); // つながった！
            return;
        }

        if (data.pathType === this.curType) return;
        if (data.isEnd && data.type !== this.curType) {
            AudioManager.playSfx(this, 'sfx_error');
            return;
        }

        // 新しいセルへ
        path.push({ row, col });
        data.pathType = this.curType; // Changed `cellData.pathType = this.currentType;` to `data.pathType = this.curType;`
        this.addTrail(lr, lc, row, col); // Changed `this.addPawTrail` to `this.addTrail` and `lastRow, lastCol` to `lr, lc`
        this.lastCell = { row, col };
        this.updateProgress();
        this.renderPaths(); // Changed `this.render()` to `this.renderPaths()` to match existing method
        HapticManager.selection(); // カチッ（描画の心地よいクリック感）
        AudioManager.playSfx(this, 'sfx_draw_step');
    }

    addTrail(fr, fc, tr, tc) {
        const fx = this.gridX + fc * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
        const fy = this.gridY + fr * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
        const tx = this.gridX + tc * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
        const ty = this.gridY + tr * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;

        const angle = Math.atan2(ty - fy, tx - fx);
        const stepCount = this.trails[this.curType].length;

        // 🐾 てくてく感：左右交互のオフセット
        const side = (stepCount % 2 === 0) ? -1 : 1;
        const perpAngle = angle + Math.PI / 2;
        const offset = side * this.cellSz * 0.12;

        // マスの中央に肉球を配置（移動先セル）
        this.trails[this.curType].push({
            x: tx + Math.cos(perpAngle) * offset,
            y: ty + Math.sin(perpAngle) * offset,
            angle: angle,
            stepNum: stepCount,
            isNew: true
        });
    }

    renderPaths() {
        // セル塗り
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                const fill = this.cells[r][c].getData('fill');
                const pt = this.grid[r][c].pathType;
                fill.clear();
                if (pt > 0 && DOG_TYPES[pt]) {
                    fill.fillStyle(DOG_TYPES[pt].color, 0.5);
                    fill.fillRoundedRect(2, 2, this.cellSz - 4, this.cellSz - 4, CONFIG.CORNER_RADIUS - 2);
                }
            }
        }

        // 🐾 肉球トレイル（てくてく歩く感・桜井イズム：可愛いは正義！）
        // デフォルトはbrown（旧default）に設定
        const pawColorSetting = gameData.customize?.pawColor || 'brown';
        const pawColorData = PAW_COLORS[pawColorSetting] || PAW_COLORS.brown;
        const pawImageKey = pawColorData.imageKey || 'paw_brown';
        
        // 🔍 デバッグ: 肉球の色を確認（問題解決後に削除）
        if (!this._pawColorLogged) {
            console.log('🐾 肉球カラー設定:', pawColorSetting, '→ 画像:', pawImageKey);
            this._pawColorLogged = true;
        }

        this.trailCon.removeAll(true);
        this.existingTypes.forEach(t => {
            const trail = this.trails[t];
            if (!trail || trail.length === 0) return;

            trail.forEach((p, i) => {
                // 🐾 肉球サイズ（新しい足跡ほど大きく、てくてく感）
                const isRecent = i >= trail.length - 2;
                const isNewest = i === trail.length - 1;
                // 可愛いサイズで表示！（元のサイズに戻す）
                const pawSize = isNewest ? this.cellSz * 0.7 : (isRecent ? this.cellSz * 0.6 : this.cellSz * 0.5);

                // 🐾 スプライト版肉球を使用（超かわいい！）
                const paw = PawPrint.drawSprite(this, p.x, p.y, pawImageKey, pawSize);
                paw.setOrigin(0.5, 0.5);  // 中央配置

                // 🐾 方向に応じた回転（上向きが基本、なぞった方向に向く）
                // 画像は指が上を向いた状態なので、進行方向に指を向ける
                const tiltAngle = (p.stepNum % 2 === 0) ? -0.15 : 0.15;
                paw.setRotation(p.angle + Math.PI / 2 + tiltAngle);

                // 古い足跡はフェードアウト（でも消えすぎない）
                const baseAlpha = isNewest ? 1 : (isRecent ? 0.85 : 0.4 + (i / trail.length) * 0.35);
                paw.setAlpha(baseAlpha);

                // 🎯 新しい足跡には「ぽふっ」アニメーション
                if (p.isNew && isRecent) {
                    const targetScale = paw.scale;  // drawSpriteで計算されたスケールを保存
                    paw.setScale(0);
                    this.tweens.add({
                        targets: paw,
                        scale: { from: 0, to: targetScale * 1.15 },
                        duration: 80,
                        ease: 'Back.easeOut',
                        onComplete: () => {
                            // ぷにっと戻る
                            this.tweens.add({
                                targets: paw,
                                scale: targetScale,
                                duration: 60,
                                ease: 'Sine.easeOut'
                            });
                        }
                    });
                    p.isNew = false;
                }

                this.trailCon.add(paw);
            });
        });
    }

    showConnectEffect(row, col) {
        const x = this.gridX + col * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
        const y = this.gridY + row * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
        const dogData = this.grid[row][col];
        // ゴールデンワンコ（type=29）のみ特別扱い（ゴールデンレトリバーは普通）
        const isGolden = dogData.type === 29;

        // 🎯 桜井イズム：ヒットストップ（タメ）- 一瞬の「静止」で成功を際立たせる
        // 画面振動をより強く、気持ちよく
        this.cameras.main.shake(120, isGolden ? 0.012 : 0.008);
        AudioManager.playSfx(this, 'sfx_connect');
        
        // 🎯 Haptic: つながった！の感覚（先にフィードバック）
        HapticManager.notification('Success');

        // 犬の顔をハッピーに変更
        const key = `${row},${col}`;
        const dogIcon = this.dogIcons[key];
        if (dogIcon) {
            // 既存を削除して笑顔で再描画
            dogIcon.container.destroy();
            const newDog = DogFaceRenderer.draw(this, x, y, dogIcon.type, this.cellSz * 0.4, 'happy');
            this.dogCon.add(newDog);
            this.dogIcons[key].container = newDog;
            
            // ✨ でんせつワンコはキラキラエフェクト追加！
            if (LEGEND_ENCOUNTERS[dogIcon.type]) {
                this.addLegendarySparkle(newDog, this.cellSz * 0.4);
            }

            // 🎯 桜井イズム：成功のバウンス - ぐっと縮んでぽんっと弾ける
            newDog.setScale(0.8);
            this.tweens.add({
                targets: newDog,
                scale: 1.4,
                duration: 100,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: newDog,
                        scale: 1,
                        duration: 150,
                        ease: 'Sine.easeInOut'
                    });
                }
            });
        }

        // 🐾 接続した相方の犬も喜ばせる
        const startKey = this.findPairStartKey(row, col, dogData.type);
        if (startKey && this.dogIcons[startKey]) {
            const startIcon = this.dogIcons[startKey];
            const [sr, sc] = startKey.split(',').map(Number);
            const sx = this.gridX + sc * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
            const sy = this.gridY + sr * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
            
            startIcon.container.destroy();
            const newStartDog = DogFaceRenderer.draw(this, sx, sy, startIcon.type, this.cellSz * 0.4, 'happy');
            this.dogCon.add(newStartDog);
            this.dogIcons[startKey].container = newStartDog;
            
            // ✨ でんせつワンコはキラキラエフェクト追加！
            if (LEGEND_ENCOUNTERS[startIcon.type]) {
                this.addLegendarySparkle(newStartDog, this.cellSz * 0.4);
            }
            
            // 相方もぴょんぴょん
            this.tweens.add({
                targets: newStartDog,
                y: sy - 8,
                duration: 80,
                yoyo: true,
                repeat: 1,
                ease: 'Quad.easeOut'
            });
        }

        // 「わん！」テキスト - より大きく、より嬉しく
        const wanText = this.add.text(x, y - 30, 'わん！', {
            ...TEXT_STYLE.body,
            fontSize: isGolden ? '18px' : '16px',
            color: isGolden ? '#FFD700' : '#FF6B8A',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5).setScale(0);

        this.tweens.add({
            targets: wanText,
            scale: 1.2,
            y: y - 60,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: wanText,
                    alpha: 0,
                    y: y - 80,
                    scale: 0.8,
                    duration: 400,
                    ease: 'Cubic.easeIn',
                    onComplete: () => wanText.destroy()
                });
            }
        });

        // 🎯 桜井イズム：ハートがぽふぽふ湧き出る
        this.spawnConnectHearts(x, y, isGolden);

        // ゴールデン特別演出
        if (isGolden) {
            this.cameras.main.flash(300, 255, 215, 0, true);
            
            // 星が舞い散る
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const star = this.add.text(x, y, '⭐', {
                    fontSize: '24px'
                }).setOrigin(0.5).setScale(0);

                this.tweens.add({
                    targets: star,
                    x: x + Math.cos(angle) * 80,
                    y: y + Math.sin(angle) * 80,
                    scale: { from: 0, to: 1.5 },
                    alpha: { from: 1, to: 0 },
                    rotation: Math.PI * 2,
                    duration: 700,
                    delay: i * 30,
                    ease: 'Cubic.easeOut',
                    onComplete: () => star.destroy()
                });
            }
            
            const luckyText = this.add.text(x, y - 70, 'Lucky!', {
                ...TEXT_STYLE.special,
                fontSize: '30px',
            }).setOrigin(0.5).setScale(0);

            this.tweens.add({
                targets: luckyText,
                scale: 1.3,
                duration: 200,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: luckyText,
                        alpha: 0,
                        y: y - 100,
                        scale: 0.8,
                        duration: 600,
                        onComplete: () => luckyText.destroy()
                    });
                }
            });
        }
    }

    // 🎯 ペア接続時のハート演出
    spawnConnectHearts(x, y, isGolden) {
        const heartCount = isGolden ? 10 : 6;
        const effectIcon = isGolden ? '💛' : '❤️';
        
        for (let i = 0; i < heartCount; i++) {
            const angle = (i / heartCount) * Math.PI * 2 - Math.PI / 2;
            const distance = isGolden ? 60 : 45;
            
            const heart = this.add.text(x, y, effectIcon, {
                fontSize: isGolden ? '20px' : '16px'
            }).setOrigin(0.5).setScale(0).setAlpha(0);

            this.tweens.add({
                targets: heart,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance - 15,
                scale: { from: 0, to: 1.3 },
                alpha: { from: 0, to: 1 },
                duration: 200,
                delay: i * 25,
                ease: 'Back.easeOut',
                onComplete: () => {
                    this.tweens.add({
                        targets: heart,
                        y: heart.y - 20,
                        alpha: 0,
                        scale: 0.5,
                        duration: 350,
                        ease: 'Cubic.easeIn',
                        onComplete: () => heart.destroy()
                    });
                }
            });
        }
    }

    // ペアの相方を見つける
    findPairStartKey(endRow, endCol, type) {
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                if ((r !== endRow || c !== endCol) && 
                    this.grid[r][c].isEnd && 
                    this.grid[r][c].type === type) {
                    return `${r},${c}`;
                }
            }
        }
        return null;
    }

    clearPath(type) {
        this.paths[type].forEach(p => {
            if (!this.grid[p.row][p.col].isEnd) this.grid[p.row][p.col].pathType = 0;
        });
        this.paths[type] = [];
        this.trails[type] = [];
        this.renderPaths();
    }

    resetLevel() {
        this.existingTypes.forEach(t => this.clearPath(t));
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                if (!this.grid[r][c].isEnd) this.grid[r][c].pathType = 0;
            }
        }

        // 犬顔を無表情に戻す
        Object.keys(this.dogIcons).forEach(key => {
            const [row, col] = key.split(',').map(Number);
            const x = this.gridX + col * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
            const y = this.gridY + row * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
            const dogData = this.dogIcons[key];
            if (dogData) {
                dogData.container.destroy();
                const newDog = DogFaceRenderer.draw(this, x, y, dogData.type, this.cellSz * 0.4, 'neutral');
                this.dogCon.add(newDog);
                this.dogIcons[key].container = newDog;
                
                // ✨ でんせつワンコはキラキラエフェクト追加！
                if (LEGEND_ENCOUNTERS[dogData.type]) {
                    this.addLegendarySparkle(newDog, this.cellSz * 0.4);
                }
            }
        });

        this.updateProgress();
        this.renderPaths();
        this.cameras.main.shake(100, 0.005);
    }

    showPawTrail(x, y) {
        // 肉球を軌跡として表示（スプライト版！）
        const pawColorSetting = gameData.customize?.pawColor || 'brown';
        const pawData = PAW_COLORS[pawColorSetting] || PAW_COLORS.brown;
        const pawImageKey = pawData.imageKey || 'paw_brown';

        const paw = PawPrint.drawSprite(this, x, y, pawImageKey, 28, 0.8);
        paw.setOrigin(0.5, 0.5);
        paw.setRotation(Phaser.Math.FloatBetween(-0.3, 0.3));
        const targetScale = paw.scale;  // drawSpriteで計算されたスケールを保存

        this.tweens.add({
            targets: paw,
            alpha: 0,
            scale: targetScale * 0.5,  // 元のスケールに対して縮小
            duration: 800,
            onComplete: () => paw.destroy()
        });
    }

    showDog(x, y) {
        // なぞり中の追従肉球は表示しない（マスの足跡のみ表示）
        // this.showPawTrail(x, y);
    }

    hideDog() {
        // 軌跡モードなので特に何もしない
    }

    updateProgress() {
        let filled = 0;
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                if (this.grid[r][c].pathType > 0) filled++;
            }
        }

        this.progContainer.removeAll(true);
        const pawCount = Math.floor((filled / 36) * 10);
        const pawColorSetting = gameData.customize?.pawColor || 'brown';
        const pawData = PAW_COLORS[pawColorSetting] || PAW_COLORS.brown;
        const pawImageKey = pawData.imageKey || 'paw_brown';

        for (let i = 0; i < pawCount; i++) {
            const paw = PawPrint.drawSprite(this, (i - 4.5) * 18, 0, pawImageKey, 16);
            paw.setOrigin(0.5, 0.5);
            this.progContainer.add(paw);
        }
    }

    pathComplete(type) {
        const path = this.paths[type];
        if (!path || path.length < 2) return false;

        const ends = [];
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                if (this.grid[r][c].isEnd && this.grid[r][c].type === type) ends.push({ row: r, col: c });
            }
        }
        if (ends.length !== 2) return false;

        const first = path[0], last = path[path.length - 1];
        const hasStart = (first.row === ends[0].row && first.col === ends[0].col) || (first.row === ends[1].row && first.col === ends[1].col);
        const hasEnd = (last.row === ends[0].row && last.col === ends[0].col) || (last.row === ends[1].row && last.col === ends[1].col);
        return hasStart && hasEnd && (first.row !== last.row || first.col !== last.col);
    }

    checkClear() {
        // 存在する全タイプが接続されているか確認
        for (const t of this.existingTypes) {
            if (!this.pathComplete(t)) return false;
        }

        // 全セルが埋まっているか確認
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                if (this.grid[r][c].pathType === 0) return false;
            }
        }

        // クリア！
        console.log('🎉 クリア！');
        HapticManager.notification('Success'); // ドーン！祝福

        // クリア状態を保存（通常モードのみ）
        if (this.mode !== 'challenge') {
            const stageId = this.lvIndex + 1; // ステージ番号は1始まり
            saveClearedStage(stageId);
        }

        // 統計更新
        GameData.updateStats(gameData, 'clear');
        if (this.mode === 'challenge') {
            GameData.updateStats(gameData, 'challenge_clear');
        }
        if (this.hasGolden) {
            GameData.updateStats(gameData, 'golden');
        }
        
        // ✨ でんせつワンコ獲得処理
        if (this.legendEncounter) {
            // 伝説ワンコを解放
            if (!gameData.unlockedDogs.includes(this.legendEncounter.id)) {
                gameData.unlockedDogs.push(this.legendEncounter.id);
                const today = new Date().toISOString().split('T')[0];
                gameData.dogUnlockDates[this.legendEncounter.id] = today;
                console.log(`✨ でんせつワンコ獲得！ ${this.legendEncounter.name}`);
            }
        }

        // 使用犬種を記録
        gameData.selectedDogs.forEach(dogId => {
            GameData.updateStats(gameData, 'dog_usage', dogId);
        });

        // デイリーミッション更新
        DailyManager.updateProgress(gameData, 'clear');
        if (this.mode === 'challenge') {
            DailyManager.updateProgress(gameData, 'challenge');
        }
        if (this.hasGolden) {
            DailyManager.updateProgress(gameData, 'golden');
        }
        
        // 🆕 今日のワンコと遊んだかチェック
        const todaysDog = gameData.daily?.todaysDog;
        if (todaysDog && gameData.selectedDogs.includes(todaysDog)) {
            DailyManager.updateProgress(gameData, 'today_dog');
        }
        
        // 🆕 ノーミスクリアチェック
        // 通常モード: パズルなのでクリア=ノーミス
        // エンドレス: 途中でミスするとゲームオーバーなので、クリア=ノーミス
        DailyManager.updateProgress(gameData, 'perfect');

        // 実績チェック（ワンコ）
        const newAchievements = GameData.checkAchievements(gameData);
        
        // ★ にくきゅうカラー・テーマの解放チェック
        const nikukyuUnlocks = GameData.checkNikukyuUnlocks(gameData);
        const themeUnlocks = GameData.checkThemeUnlocks(gameData);
        const newItemUnlocks = [...nikukyuUnlocks, ...themeUnlocks];
        
        GameData.save(gameData);

        // クリア演出
        this.cameras.main.flash(200, 255, 255, 200);
        this.time.delayedCall(600, () => {
            // ★ チュートリアルモードの場合もクリア画面を表示
            if (this.tutorialMode) {
                this.scene.start('ClearScene', {
                    mode: 'tutorial',
                    levelIndex: 0,
                    hasGolden: false,
                    newAchievements: newAchievements,
                    newItemUnlocks: newItemUnlocks,
                    tutorialMode: true
                });
                return;
            }
            
            if (this.mode === 'challenge') {
                // ✨ でんせつワンコ獲得時は専用演出へ
                if (this.legendEncounter) {
                    this.scene.start('LegendUnlockScene', {
                        legendEncounter: this.legendEncounter,
                        challengeScore: this.chalScore + 1,
                        newAchievements: newAchievements,
                        newItemUnlocks: newItemUnlocks
                    });
                } else {
                    this.scene.start('ClearScene', {
                        mode: 'challenge',
                        challengeScore: this.chalScore + 1,
                        hasGolden: this.hasGolden,
                        newAchievements: newAchievements,
                        newItemUnlocks: newItemUnlocks
                    });
                }
            } else {
                this.scene.start('ClearScene', {
                    mode: 'normal',
                    levelIndex: this.lvIndex,
                    hasGolden: this.hasGolden,
                    newAchievements: newAchievements,
                    newItemUnlocks: newItemUnlocks
                });
            }
        });
        return true;
    }

    showConfirm() {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setInteractive();
        const dialog = this.add.container(width / 2, height / 2);

        // ダイアログ背景（十分な余白を確保！）
        const dialogW = 260;
        const dialogH = 150;
        const bg = this.add.graphics();
        bg.fillStyle(PALETTE.uiBg, 1);
        bg.fillRoundedRect(-dialogW / 2, -dialogH / 2, dialogW, dialogH, 16);
        bg.lineStyle(3, PALETTE.cellOutline, 1);
        bg.strokeRoundedRect(-dialogW / 2, -dialogH / 2, dialogW, dialogH, 16);

        // 質問テキスト
        const txt = this.add.text(0, -35, 'やめますか？', {
            ...TEXT_STYLE.heading,
            fontSize: '20px',
        }).setOrigin(0.5);

        // 「はい」ボタン
        const yesBtn = this.add.container(-55, 30);
        const yesBg = this.add.graphics();
        yesBg.fillStyle(0xFF6B6B, 1);
        yesBg.fillRoundedRect(-45, -22, 90, 44, 10);
        const yesTxt = this.add.text(0, 0, 'はい', {
            ...TEXT_STYLE.button,
            fontSize: '18px',
        }).setOrigin(0.5);
        yesBtn.add([yesBg, yesTxt]);
        yesBtn.setSize(90, 44).setInteractive({ useHandCursor: true });

        // 「いいえ」ボタン
        const noBtn = this.add.container(55, 30);
        const noBg = this.add.graphics();
        noBg.fillStyle(0x888888, 1);
        noBg.fillRoundedRect(-45, -22, 90, 44, 10);
        const noTxt = this.add.text(0, 0, 'いいえ', {
            ...TEXT_STYLE.button,
            fontSize: '18px',
        }).setOrigin(0.5);
        noBtn.add([noBg, noTxt]);
        noBtn.setSize(90, 44).setInteractive({ useHandCursor: true });

        dialog.add([bg, txt, yesBtn, noBtn]);

        // タップフィードバック
        yesBtn.on('pointerdown', () => this.tweens.add({ targets: yesBtn, scale: 0.9, duration: 50 }));
        yesBtn.on('pointerup', () => {
            this.tweens.add({ targets: yesBtn, scale: 1, duration: 50 });
            this.cameras.main.fadeOut(200);
            this.time.delayedCall(200, () => this.scene.start('MainMenuScene'));
        });
        yesBtn.on('pointerout', () => this.tweens.add({ targets: yesBtn, scale: 1, duration: 50 }));

        noBtn.on('pointerdown', () => this.tweens.add({ targets: noBtn, scale: 0.9, duration: 50 }));
        noBtn.on('pointerup', () => {
            this.tweens.add({ targets: noBtn, scale: 1, duration: 50 });
            overlay.destroy();
            dialog.destroy();
        });
        noBtn.on('pointerout', () => this.tweens.add({ targets: noBtn, scale: 1, duration: 50 }));
    }

    // ========================================
    // ★ チュートリアル機能（指示→操作→指示→操作の流れ）
    // ========================================
    startTutorial() {
        this.tutorialStep = 0;
        this.tutorialConnectedCount = 0;  // 接続したペア数を追跡
        this.showTutorialStep();
    }

    showTutorialStep() {
        const { width, height } = this.scale;
        
        // ステップ0: 最初の説明
        if (this.tutorialStep === 0) {
            this.showTutorialOverlay({
                text: '同じワンコをつなごう！',
                subText: 'ドラッグして線を引いてね',
                highlightType: 'dogs',
                waitForAction: true  // タップで消えて、操作待ちに
            });
        }
        // 以降のステップは onPairConnected で制御
    }

    // パスが1ペア接続されたときに呼ばれる（GameSceneから呼び出す）
    onTutorialPairConnected() {
        if (!this.tutorialMode) return;
        
        this.tutorialConnectedCount++;
        const totalPairs = this.existingTypes.length;
        
        // 最初のペア接続後に励まし
        if (this.tutorialConnectedCount === 1 && totalPairs > 1) {
            this.time.delayedCall(300, () => {
                this.showTutorialOverlay({
                    text: 'いいね！その調子！',
                    subText: '残りのワンコもつなごう',
                    highlightType: 'none',
                    waitForAction: true
                });
            });
        }
        // 2ペア目の接続後にリトライボタンの説明
        else if (this.tutorialConnectedCount === 2 && totalPairs > 2) {
            this.time.delayedCall(300, () => {
                this.showTutorialOverlay({
                    text: 'つまったらここをタップ！',
                    subText: 'やりなおせるよ',
                    highlightType: 'resetBtn',
                    waitForAction: true
                });
            });
        }
        // 半分くらい接続したら（3ペア目以降で、かつまだリトライ説明後）
        else if (this.tutorialConnectedCount === Math.floor(totalPairs / 2) && totalPairs > 4 && this.tutorialConnectedCount > 2) {
            this.time.delayedCall(300, () => {
                this.showTutorialOverlay({
                    text: 'すごい！あと少し！',
                    subText: '全部のマスを埋めよう',
                    highlightType: 'none',
                    waitForAction: true
                });
            });
        }
        // クリア直前（最後の1ペアはクリア処理に任せる）
    }

    showTutorialOverlay(step) {
        const { width, height } = this.scale;
        
        // 既存のオーバーレイを削除
        this.hideTutorialOverlay();

        // オーバーレイコンテナ
        this.tutorialContainer = this.add.container(0, 0).setDepth(1000);

        // 半透明の黒背景
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, width, height);
        this.tutorialContainer.add(overlay);

        // ハイライト
        if (step.highlightType === 'dogs') {
            this.highlightDogs(overlay);
        } else if (step.highlightType === 'grid') {
            this.highlightGrid(overlay);
        } else if (step.highlightType === 'resetBtn') {
            this.highlightResetBtn(overlay);
        }

        // 説明テキスト用の背景
        const textBgY = height * 0.75;
        const textBg = this.add.graphics();
        textBg.fillStyle(0xFFFFFF, 0.95);
        textBg.fillRoundedRect(30, textBgY - 50, width - 60, 120, 16);
        this.tutorialContainer.add(textBg);

        // メインテキスト
        const mainText = this.add.text(width / 2, textBgY - 15, step.text, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '26px',
            color: '#5D4037',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.tutorialContainer.add(mainText);

        // サブテキスト
        const subText = this.add.text(width / 2, textBgY + 20, step.subText, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#8D6E63',
        }).setOrigin(0.5);
        this.tutorialContainer.add(subText);

        // 「タップしてつづける」テキスト
        const tapText = this.add.text(width / 2, textBgY + 55, '▼ タップしてはじめる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#A1887F',
        }).setOrigin(0.5);
        this.tutorialContainer.add(tapText);

        // 点滅アニメーション
        this.tweens.add({
            targets: tapText,
            alpha: { from: 1, to: 0.4 },
            duration: 600,
            yoyo: true,
            repeat: -1,
        });

        // タップでオーバーレイを消して操作可能に
        const hitArea = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        this.tutorialContainer.add(hitArea);

        hitArea.on('pointerdown', () => {
            HapticManager.selection();
            AudioManager.playSfx(this, 'sfx_ui_tap');
            this.hideTutorialOverlay();
            this.tutorialStep++;
            // onCloseコールバックがあれば実行
            if (step.onClose) {
                step.onClose();
            }
        });
    }

    highlightDogs(overlay) {
        // 最初のペアの犬をハイライト
        if (this.levelSnacks.length >= 2) {
            const firstType = this.levelSnacks[0].type;
            const sameDogs = this.levelSnacks.filter(s => s.type === firstType);
            
            sameDogs.forEach(dog => {
                const x = this.gridX + dog.col * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
                const y = this.gridY + dog.row * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
                const radius = this.cellSz * 0.6;

                // 光るエフェクト
                const glow = this.add.graphics();
                glow.fillStyle(0xFFFFFF, 0.3);
                glow.fillCircle(x, y, radius + 10);
                this.tutorialContainer.add(glow);

                // パルスアニメーション
                this.tweens.add({
                    targets: glow,
                    alpha: { from: 0.3, to: 0.6 },
                    scaleX: { from: 1, to: 1.1 },
                    scaleY: { from: 1, to: 1.1 },
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                });
            });
        }
    }

    highlightGrid(overlay) {
        // グリッド全体を囲む枠
        const gridW = 6 * (this.cellSz + CONFIG.CELL_PADDING);
        const gridH = 6 * (this.cellSz + CONFIG.CELL_PADDING);
        
        const border = this.add.graphics();
        border.lineStyle(4, 0xFFD54F, 1);
        border.strokeRoundedRect(
            this.gridX - 5,
            this.gridY - 5,
            gridW + 5,
            gridH + 5,
            10
        );
        this.tutorialContainer.add(border);

        // パルスアニメーション
        this.tweens.add({
            targets: border,
            alpha: { from: 1, to: 0.5 },
            duration: 600,
            yoyo: true,
            repeat: -1,
        });
    }

    highlightResetBtn(overlay) {
        const { width, height } = this.scale;
        // リセットボタンの位置（createFooter と同じ計算）
        const footerY = height - SAFE.BOTTOM - 37;
        const btnX = width / 2;
        const btnSize = 60;

        // リセットボタンを囲む光るエフェクト
        const glow = this.add.graphics();
        glow.fillStyle(0xFFD54F, 0.4);
        glow.fillCircle(btnX, footerY, btnSize / 2 + 15);
        this.tutorialContainer.add(glow);

        // パルスアニメーション
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.4, to: 0.8 },
            scaleX: { from: 1, to: 1.2 },
            scaleY: { from: 1, to: 1.2 },
            duration: 500,
            yoyo: true,
            repeat: -1,
        });

        // 矢印を追加（下向き）
        const arrowY = footerY - btnSize / 2 - 40;
        const arrow = this.add.text(btnX, arrowY, '▼', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '32px',
            color: '#FFD54F',
        }).setOrigin(0.5);
        this.tutorialContainer.add(arrow);

        // 矢印のバウンスアニメーション
        this.tweens.add({
            targets: arrow,
            y: arrowY + 10,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    hideTutorialOverlay() {
        if (this.tutorialContainer) {
            this.tutorialContainer.destroy();
            this.tutorialContainer = null;
        }
    }
}

// ========================================
// ★ 実績解放演出シーン（チュートリアル/通常両対応）
// ========================================
class AchievementUnlockScene extends Phaser.Scene {
    constructor() { super({ key: 'AchievementUnlockScene' }); }

    init(data) {
        this.newAchievements = data.newAchievements || [];
        this.tutorialMode = data.tutorialMode || false;
        this.currentIndex = data.currentIndex || 0;
        // ★ 追加：アイテム獲得（にくきゅう・テーマ）
        this.newItemUnlocks = data.newItemUnlocks || [];
    }

    create() {
        const { width, height } = this.scale;

        // 背景（キラキラグラデーション）
        this.createBackground();

        // 解放演出を開始
        if (this.newAchievements.length > 0) {
            this.showUnlockAnimation();
        } else {
            // 解放がない場合は直接次へ
            this.goToNext();
        }

        this.cameras.main.fadeIn(400);
    }

    createBackground() {
        const { width, height } = this.scale;
        
        // グラデーション背景
        const bg = this.add.graphics();
        bg.fillGradientStyle(0xFFF8E1, 0xFFF8E1, 0xFFE0B2, 0xFFE0B2, 1);
        bg.fillRect(0, 0, width, height);

        // キラキラパーティクル
        this.createSparkles();
    }

    createSparkles() {
        const { width, height } = this.scale;
        
        // キラキラを複数配置（絵文字を使用）
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(20, width - 20);
            const y = Phaser.Math.Between(20, height - 20);
            const size = Phaser.Math.Between(14, 24);
            
            const sparkle = this.add.text(x, y, '✨', {
                fontSize: `${size}px`,
            }).setOrigin(0.5).setAlpha(0.3);
            
            // キラキラアニメーション
            this.tweens.add({
                targets: sparkle,
                alpha: { from: 0.3, to: 1 },
                scale: { from: 0.8, to: 1.2 },
                duration: Phaser.Math.Between(400, 800),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 500),
            });
        }
    }

    showUnlockAnimation() {
        const { width, height } = this.scale;
        const achievement = this.newAchievements[this.currentIndex];
        
        if (!achievement) {
            this.goToNext();
            return;
        }

        // 🎵 サウンド（シャキーン！）
        AudioManager.playSfx(this, 'sfx_unlock_item');
        HapticManager.notification('Success');

        // コンテナ
        const container = this.add.container(width / 2, height / 2);

        // 「やった！」テキスト
        const yattaText = this.add.text(0, -180, 'やった！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '36px',
            color: '#FF6F00',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5);
        container.add(yattaText);

        // 弾むアニメーション
        this.tweens.add({
            targets: yattaText,
            y: -190,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // 犬種画像を取得
        const dogId = achievement.dogId;
        const dogKey = `dog_${dogId}_happy`;
        
        // 犬種画像（円形フレーム付き）
        const frame = this.add.graphics();
        frame.fillStyle(0xFFFFFF, 1);
        frame.fillCircle(0, -30, 90);
        frame.lineStyle(6, 0xFFB300, 1);
        frame.strokeCircle(0, -30, 90);
        container.add(frame);

        // 犬の顔（DogFaceRenderer使用）
        const dogFace = DogFaceRenderer.draw(this, 0, -30, dogId, 70, 'happy');
        container.add(dogFace);

        // 犬種名
        const dogInfo = DOG_ASSETS[dogId];
        const dogName = dogInfo ? dogInfo.name : `ワンコ #${dogId}`;
        
        const nameText = this.add.text(0, 70, `${dogName}を\nゲット！`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '28px',
            color: '#5D4037',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        container.add(nameText);

        // 入場アニメーション
        container.setScale(0);
        this.tweens.add({
            targets: container,
            scale: 1,
            duration: 500,
            ease: 'Back.out',
        });

        // 「つぎへ」ボタン
        this.time.delayedCall(800, () => {
            this.createNextButton();
        });
    }

    createNextButton() {
        const { width, height } = this.scale;
        
        const btnW = 200;
        const btnH = 60;
        const btnY = height - SAFE.BOTTOM - 80;

        const btn = this.add.container(width / 2, btnY);

        // ボタン背景
        const bg = this.add.graphics();
        bg.fillStyle(0xFF8F00, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
        bg.lineStyle(3, 0xFFB300, 1);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
        btn.add(bg);

        // ボタンテキスト
        const text = this.add.text(0, 0, 'つぎへ', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#FFFFFF',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        btn.add(text);

        btn.setSize(btnW, btnH);
        btn.setInteractive({ useHandCursor: true });

        // インタラクション
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.05, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.95, duration: 40 });
            HapticManager.selection();
            AudioManager.playSfx(this, 'sfx_ui_tap');
        });
        btn.on('pointerup', () => {
            this.currentIndex++;
            if (this.currentIndex < this.newAchievements.length) {
                // 次の実績を表示
                this.scene.restart({
                    newAchievements: this.newAchievements,
                    tutorialMode: this.tutorialMode,
                    currentIndex: this.currentIndex,
                    newItemUnlocks: this.newItemUnlocks
                });
            } else {
                this.goToNext();
            }
        });

        // 入場アニメーション
        btn.setAlpha(0);
        btn.y = btnY + 30;
        this.tweens.add({
            targets: btn,
            alpha: 1,
            y: btnY,
            duration: 300,
            ease: 'Back.out',
        });
    }

    goToNext() {
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            // ★ アイテム獲得があれば ItemUnlockScene へ
            if (this.newItemUnlocks && this.newItemUnlocks.length > 0) {
                this.scene.start('ItemUnlockScene', {
                    unlocks: this.newItemUnlocks,
                    returnScene: 'MainMenuScene',
                    returnData: this.tutorialMode && !gameData.tutorial.completed ? { tutorialMode: true } : {}
                });
                return;
            }

            // ★ チュートリアル完了済みなら通常モードで遷移
            if (this.tutorialMode && !gameData.tutorial.completed) {
                // チュートリアルモード：メインメニューへ（チュートリアル継続）
                this.scene.start('MainMenuScene', { tutorialMode: true });
            } else {
                // 通常モード or チュートリアル完了済み：メインメニューへ
                this.scene.start('MainMenuScene');
            }
        });
    }
}

// ========================================
// ★ 汎用アイテム獲得演出シーン（ワンコ・衣装・にくきゅう・テーマ）
// ========================================
class ItemUnlockScene extends Phaser.Scene {
    constructor() { super({ key: 'ItemUnlockScene' }); }

    init(data) {
        this.unlocks = data.unlocks || [];  // { type: 'dog'|'costume'|'nikukyu'|'theme', ... }
        this.currentIndex = data.currentIndex || 0;
        this.returnScene = data.returnScene || 'MainMenuScene';
        this.returnData = data.returnData || {};
    }

    create() {
        const { width, height } = this.scale;

        // 背景（キラキラグラデーション）
        this.createBackground();

        // 解放演出を開始
        if (this.unlocks.length > 0 && this.currentIndex < this.unlocks.length) {
            this.showUnlockAnimation();
        } else {
            this.goToNext();
        }

        this.cameras.main.fadeIn(400);
    }

    createBackground() {
        const { width, height } = this.scale;
        
        // グラデーション背景
        const bg = this.add.graphics();
        bg.fillGradientStyle(0xFFF8E1, 0xFFF8E1, 0xFFE0B2, 0xFFE0B2, 1);
        bg.fillRect(0, 0, width, height);

        // キラキラパーティクル
        this.createSparkles();
    }

    createSparkles() {
        const { width, height } = this.scale;
        
        for (let i = 0; i < 25; i++) {
            const x = Phaser.Math.Between(20, width - 20);
            const y = Phaser.Math.Between(20, height - 20);
            const size = Phaser.Math.Between(14, 28);
            
            const sparkle = this.add.text(x, y, '✨', {
                fontSize: `${size}px`,
            }).setOrigin(0.5).setAlpha(0.3);
            
            this.tweens.add({
                targets: sparkle,
                alpha: { from: 0.3, to: 1 },
                scale: { from: 0.8, to: 1.2 },
                duration: Phaser.Math.Between(400, 800),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 500),
            });
        }
    }

    showUnlockAnimation() {
        const { width, height } = this.scale;
        const item = this.unlocks[this.currentIndex];
        
        if (!item) {
            this.goToNext();
            return;
        }

        // 🎵 獲得音！（シャキーン）
        AudioManager.playSfx(this, 'sfx_unlock_item');
        HapticManager.notification('Success');

        // コンテナ
        const container = this.add.container(width / 2, height / 2 - 30);

        // タイプに応じて表示を変更
        switch (item.type) {
            case 'dog':
                this.showDogUnlock(container, item);
                break;
            case 'costume':
                this.showCostumeUnlock(container, item);
                break;
            case 'nikukyu':
                this.showNikukyuUnlock(container, item);
                break;
            case 'theme':
                this.showThemeUnlock(container, item);
                break;
            default:
                this.goToNext();
                return;
        }

        // 入場アニメーション
        container.setScale(0);
        this.tweens.add({
            targets: container,
            scale: 1,
            duration: 600,
            ease: 'Back.out',
        });

        // 「つぎへ」ボタン
        this.time.delayedCall(1000, () => {
            this.createNextButton();
        });
    }

    // 🐕 ワンコ獲得演出
    showDogUnlock(container, item) {
        const dogId = item.dogId;
        const dogInfo = DOG_ASSETS[dogId];
        const dogName = dogInfo ? dogInfo.name : `ワンコ #${dogId}`;

        // 「やった！」テキスト
        const titleText = this.add.text(0, -170, 'やった！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '36px',
            color: '#FF6F00',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5);
        container.add(titleText);
        this.addBounceAnimation(titleText);

        // 円形フレーム
        const frame = this.add.graphics();
        frame.fillStyle(0xFFFFFF, 1);
        frame.fillCircle(0, -30, 90);
        frame.lineStyle(6, 0xFFB300, 1);
        frame.strokeCircle(0, -30, 90);
        container.add(frame);

        // 犬の顔
        const dogFace = DogFaceRenderer.draw(this, 0, -30, dogId, 70, 'happy');
        container.add(dogFace);

        // 犬種名
        const nameText = this.add.text(0, 80, `${dogName}を\nゲット！`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '28px',
            color: '#5D4037',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        container.add(nameText);
    }

    // 🎀 衣装獲得演出
    showCostumeUnlock(container, item) {
        const costumeName = item.name || 'きせかえ';
        const costumeIcon = item.icon || '🎀';

        // 「ゲット！」テキスト
        const titleText = this.add.text(0, -170, 'ゲット！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '36px',
            color: '#E91E63',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5);
        container.add(titleText);
        this.addBounceAnimation(titleText);

        // 円形フレーム
        const frame = this.add.graphics();
        frame.fillStyle(0xFFFFFF, 1);
        frame.fillCircle(0, -30, 80);
        frame.lineStyle(5, 0xE91E63, 1);
        frame.strokeCircle(0, -30, 80);
        container.add(frame);

        // 衣装画像 or アイコン
        if (item.imageKey && this.textures.exists(item.imageKey)) {
            const img = this.add.image(0, -30, item.imageKey);
            img.setScale(0.5);
            container.add(img);
        } else {
            const icon = this.add.text(0, -30, costumeIcon, {
                fontSize: '60px',
            }).setOrigin(0.5);
            container.add(icon);
        }

        // 衣装名
        const nameText = this.add.text(0, 70, `${costumeName}`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '26px',
            color: '#5D4037',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        container.add(nameText);

        // 説明
        const descText = this.add.text(0, 105, item.description || 'あたらしいきせかえ！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#8D6E63',
            align: 'center',
        }).setOrigin(0.5);
        container.add(descText);
    }

    // 🐾 にくきゅうカラー獲得演出
    showNikukyuUnlock(container, item) {
        const colorName = item.name || 'カラー';
        const colorValue = item.color === 'rainbow' ? 0xFF69B4 : item.color;

        // 「NEW！」テキスト
        const titleText = this.add.text(0, -170, 'NEW！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '36px',
            color: '#FF5722',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5);
        container.add(titleText);
        this.addBounceAnimation(titleText);

        // 円形フレーム
        const frame = this.add.graphics();
        frame.fillStyle(0xFFFFFF, 1);
        frame.fillCircle(0, -30, 80);
        frame.lineStyle(5, colorValue, 1);
        frame.strokeCircle(0, -30, 80);
        container.add(frame);

        // にくきゅう描画（スプライト版！）
        const pawImageKey = PAW_COLORS[item.key]?.imageKey || 'paw_brown';
        const paw = PawPrint.drawSprite(this, 0, -30, pawImageKey, 130);
        paw.setOrigin(0.5, 0.5);
        if (item.color === 'rainbow') {
            // 虹色のキラキラエフェクト
            this.tweens.add({
                targets: paw,
                angle: { from: -5, to: 5 },
                duration: 300,
                yoyo: true,
                repeat: -1,
            });
        }
        container.add(paw);

        // カラー名
        const nameText = this.add.text(0, 70, `にくきゅうカラー\n「${colorName}」`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '22px',
            color: '#5D4037',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        container.add(nameText);

        // 説明
        const descText = this.add.text(0, 125, 'きせかえで設定できるよ！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#8D6E63',
            align: 'center',
        }).setOrigin(0.5);
        container.add(descText);
    }

    // 🌍 テーマ獲得演出
    showThemeUnlock(container, item) {
        const themeName = item.name || 'テーマ';
        const themeIcon = item.icon || '🌍';

        // 「かいほう！」テキスト
        const titleText = this.add.text(0, -180, 'かいほう！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '36px',
            color: '#2196F3',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5);
        container.add(titleText);
        this.addBounceAnimation(titleText);

        // マスク用の座標計算（コンテナ位置を考慮）
        const { width, height } = this.scale;
        const containerX = width / 2;
        const containerY = height / 2 - 30;
        
        // 角丸マスク（背景と画像の両方に使用）
        const maskShape = this.make.graphics({ add: false });
        maskShape.fillStyle(0xffffff);
        maskShape.fillRoundedRect(containerX - 90, containerY - 80, 180, 100, 12);
        const roundedMask = maskShape.createGeometryMask();

        // テーマプレビュー（背景色のみ、枠線は後で描画）
        const previewBg = this.add.graphics();
        previewBg.fillStyle(item.sky || 0x87CEEB, 1);
        previewBg.fillRoundedRect(-90, -80, 180, 100, 12);
        previewBg.fillStyle(item.ground || 0x90EE90, 1);
        previewBg.fillRect(-90, -20, 180, 40);
        previewBg.setMask(roundedMask);  // 地面色のはみ出しを防ぐ
        container.add(previewBg);

        // テーマ画像があれば表示
        if (item.image && this.textures.exists(item.image)) {
            const themeImg = this.add.image(0, -30, item.image);
            themeImg.setDisplaySize(180, 100);
            themeImg.setMask(roundedMask);  // 同じマスクを共有
            container.add(themeImg);
        }
        
        // 白い枠線（画像の上に描画してはみ出しを隠す）
        const previewFrame = this.add.graphics();
        previewFrame.lineStyle(4, 0xFFFFFF, 1);
        previewFrame.strokeRoundedRect(-90, -80, 180, 100, 12);
        container.add(previewFrame);

        // アイコン
        const icon = this.add.text(0, -30, themeIcon, {
            fontSize: '32px',
        }).setOrigin(0.5);
        container.add(icon);

        // テーマ名
        const nameText = this.add.text(0, 55, `せかいのテーマ\n「${themeName}」`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '22px',
            color: '#5D4037',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        container.add(nameText);

        // 説明
        const descText = this.add.text(0, 115, 'きせかえで設定できるよ！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#8D6E63',
            align: 'center',
        }).setOrigin(0.5);
        container.add(descText);
    }

    addBounceAnimation(target) {
        this.tweens.add({
            targets: target,
            y: target.y - 10,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    createNextButton() {
        const { width, height } = this.scale;
        
        const btnW = 200;
        const btnH = 60;
        const btnY = height - SAFE.BOTTOM - 80;

        const btn = this.add.container(width / 2, btnY);

        // ボタン背景
        const bg = this.add.graphics();
        bg.fillStyle(0xFF8F00, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
        bg.lineStyle(3, 0xFFB300, 1);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
        btn.add(bg);

        // ボタンテキスト
        const isLast = this.currentIndex >= this.unlocks.length - 1;
        const btnLabel = isLast ? 'OK！' : 'つぎへ';
        const text = this.add.text(0, 0, btnLabel, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#FFFFFF',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        btn.add(text);

        btn.setSize(btnW, btnH);
        btn.setInteractive({ useHandCursor: true });

        // インタラクション
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.05, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.95, duration: 40 });
            HapticManager.selection();
            AudioManager.playSfx(this, 'sfx_ui_tap');
        });
        btn.on('pointerup', () => {
            this.currentIndex++;
            if (this.currentIndex < this.unlocks.length) {
                // 次のアイテムを表示
                this.scene.restart({
                    unlocks: this.unlocks,
                    currentIndex: this.currentIndex,
                    returnScene: this.returnScene,
                    returnData: this.returnData,
                });
            } else {
                this.goToNext();
            }
        });

        // 入場アニメーション
        btn.setAlpha(0);
        btn.y = btnY + 30;
        this.tweens.add({
            targets: btn,
            alpha: 1,
            y: btnY,
            duration: 300,
            ease: 'Back.out',
        });
    }

    goToNext() {
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            this.scene.start(this.returnScene, this.returnData);
        });
    }
}

// ========================================
// ✨ でんせつワンコ獲得シーン
// ========================================
class LegendUnlockScene extends Phaser.Scene {
    constructor() { super({ key: 'LegendUnlockScene' }); }

    init(data) {
        this.legendEncounter = data.legendEncounter;
        this.challengeScore = data.challengeScore || 1;
        this.newAchievements = data.newAchievements || [];
        this.newItemUnlocks = data.newItemUnlocks || [];
    }

    create() {
        const { width, height } = this.scale;
        
        // 背景
        this.add.rectangle(0, 0, width, height, 0x1a0a30).setOrigin(0);
        
        // キラキラ背景エフェクト
        this.createSparkleBackground();
        
        // メインコンテナ
        const container = this.add.container(width / 2, height / 2);
        
        // タイトル
        const titleText = this.add.text(0, -height * 0.35, '✨ でんせつワンコ ✨', {
            fontFamily: 'KeiFont',
            fontSize: '28px',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 4,
        }).setOrigin(0.5);
        container.add(titleText);
        
        // 伝説ワンコ画像
        const dogId = this.legendEncounter.id;
        const asset = DOG_ASSETS[dogId];
        if (asset && asset.hasImage) {
            const imgKey = `dog_${dogId}_excited`;
            if (this.textures.exists(imgKey)) {
                const dogImg = this.add.image(0, -height * 0.1, imgKey)
                    .setOrigin(0.5)
                    .setScale(0);
                container.add(dogImg);
                
                // 登場アニメーション
                this.tweens.add({
                    targets: dogImg,
                    scale: 0.4,
                    duration: 800,
                    ease: 'Back.easeOut',
                    delay: 300
                });
                
                // ゆらゆらアニメーション
                this.tweens.add({
                    targets: dogImg,
                    y: dogImg.y - 10,
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                    delay: 1100
                });
            } else {
                // フォールバック: テキスト表示
                const dogEmoji = this.add.text(0, -height * 0.1, '🐕', {
                    fontSize: '120px'
                }).setOrigin(0.5);
                container.add(dogEmoji);
            }
        }
        
        // 獲得メッセージ
        const unlockMsg = this.add.text(0, height * 0.12, this.legendEncounter.unlockMessage, {
            fontFamily: 'KeiFont',
            fontSize: '32px',
            color: '#FFFFFF',
            stroke: '#8B0000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setAlpha(0);
        container.add(unlockMsg);
        
        this.tweens.add({
            targets: unlockMsg,
            alpha: 1,
            duration: 500,
            delay: 800
        });
        
        // 名前
        const nameText = this.add.text(0, height * 0.22, `【${this.legendEncounter.name}】`, {
            fontFamily: 'KeiFont',
            fontSize: '24px',
            color: '#FFD700',
            stroke: '#000',
            strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0);
        container.add(nameText);
        
        this.tweens.add({
            targets: nameText,
            alpha: 1,
            duration: 500,
            delay: 1000
        });
        
        // OKボタン
        this.time.delayedCall(1500, () => {
            const btnContainer = this.add.container(0, height * 0.35);
            
            const btnBg = this.add.graphics();
            btnBg.fillStyle(0xFFD700, 1);
            btnBg.fillRoundedRect(-80, -25, 160, 50, 25);
            btnBg.lineStyle(3, 0xFFA500, 1);
            btnBg.strokeRoundedRect(-80, -25, 160, 50, 25);
            btnContainer.add(btnBg);
            
            const btnText = this.add.text(0, 0, 'OK', {
                fontFamily: 'KeiFont',
                fontSize: '24px',
                color: '#000000',
            }).setOrigin(0.5);
            btnContainer.add(btnText);
            
            btnContainer.setSize(160, 50);
            btnContainer.setInteractive({ useHandCursor: true });
            
            btnContainer.on('pointerdown', () => {
                AudioManager.playSfx(this, 'sfx_decide');
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => {
                    // チャレンジモードの続きに戻る
                    this.scene.start('GameScene', {
                        mode: 'challenge',
                        levelIndex: 0,
                        challengeScore: this.challengeScore
                    });
                });
            });
            
            container.add(btnContainer);
            
            // ボタン登場アニメーション
            btnContainer.setScale(0);
            this.tweens.add({
                targets: btnContainer,
                scale: 1,
                duration: 300,
                ease: 'Back.easeOut'
            });
        });
        
        // BGM
        AudioManager.playSfx(this, 'sfx_achievement');
    }
    
    createSparkleBackground() {
        const { width, height } = this.scale;
        
        // 星をランダムに配置
        for (let i = 0; i < 50; i++) {
            const star = this.add.text(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                '✨',
                { fontSize: Phaser.Math.Between(10, 25) + 'px' }
            ).setOrigin(0.5).setAlpha(Phaser.Math.FloatBetween(0.3, 0.8));
            
            // キラキラアニメーション
            this.tweens.add({
                targets: star,
                alpha: Phaser.Math.FloatBetween(0.1, 0.5),
                duration: Phaser.Math.Between(1000, 2000),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 1000)
            });
        }
    }
}

// ========================================
// クリアシーン
// ========================================
class ClearScene extends Phaser.Scene {
    constructor() { super({ key: 'ClearScene' }); }

    init(data) {
        this.mode = data.mode || 'normal';
        this.lvIndex = data.levelIndex || 0;
        this.chalScore = data.challengeScore || 0;
        // ★ チュートリアルモード対応
        this.tutorialMode = data.tutorialMode || false;
        this.newAchievements = data.newAchievements || [];
        // ★ 新規アイテム解放（にくきゅう・テーマ）
        this.newItemUnlocks = data.newItemUnlocks || [];
    }

    create() {
        const { width, height } = this.scale;

        // 🎯 桜井イズム：クリアの瞬間は最高の祝福を！
        // クリアSE
        AudioManager.playSfx(this, 'sfx_clear');
        // 画面フラッシュ（ドーン！）
        this.cameras.main.flash(300, 255, 255, 255);
        HapticManager.notification('Success');

        // 背景
        this.add.rectangle(0, 0, width, height, PALETTE.sky).setOrigin(0);

        const ground = this.add.graphics();
        ground.fillStyle(PALETTE.grass, 1);
        ground.fillRect(0, height * 0.6, width, height * 0.4);

        // 🎉 豪華な紙吹雪
        this.createConfetti();
        
        // 継続的なキラキラ
        this.createSparkles();

        if (this.mode === 'challenge') {
            this.createChallengeClear();
        } else {
            this.createNormalClear();
        }
    }

    createConfetti() {
        const { width, height } = this.scale;
        const selectedDogs = gameData.selectedDogs;
        
        // 🎯 桜井イズム：紙吹雪は多め、色とりどりで祝福感UP
        const confettiCount = 40;
        const shapes = ['rect', 'circle', 'star'];

        for (let i = 0; i < confettiCount; i++) {
            const x = Phaser.Math.Between(10, width - 10);
            const dogType = selectedDogs[Phaser.Math.Between(0, selectedDogs.length - 1)];
            const color = DOG_TYPES[dogType]?.color || 0xFFD700;
            const shape = shapes[Phaser.Math.Between(0, shapes.length - 1)];

            const conf = this.add.graphics();
            conf.fillStyle(color, 1);
            
            if (shape === 'rect') {
                const w = Phaser.Math.Between(6, 12);
                const h = Phaser.Math.Between(4, 8);
                conf.fillRect(-w/2, -h/2, w, h);
            } else if (shape === 'circle') {
                conf.fillCircle(0, 0, Phaser.Math.Between(3, 6));
            } else {
                // 小さな星型
                const size = Phaser.Math.Between(4, 8);
                conf.fillRect(-size/2, -1, size, 2);
                conf.fillRect(-1, -size/2, 2, size);
            }
            
            conf.x = x;
            conf.y = -Phaser.Math.Between(20, 80);

            // ひらひら舞い落ちる演出
            this.tweens.add({
                targets: conf,
                y: height + 30,
                x: x + Phaser.Math.Between(-80, 80),
                rotation: Phaser.Math.Between(-8, 8),
                duration: Phaser.Math.Between(2000, 4000),
                delay: Phaser.Math.Between(0, 800),
                ease: 'Sine.easeInOut',
                onComplete: () => conf.destroy()
            });
        }
    }
    
    // ✨ 継続的なキラキラエフェクト
    createSparkles() {
        const { width, height } = this.scale;
        
        // 数秒間キラキラが舞う
        for (let wave = 0; wave < 3; wave++) {
            this.time.delayedCall(wave * 1000, () => {
                for (let i = 0; i < 8; i++) {
                    const sparkle = this.add.text(
                        Phaser.Math.Between(30, width - 30),
                        Phaser.Math.Between(height * 0.1, height * 0.5),
                        '✨',
                        { fontSize: Phaser.Math.Between(12, 20) + 'px' }
                    ).setOrigin(0.5).setAlpha(0);
                    
                    this.tweens.add({
                        targets: sparkle,
                        alpha: { from: 0, to: 1 },
                        scale: { from: 0.5, to: 1.2 },
                        duration: 400,
                        delay: i * 80,
                        yoyo: true,
                        onComplete: () => sparkle.destroy()
                    });
                }
            });
        }
    }

    createNormalClear() {
        const { width, height } = this.scale;
        const selectedDogs = gameData.selectedDogs;
        this.dogContainers = [];

        // 🐕 4匹の犬（大喜び！やったー！演出）
        const dogsY = height * 0.32;
        selectedDogs.forEach((dogType, i) => {
            const x = width * (0.15 + i * 0.235);
            const dog = DogFaceRenderer.draw(this, x, dogsY, dogType, 22, 'excited');
            dog.setScale(0);
            this.dogContainers.push(dog);

            // 🎯 桜井イズム：ぽーんと登場！
            this.tweens.add({
                targets: dog,
                scale: { from: 0, to: 1.2 },
                duration: 300,
                delay: i * 120,
                ease: 'Back.easeOut',
                onComplete: () => {
                    // 縮んで落ち着く
                    this.tweens.add({
                        targets: dog,
                        scale: 1,
                        duration: 150,
                        ease: 'Sine.easeOut'
                    });
                }
            });

            // しっぽフリフリ（ぴょんぴょん）
            this.tweens.add({
                targets: dog,
                y: dogsY - 12,
                duration: 400 + i * 30,
                delay: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Quad.easeOut'
            });
            
            // 🐾 各犬から小さなハートがぽふっ
            this.time.delayedCall(400 + i * 120, () => {
                const miniHeart = this.add.text(x, dogsY - 25, '♥', {
                    fontSize: '14px',
                    color: '#FF6B8A'
                }).setOrigin(0.5).setScale(0);
                
                this.tweens.add({
                    targets: miniHeart,
                    y: dogsY - 45,
                    scale: { from: 0, to: 1 },
                    alpha: { from: 1, to: 0 },
                    duration: 600,
                    ease: 'Cubic.easeOut',
                    onComplete: () => miniHeart.destroy()
                });
            });
        });

        // 🎊 大きなハート（中央に3つ、より派手に）
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(500 + i * 150, () => {
                const heart = this.add.text(
                    width / 2 + (i - 1) * 55,
                    height * 0.15,
                    '❤️',
                    { fontSize: '40px' }
                ).setOrigin(0.5).setScale(0);

                this.tweens.add({
                    targets: heart,
                    scale: { from: 0, to: 1.3 },
                    duration: 250,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: heart,
                            scale: 1,
                            duration: 150
                        });
                        // ふわふわ浮遊
                        this.tweens.add({
                            targets: heart,
                            y: heart.y - 8,
                            duration: 800 + i * 100,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });
                    }
                });
            });
        }

        // 🎯 「やったー！」テキスト（ドーンと登場）
        const clearText = this.add.text(width / 2, height * 0.50, 'やったー！', {
            ...TEXT_STYLE.title,
            fontSize: '40px',
        }).setOrigin(0.5).setScale(0);
        
        this.tweens.add({
            targets: clearText,
            scale: { from: 0, to: 1.15 },
            duration: 350,
            delay: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: clearText,
                    scale: 1,
                    duration: 150
                });
            }
        });

        const subText = this.add.text(width / 2, height * 0.59, 'おさんぽ たのしかったね！', {
            ...TEXT_STYLE.section,
            fontSize: '16px',
        }).setOrigin(0.5).setAlpha(0);
        
        this.tweens.add({
            targets: subText,
            alpha: 1,
            y: subText.y - 5,
            duration: 400,
            delay: 600,
            ease: 'Cubic.easeOut'
        });

        // ボタン（より早く出現、待たせない）
        this.time.delayedCall(700, () => {
            // シェアボタン
            const shareBtn = ShareUtils.createShareButton(this, width / 2, height * 0.70, 'normal', this.lvIndex);
            shareBtn.setScale(0);
            this.tweens.add({ targets: shareBtn, scale: 1, duration: 300, ease: 'Back.easeOut' });

            // 🎯 つぎへボタン（押しやすく大きく）
            const btn = this.createButton(width / 2, height * 0.82, 'つぎへ！', DOG_TYPES[2].color, async () => {
                HapticManager.impact('Light');
                
                // 🎯 広告表示（AD_INTERVAL ステージごと）
                try {
                    await AdManager.onStageEnd();
                } catch (e) {
                    console.log('広告表示スキップ:', e.message);
                }
                
                this.cameras.main.fadeOut(200);
                this.time.delayedCall(200, () => {
                    // 次の遷移先を決定
                    const nextGameData = {
                        mode: 'normal',
                        levelIndex: (this.lvIndex + 1) % LEVELS.length
                    };

                    // ★ チュートリアルモードの場合は実績解放演出へ（ただし完了済みなら通常フロー）
                    if (this.tutorialMode && !gameData.tutorial.completed) {
                        this.scene.start('AchievementUnlockScene', {
                            newAchievements: this.newAchievements,
                            newItemUnlocks: this.newItemUnlocks,
                            tutorialMode: true
                        });
                    } else if (this.newAchievements && this.newAchievements.length > 0) {
                        // 新しい実績がある場合は実績解放演出へ（通常モード）
                        this.scene.start('AchievementUnlockScene', {
                            newAchievements: this.newAchievements,
                            newItemUnlocks: this.newItemUnlocks,
                            tutorialMode: false
                        });
                    } else if (this.newItemUnlocks && this.newItemUnlocks.length > 0) {
                        // ★ 新しいアイテム（にくきゅう・テーマ）がある場合は獲得演出へ
                        this.scene.start('ItemUnlockScene', {
                            unlocks: this.newItemUnlocks,
                            returnScene: 'GameScene',
                            returnData: nextGameData
                        });
                    } else {
                        this.scene.start('GameScene', nextGameData);
                    }
                });
            });

            btn.setScale(0);
            this.tweens.add({ targets: btn, scale: 1, duration: 300, delay: 80, ease: 'Back.easeOut' });
        });
    }

    createChallengeClear() {
        const { width, height } = this.scale;
        const selectedDogs = gameData.selectedDogs;

        // スコア - 桜井イズム：成功の達成感を数字で祝福！
        const score = this.add.text(width / 2, height * 0.25, this.chalScore.toString(), {
            ...TEXT_STYLE.score,
            fontSize: '72px',
        }).setOrigin(0.5).setScale(0);

        this.tweens.add({
            targets: score,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });

        // 4匹の犬（大喜び・DogFaceRenderer使用）
        const dogsY = height * 0.48;
        selectedDogs.forEach((dogType, i) => {
            const x = width * (0.15 + i * 0.235);
            const dog = DogFaceRenderer.draw(this, x, dogsY, dogType, 18, 'excited');

            this.tweens.add({
                targets: dog,
                y: dogsY - 5,
                duration: 400 + i * 40,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 80
            });
        });

        // テキスト
        this.add.text(width / 2, height * 0.62, 'つぎのステージへ！', {
            ...TEXT_STYLE.heading,
            fontSize: '18px',
        }).setOrigin(0.5);

        // シェアボタン（小さめ・すぐ次に進むから控えめに）
        const shareBtn = ShareUtils.createShareButton(this, width / 2, height * 0.75, 'challenge', this.chalScore);
        shareBtn.setScale(0.8);
        shareBtn.setAlpha(0.85);

        // 自動で次へ（広告表示後）
        this.time.delayedCall(1800, async () => {
            // 🎯 広告表示（AD_INTERVAL ステージごと）
            try {
                await AdManager.onStageEnd();
            } catch (e) {
                console.log('広告表示スキップ:', e.message);
            }

            const nextGameData = {
                mode: 'challenge',
                challengeScore: this.chalScore
            };

            // ★ 新しいアイテム獲得があれば獲得演出へ
            if (this.newItemUnlocks && this.newItemUnlocks.length > 0) {
                this.scene.start('ItemUnlockScene', {
                    unlocks: this.newItemUnlocks,
                    returnScene: 'GameScene',
                    returnData: nextGameData
                });
            } else if (this.newAchievements && this.newAchievements.length > 0) {
                // ワンコ獲得があれば実績演出へ
                this.scene.start('AchievementUnlockScene', {
                    newAchievements: this.newAchievements,
                    newItemUnlocks: [],
                    tutorialMode: false
                });
            } else {
                this.scene.start('GameScene', nextGameData);
            }
        });
    }

    createButton(x, y, text, color, cb) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-70, -20, 140, 40, 8);
        bg.lineStyle(2, PALETTE.cellOutline, 1);
        bg.strokeRoundedRect(-70, -20, 140, 40, 8);

        // 桜井イズム: buttonSmall + 縁取り
        const txt = this.add.text(0, 0, text, {
            ...TEXT_STYLE.buttonSmall,
            fontSize: '18px',
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(140, 40);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerup', cb);

        return btn;
    }
}

// ========================================
// ゲームオーバーシーン
// ========================================
class GameOverScene extends Phaser.Scene {
    constructor() { super({ key: 'GameOverScene' }); }

    init(data) {
        this.score = data.score || 0;
        // チャレンジストリークリセット
        GameData.updateStats(gameData, 'challenge_reset');
    }

    create() {
        const { width, height } = this.scale;
        const selectedDogs = gameData.selectedDogs;

        // BGMを停止（即座に）
        AudioManager.stopBgm(0);

        // 🎯 桜井イズム：失敗を否定しない、優しい背景色
        this.add.rectangle(0, 0, width, height, 0x4A5568, 0.95).setOrigin(0);

        // 4匹の犬（しょんぼり表情で共感！）
        const dogsY = height * 0.22;
        selectedDogs.forEach((dogType, i) => {
            const x = width * (0.15 + i * 0.235);
            const dog = DogFaceRenderer.draw(this, x, dogsY, dogType, 18, 'sad');
            
            // 🐕 一緒にしょんぼり（でも励ます）
            this.tweens.add({
                targets: dog,
                y: dogsY - 5,
                duration: 600 + i * 50,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: i * 100
            });
        });

        // 🎯 桜井イズム：「ゲームオーバー」ではなく前向きな表現
        // → 否定的な表現を避け、次への意欲を促す
        const mainText = this.add.text(width / 2, height * 0.38, 'またあそぼ！', {
            ...TEXT_STYLE.heading,
            fontSize: '28px',
            color: '#FFFFFF',
            stroke: '#00000066',
            strokeThickness: 4,
        }).setOrigin(0.5).setScale(0);
        
        this.tweens.add({
            targets: mainText,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });

        // スコア表示（肯定的な表現に）
        this.add.text(width / 2, height * 0.48, 'おさんぽできたかず', {
            ...TEXT_STYLE.small,
            fontSize: '13px',
            color: '#CCCCCC',
        }).setOrigin(0.5);

        const scoreText = this.add.text(width / 2, height * 0.56, this.score.toString(), {
            ...TEXT_STYLE.score,
            fontSize: '56px',
        }).setOrigin(0.5).setScale(0);
        
        this.tweens.add({
            targets: scoreText,
            scale: 1,
            duration: 400,
            delay: 200,
            ease: 'Back.easeOut'
        });

        // ハイスコア
        const hs = gameData.stats.challengeHighScore || 0;
        const isNew = this.score > hs;

        if (isNew) {
            // 🎉 新記録！盛大にお祝い
            const newRecord = this.add.text(width / 2, height * 0.68, '🎉 あたらしいきろく！', {
                fontSize: '20px',
                fontFamily: 'KeiFont, sans-serif',
                color: '#FFD700',
                stroke: '#000000',
                strokeThickness: 3,
            }).setOrigin(0.5).setScale(0);
            
            this.tweens.add({
                targets: newRecord,
                scale: 1.1,
                duration: 400,
                delay: 400,
                ease: 'Back.easeOut',
                yoyo: true,
                repeat: 2
            });
            
            HapticManager.notification('Success');
        } else {
            // 次への励まし（桜井イズム: ワンコ視点で親しみやすく）
            this.add.text(width / 2, height * 0.68, 'わんこがまってるよ！', {
                fontSize: '14px',
                fontFamily: 'KeiFont, sans-serif',
                color: '#AAAAAA',
                stroke: '#00000044',
                strokeThickness: 2,
            }).setOrigin(0.5);
        }

        // 桜井イズム: 縁取りで視認性UP
        this.add.text(width / 2, height * 0.76, `🏆 ベスト: ${Math.max(hs, this.score)}`, {
            fontSize: '15px',
            fontFamily: 'KeiFont, sans-serif',
            color: '#FFD700',
            stroke: '#00000066',
            strokeThickness: 2,
        }).setOrigin(0.5);

        // シェアボタン
        this.time.delayedCall(300, () => {
            const shareBtn = ShareUtils.createShareButton(this, width / 2, height * 0.84, 'gameover', this.score, isNew);
            shareBtn.setScale(0);
            this.tweens.add({ targets: shareBtn, scale: 1, duration: 300, ease: 'Back.easeOut' });
        });

        // 🎯 桜井イズム：リトライボタンを目立たせて再挑戦を促す
        this.time.delayedCall(400, () => {
            // リトライボタン（大きく、目立つ色で！）
            const retryBtn = this.createButton(width / 2, height * 0.92, 'もういっかい！', DOG_TYPES[1].color, async () => {
                HapticManager.impact('Light');
                try {
                    await AdManager.onStageEnd();
                } catch (e) {
                    console.log('広告表示スキップ:', e.message);
                }
                this.cameras.main.fadeOut(200);
                this.time.delayedCall(200, () => {
                    this.scene.start('GameScene', { mode: 'challenge' });
                });
            });
            retryBtn.setScale(0);
            this.tweens.add({ 
                targets: retryBtn, 
                scale: 1, 
                duration: 300, 
                ease: 'Back.easeOut',
                onComplete: () => {
                    // ボタンを軽くバウンスさせて注目を集める
                    this.tweens.add({
                        targets: retryBtn,
                        scale: 1.05,
                        duration: 500,
                        yoyo: true,
                        repeat: 2,
                        ease: 'Sine.easeInOut'
                    });
                }
            });
        });
        
        // メニューへ戻るリンク（桜井イズム: ワンコらしい表現で）
        const backLink = this.add.text(width / 2, height - SAFE.BOTTOM - 20, 'おうちにかえる！', {
            fontSize: '12px',
            fontFamily: 'KeiFont, sans-serif',
            color: '#888888',
            stroke: '#00000033',
            strokeThickness: 1,
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        backLink.on('pointerup', () => {
            this.cameras.main.fadeOut(200);
            this.time.delayedCall(200, () => this.scene.start('MainMenuScene'));
        });
    }

    createButton(x, y, text, color, cb) {
        const btn = this.add.container(x, y);
        const btnW = 150;  // 🎯 モバイル基準：大きめに
        const btnH = 48;

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
        bg.lineStyle(2, 0xFFFFFF, 0.5);
        bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

        const txt = this.add.text(0, 0, text, {
            ...TEXT_STYLE.button,
            fontSize: '18px',
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(btnW, btnH);
        btn.setInteractive({ useHandCursor: true });

        // 🎯 桜井イズム：気持ちいいフィードバック
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.92, duration: 40 });
            HapticManager.impact('Light');
        });
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, scale: 1.05, duration: 80, yoyo: true });
            cb();
        });
        btn.on('pointerout', () => {
            this.tweens.add({ targets: btn, scale: 1, duration: 80 });
        });

        return btn;
    }
}

// ========================================
// ショップシーン（行動経済学に基づくUI/UX）
// ========================================
// 🎯 デザイン原則:
// 1. ヒーロー商品を大きく目立たせる
// 2. 価格比較を視覚的に分かりやすく（元値取り消し線）
// 3. バッジで社会的証明を活用
// 4. スクロール可能でストレスなく閲覧
// ========================================
class ShopScene extends Phaser.Scene {
    constructor() { super({ key: 'ShopScene' }); }

    create() {
        const { width, height } = this.scale;

        AudioManager.playBgm(this, 'bgm_select');

        // 🎨 背景画像を設定（画面にフィット）
        const bg = this.add.image(width / 2, height / 2, 'shop_bg');
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(0);

        this.createHeader();
        this.createProducts();

        this.cameras.main.fadeIn(300);
    }

    createHeader() {
        const { width } = this.scale;
        const headerY = SAFE.TOP;

        // 戻るボタン（メインメニューと同じ背景付きスタイル）
        this.createBackButton(50, headerY + 32);

        // タイトル（変更なし）
        const titleText = this.add.text(width / 2, headerY + 32, '🛒 ショップ', {
            ...TEXT_STYLE.heading,
            fontSize: '22px',
        }).setOrigin(0.5);
        titleText.setDepth(101);

        // 購入復元ボタン（iOS審査必須）
        this.createRestoreButton(width - 60, headerY + 32);
    }

    // 購入復元ボタン
    createRestoreButton(x, y) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRoundedRect(-40, -14, 80, 28, 8);
        bg.lineStyle(2, 0x4CAF50, 1);
        bg.strokeRoundedRect(-40, -14, 80, 28, 8);

        const txt = this.add.text(0, 0, '🔄 復元', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#4CAF50',
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(80, 28);
        btn.setInteractive({ useHandCursor: true });
        btn.setDepth(101);

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', () => this.restorePurchases());

        return btn;
    }

    // 購入復元処理
    async restorePurchases() {
        const { width, height } = this.scale;

        // ローディング表示
        const loadingText = this.add.text(width / 2, height / 2, '復元ちゅう...', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#5D4037',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(400);

        try {
            const result = await PurchaseManager.restorePurchases();
            loadingText.destroy();

            if (result.success && result.restored.length > 0) {
                // 復元成功
                HapticManager.notification('Success');
                AudioManager.playSfx(this, 'sfx_achievement');

                // ゲームデータに反映
                if (PurchaseManager.isAdsRemoved && PurchaseManager.isAdsRemoved()) {
                    gameData.purchases.adFree = true;
                    AdManager.removeAds();
                }
                GameData.save(gameData);

                const restoredText = result.restored.join('、');
                this.showRestoreSuccess(`${restoredText}\nを復元しました！`);
            } else {
                // 復元するものがない
                this.showPurchaseError(result.error || '復元する購入がありませんでした');
            }

        } catch (error) {
            loadingText.destroy();
            console.error('復元エラー:', error);
            this.showPurchaseError('復元処理中にエラーが発生しました');
        }
    }

    // 復元成功表示
    showRestoreSuccess(message) {
        const { width, height } = this.scale;

        const successText = this.add.text(width / 2, height / 2, `✅ ${message}`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#4CAF50',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(401);

        this.tweens.add({
            targets: successText,
            scale: { from: 0.8, to: 1 },
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(2000, () => {
                    successText.destroy();
                    this.scene.restart();
                });
            }
        });
    }

    createBackButton(x, y) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRoundedRect(-38, -16, 76, 32, 10);
        bg.lineStyle(2.5, DOG_TYPES[3].color, 1);
        bg.strokeRoundedRect(-38, -16, 76, 32, 10);

        // 桜井イズム: KeiFont + 縁取りで統一感
        const txt = this.add.text(0, 0, '← もどる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#5D4037',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(76, 32);
        btn.setInteractive({ useHandCursor: true });
        btn.setDepth(101);

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('MainMenuScene'));
        });

        return btn;
    }

    createProducts() {
        const { width, height } = this.scale;
        const startY = SAFE.TOP + 85;
        
        // StoreKitから実際の価格を取得してSHOP_ITEMSに反映
        const products = Object.values(SHOP_ITEMS).map(product => {
            const storePrice = PurchaseManager.getFormattedPrice(product.storeProductId);
            return {
                ...product,
                displayPrice: storePrice !== '---' ? storePrice : product.fallbackPrice,
            };
        });
        let currentY = startY;

        products.forEach((product, i) => {
            if (product.isHero) {
                // ★ ヒーロー商品は大きく表示
                this.createHeroCard(width / 2, currentY, product);
                currentY += 175;  // ヒーロー商品の後に十分な間隔を確保
            } else {
                // 通常商品
                this.createProductCard(width / 2, currentY, product);
                currentY += 95;
            }
        });
    }

    // ★ ヒーロー商品カード（行動経済学：アンカリング＋社会的証明）
    createHeroCard(x, y, product) {
        const { width } = this.scale;
        const cardW = width - 20;  // 幅を広く
        const cardH = 155;  // 高さを大きく
        const isPurchased = gameData.purchases?.[product.id]
            || (product.id === 'deluxe' && gameData.purchases?.adFree && gameData.purchases?.allCustomize);

        const card = this.add.container(x, y);

        // 🎨 ゴールドのグロー効果
        const glow = this.add.graphics();
        glow.fillStyle(0xFFD700, 0.25);
        glow.fillRoundedRect(-cardW / 2 - 6, -6, cardW + 12, cardH + 12, 20);
        card.add(glow);

        // アニメーション（キラキラ）
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.15, to: 0.35 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // メイン背景
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFDF0, 1);
        bg.fillRoundedRect(-cardW / 2, 0, cardW, cardH, 16);
        bg.lineStyle(3, 0xFFD700, 1);
        bg.strokeRoundedRect(-cardW / 2, 0, cardW, cardH, 16);
        card.add(bg);

        // 🎉 バッジ（社会的証明）- 大きく目立つように！
        if (product.badge && !isPurchased) {
            // メインバッジ（一番人気！）- コンテナにまとめて一体化
            const mainBadge = this.add.container(-cardW / 2 + 65, 0);
            const badgeBg = this.add.graphics();
            badgeBg.fillStyle(0xFF2222, 1);
            badgeBg.fillRoundedRect(-60, -18, 120, 36, 18);
            // キラキラ枠
            badgeBg.lineStyle(3, 0xFFFF00, 1);
            badgeBg.strokeRoundedRect(-60, -18, 120, 36, 18);
            mainBadge.add(badgeBg);

            const badgeText = this.add.text(0, 0, product.badge, {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '18px',
                color: '#FFFFFF',
                fontStyle: 'bold',
                stroke: '#FF0000',
                strokeThickness: 2,
            }).setOrigin(0.5);
            mainBadge.add(badgeText);
            card.add(mainBadge);

            // バッジのキラキラアニメーション
            this.tweens.add({
                targets: mainBadge,
                scale: { from: 1, to: 1.08 },
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

        }

        // アイコン（画像アイコン）- 大きく！
        const iconSize = 85;
        const icon = this.add.image(-cardW / 2 + 55, cardH / 2 + 8, product.iconKey);
        icon.setDisplaySize(iconSize, iconSize).setOrigin(0.5);
        if (isPurchased) {
            icon.setTint(0xAAAAAA);
            icon.setAlpha(0.7);
        }
        card.add(icon);

        // 商品名（大きく目立つ）- さらに大きく！
        const nameText = this.add.text(-cardW / 2 + 100, 28, product.name, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '26px',
            color: isPurchased ? '#999999' : '#5D4037',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0, 0);
        card.add(nameText);

        // 説明
        const descText = this.add.text(-cardW / 2 + 100, 62, product.description, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#666666',
            wordWrap: { width: cardW - 200 },
            lineSpacing: 4,
        }).setOrigin(0, 0);
        card.add(descText);

        // 価格エリア
        if (isPurchased) {
            const purchasedText = this.add.text(cardW / 2 - 20, cardH / 2, '✓ 購入ずみ', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '16px',
                color: '#4CAF50',
                fontStyle: 'bold',
                stroke: '#FFFFFF',
                strokeThickness: 2,
            }).setOrigin(1, 0.5);
            card.add(purchasedText);
        } else {
            // 現在価格（StoreKitから取得した実価格を表示）
            const priceBg = this.add.graphics();
            priceBg.fillStyle(product.color, 1);
            priceBg.fillRoundedRect(cardW / 2 - 110, cardH / 2 - 5, 100, 50, 14);
            priceBg.lineStyle(3, 0xFFFFFF, 0.5);
            priceBg.strokeRoundedRect(cardW / 2 - 110, cardH / 2 - 5, 100, 50, 14);
            card.add(priceBg);

            const priceLabel = this.add.text(cardW / 2 - 60, cardH / 2 + 20, product.displayPrice, {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '22px',
                color: '#FFFFFF',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 1,
            }).setOrigin(0.5);
            card.add(priceLabel);
        }

        if (!isPurchased) {
            // ★ 透明なRectangleをhitAreaとして追加（Container直接のsetInteractiveは座標不整合が起きやすい）
            const hitArea = this.add.rectangle(0, cardH / 2, cardW, cardH, 0x000000, 0);
            hitArea.setInteractive({ useHandCursor: true });
            card.add(hitArea);
            card.sendToBack(hitArea);  // 背景より後ろに配置（視覚的には見えない）

            hitArea.on('pointerdown', () => {
                this.tweens.add({ targets: card, scale: 0.97, duration: 40 });
                HapticManager.impact('Light');
            });
            hitArea.on('pointerup', () => {
                this.tweens.add({ targets: card, scale: 1.02, duration: 80, yoyo: true });
                this.processPurchase(product);
            });
            hitArea.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 80 }));
        }
    }

    // 通常商品カード
    createProductCard(x, y, product) {
        const { width } = this.scale;
        const cardW = width - 36;
        const cardH = 82;
        
        // ワンちゃん単品の場合、購入済みかどうかを別途判定
        const isPurchased = product.isSingleDog 
            ? false  // 何度でも買える
            : (gameData.purchases?.[product.id] || gameData.purchases?.deluxe);

        const card = this.add.container(x, y);

        // 🎨 背景
        const bg = this.add.graphics();
        if (isPurchased) {
            bg.fillStyle(0xF5F5F5, 1);
            bg.fillRoundedRect(-cardW / 2, 0, cardW, cardH, 14);
        } else {
            bg.fillStyle(0xFFFFFF, 1);
            bg.fillRoundedRect(-cardW / 2, 0, cardW, cardH, 14);
            bg.lineStyle(2, 0xE8E8E8, 1);
            bg.strokeRoundedRect(-cardW / 2, 0, cardW, cardH, 14);
        }
        card.add(bg);

        // アイコン（画像アイコン）
        const iconSize = 52;
        const icon = this.add.image(-cardW / 2 + 38, cardH / 2, product.iconKey);
        icon.setDisplaySize(iconSize, iconSize).setOrigin(0.5);
        if (isPurchased) {
            icon.setTint(0xAAAAAA);
            icon.setAlpha(0.7);
        }
        card.add(icon);

        // 商品名
        const nameText = this.add.text(-cardW / 2 + 70, 16, product.name, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '17px',
            color: isPurchased ? '#999999' : '#5D4037',
            fontStyle: 'bold',
        }).setOrigin(0, 0);
        card.add(nameText);

        // 説明
        const descText = this.add.text(-cardW / 2 + 70, 40, product.description, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '11px',
            color: '#777777',
            wordWrap: { width: cardW - 170 },
            lineSpacing: 2,
        }).setOrigin(0, 0);
        card.add(descText);

        // 価格
        if (isPurchased) {
            const purchasedText = this.add.text(cardW / 2 - 15, cardH / 2, '✓ 購入ずみ', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '13px',
                color: '#4CAF50',
                fontStyle: 'bold',
            }).setOrigin(1, 0.5);
            card.add(purchasedText);
        } else {
            const priceBg = this.add.graphics();
            priceBg.fillStyle(product.color, 1);
            priceBg.fillRoundedRect(cardW / 2 - 78, cardH / 2 - 15, 68, 30, 10);
            card.add(priceBg);

            const priceLabel = this.add.text(cardW / 2 - 44, cardH / 2, product.displayPrice, {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '14px',
                color: '#FFFFFF',
                fontStyle: 'bold',
            }).setOrigin(0.5);
            card.add(priceLabel);
        }

        if (!isPurchased) {
            // ★ 透明なRectangleをhitAreaとして追加（Container直接のsetInteractiveは座標不整合が起きやすい）
            const hitArea = this.add.rectangle(0, cardH / 2, cardW, cardH, 0x000000, 0);
            hitArea.setInteractive({ useHandCursor: true });
            card.add(hitArea);
            card.sendToBack(hitArea);  // 背景より後ろに配置（視覚的には見えない）

            hitArea.on('pointerdown', () => {
                this.tweens.add({ targets: card, scale: 0.96, duration: 40 });
                HapticManager.impact('Light');
            });
            hitArea.on('pointerup', () => {
                this.tweens.add({ targets: card, scale: 1.02, duration: 80, yoyo: true });
                
                // ワンちゃん単品の場合は選択モーダルを表示
                if (product.isSingleDog) {
                    this.showDogSelectModal();
                } else {
                    this.processPurchase(product);
                }
            });
            hitArea.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 80 }));
        }
    }

    // 🐕 ワンちゃん選択モーダル（ずかん風3列レイアウト）
    showDogSelectModal() {
        const { width, height } = this.scale;

        // オーバーレイ
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
            .setOrigin(0).setDepth(200).setInteractive();

        // 未解放の犬をリストアップ（ゴールデンわんこID=29は除外：レア犬）
        const unlockedDogs = gameData.unlockedDogs || [];
        const lockedDogs = Object.entries(DOG_TYPES)
            .filter(([id, data]) => {
                const dogId = parseInt(id);
                // ゴールデンわんこ（ID=29）は除外（レア犬として別扱い）
                if (dogId === 29) return false;
                return !unlockedDogs.includes(dogId) && !data.isSecret;
            });

        // モーダル背景（画面をもっと使う・固定高さ）
        const modalW = width - 30;
        const cols = 3;
        const cellSize = 100;
        const gap = 8;
        const rowHeight = cellSize + gap + 14;
        const visibleRows = 4;  // 表示行数
        const gridVisibleHeight = visibleRows * rowHeight;
        const modalH = gridVisibleHeight + 120;  // タイトル・閉じるボタン分
        const modalY = height / 2 - modalH / 2;

        // 全行数を計算
        const totalRows = Math.ceil(lockedDogs.length / cols);
        const gridTotalHeight = totalRows * rowHeight;

        const modalBg = this.add.graphics().setDepth(201);
        // 影
        modalBg.fillStyle(0x000000, 0.1);
        modalBg.fillRoundedRect(width / 2 - modalW / 2 + 4, modalY + 4, modalW, modalH, 20);
        // 本体
        modalBg.fillStyle(0xFFFFFF, 1);
        modalBg.fillRoundedRect(width / 2 - modalW / 2, modalY, modalW, modalH, 20);
        // 上部アクセントライン（ブラウン）
        modalBg.fillStyle(0x8D6E63, 0.7);
        modalBg.fillRoundedRect(width / 2 - modalW / 2, modalY, modalW, 6, { tl: 20, tr: 20, bl: 0, br: 0 });

        // タイトル
        const title = this.add.text(width / 2, modalY + 35, '🐕 迎えるワンコを選ぼう！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#5D4037',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(202);

        // 犬グリッド（ずかん風）
        const gridStartY = modalY + 70;
        const gridEndY = gridStartY + gridVisibleHeight - 10;
        const totalW = cols * cellSize + (cols - 1) * gap;
        const startX = (width - totalW) / 2 + cellSize / 2;

        const dogButtons = [];

        // スクロール用コンテナ
        const scrollContainer = this.add.container(0, 0).setDepth(202);

        // スクロール状態管理
        let scrollY = 0;
        let isScrolling = false;

        if (lockedDogs.length === 0) {
            // 全部解放済み
            const noDogsText = this.add.text(width / 2, modalY + modalH / 2, 'すべてのワンコを\nお迎えしました！🐶', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '16px',
                color: '#5D4037',
                align: 'center',
            }).setOrigin(0.5).setDepth(202);
            dogButtons.push(noDogsText);
        } else {
            lockedDogs.forEach(([id, dog], i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const cx = startX + col * (cellSize + gap);
                const cy = gridStartY + row * rowHeight + cellSize / 2;

                const btn = this.add.container(cx, cy);

                // ずかん風カード背景（統一枠色）
                const bg = this.add.graphics();
                // 影
                bg.fillStyle(0x000000, 0.06);
                bg.fillRoundedRect(-cellSize / 2 + 3, -cellSize / 2 + 3, cellSize, cellSize, 14);
                // カード本体（アイボリー）
                bg.fillStyle(0xFFFBF5, 1);
                bg.fillRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 14);
                // 統一枠線（ブラウン系）
                bg.lineStyle(2.5, 0xA1887F, 1);
                bg.strokeRoundedRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 14);
                btn.add(bg);

                // 犬の顔（大きく表示）
                const face = DogFaceRenderer.draw(this, 0, -8, parseInt(id), 22, 'happy');
                btn.add(face);

                // 名前（見やすく・長い名前は2行に）
                const nameLabel = this.add.text(0, cellSize / 2 - 22, dog.name, {
                    fontFamily: 'KeiFont, sans-serif',
                    fontSize: '11px',
                    color: '#5D4037',
                    fontStyle: 'bold',
                    align: 'center',
                    wordWrap: { width: cellSize - 10, useAdvancedWrap: true },
                }).setOrigin(0.5);
                btn.add(nameLabel);

                btn.setSize(cellSize, cellSize);
                btn.setInteractive({ useHandCursor: true });

                btn.on('pointerdown', (pointer) => {
                    // マスク範囲外ならスキップ
                    if (pointer.y < gridStartY || pointer.y > gridEndY) return;
                    if (isScrolling) return;
                    this.tweens.add({ targets: btn, scale: 0.92, duration: 40 });
                });
                btn.on('pointerup', (pointer) => {
                    // マスク範囲外ならスキップ（表示されてない領域のタップ防止）
                    if (pointer.y < gridStartY || pointer.y > gridEndY) return;
                    if (isScrolling) return;
                    HapticManager.notification('Success');
                    this.purchaseSingleDog(parseInt(id), dog, overlay, modalBg, title, closeBtn, dogButtons, scrollContainer);
                });
                btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));

                scrollContainer.add(btn);
                dogButtons.push(btn);
            });
        }

        // スクロール用マスク（常に適用）
        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(width / 2 - modalW / 2, gridStartY, modalW, gridVisibleHeight - 10);
        const mask = maskGraphics.createGeometryMask();
        scrollContainer.setMask(mask);

        // スクロール制御
        const maxScroll = Math.max(0, gridTotalHeight - gridVisibleHeight + 10);
        let isDragging = false;
        let dragStartY = 0;
        let scrollStartY = 0;

        overlay.on('pointerdown', (pointer) => {
            if (pointer.y >= gridStartY && pointer.y <= gridEndY) {
                isDragging = true;
                dragStartY = pointer.y;
                scrollStartY = scrollY;
                isScrolling = false;
            }
        });
        overlay.on('pointermove', (pointer) => {
            if (!isDragging) return;
            const delta = Math.abs(pointer.y - dragStartY);
            if (delta > 8) {
                isScrolling = true;  // スクロール中フラグ（タップ防止）
            }
            scrollY = Phaser.Math.Clamp(scrollStartY - (pointer.y - dragStartY), 0, maxScroll);
            scrollContainer.y = -scrollY;
        });
        overlay.on('pointerup', () => {
            isDragging = false;
            // 少し遅延してスクロールフラグをリセット
            this.time.delayedCall(50, () => {
                isScrolling = false;
            });
        });

        // 閉じるボタン
        const closeBtn = this.add.text(width / 2, modalY + modalH - 30, '× とじる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#999999',
            fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerup', () => {
            overlay.destroy();
            modalBg.destroy();
            title.destroy();
            closeBtn.destroy();
            scrollContainer.destroy();
            dogButtons.forEach(b => b.destroy());
        });
    }

    // ワンちゃん1匹購入（実際のIAP購入処理を実行）
    async purchaseSingleDog(dogId, dog, overlay, modalBg, title, closeBtn, dogButtons, scrollContainer) {
        const { width, height } = this.scale;
        
        // ローディング表示
        const loadingText = this.add.text(width / 2, height / 2, 'しょりちゅう...', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#5D4037',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(400);

        try {
            // 実際のIAP購入処理を呼び出す
            console.log('[Shop] ワンコを迎える購入開始: dogId=', dogId);
            const purchaseResult = await PurchaseManager.purchaseSingleDog();
            console.log('[Shop] ワンコを迎える購入結果:', purchaseResult);

            loadingText.destroy();

            if (purchaseResult.success) {
                // UIをクリーンアップ
                overlay.destroy();
                modalBg.destroy();
                title.destroy();
                closeBtn.destroy();
                if (scrollContainer) scrollContainer.destroy();
                dogButtons.forEach(b => b.destroy());

                // 犬を解放
                if (!gameData.unlockedDogs.includes(dogId)) {
                    gameData.unlockedDogs.push(dogId);
                    const today = new Date().toISOString().split('T')[0];
                    gameData.dogUnlockDates[dogId] = today;
                    GameData.save(gameData);
                }

                HapticManager.notification('Success');
                AudioManager.playSfx(this, 'sfx_achievement');
                this.showPurchaseSuccess({ name: dog.name, icon: '🐕' });
            } else {
                // 購入キャンセルまたはエラー - モーダルは閉じない
                HapticManager.notification('Error');
                this.showPurchaseError(purchaseResult.error || '購入がキャンセルされました');
            }

        } catch (error) {
            loadingText.destroy();
            console.error('[Shop] ワンコを迎える購入エラー:', error);
            HapticManager.notification('Error');
            this.showPurchaseError('購入処理中にエラーが発生しました');
        }
    }

    // 購入処理（実際のIAP使用）
    async processPurchase(product) {
        if (product.id === 'deluxe' && gameData.purchases?.adFree && gameData.purchases?.allCustomize) {
            return;
        }

        // ローディング表示
        const { width, height } = this.scale;
        const loadingText = this.add.text(width / 2, height / 2, 'しょりちゅう...', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#5D4037',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(400);

        try {
            let purchaseResult;

            // 商品タイプに応じて購入処理
            if (product.id === 'deluxe') {
                // プレミアムセット（広告削除＋いろどりパック）
                purchaseResult = await PurchaseManager.purchaseDeluxe();
            } else if (product.id === 'allCustomize') {
                // いろどりパック
                purchaseResult = await PurchaseManager.purchaseCustomize();
            } else if (product.id === 'adFree') {
                // 広告削除
                purchaseResult = await PurchaseManager.purchaseRemoveAds();
            } else if (product.id === 'singleDog') {
                // ワンコを迎える（消費型）
                purchaseResult = await PurchaseManager.purchaseSingleDog();
            } else {
                // 未知の商品
                purchaseResult = { success: false, error: '不明な商品です' };
            }

            loadingText.destroy();

            if (purchaseResult.success) {
                HapticManager.notification('Success');
                AudioManager.playSfx(this, 'sfx_achievement');

                // 購入状態を保存
                gameData.purchases[product.id] = true;
                if (product.id === 'deluxe') {
                    gameData.purchases.adFree = true;
                    gameData.purchases.allCustomize = true;
                    AdManager.removeAds();
                }
                if (product.id === 'adFree') {
                    AdManager.removeAds();
                }
                GameData.save(gameData);

                this.showPurchaseSuccess(product);
            } else {
                // 購入キャンセルまたはエラー
                this.showPurchaseError(purchaseResult.error || '購入がキャンセルされました');
            }

        } catch (error) {
            loadingText.destroy();
            console.error('購入エラー:', error);
            this.showPurchaseError('購入処理中にエラーが発生しました');
        }
    }

    // 購入エラー表示
    showPurchaseError(message) {
        const { width, height } = this.scale;

        HapticManager.notification('Error');

        const errorText = this.add.text(width / 2, height / 2, `⚠️ ${message}`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#D32F2F',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(401);

        this.tweens.add({
            targets: errorText,
            alpha: { from: 1, to: 0 },
            duration: 2000,
            delay: 1500,
            onComplete: () => errorText.destroy()
        });
    }

    showPurchaseSuccess(product) {
        const { width, height } = this.scale;

        // エフェクト（キラキラ）
        for (let i = 0; i < 25; i++) {
            const x = Phaser.Math.Between(50, width - 50);
            const y = height / 2;
            const emoji = ['✨', '🎉', '⭐'][i % 3];
            const particle = this.add.text(x, y, emoji, { fontSize: '28px' }).setAlpha(0).setDepth(300);

            this.tweens.add({
                targets: particle,
                y: y - Phaser.Math.Between(80, 200),
                alpha: { from: 1, to: 0 },
                scale: { from: 1.2, to: 0.3 },
                duration: 1200,
                delay: i * 40,
                onComplete: () => particle.destroy()
            });
        }

        const successText = this.add.text(width / 2, height / 2, `${product.icon} ${product.name}\n購入完了！`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#5D4037',
            fontStyle: 'bold',
            align: 'center',
            stroke: '#FFFFFF',
            strokeThickness: 5,
        }).setOrigin(0.5).setScale(0).setDepth(301);

        this.tweens.add({
            targets: successText,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(1500, () => {
                    successText.destroy();
                    this.scene.restart();
                });
            }
        });
    }
}

// ========================================
// 設定シーン
// ========================================
class SettingsScene extends Phaser.Scene {
    constructor() { super({ key: 'SettingsScene' }); }

    create() {
        const { width, height } = this.scale;

        AudioManager.playBgm(this, 'bgm_select');

        // 🎨 背景画像を設定（画面にフィット）
        const bg = this.add.image(width / 2, height / 2, 'settei_bg');
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(0);

        this.createHeader();
        this.createSettings();

        this.cameras.main.fadeIn(300);
    }

    createHeader() {
        const { width } = this.scale;
        const headerY = SAFE.TOP;

        // もどるボタン（メインメニューと同じテロップスタイル）
        this.createBackButton(50, headerY + 32);

        // タイトル（メインメニューと統一）
        const titleText = this.add.text(width / 2, headerY + 32, '⚙️ せってい', {
            ...TEXT_STYLE.heading,
            fontSize: '22px',
        }).setOrigin(0.5);
        titleText.setDepth(101);
    }

    createBackButton(x, y) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRoundedRect(-38, -16, 76, 32, 10);
        bg.lineStyle(2.5, DOG_TYPES[3].color, 1);
        bg.strokeRoundedRect(-38, -16, 76, 32, 10);

        // 桜井イズム: KeiFont + 縁取りで統一感
        const txt = this.add.text(0, 0, '← もどる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#5D4037',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(76, 32);
        btn.setInteractive({ useHandCursor: true });
        btn.setDepth(101);

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('TitleScene'));
        });

        return btn;
    }

    createSettings() {
        const { width, height } = this.scale;
        const startY = SAFE.TOP + 100;

        // ========================================
        // 🔊 サウンド設定セクション
        // ========================================
        const soundSectionBg = this.add.graphics();
        // 影
        soundSectionBg.fillStyle(0x90A4AE, 0.25);
        soundSectionBg.fillRoundedRect(18, startY - 15, width - 32, 175, 16);
        // メイン背景
        soundSectionBg.fillStyle(0xFAFAFA, 0.98);
        soundSectionBg.fillRoundedRect(15, startY - 20, width - 30, 175, 16);
        // 上部アクセントライン（グレー！）
        soundSectionBg.fillStyle(0x607D8B, 0.5);
        soundSectionBg.fillRoundedRect(15, startY - 20, width - 30, 5, { tl: 16, tr: 16, bl: 0, br: 0 });

        // BGM音量スライダー
        this.createVolumeSlider(width / 2, startY + 25, '🎵 BGM', 
            typeof gameData.settings.bgmVolume === 'number' ? gameData.settings.bgmVolume : 1.0, 
            (val) => {
                gameData.settings.bgmVolume = val;
                AudioManager.setBgmVolume(val);
                GameData.save(gameData);
            }
        );

        // SE音量スライダー
        this.createVolumeSlider(width / 2, startY + 100, '🔊 SE', 
            typeof gameData.settings.seVolume === 'number' ? gameData.settings.seVolume : 1.0, 
            (val) => {
                gameData.settings.seVolume = val;
                AudioManager.setSeVolume(val);
                GameData.save(gameData);
            },
            () => {
                // スライダー操作終了時にSEをテスト再生
                AudioManager.playSfx(this, 'sfx_ui_tap');
            }
        );

        // ========================================
        // 📋 その他セクション（ストア要件対応）
        // ========================================
        const otherSectionY = startY + 200;
        const otherSectionBg = this.add.graphics();
        // 影
        otherSectionBg.fillStyle(0x90A4AE, 0.25);
        otherSectionBg.fillRoundedRect(18, otherSectionY - 15, width - 32, 145, 16);
        // メイン背景
        otherSectionBg.fillStyle(0xFAFAFA, 0.98);
        otherSectionBg.fillRoundedRect(15, otherSectionY - 20, width - 30, 145, 16);
        // 上部アクセントライン（ブルー系）
        otherSectionBg.fillStyle(0x4FC3F7, 0.5);
        otherSectionBg.fillRoundedRect(15, otherSectionY - 20, width - 30, 5, { tl: 16, tr: 16, bl: 0, br: 0 });

        // 🔄 購入を復元（iOS必須）
        this.createLinkButton(width / 2, otherSectionY + 20, '🔄 購入を復元', () => {
            this.onRestorePurchases();
        });

        // 📄 プライバシーポリシー（ストア必須）
        this.createLinkButton(width / 2, otherSectionY + 80, '📄 プライバシーポリシー', () => {
            this.onPrivacyPolicy();
        });

        // ========================================
        // ⚠️ 危険操作セクション（最下部）
        // ========================================
        this.createButton(width / 2, height - SAFE.BOTTOM - 80, '🗑️ データをリセット', 0xFF6B6B, () => {
            this.showResetConfirm();
        });
    }

    // 🔗 リンク風ボタン（桜井イズム：控えめだが押しやすい）
    createLinkButton(x, y, text, cb) {
        const { width } = this.scale;
        const btnW = width - 70;

        const container = this.add.container(x, y);

        // 背景（タップ領域を明確に）
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 1);
        bg.fillRoundedRect(-btnW / 2, -24, btnW, 48, 12);
        bg.lineStyle(2, 0xE0E0E0, 1);
        bg.strokeRoundedRect(-btnW / 2, -24, btnW, 48, 12);

        // テキスト（桜井イズム: 縁取りで視認性UP）
        const labelText = this.add.text(0, 0, text, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '17px',
            color: '#5D4037',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        // 右矢印（タップ可能であることを示す）
        const arrow = this.add.text(btnW / 2 - 20, 0, '›', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#9E9E9E',
        }).setOrigin(0.5);

        container.add([bg, labelText, arrow]);
        container.setSize(btnW, 48);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => {
            this.tweens.add({ targets: container, scale: 0.97, duration: 50 });
            bg.clear();
            bg.fillStyle(0xF5F5F5, 1);
            bg.fillRoundedRect(-btnW / 2, -24, btnW, 48, 12);
            bg.lineStyle(2, 0xE0E0E0, 1);
            bg.strokeRoundedRect(-btnW / 2, -24, btnW, 48, 12);
        });
        container.on('pointerup', () => {
            this.tweens.add({ targets: container, scale: 1, duration: 100, ease: 'Back.easeOut' });
            bg.clear();
            bg.fillStyle(0xFFFFFF, 1);
            bg.fillRoundedRect(-btnW / 2, -24, btnW, 48, 12);
            bg.lineStyle(2, 0xE0E0E0, 1);
            bg.strokeRoundedRect(-btnW / 2, -24, btnW, 48, 12);
            cb();
        });
        container.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1, duration: 80 });
            bg.clear();
            bg.fillStyle(0xFFFFFF, 1);
            bg.fillRoundedRect(-btnW / 2, -24, btnW, 48, 12);
            bg.lineStyle(2, 0xE0E0E0, 1);
            bg.strokeRoundedRect(-btnW / 2, -24, btnW, 48, 12);
        });

        return container;
    }

    // 🔄 購入を復元
    async onRestorePurchases() {
        const { width, height } = this.scale;

        const loadingText = this.add.text(width / 2, height / 2, '復元ちゅう...', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#5D4037',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5).setDepth(400);

        try {
            const result = await PurchaseManager.restorePurchases();
            loadingText.destroy();

            if (result.success && result.restored.length > 0) {
                HapticManager.notification('Success');

                if (PurchaseManager.isAdsRemoved && PurchaseManager.isAdsRemoved()) {
                    gameData.purchases.adFree = true;
                    AdManager.removeAds();
                }
                GameData.save(gameData);

                const restoredText = result.restored.join('、');
                this.showToast(`${restoredText} を復元しました！`);
            } else {
                this.showToast(result.error || '復元する購入がありませんでした');
            }

        } catch (error) {
            loadingText.destroy();
            console.error('復元エラー:', error);
            this.showToast('復元処理中にエラーが発生しました');
        }
    }

    // 📄 プライバシーポリシー（アプリ内ブラウザで表示）
    async onPrivacyPolicy() {
        const privacyUrl = 'https://kerofen.github.io/inusanpo/privacy-policy.html';
        try {
            await Browser.open({ url: privacyUrl });
        } catch (e) {
            // フォールバック（Web環境など）
            window.open(privacyUrl, '_blank');
        }
    }

    // 🍞 トースト通知（桜井イズム：控えめなフィードバック）
    showToast(message) {
        const { width, height } = this.scale;
        
        const toast = this.add.container(width / 2, height - SAFE.BOTTOM - 150);
        toast.setAlpha(0);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 0.9);
        bg.fillRoundedRect(-120, -20, 240, 40, 20);
        
        const text = this.add.text(0, 0, message, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        
        toast.add([bg, text]);
        
        // フェードイン → 1.5秒待機 → フェードアウト
        this.tweens.add({
            targets: toast,
            alpha: 1,
            y: toast.y - 10,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(1500, () => {
                    this.tweens.add({
                        targets: toast,
                        alpha: 0,
                        y: toast.y + 10,
                        duration: 200,
                        onComplete: () => toast.destroy()
                    });
                });
            }
        });
    }

    // 🎚️ 音量スライダー（桜井イズム：直感的で美しいUI）
    createVolumeSlider(x, y, label, initialValue, onChange, onRelease = null) {
        const { width } = this.scale;
        const sliderW = width - 70;
        const barWidth = sliderW - 150;  // ラベル分のスペースを確保（広めに）
        const barHeight = 8;
        const knobRadius = 14;
        const barStartX = -sliderW / 2 + 110;  // ラベルに被らないよう右に調整

        const container = this.add.container(x, y);

        // 🎨 背景
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 1);
        bg.fillRoundedRect(-sliderW / 2, -28, sliderW, 56, 14);
        bg.lineStyle(2, 0xE0E0E0, 1);
        bg.strokeRoundedRect(-sliderW / 2, -28, sliderW, 56, 14);

        // ラベル
        const labelText = this.add.text(-sliderW / 2 + 22, 0, label, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#5D4037',
            fontStyle: 'bold',
        }).setOrigin(0, 0.5);

        let currentValue = initialValue;

        // スライダーバー（背景）
        const barBg = this.add.graphics();
        barBg.fillStyle(0xE0E0E0, 1);
        barBg.fillRoundedRect(barStartX, -barHeight / 2, barWidth, barHeight, barHeight / 2);

        // スライダーバー（塗りつぶし）
        const barFill = this.add.graphics();

        // つまみ
        const knob = this.add.graphics();

        // 値を描画する関数
        const drawSlider = () => {
            const fillWidth = barWidth * currentValue;
            
            barFill.clear();
            if (fillWidth > 0) {
                barFill.fillStyle(0x4FC3F7, 1);
                barFill.fillRoundedRect(barStartX, -barHeight / 2, fillWidth, barHeight, barHeight / 2);
            }

            const knobX = barStartX + fillWidth;
            knob.clear();
            // 影
            knob.fillStyle(0x000000, 0.15);
            knob.fillCircle(knobX + 2, 2, knobRadius);
            // つまみ本体
            knob.fillStyle(0xFFFFFF, 1);
            knob.fillCircle(knobX, 0, knobRadius);
            knob.lineStyle(2, 0x4FC3F7, 1);
            knob.strokeCircle(knobX, 0, knobRadius);
            // 内側の装飾
            knob.fillStyle(0x4FC3F7, 0.3);
            knob.fillCircle(knobX, 0, knobRadius - 5);
        };

        drawSlider();

        container.add([bg, labelText, barBg, barFill, knob]);
        container.setSize(sliderW, 56);
        container.setInteractive({ useHandCursor: true, draggable: false });

        // ドラッグ操作でスライダーを動かす
        let isDragging = false;

        const updateValueFromPointer = (pointerX) => {
            // コンテナのワールド位置を取得
            const containerX = container.x;
            const localX = pointerX - containerX;
            
            // バーの範囲内に制限して値を計算
            const relativeX = localX - barStartX;
            const newValue = Math.max(0, Math.min(1, relativeX / barWidth));
            
            if (newValue !== currentValue) {
                currentValue = newValue;
                drawSlider();
                onChange(currentValue);
            }
        };

        container.on('pointerdown', (pointer) => {
            isDragging = true;
            updateValueFromPointer(pointer.x);
        });

        this.input.on('pointermove', (pointer) => {
            if (isDragging) {
                updateValueFromPointer(pointer.x);
            }
        });

        this.input.on('pointerup', () => {
            if (isDragging) {
                isDragging = false;
                if (onRelease) onRelease();
            }
        });
    }

    createToggle(x, y, label, initialValue, onChange) {
        const { width } = this.scale;
        const toggleW = width - 70;

        const container = this.add.container(x, y);

        // 🎨 桜井イズム：美しいトグル背景
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 1);
        bg.fillRoundedRect(-toggleW / 2, -28, toggleW, 56, 14);
        bg.lineStyle(2, 0xE0E0E0, 1);
        bg.strokeRoundedRect(-toggleW / 2, -28, toggleW, 56, 14);

        const labelText = this.add.text(-toggleW / 2 + 22, 0, label, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#5D4037',
            fontStyle: 'bold',
        }).setOrigin(0, 0.5);

        let isOn = initialValue;

        const toggleBg = this.add.graphics();
        const toggleCircle = this.add.graphics();

        const drawToggle = () => {
            toggleBg.clear();
            toggleBg.fillStyle(isOn ? 0x4CAF50 : 0xBDBDBD, 1);
            toggleBg.fillRoundedRect(toggleW / 2 - 75, -16, 55, 32, 16);

            toggleCircle.clear();
            toggleCircle.fillStyle(0xFFFFFF, 1);
            toggleCircle.fillCircle(isOn ? toggleW / 2 - 34 : toggleW / 2 - 61, 0, 13);
            // 影
            toggleCircle.lineStyle(1, 0x00000022, 1);
            toggleCircle.strokeCircle(isOn ? toggleW / 2 - 34 : toggleW / 2 - 61, 0, 13);
        };

        drawToggle();

        container.add([bg, labelText, toggleBg, toggleCircle]);
        container.setSize(toggleW, 56);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerdown', () => this.tweens.add({ targets: container, scale: 0.96, duration: 50 }));
        container.on('pointerup', () => {
            this.tweens.add({ targets: container, scale: 1, duration: 100, ease: 'Back.easeOut' });
            isOn = !isOn;
            drawToggle();
            onChange(isOn);
        });
        container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 80 }));
    }

    createButton(x, y, text, color, cb) {
        const btn = this.add.container(x, y);

        // 🎨 桜井イズム：美しいボタン
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-110, -25, 220, 50, 14);

        const txt = this.add.text(0, 0, text, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(220, 50);
        btn.setInteractive({ useHandCursor: true });
        
        btn.on('pointerdown', () => this.tweens.add({ targets: btn, scale: 0.94, duration: 50 }));
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, scale: 1, duration: 100, ease: 'Back.easeOut' });
            cb();
        });
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
    }

    showResetConfirm() {
        const { width, height } = this.scale;

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0);
        const dialog = this.add.container(width / 2, height / 2);

        // 🎨 桜井イズム：美しいダイアログ
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 1);
        bg.fillRoundedRect(-130, -80, 260, 160, 16);

        const title = this.add.text(0, -50, '⚠️ 確認', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '22px',
            color: '#5D4037',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        const msg = this.add.text(0, -5, 'すべてのデータを\nリセットしますか？', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#5D4037',
            align: 'center',
            lineSpacing: 4,
        }).setOrigin(0.5);

        const yesBtn = this.add.text(-50, 55, 'はい', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#FF6B6B',
            fontStyle: 'bold',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const noBtn = this.add.text(50, 55, 'いいえ', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '18px',
            color: '#4CAF50',
            fontStyle: 'bold',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        yesBtn.on('pointerdown', () => this.tweens.add({ targets: yesBtn, scale: 0.9, duration: 50 }));
        yesBtn.on('pointerup', () => {
            localStorage.removeItem(GameData.STORAGE_KEY);
            gameData = GameData.getDefaultData();
            this.scene.start('TitleScene');
        });
        yesBtn.on('pointerout', () => this.tweens.add({ targets: yesBtn, scale: 1, duration: 80 }));

        noBtn.on('pointerdown', () => this.tweens.add({ targets: noBtn, scale: 0.9, duration: 50 }));
        noBtn.on('pointerup', () => {
            this.tweens.add({ targets: noBtn, scale: 1, duration: 80 });
            overlay.destroy();
            dialog.destroy();
        });
        noBtn.on('pointerout', () => this.tweens.add({ targets: noBtn, scale: 1, duration: 80 }));

        dialog.add([bg, title, msg, yesBtn, noBtn]);
    }
}

// ========================================
// カスタマイズシーン（タブナビゲーション版）
// ========================================
class CustomizeScene extends Phaser.Scene {
    constructor() { super({ key: 'CustomizeScene' }); }

    create() {
        const { width, height } = this.scale;

        // 🎨 背景画像を設定（画面にフィット）
        const bg = this.add.image(width / 2, height / 2, 'kisekae_bg');
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(0);

        // タブ状態の初期化（前回選択を維持）
        this.currentTab = this.registry.get('customizeTab') || 'color';
        
        // コンテンツコンテナ（タブ切り替え時に破棄・再生成）
        this.contentContainer = null;
        
        this.createHeader();
        this.createTabs();
        this.showTabContent(this.currentTab);

        this.cameras.main.fadeIn(300);
    }

    createHeader() {
        const { width } = this.scale;
        const headerY = SAFE.TOP;

        // ヘッダー背景は削除（背景画像を活かす）

        // 戻るボタン（メインメニューと同じ背景付きスタイル）
        this.createBackButton(50, headerY + 28);

        // タイトル（メインメニューと統一）
        const titleText = this.add.text(width / 2, headerY + 28, '🎨 きせかえ', {
            ...TEXT_STYLE.heading,
            fontSize: '22px',
        }).setOrigin(0.5);
        titleText.setDepth(101);
    }

    createBackButton(x, y) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRoundedRect(-38, -16, 76, 32, 10);
        bg.lineStyle(2.5, DOG_TYPES[3].color, 1);
        bg.strokeRoundedRect(-38, -16, 76, 32, 10);

        // 桜井イズム: KeiFont + 縁取りで統一感
        const txt = this.add.text(0, 0, '← もどる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#5D4037',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(76, 32);
        btn.setInteractive({ useHandCursor: true });
        btn.setDepth(101);

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('MainMenuScene'));
        });

        return btn;
    }

    // ★ ハートピア風タブナビゲーション
    createTabs() {
        const { width } = this.scale;
        const tabY = SAFE.TOP + 75;

        // タブ背景
        const tabBg = this.add.graphics();
        tabBg.setDepth(99);
        tabBg.fillStyle(0xFFF5F7, 0.95);
        tabBg.fillRoundedRect(15, tabY - 8, width - 30, 50, 12);

        const tabs = [
            { id: 'color', iconKey: 'menu_color', label: 'カラー' },
            { id: 'costume', iconKey: 'menu_costume', label: '衣装' },
            { id: 'theme', iconKey: 'menu_theme', label: 'テーマ' },
        ];

        const tabWidth = (width - 50) / 3;
        const startX = 25 + tabWidth / 2;

        this.tabButtons = [];

        tabs.forEach((tab, i) => {
            const x = startX + i * tabWidth;
            const isActive = this.currentTab === tab.id;

            const container = this.add.container(x, tabY + 17);
            container.setDepth(100);

            // タブ背景（選択中はピルボタン風）
            const bg = this.add.graphics();
            if (isActive) {
                // ★ ハートピア風：選択中は目立つピルボタン
                bg.fillStyle(0xFFD700, 1);
                bg.fillRoundedRect(-tabWidth / 2 + 5, -16, tabWidth - 10, 32, 16);
            }
            container.add(bg);

            // アイコン（画像）+ ラベル（桜井イズム: 縁取りで視認性UP）
            const textColor = isActive ? '#5D4037' : '#888888';
            const fontWeight = isActive ? 'bold' : 'normal';
            
            // 画像アイコン
            const icon = this.add.image(-25, 0, tab.iconKey);
            const iconScale = 22 / Math.max(icon.width, icon.height);
            icon.setScale(iconScale);
            icon.setAlpha(isActive ? 1 : 0.6);
            container.add(icon);
            
            // ラベル
            const label = this.add.text(10, 0, tab.label, {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '15px',
                color: textColor,
                fontStyle: fontWeight,
                stroke: '#FFFFFF',
                strokeThickness: isActive ? 2 : 1,
            }).setOrigin(0.5);
            container.add(label);

            // インタラクション
            container.setSize(tabWidth - 10, 36);
            container.setInteractive({ useHandCursor: true });

            container.on('pointerdown', () => {
                if (!isActive) {
                    this.tweens.add({ targets: container, scale: 0.95, duration: 50 });
                }
            });

            container.on('pointerup', () => {
                this.tweens.add({ targets: container, scale: 1, duration: 80 });
                if (!isActive) {
                    this.switchTab(tab.id);
                }
            });

            container.on('pointerout', () => {
                this.tweens.add({ targets: container, scale: 1, duration: 60 });
            });

            this.tabButtons.push({ container, tab });
        });
    }

    // タブ切り替え
    switchTab(tabId) {
        this.currentTab = tabId;
        this.registry.set('customizeTab', tabId);  // 状態を保持
        this.scene.restart();  // 再描画（簡易実装）
    }

    // タブ内容の表示
    showTabContent(tabId) {
        const { width, height } = this.scale;
        const contentY = SAFE.TOP + 140;

        // コンテンツコンテナを作成
        this.contentContainer = this.add.container(0, 0);

        // ★ 白カードでコンテンツエリアをグループ化（ハートピア風）
        const cardBg = this.add.graphics();
        cardBg.fillStyle(0xFFFFFF, 0.98);
        cardBg.fillRoundedRect(15, contentY - 10, width - 30, height - contentY - 20, 18);
        // 影
        cardBg.fillStyle(0x000000, 0.05);
        cardBg.fillRoundedRect(18, contentY - 7, width - 36, height - contentY - 26, 18);
        this.contentContainer.add(cardBg);
        this.contentContainer.sendToBack(cardBg);

        switch (tabId) {
            case 'color':
                this.createPawColorsContent(contentY);
                break;
            case 'costume':
                this.createCostumesContent(contentY);
                break;
            case 'theme':
                this.createThemesContent(contentY);
                break;
        }
    }

    // ===== カラータブ =====
    createPawColorsContent(startY) {
        const { width } = this.scale;

        // 🐾 タイトル（桜井イズム: section + 縁取り）
        const title = this.add.text(width / 2, startY + 20, '🐾 にくきゅうカラー', {
            ...TEXT_STYLE.section,
            fontSize: '18px',
        }).setOrigin(0.5);
        this.contentContainer.add(title);

        // サブテキスト（桜井イズム: small + 縁取り）
        const sub = this.add.text(width / 2, startY + 45, 'おさんぽ中の肉球の色を変えよう！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '12px',
            color: '#888888',
            stroke: '#FFFFFF',
            strokeThickness: 1,
        }).setOrigin(0.5);
        this.contentContainer.add(sub);

        // 🐾 カラーを2行で美しく配置
        const colors = Object.entries(PAW_COLORS);
        const cols = 5;
        const size = 56;  // 少し小さくして収まりやすく
        const gapX = 10;
        const gapY = 70;  // 行間
        const totalW = cols * size + (cols - 1) * gapX;
        const baseX = (width - totalW) / 2 + size / 2;

        colors.forEach(([key, data], i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = baseX + col * (size + gapX);
            const y = startY + 100 + row * gapY;
            this.createColorOption(x, y, key, data);
        });
    }

    createColorOption(x, y, key, data) {
        const isUnlocked = this.checkUnlock(data.unlockCondition);
        const isSelected = gameData.customize.pawColor === key || (!gameData.customize.pawColor && key === 'brown');

        const btn = this.add.container(x, y);
        const radius = 26;  // コンパクトに収める

        // 🎨 桜井イズム：選択状態を一目で分かるように！（共通仕様）
        const bg = this.add.graphics();
        
        if (isSelected) {
            // ✨ 選択中：ゴールドグロー + リング + パルスアニメ
            bg.fillStyle(0xFFD700, 0.25);
            bg.fillCircle(0, 0, radius + 6);
            bg.fillStyle(0xFFFAE6, 1);
            bg.fillCircle(0, 0, radius);
            bg.lineStyle(3, 0xFFD700, 1);
            bg.strokeCircle(0, 0, radius);
            
            // ★ パルスアニメーション（視覚的フィードバック強化）
            this.tweens.add({
                targets: btn,
                scale: { from: 1, to: 1.03 },
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else if (isUnlocked) {
            // ★ 共通仕様：暖色アイボリー背景で白カードから浮かせる
            bg.fillStyle(0xFFFBF5, 1);  // アイボリー
            bg.fillCircle(0, 0, radius);
            const ringColor = data.color === 'rainbow' ? 0xFF69B4 : data.color;
            bg.lineStyle(2.5, ringColor, 0.85);
            bg.strokeCircle(0, 0, radius);
        } else {
            // ★ 共通仕様：明るいグレーで視認性UP
            bg.fillStyle(0xA8A8A8, 1);  // 明るいグレー
            bg.fillCircle(0, 0, radius);
            bg.lineStyle(2, 0x909090, 1);  // グレー枠
            bg.strokeCircle(0, 0, radius);
        }
        btn.add(bg);
        this.contentContainer.add(btn);

        // 🐾 肉球アイコン（スプライト版！超かわいい！）
        const pawImageKey = data.imageKey || 'paw_brown';
        if (isUnlocked) {
            const paw = PawPrint.drawSprite(this, 0, 0, pawImageKey, 38);
            paw.setOrigin(0.5, 0.5);  // 中央配置
            paw.setAlpha(1);
            btn.add(paw);
        } else {
            // 🔒 シルエット表示（ずかんと同じ仕様）
            const paw = PawPrint.drawSprite(this, 0, 0, pawImageKey, 38);
            paw.setOrigin(0.5, 0.5);  // 中央配置
            paw.setAlpha(0.5);
            paw.setTint(0x222222);  // ダークシルエット
            btn.add(paw);
        }

        // ✓ 選択チェックマーク（円の中に収まるように配置）
        if (isSelected) {
            const checkBg = this.add.graphics();
            checkBg.fillStyle(0x4CAF50, 1);
            checkBg.fillCircle(radius - 4, -radius + 4, 9);
            btn.add(checkBg);
            
            const check = this.add.text(radius - 4, -radius + 4, '✓', {
                fontSize: '11px',
                fontStyle: 'bold',
                color: '#FFFFFF'
            }).setOrigin(0.5);
            btn.add(check);
        }

        btn.setSize(radius * 2 + 16, radius * 2 + 16);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerdown', () => {
            if (!isSelected) {
                this.tweens.add({ targets: btn, scale: 0.90, duration: 50 });
            }
        });
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, scale: isSelected ? 1.05 : 1, duration: 100, ease: 'Back.easeOut' });
            if (isUnlocked) {
                gameData.customize.pawColor = key;
                GameData.save(gameData);
                this.scene.restart();
            } else {
                this.showUnlockCondition(data);
            }
        });
        btn.on('pointerout', () => {
            if (!isSelected) {
                this.tweens.add({ targets: btn, scale: 1, duration: 80 });
            }
        });
    }

    // ===== きせかえタブ =====
    createCostumesContent(startY) {
        const { width, height } = this.scale;

        // 🎀 タイトル（桜井イズム: section + 縁取り）
        const medals = gameData.rewards?.medals || 0;
        const title = this.add.text(width / 2, startY + 20, '🎀 衣装', {
            ...TEXT_STYLE.section,
            fontSize: '18px',
        }).setOrigin(0.5);
        this.contentContainer.add(title);

        // メダル表示（桜井イズム: small + 縁取り）
        const medalText = this.add.text(width / 2, startY + 45, `🏅 おさんぽメダル: ${medals}枚`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            color: '#888888',
            stroke: '#FFFFFF',
            strokeThickness: 1,
        }).setOrigin(0.5);
        this.contentContainer.add(medalText);

        const costumes = Object.entries(COSTUME_ITEMS);
        // ★ 図鑑と同じ3列レイアウト！（桜井イズム：統一感）
        const cols = 3;
        const size = 95;
        const gap = 8;
        const rowGap = 12;
        const totalW = cols * size + (cols - 1) * gap;
        const baseX = (width - totalW) / 2 + size / 2;

        // ★ スクロール対応（図鑑と同じ方式）
        const rows = Math.ceil(costumes.length / cols);
        const listHeight = rows * (size + rowGap + 20) + 80;  // 下までスクロールできるよう余裕を追加
        // ★ タイトル下から白カード下端まで（スクロール時に文字を隠す）
        const maskStartY = startY + 65;
        const maskEndY = height - 40;
        const visibleHeight = maskEndY - maskStartY;
        
        // スクロール可能なコンテナ
        this.costumeListContainer = this.add.container(0, 0);
        this.contentContainer.add(this.costumeListContainer);

        costumes.forEach(([key, data], i) => {
            const x = baseX + (i % cols) * (size + gap);
            // ★ アイテム開始位置を下げて、マスク内に収める（グロー上端 = 125 - 47.5 - 8 = 69.5）
            const y = startY + 125 + Math.floor(i / cols) * (size + rowGap + 20);
            this.createCostumeOption(x, y, key, data, this.costumeListContainer);
        });

        // スクロール用マスク（タイトル下から、白カード内に収める）
        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(15, maskStartY, width - 30, visibleHeight);
        const mask = maskGraphics.createGeometryMask();
        this.costumeListContainer.setMask(mask);

        // スクロール制御
        this.scrollY = 0;
        this.maxScroll = Math.max(0, listHeight - visibleHeight + 30);

        // ★ スクロール状態をシーン変数に保存（アイテムタップ判定で使用）
        this.isScrolling = false;
        
        // ★ スクロール可能領域の境界を保存（マスク領域と対応）
        this.scrollBounds = {
            top: maskStartY,
            bottom: maskEndY,
            left: 15,
            right: width - 15
        };

        // シーン全体でスクロール処理
        let isDragging = false;
        let dragStartY = 0;
        let scrollStartY = 0;

        this.input.on('pointerdown', (pointer) => {
            // ★ X軸も制限を追加
            if (pointer.y >= maskStartY && pointer.y <= maskStartY + visibleHeight &&
                pointer.x >= 15 && pointer.x <= width - 15) {
                isDragging = true;
                dragStartY = pointer.y;
                scrollStartY = this.scrollY;
                this.isScrolling = false;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (!isDragging) return;
            const delta = Math.abs(pointer.y - dragStartY);
            if (delta > 10) {
                this.isScrolling = true;  // ★ スクロール中フラグを立てる
                this.scrollY = Phaser.Math.Clamp(scrollStartY - (pointer.y - dragStartY), 0, this.maxScroll);
                this.costumeListContainer.y = -this.scrollY;
            }
        });

        this.input.on('pointerup', () => {
            isDragging = false;
            // ★ 少し遅延してスクロールフラグをリセット
            this.time.delayedCall(50, () => {
                this.isScrolling = false;
            });
        });
    }

    createCostumeOption(x, y, key, data, container) {
        const isUnlocked = this.checkUnlock(data.unlockCondition);
        const equippedCostumes = gameData.customize.equippedCostumes || [];
        const isEquipped = equippedCostumes.includes(key);

        const btn = this.add.container(x, y);
        // ★ 図鑑と同じサイズ！
        const size = 95;

        // 🎀 桜井イズム：装備中を一目で分かるように！（共通仕様）
        const bg = this.add.graphics();
        if (isEquipped) {
            // ✨ 装備中：ゴールドグロー + パルスアニメ
            bg.fillStyle(0xFFD700, 0.25);
            bg.fillRoundedRect(-size / 2 - 8, -size / 2 - 8, size + 16, size + 16, 18);
            bg.fillStyle(0xFFFAE6, 1);
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(4, 0xFFD700, 1);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
            
            // ★ パルスアニメーション
            this.tweens.add({
                targets: btn,
                scale: { from: 1, to: 1.03 },
                duration: 900,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else if (isUnlocked) {
            // ★ 共通仕様：暖色アイボリー背景で白カードから浮かせる
            bg.fillStyle(0x000000, 0.05);
            bg.fillRoundedRect(-size / 2 + 2, -size / 2 + 2, size, size, 14);
            bg.fillStyle(0xFFFBF5, 1);  // アイボリー
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(2.5, 0xDDC8B8, 1);  // 暖色ベージュ枠
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        } else {
            // ★ 共通仕様：明るいグレーで視認性UP
            bg.fillStyle(0x000000, 0.04);
            bg.fillRoundedRect(-size / 2 + 2, -size / 2 + 2, size, size, 14);
            bg.fillStyle(0xA8A8A8, 1);  // 明るいグレー
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(2, 0x909090, 1);  // グレー枠
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        }
        btn.add(bg);
        // ★ 引数で渡されたコンテナに追加（スクロール対応）
        (container || this.contentContainer).add(btn);

        // 🎯 アイコン（画像ベース対応）
        if (isUnlocked) {
            // 画像がある場合は画像を表示、なければ絵文字フォールバック
            if (data.imageKey && this.textures.exists(data.imageKey)) {
                const icon = this.add.image(0, -8, data.imageKey);
                const iconScale = 40 / Math.max(icon.width, icon.height);
                icon.setScale(iconScale);
                btn.add(icon);
            } else {
                const icon = this.add.text(0, -8, data.icon, {
                    fontSize: '32px',
                }).setOrigin(0.5);
                btn.add(icon);
            }
        } else {
            // 🔒 シルエット表示（ずかんと同じ仕様）
            if (data.imageKey && this.textures.exists(data.imageKey)) {
                const icon = this.add.image(0, -8, data.imageKey);
                const iconScale = 40 / Math.max(icon.width, icon.height);
                icon.setScale(iconScale);
                icon.setTint(0x222222);  // ダークシルエット
                icon.setAlpha(0.5);
                btn.add(icon);
            }
        }

        // 📝 ラベル（枠内に収める - ずかんと同じ仕様）
        const labelColor = isUnlocked ? '#5D4037' : '#888888';
        const labelText = isUnlocked ? data.name : '？？？';
        const label = this.add.text(0, size / 2 - 22, labelText, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: labelColor,
        }).setOrigin(0.5);
        btn.add(label);

        // ✓ 装備チェック
        if (isEquipped) {
            const check = this.add.text(size / 2 - 4, -size / 2 + 4, '✓', {
                fontSize: '14px',
                fontStyle: 'bold',
                backgroundColor: '#4CAF50',
                padding: { x: 4, y: 2 },
                color: '#FFFFFF'
            }).setOrigin(0.5);
            btn.add(check);
        }

        btn.setSize(size + 12, size + 12);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerdown', (pointer) => {
            // ★ マスク領域外のタップは無視
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            if (!isEquipped) {
                this.tweens.add({ targets: btn, scale: 0.92, duration: 40 });
            }
        });
        btn.on('pointerup', (pointer) => {
            this.tweens.add({ targets: btn, scale: isEquipped ? 1.03 : 1, duration: 80, ease: 'Back.easeOut' });
            
            // ★ スクロール中のタップは無視
            if (this.isScrolling) {
                return;
            }
            
            // ★ マスク領域外のタップは無視
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            
            if (isUnlocked) {
                if (!gameData.customize.equippedCostumes) {
                    gameData.customize.equippedCostumes = [];
                }

                if (isEquipped) {
                    gameData.customize.equippedCostumes = [];
                } else {
                    gameData.customize.equippedCostumes = [key];
                }

                GameData.save(gameData);
                this.scene.restart();
            } else {
                this.showCostumeUnlockCondition(data);
            }
        });
        btn.on('pointerout', () => {
            if (!isEquipped) {
                this.tweens.add({ targets: btn, scale: 1, duration: 80 });
            }
        });
    }

    showCostumeUnlockCondition(data) {
        const { width, height } = this.scale;

        // ★ 図鑑と同じダークスタイル！（桜井イズム：統一感）
        const overlay = this.add.rectangle(0, 0, width, height * 2, 0x000000, 0.5).setOrigin(0).setInteractive();
        const dialog = this.add.container(width / 2, height / 2 + this.cameras.main.scrollY);

        // 背景（図鑑と同じダークスタイル）
        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 1);
        bg.fillRoundedRect(-140, -120, 280, 240, 12);
        dialog.add(bg);

        // 🎀 大きなシルエット表示（ワクワク感！）
        if (data.imageKey && this.textures.exists(data.imageKey)) {
            const icon = this.add.image(0, -55, data.imageKey);
            const iconScale = 60 / Math.max(icon.width, icon.height);
            icon.setScale(iconScale);
            icon.setTint(0x111111);  // ダークシルエット
            icon.setAlpha(0.6);
            dialog.add(icon);
        } else {
            // 画像がない場合は絵文字をシルエット風に
            const icon = this.add.text(0, -55, data.icon, {
                fontSize: '48px',
            }).setOrigin(0.5);
            icon.setAlpha(0.4);
            dialog.add(icon);
        }

        // ？？？ を目立たせる（図鑑と同じ）
        const mystery = this.add.text(0, 5, '？？？', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        dialog.add(mystery);

        // 解放条件
        let condText = '🔓 条件を達成すると解放';
        let progressText = '';
        
        if (data.unlockCondition.startsWith('medals_')) {
            const required = data.unlockCondition.split('_')[1];
            const current = gameData.rewards?.medals || 0;
            condText = `🔓 おさんぽメダル ${required}枚で解放`;
            progressText = `（現在: ${current}枚）`;
        } else if (data.unlockCondition.startsWith('stamp_complete_')) {
            const required = data.unlockCondition.split('_')[2];
            const current = gameData.rewards?.totalWeeklyComplete || 0;
            condText = `🔓 週間スタンプ ${required}回コンプで解放`;
            progressText = `（現在: ${current}回）`;
        }

        // 条件テキスト（図鑑と同じスタイル）
        const cond = this.add.text(0, 50, condText, {
            ...TEXT_STYLE.body,
            fontSize: '13px',
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: 240 },
        }).setOrigin(0.5);
        dialog.add(cond);

        // 進捗表示（図鑑と同じ）
        if (progressText) {
            const progress = this.add.text(0, 85, progressText, {
                fontSize: '11px',
                color: '#AAAAAA',
                align: 'center',
            }).setOrigin(0.5);
            dialog.add(progress);
        }

        // 閉じる
        overlay.on('pointerup', () => {
            dialog.destroy();
            overlay.destroy();
        });

        // アニメーション（図鑑と同じ）
        dialog.setScale(0.8);
        dialog.setAlpha(0);
        this.tweens.add({ targets: dialog, scale: 1, alpha: 1, duration: 150, ease: 'Back.easeOut' });
    }

    // ===== テーマタブ =====
    createThemesContent(startY) {
        const { width, height } = this.scale;

        // 🌍 タイトル（桜井イズム: section + 縁取り）
        const title = this.add.text(width / 2, startY + 20, '🌍 せかいのテーマ', {
            ...TEXT_STYLE.section,
            fontSize: '18px',
        }).setOrigin(0.5);
        this.contentContainer.add(title);

        // サブテキスト（桜井イズム: small + 縁取り）
        const sub = this.add.text(width / 2, startY + 45, 'おさんぽの背景を変えよう！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '12px',
            color: '#888888',
            stroke: '#FFFFFF',
            strokeThickness: 1,
        }).setOrigin(0.5);
        this.contentContainer.add(sub);

        const themes = Object.entries(THEMES);
        // ★ 図鑑と同じ3列レイアウト！（桜井イズム：統一感）
        const cols = 3;
        const size = 95;
        const gap = 8;
        const rowGap = 12;
        const totalW = cols * size + (cols - 1) * gap;
        const baseX = (width - totalW) / 2 + size / 2;

        // ★ スクロール対応（図鑑と同じ方式）
        const rows = Math.ceil(themes.length / cols);
        const listHeight = rows * (size + rowGap + 20) + 50;
        // ★ 下側だけマスク（上側は見切る必要なし）
        const maskStartY = 0;  // 上端から
        const maskEndY = height - 40;  // 白カード下端（height-30）より少し上まで
        const visibleHeight = maskEndY - maskStartY;
        
        // スクロール可能なコンテナ
        this.themeListContainer = this.add.container(0, 0);
        this.contentContainer.add(this.themeListContainer);

        themes.forEach(([key, data], i) => {
            const x = baseX + (i % cols) * (size + gap);
            // ★ アイテム開始位置を下げて、マスク内に収める（グロー上端 = 125 - 47.5 - 8 = 69.5）
            const y = startY + 125 + Math.floor(i / cols) * (size + rowGap + 20);
            this.createThemeOption(x, y, key, data, this.themeListContainer);
        });

        // スクロール用マスク（タイトル下から、白カード内に収める）
        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(15, maskStartY, width - 30, visibleHeight);
        const mask = maskGraphics.createGeometryMask();
        this.themeListContainer.setMask(mask);

        // スクロール制御
        this.scrollY = 0;
        this.maxScroll = Math.max(0, listHeight - visibleHeight + 30);

        // ★ スクロール状態をシーン変数に保存（アイテムタップ判定で使用）
        this.isScrolling = false;
        
        // ★ スクロール可能領域の境界を保存（マスク領域と対応）
        this.scrollBounds = {
            top: maskStartY,
            bottom: maskEndY,
            left: 15,
            right: width - 15
        };

        // シーン全体でスクロール処理
        let isDragging = false;
        let dragStartY = 0;
        let scrollStartY = 0;

        this.input.on('pointerdown', (pointer) => {
            // ★ X軸も制限を追加
            if (pointer.y >= maskStartY && pointer.y <= maskStartY + visibleHeight &&
                pointer.x >= 15 && pointer.x <= width - 15) {
                isDragging = true;
                dragStartY = pointer.y;
                scrollStartY = this.scrollY;
                this.isScrolling = false;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (!isDragging) return;
            const delta = Math.abs(pointer.y - dragStartY);
            if (delta > 10) {
                this.isScrolling = true;  // ★ スクロール中フラグを立てる
                this.scrollY = Phaser.Math.Clamp(scrollStartY - (pointer.y - dragStartY), 0, this.maxScroll);
                this.themeListContainer.y = -this.scrollY;
            }
        });

        this.input.on('pointerup', () => {
            isDragging = false;
            // ★ 少し遅延してスクロールフラグをリセット
            this.time.delayedCall(50, () => {
                this.isScrolling = false;
            });
        });
    }

    createThemeOption(x, y, key, data, container) {
        const isUnlocked = this.checkUnlock(data.unlockCondition);
        const isSelected = gameData.customize.theme === key;

        const btn = this.add.container(x, y);
        // ★ 図鑑と同じサイズ！
        const size = 95;

        // 🌍 桜井イズム：選択状態を一目で分かるように！
        const bg = this.add.graphics();
        
        if (isSelected) {
            // ✨ 選択中：ゴールドグロー + パルスアニメ
            bg.fillStyle(0xFFD700, 0.3);
            bg.fillRoundedRect(-size / 2 - 8, -size / 2 - 8, size + 16, size + 16, 18);
            
            // ★ パルスアニメーション
            this.tweens.add({
                targets: btn,
                scale: { from: 1, to: 1.03 },
                duration: 850,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        // ★ 背景を先に追加（重要！）
        if (isUnlocked) {
            // ★ 共通仕様：暖色アイボリー背景
            bg.fillStyle(0xFFFBF5, 1);  // アイボリー
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
        } else {
            // ★ 共通仕様：明るいグレーで視認性UP
            bg.fillStyle(0x000000, 0.04);
            bg.fillRoundedRect(-size / 2 + 2, -size / 2 + 2, size, size, 14);
            bg.fillStyle(0xA8A8A8, 1);  // 明るいグレー
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
        }

        // 選択中のリング
        if (isSelected) {
            bg.lineStyle(5, 0xFFD700, 1);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        } else if (isUnlocked) {
            // ★ 共通仕様：暖色ベージュ枠
            bg.lineStyle(2.5, 0xDDC8B8, 1);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        } else {
            // ★ 共通仕様：グレー枠
            bg.lineStyle(2, 0x909090, 1);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        }
        
        // ★ bgを最初に追加！
        btn.add(bg);

        // 🌍 背景画像サムネイルまたはグラデーション（bgの上に追加）
        if (isUnlocked && data.image && this.textures.exists(data.image)) {
            // 背景画像がある場合はサムネイル表示
            const thumb = this.add.image(0, -12, data.image);
            // サムネイルサイズ（角丸分を考慮して少し小さく）
            const thumbWidth = size - 12;
            const thumbHeight = size - 32;  // 下のラベル用スペースを除く
            
            // スケール計算（カバー形式 - 画像がエリアを完全に覆う）
            const scaleX = thumbWidth / thumb.width;
            const scaleY = thumbHeight / thumb.height;
            const scale = Math.max(scaleX, scaleY);
            thumb.setScale(scale);
            
            // ★ setCropで表示エリアを制限（スクロール対応！マスクより確実）
            const cropWidth = thumbWidth / scale;
            const cropHeight = thumbHeight / scale;
            const cropX = (thumb.width - cropWidth) / 2;
            const cropY = (thumb.height - cropHeight) / 2;
            thumb.setCrop(cropX, cropY, cropWidth, cropHeight);
            
            btn.add(thumb);
        } else if (isUnlocked) {
            // フォールバック: グラデーション
            const gradBg = this.add.graphics();
            gradBg.fillGradientStyle(data.sky, data.sky, data.ground, data.ground, 1);
            gradBg.fillRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 28, 10);
            btn.add(gradBg);
        } else {
            // シルエット（グラデーションをダークに）
            const gradBg = this.add.graphics();
            gradBg.fillGradientStyle(data.sky, data.sky, data.ground, data.ground, 1);
            gradBg.fillRoundedRect(-size / 2 + 4, -size / 2 + 4, size - 8, size - 28, 10);
            gradBg.setAlpha(0.3);
            btn.add(gradBg);
        }

        // ★ 引数で渡されたコンテナに追加（スクロール対応）
        (container || this.contentContainer).add(btn);

        // 📝 ラベル（枠内に収める - ずかんと同じ仕様）
        const labelText = isUnlocked ? data.name : '？？？';
        const label = this.add.text(0, size / 2 - 22, labelText, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: isUnlocked ? '#5D4037' : '#888888',
        }).setOrigin(0.5);
        btn.add(label);

        // ✓ 選択チェック
        if (isSelected) {
            const check = this.add.text(size / 2 - 4, -size / 2 + 4, '✓', {
                fontSize: '14px',
                fontStyle: 'bold',
                backgroundColor: '#4CAF50',
                padding: { x: 4, y: 2 },
                color: '#FFFFFF'
            }).setOrigin(0.5);
            btn.add(check);
        }

        btn.setSize(size + 14, size + 14);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerdown', (pointer) => {
            // ★ マスク領域外のタップは無視
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            if (!isSelected) {
                this.tweens.add({ targets: btn, scale: 0.92, duration: 40 });
            }
        });
        btn.on('pointerup', (pointer) => {
            this.tweens.add({ targets: btn, scale: isSelected ? 1.03 : 1, duration: 80, ease: 'Back.easeOut' });
            
            // ★ スクロール中のタップは無視
            if (this.isScrolling) {
                return;
            }
            
            // ★ マスク領域外のタップは無視
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            
            if (isUnlocked) {
                gameData.customize.theme = key;
                GameData.save(gameData);
                this.scene.restart();
            } else {
                this.showThemeUnlockCondition(data);
            }
        });
        btn.on('pointerout', () => {
            if (!isSelected) {
                this.tweens.add({ targets: btn, scale: 1, duration: 80 });
            }
        });
    }

    // ★ テーマ専用のロック表示（図鑑と同じダークスタイル）
    showThemeUnlockCondition(data) {
        const { width, height } = this.scale;

        // ★ 図鑑と同じダークスタイル！（桜井イズム：統一感）
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setInteractive();
        const dialog = this.add.container(width / 2, height / 2);

        // 背景（図鑑と同じダークスタイル）
        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 1);
        bg.fillRoundedRect(-140, -120, 280, 240, 12);
        dialog.add(bg);

        // 🌍 大きなシルエット表示（テーマのグラデーション）
        const size = 70;
        const gradBg = this.add.graphics();
        gradBg.fillGradientStyle(data.sky, data.sky, data.ground, data.ground, 1);
        gradBg.fillRoundedRect(-size / 2, -90, size, size - 10, 10);
        gradBg.setAlpha(0.4);
        dialog.add(gradBg);

        // ？？？ を目立たせる（図鑑と同じ）
        const mystery = this.add.text(0, 5, '？？？', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        dialog.add(mystery);

        // 解放条件テキスト
        let conditionText = '🔓 条件を達成すると解放';
        let progressText = '';
        
        if (data.unlockCondition) {
            // メダル条件
            if (data.unlockCondition.startsWith('medals_')) {
                const required = data.unlockCondition.split('_')[1];
                const current = gameData.rewards?.medals || 0;
                conditionText = `🔓 おさんぽメダル ${required}枚で解放`;
                progressText = `（現在: ${current}枚）`;
            }
            // スタンプ完走条件
            else if (data.unlockCondition.startsWith('stamp_complete_')) {
                const required = data.unlockCondition.split('_')[2];
                const current = gameData.rewards?.totalWeeklyComplete || 0;
                conditionText = `🔓 週間スタンプ ${required}回コンプで解放`;
                progressText = `（現在: ${current}回）`;
            }
            // 既存条件
            else {
                const condMap = {
                    'clear_20_stages': { desc: '🔓 20ステージクリアで解放', progress: `（現在: ${gameData.stats?.totalClears || 0}回）` },
                    'clear_30_stages': { desc: '🔓 30ステージクリアで解放', progress: `（現在: ${gameData.stats?.totalClears || 0}回）` },
                    'challenge_5_streak': { desc: '🔓 チャレンジ5連続で解放', progress: `（最高: ${gameData.stats?.challengeHighScore || 0}連続）` },
                    'golden_3_times': { desc: '🔓 ゴールデンワンコ3回で解放', progress: `（現在: ${gameData.stats?.goldenClears || 0}回）` },
                    'use_all_4_dogs': { desc: '🔓 初期4犬種を1回ずつ使用で解放', progress: '' },
                };
                const cond = condMap[data.unlockCondition];
                if (cond) {
                    conditionText = cond.desc;
                    progressText = cond.progress;
                }
            }
        }

        // 条件テキスト（図鑑と同じスタイル）
        const cond = this.add.text(0, 50, conditionText, {
            ...TEXT_STYLE.body,
            fontSize: '13px',
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: 240 },
        }).setOrigin(0.5);
        dialog.add(cond);

        // 進捗表示（図鑑と同じ）
        if (progressText) {
            const progress = this.add.text(0, 85, progressText, {
                fontSize: '11px',
                color: '#AAAAAA',
                align: 'center',
            }).setOrigin(0.5);
            dialog.add(progress);
        }

        // 閉じる
        overlay.on('pointerup', () => {
            dialog.destroy();
            overlay.destroy();
        });

        // アニメーション（図鑑と同じ）
        dialog.setScale(0.8);
        dialog.setAlpha(0);
        this.tweens.add({ targets: dialog, scale: 1, alpha: 1, duration: 150, ease: 'Back.easeOut' });
    }

    checkUnlock(condition) {
        // ★ テストモードは先頭の TEST_MODE_UNLOCK_ALL で制御
        if (TEST_MODE_UNLOCK_ALL) return true;
        
        if (!condition) return true;
        if (gameData.purchases?.deluxe || gameData.purchases?.allCustomize) return true;

        // ★ メダル・スタンプ条件を追加！
        const medals = gameData.rewards?.medals || 0;
        const weeklyComplete = gameData.rewards?.totalWeeklyComplete || 0;

        // メダル条件: medals_X
        if (condition.startsWith('medals_')) {
            const required = parseInt(condition.split('_')[1]);
            return medals >= required;
        }

        // スタンプ完走条件: stamp_complete_X
        if (condition.startsWith('stamp_complete_')) {
            const required = parseInt(condition.split('_')[2]);
            return weeklyComplete >= required;
        }

        // 条件チェック（既存）
        switch (condition) {
            // ★ にくきゅうカラー解放条件
            case 'clear_10_stages': return gameData.stats.totalClears >= 10;
            case 'clear_15_stages': return gameData.stats.totalClears >= 15;
            case 'clear_20_stages': return gameData.stats.totalClears >= 20;
            case 'clear_25_stages': return gameData.stats.totalClears >= 25;
            case 'clear_30_stages': return gameData.stats.totalClears >= 30;
            case 'clear_40_stages': return gameData.stats.totalClears >= 40;
            case 'clear_50_stages': return gameData.stats.totalClears >= 50;
            case 'challenge_3_streak': return gameData.stats.challengeHighScore >= 3;
            case 'challenge_5_streak': return gameData.stats.challengeHighScore >= 5;
            case 'golden_3_times': return gameData.stats.goldenClears >= 3; // TODO: ゴールデンワンコ実装後に有効化
            case 'use_all_4_dogs':
                const usage = gameData.stats.dogUsage;
                return [1, 2, 3, 4].every(d => usage[d] >= 1); // 初期犬4匹
            default: return false;
        }
    }

    showUnlockCondition(data) {
        const { width, height } = this.scale;

        // ★ 図鑑と同じダークスタイル！（桜井イズム：統一感）
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setInteractive();
        const dialog = this.add.container(width / 2, height / 2);

        // 背景（図鑑と同じダークスタイル）
        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 1);
        bg.fillRoundedRect(-140, -120, 280, 240, 12);
        dialog.add(bg);

        // 🐾 大きなシルエット表示（ワクワク感！）- スプライト版
        const pawImageKey = data.imageKey || 'paw_brown';
        const paw = PawPrint.drawSprite(this, 0, -55, pawImageKey, 55);
        paw.setOrigin(0.5, 0.5);
        paw.setAlpha(0.6);
        paw.setTint(0x111111);  // ダークシルエット
        dialog.add(paw);

        // ？？？ を目立たせる（図鑑と同じ）
        const mystery = this.add.text(0, 5, '？？？', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        dialog.add(mystery);

        // 解放条件テキスト
        let conditionText = '条件を達成すると解放';
        let progressText = '';
        
        if (data.unlockCondition) {
            // メダル条件
            if (data.unlockCondition.startsWith('medals_')) {
                const required = data.unlockCondition.split('_')[1];
                const current = gameData.rewards?.medals || 0;
                conditionText = `🔓 おさんぽメダル ${required}枚で解放`;
                progressText = `（現在: ${current}枚）`;
            }
            // スタンプ完走条件
            else if (data.unlockCondition.startsWith('stamp_complete_')) {
                const required = data.unlockCondition.split('_')[2];
                const current = gameData.rewards?.totalWeeklyComplete || 0;
                conditionText = `🔓 週間スタンプ ${required}回コンプで解放`;
                progressText = `（現在: ${current}回）`;
            }
            // 既存条件
            else {
                const condMap = {
                    // ★ にくきゅうカラー解放条件（16種類！）
                    'clear_10_stages': { desc: '🔓 10ステージクリアで解放', progress: `（現在: ${gameData.stats?.totalClears || 0}回）` },
                    'clear_15_stages': { desc: '🔓 15ステージクリアで解放', progress: `（現在: ${gameData.stats?.totalClears || 0}回）` },
                    'clear_20_stages': { desc: '🔓 20ステージクリアで解放', progress: `（現在: ${gameData.stats?.totalClears || 0}回）` },
                    'clear_25_stages': { desc: '🔓 25ステージクリアで解放', progress: `（現在: ${gameData.stats?.totalClears || 0}回）` },
                    'clear_30_stages': { desc: '🔓 30ステージクリアで解放', progress: `（現在: ${gameData.stats?.totalClears || 0}回）` },
                    'clear_40_stages': { desc: '🔓 40ステージクリアで解放', progress: `（現在: ${gameData.stats?.totalClears || 0}回）` },
                    'clear_50_stages': { desc: '🔓 50ステージクリアで解放', progress: `（現在: ${gameData.stats?.totalClears || 0}回）` },
                    'challenge_3_streak': { desc: '🔓 チャレンジ3連続で解放', progress: `（最高: ${gameData.stats?.challengeHighScore || 0}連続）` },
                    'challenge_5_streak': { desc: '🔓 チャレンジ5連続で解放', progress: `（最高: ${gameData.stats?.challengeHighScore || 0}連続）` },
                    'challenge_10_streak': { desc: '🔓 チャレンジ10連続で解放', progress: `（最高: ${gameData.stats?.challengeHighScore || 0}連続）` },
                    'golden_3_times': { desc: '🔓 ゴールデンワンコ3回で解放', progress: `（現在: ${gameData.stats?.goldenClears || 0}回）` },
                    'use_all_4_dogs': { desc: '🔓 初期4犬種を1回ずつ使用で解放', progress: '' },
                    'all_paws_unlocked': { desc: '🌈 全ての肉球カラーを集めると解放！', progress: `（現在: ${gameData.unlockedNikukyuColors?.length || 1}/15）` },
                };
                const cond = condMap[data.unlockCondition];
                if (cond) {
                    conditionText = cond.desc;
                    progressText = cond.progress;
                }
            }
        }

        // 条件テキスト（図鑑と同じスタイル）
        const cond = this.add.text(0, 50, conditionText, {
            ...TEXT_STYLE.body,
            fontSize: '13px',
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: 240 },
        }).setOrigin(0.5);
        dialog.add(cond);

        // 進捗表示（図鑑と同じ）
        if (progressText) {
            const progress = this.add.text(0, 85, progressText, {
                fontSize: '11px',
                color: '#AAAAAA',
                align: 'center',
            }).setOrigin(0.5);
            dialog.add(progress);
        }

        // 閉じる
        overlay.on('pointerup', () => {
            dialog.destroy();
            overlay.destroy();
        });

        // アニメーション（図鑑と同じ）
        dialog.setScale(0.8);
        dialog.setAlpha(0);
        this.tweens.add({ targets: dialog, scale: 1, alpha: 1, duration: 150, ease: 'Back.easeOut' });
    }
}

// ========================================
// 図鑑シーン
// ========================================
// 🐕 犬種の豆知識（愛着がわく情報）- 32種類対応
const DOG_TRIVIA = {
    1: { // 柴犬
        origin: 'にほん',
        personality: 'ちゅうじつ',
        trivia: 'しっぽがくるんと\nまるまっているよ！',
        funFact: '「柴」は小さいという\n意味なんだよ！'
    },
    2: { // パグ
        origin: 'ちゅうごく',
        personality: 'あかるい',
        trivia: 'しわしわの顔が\nチャームポイント！',
        funFact: '昔は王様のペット\nだったんだよ！'
    },
    3: { // トイプードル
        origin: 'フランス',
        personality: 'かしこい',
        trivia: 'けが抜けにくいから\nアレルギーにやさしい！',
        funFact: '水に飛び込む狩りが\n得意だったよ！'
    },
    4: { // ハスキー
        origin: 'シベリア',
        personality: 'げんき',
        trivia: 'そりを引くのが\n大得意！',
        funFact: 'オッドアイの子も\nいるんだよ！'
    },
    5: { // ゴールデンレトリバー
        origin: 'イギリス',
        personality: 'やさしい',
        trivia: 'きんいろの毛が\nとってもきれい！',
        funFact: '人を助ける仕事が\n大好きなんだよ！'
    },
    6: { // コーギー
        origin: 'ウェールズ',
        personality: 'かっぱつ',
        trivia: 'おしりが\nぷりぷりでかわいい！',
        funFact: 'イギリス女王の\n愛犬だったよ！'
    },
    7: { // ダルメシアン
        origin: 'クロアチア',
        personality: 'うんどうずき',
        trivia: 'うまれた時は\nまっしろなんだよ！',
        funFact: '消防署の\nマスコットだよ！'
    },
    8: { // チワワ
        origin: 'メキシコ',
        personality: 'ゆうかん',
        trivia: '世界一ちいさい\n犬種だよ！',
        funFact: 'ちいさいけど\n勇敢なんだ！'
    },
    9: { // シュナウザー
        origin: 'ドイツ',
        personality: 'しっかりもの',
        trivia: '立派なひげが\nおじいさんみたい！',
        funFact: 'ネズミ捕りが\n得意だったんだ！'
    },
    10: { // ドーベルマン
        origin: 'ドイツ',
        personality: 'ちゅうじつ',
        trivia: 'スマートでかっこいい！\n警察犬としても活躍！',
        funFact: '税金を集める人が\n作った犬種なんだよ！'
    },
    11: { // セントバーナード
        origin: 'スイス',
        personality: 'おだやか',
        trivia: 'とっても大きいけど\n優しい巨人だよ！',
        funFact: '雪山で遭難した人を\n助けていたんだよ！'
    },
    12: { // ボルゾイ
        origin: 'ロシア',
        personality: 'きひん',
        trivia: '長い足で\nとても速く走れるよ！',
        funFact: 'ロシアの貴族に\n愛されていたよ！'
    },
    13: { // バーニーズ
        origin: 'スイス',
        personality: 'やさしい',
        trivia: '黒・白・茶の\n三色がきれい！',
        funFact: 'アルプスの農場で\n働いていたよ！'
    },
    14: { // サモエド
        origin: 'シベリア',
        personality: 'にこにこ',
        trivia: 'いつも笑ってるみたいな\nお顔がかわいい！',
        funFact: 'サモエドスマイルで\n有名なんだよ！'
    },
    15: { // グレートデン
        origin: 'ドイツ',
        personality: 'おおらか',
        trivia: '世界一背が高い\n犬種だよ！',
        funFact: 'スクービードゥーの\nモデルなんだよ！'
    },
    16: { // キャバリア
        origin: 'イギリス',
        personality: 'あまえんぼう',
        trivia: 'ふわふわの耳が\nチャームポイント！',
        funFact: 'イギリス王室で\n愛されていたよ！'
    },
    17: { // ジャックラッセルテリア
        origin: 'イギリス',
        personality: 'げんきいっぱい',
        trivia: 'ちいさいけど\nすごいパワー！',
        funFact: 'キツネ狩りのために\n生まれた犬種だよ！'
    },
    18: { // パピヨン
        origin: 'フランス',
        personality: 'おしゃれ',
        trivia: '蝶々みたいな耳が\nとってもきれい！',
        funFact: '「パピヨン」は\nフランス語で蝶々！'
    },
    19: { // ブルドッグ
        origin: 'イギリス',
        personality: 'やさしい',
        trivia: 'こわそうな顔だけど\n実はとっても甘えん坊！',
        funFact: 'イギリスの\nマスコットだよ！'
    },
    20: { // 黒柴（隠し！）
        origin: 'にほん',
        personality: 'クール',
        trivia: '黒い毛並みが\nかっこいい！',
        funFact: '柴犬の中でも\n珍しい黒毛だよ！'
    },
    // ====== 新犬種（21-32）======
    21: { // チワプー
        origin: 'アメリカ',
        personality: 'あまえんぼう',
        trivia: 'チワワとプードルの\nミックスだよ！',
        funFact: 'ふわふわで\nとっても人気！'
    },
    22: { // ダックスフンド
        origin: 'ドイツ',
        personality: 'こうきしん',
        trivia: '短い足と長い体が\nチャームポイント！',
        funFact: 'あなぐらに入って\n狩りをしていたよ！'
    },
    23: { // ビションフリーゼ
        origin: 'フランス',
        personality: 'あかるい',
        trivia: 'まるで綿あめみたいな\nふわふわの毛！',
        funFact: 'サーカスで\n活躍していたよ！'
    },
    24: { // ポメラニアン
        origin: 'ドイツ',
        personality: 'げんき',
        trivia: 'ふわふわの毛が\n自慢だよ！',
        funFact: '昔はもっと\n大きかったんだよ！'
    },
    25: { // チャウチャウ
        origin: 'ちゅうごく',
        personality: 'どっしり',
        trivia: 'ライオンみたいな\nたてがみがすごい！',
        funFact: '舌が青いのが\n特徴だよ！'
    },
    26: { // ニューファンドランド
        origin: 'カナダ',
        personality: 'やさしい',
        trivia: 'とっても大きくて\n泳ぎが得意！',
        funFact: '海難救助犬として\n活躍していたよ！'
    },
    27: { // シャーペイ
        origin: 'ちゅうごく',
        personality: 'ちゅうじつ',
        trivia: 'しわしわの皮膚が\nチャームポイント！',
        funFact: '世界で一番珍しい\n犬種のひとつだよ！'
    },
    28: { // チャイニーズクレステッド（隠し！）
        origin: 'ちゅうごく',
        personality: 'おちゃめ',
        trivia: '毛がないのが\n特徴だよ！',
        funFact: '実はとっても\nあったかいんだ！'
    },
    29: { // ゴールデンワンコ（でんせつワンコ！）
        origin: '???',
        personality: 'きらきら',
        trivia: '金色に輝く\n伝説のワンコ！',
        funFact: '見つけたあなたは\nとってもラッキー！'
    },
    30: { // ボーダーコリー
        origin: 'イギリス',
        personality: 'とってもかしこい',
        trivia: '世界一あたまがいい\n犬種と言われているよ！',
        funFact: 'ひつじを追いかける\nのが得意！'
    },
    31: { // ビーグル
        origin: 'イギリス',
        personality: 'こうきしんおうせい',
        trivia: 'すごい鼻を持っていて\nにおいを追いかけるのが大好き！',
        funFact: 'スヌーピーの\nモデルなんだよ！'
    },
    32: { // マルチーズ（隠し！コンプリート報酬！）
        origin: 'マルタ',
        personality: 'あまえんぼう',
        trivia: '真っ白でシルクみたいな\n毛並みがすてき！',
        funFact: '古代ローマ時代から\n愛されてきたよ！'
    },
    // ========================================
    // ✨ 伝説ワンコ（でんせつワンコ！）
    // ========================================
    33: { // チクワ（でんせつワンコ！）
        origin: '???',
        personality: 'ちくわっぽい',
        trivia: 'チワワじゃない。\nチクワ。',
        funFact: 'なぜかちくわの\nにおいがする！'
    },
    34: { // ふわもこキング（でんせつワンコ！）
        origin: '???',
        personality: 'ふわふわ',
        trivia: 'ほぼわたあめ\nである。',
        funFact: 'もふもふしすぎて\n王様になった！'
    },
    35: { // グレートデデン（でんせつワンコ！）
        origin: '???',
        personality: 'メカニカル',
        trivia: '強化改造された\nサイボーグワンコ。',
        funFact: 'でも中身は\nとってもやさしい！'
    },
    36: { // セントバナナード（でんせつワンコ！）
        origin: '???',
        personality: 'バナナずき',
        trivia: 'バナナだいすき。',
        funFact: 'いつもバナナを\n持ち歩いている！'
    },
    37: { // 武者犬（でんせつワンコ！）
        origin: '???',
        personality: 'ぶしどう',
        trivia: '武士にあこがれている。',
        funFact: 'かっこいい\nよろいがお気に入り！'
    },
    38: { // 炎の犬（でんせつワンコ！）
        origin: '???',
        personality: 'あつい',
        trivia: 'とあるアニメを\n見たサモエド。',
        funFact: '心を燃やせ！が\n口ぐせ！'
    },
    39: { // かいじゅう（でんせつワンコ！）
        origin: '???',
        personality: 'かわいい',
        trivia: 'お気に入りの\nきぐるみを着たハスキー。',
        funFact: 'がおー！って\n言うのが好き！'
    },
    40: { // ゴリラ（でんせつワンコ！）
        origin: '???',
        personality: 'パワフル',
        trivia: '力こそ全て…！',
        funFact: 'でも実は\nバナナが大好き！'
    }
};

class ZukanScene extends Phaser.Scene {
    constructor() { super({ key: 'ZukanScene' }); }

    init(data) {
        // ★ チュートリアルモード
        this.tutorialMode = data?.tutorialMode || false;
        this.tutorialContainer = null;
        this.goldenCard = null;  // ゴールデンレトリバーのカード参照
    }

    create() {
        const { width, height } = this.scale;

        AudioManager.playBgm(this, 'bgm_select');

        // 🎨 背景画像を設定（画面にフィット）
        const bg = this.add.image(width / 2, height / 2, 'zukan_bg');
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(0);

        this.createHeader();
        this.createDogList();  // StatsとListを統合！

        this.cameras.main.fadeIn(300);

        // ★ チュートリアルモードの場合、説明を表示
        if (this.tutorialMode) {
            this.time.delayedCall(500, () => {
                this.showZukanTutorial();
            });
        }
    }

    createHeader() {
        const { width } = this.scale;
        const headerY = SAFE.TOP;

        // ヘッダー背景は削除（背景画像を活かす）

        // 戻るボタン（メインメニューと同じ背景付きスタイル）
        this.createBackButton(50, headerY + 32);

        // タイトル（メインメニューと統一）
        const titleText = this.add.text(width / 2, headerY + 32, '📖 ずかん', {
            ...TEXT_STYLE.heading,
            fontSize: '22px',
        }).setOrigin(0.5);
        titleText.setDepth(101);
    }

    createBackButton(x, y) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRoundedRect(-38, -16, 76, 32, 10);
        bg.lineStyle(2.5, DOG_TYPES[3].color, 1);
        bg.strokeRoundedRect(-38, -16, 76, 32, 10);

        // 桜井イズム: KeiFont + 縁取りで統一感
        const txt = this.add.text(0, 0, '← もどる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#5D4037',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(76, 32);
        btn.setInteractive({ useHandCursor: true });
        btn.setDepth(101);

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('MainMenuScene'));
        });

        return btn;
    }

    createDogList() {
        const { width, height } = this.scale;
        const startY = SAFE.TOP + 75;
        const visibleHeight = height - startY - SAFE.BOTTOM - 10;

        // ★ 通常ワンコと伝説ワンコを分離
        const normalDogs = Object.entries(DOG_TYPES).filter(([id, data]) => {
            const dogId = parseInt(id);
            // 伝説ワンコは別枠
            if (data.isLegendary) return false;
            // 通常の隠し犬種の処理
            if (data.isSecret && !GameData.isDogUnlocked(gameData, dogId)) {
                return false;
            }
            return true;
        });
        
        const legendaryDogs = Object.entries(DOG_TYPES).filter(([id, data]) => data.isLegendary);

        const cols = 3;
        const size = 105;
        const gap = 8;  // 横の隙間を詰める
        const rowGap = 8;  // 縦の隙間も詰める
        const normalRows = Math.ceil(normalDogs.length / cols);
        
        // 伝説セクションの高さを計算（複数体対応！タイトル分も確保）
        const legendaryRows = Math.ceil(legendaryDogs.length / cols);
        const legendaryHeight = legendaryDogs.length > 0 ? (100 + legendaryRows * (95 + rowGap + 12) + 40) : 0;
        const listHeight = normalRows * (size + rowGap + 12) + 45 + legendaryHeight;
        const totalW = cols * size + (cols - 1) * gap;
        const startX = (width - totalW) / 2 + size / 2;

        // ★ ハートピア風：白カードでグループ化
        const sectionBg = this.add.graphics();
        
        // 外側の影
        sectionBg.fillStyle(0x000000, 0.08);
        sectionBg.fillRoundedRect(18, startY - 8, width - 32, visibleHeight + 10, 20);
        
        // 白カード本体
        sectionBg.fillStyle(0xFFFFFF, 1);
        sectionBg.fillRoundedRect(15, startY - 13, width - 30, visibleHeight + 10, 18);
        
        // 上部アクセントライン（ブラウン）
        sectionBg.fillStyle(0x8D6E63, 0.7);
        sectionBg.fillRoundedRect(15, startY - 13, width - 30, 6, { tl: 18, tr: 18, bl: 0, br: 0 });

        // 🐕 タイトル（伝説ワンコを除いたカウント）
        const allNormalDogs = Object.entries(DOG_TYPES).filter(([id, data]) => !data.isLegendary && id !== '5');
        const unlocked = allNormalDogs.filter(([id]) => GameData.isDogUnlocked(gameData, parseInt(id))).length;
        const isComplete = unlocked === allNormalDogs.length;
        const displayText = isComplete 
            ? `🐕 みんなともだち！ ${unlocked}ひき`
            : `🐕 ${unlocked}ひきのともだち`;

        // 桜井イズム: section + 縁取り
        this.add.text(width / 2, startY + 14, displayText, {
            ...TEXT_STYLE.section,
            fontSize: '16px',
            color: isComplete ? '#4CAF50' : '#5D4037',
        }).setOrigin(0.5);

        // スクロール可能なコンテナ
        this.dogListContainer = this.add.container(0, 0);

        // ★ 通常ワンコカードを追加
        normalDogs.forEach(([id, data], i) => {
            const dogId = parseInt(id);
            const x = startX + (i % cols) * (size + gap);
            const y = startY + 90 + Math.floor(i / cols) * (size + rowGap + 12);  // 下にずらして見切れ防止
            const card = this.createDogCard(x, y, dogId, data);
            this.dogListContainer.add(card);
            
            // ★ チュートリアル用：ゴールデンレトリバー（dogId=5）のカード参照を保存
            if (dogId === 5) {
                this.goldenCard = card;
                this.goldenCardPos = { x, y };
            }
        });

        // ★ 伝説ワンコセクション（特別枠！）
        if (legendaryDogs.length > 0) {
            const legendaryY = startY + 90 + normalRows * (size + rowGap + 12) + 20;
            this.createLegendarySection(legendaryY, legendaryDogs, this.dogListContainer);
        }

        // スクロール用マスク（タイトル下から開始！背景枠内に収める）
        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(0, startY + 35, width, visibleHeight - 50);
        const mask = maskGraphics.createGeometryMask();
        this.dogListContainer.setMask(mask);

        // スクロール制御
        this.scrollY = 0;
        this.maxScroll = Math.max(0, listHeight - visibleHeight + 100);  // 余白分調整

        // ★ スクロール状態をシーン変数に保存（カードタップ判定で使用）
        this.isScrolling = false;
        
        // ★ スクロール可能領域の境界を保存（マスク領域と対応）
        this.scrollBounds = {
            top: startY + 35,
            bottom: startY + visibleHeight - 15,
            left: 15,
            right: width - 15
        };

        // シーン全体でスクロール処理（カードクリックを妨げない）
        let isDragging = false;
        let dragStartY = 0;
        let scrollStartY = 0;

        this.input.on('pointerdown', (pointer) => {
            // スクロール領域内の場合のみ（X軸も制限を追加）
            if (pointer.y >= startY + 30 && pointer.y <= startY + visibleHeight &&
                pointer.x >= 15 && pointer.x <= width - 15) {
                isDragging = true;
                dragStartY = pointer.y;
                scrollStartY = this.scrollY;
                this.isScrolling = false;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (!isDragging) return;
            const delta = Math.abs(pointer.y - dragStartY);
            if (delta > 10) {  // 10px以上動いたらスクロール
                this.isScrolling = true;  // ★ スクロール中フラグを立てる
                this.scrollY = Phaser.Math.Clamp(scrollStartY - (pointer.y - dragStartY), 0, this.maxScroll);
                this.dogListContainer.y = -this.scrollY;
            }
        });

        this.input.on('pointerup', () => {
            isDragging = false;
            // ★ 少し遅延してスクロールフラグをリセット
            this.time.delayedCall(50, () => {
                this.isScrolling = false;
            });
        });
    }

    // ★ 伝説ワンコセクション（図鑑用）- 複数体対応！
    createLegendarySection(startY, legendaryDogs, container) {
        const { width } = this.scale;
        const cardSize = 95;
        const cols = 3;
        const gap = 8;
        const rowGap = 8;
        const rows = Math.ceil(legendaryDogs.length / cols);
        // タイトル(80px) + カード行 + 余白
        const sectionHeight = 90 + rows * (cardSize + rowGap + 12) + 30;
        
        // ✨ 伝説セクション背景（金色グラデーション風）
        const sectionBg = this.add.graphics();
        
        // 金色のグロー（外側）
        sectionBg.fillStyle(0xFFD700, 0.15);
        sectionBg.fillRoundedRect(20, startY, width - 40, sectionHeight, 16);
        
        // 内側の背景（暖かみのあるクリーム）
        sectionBg.fillStyle(0xFFFAE6, 1);
        sectionBg.fillRoundedRect(25, startY + 5, width - 50, sectionHeight - 10, 14);
        
        // 金色の枠線
        sectionBg.lineStyle(3, 0xFFD700, 1);
        sectionBg.strokeRoundedRect(25, startY + 5, width - 50, sectionHeight - 10, 14);
        
        // 上部アクセント（金色）
        sectionBg.fillStyle(0xFFD700, 0.9);
        sectionBg.fillRoundedRect(25, startY + 5, width - 50, 6, { tl: 14, tr: 14, bl: 0, br: 0 });
        
        container.add(sectionBg);
        
        // ★ 伝説ワンコカードをグリッド配置（タイトルより先に追加！）
        const totalW = cols * cardSize + (cols - 1) * gap;
        const gridStartX = (width - totalW) / 2 + cardSize / 2;
        
        legendaryDogs.forEach(([id, data], i) => {
            const dogId = parseInt(id);
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = gridStartX + col * (cardSize + gap);
            const y = startY + 120 + row * (cardSize + rowGap + 12);
            const card = this.createLegendaryCard(x, y, dogId, data);
            container.add(card);
        });
        
        // ✨ セクションタイトル（カードの後に追加して前面に表示！）
        const titleText = this.add.text(width / 2, startY + 50, '✨ でんせつワンコ ✨', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#B8860B',  // ダークゴールド
            stroke: '#FFFFFF',
            strokeThickness: 3,
        }).setOrigin(0.5);
        container.add(titleText);
    }
    
    // ★ 伝説ワンコ専用カード（図鑑用・特別デザイン）
    createLegendaryCard(x, y, dogId, data) {
        const isUnlocked = GameData.isDogUnlocked(gameData, dogId);
        const size = 95;

        const card = this.add.container(x, y);

        // ✨ 特別なカード背景（金色グロー）
        const bg = this.add.graphics();
        
        if (isUnlocked) {
            // ★ 解放済み：豪華な金色カード
            // 外側のグロー
            bg.fillStyle(0xFFD700, 0.4);
            bg.fillRoundedRect(-size / 2 - 6, -size / 2 - 6, size + 12, size + 12, 16);
            // カード本体
            bg.fillStyle(0xFFF8DC, 1);  // コーンシルク（温かみのある金色）
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            // 金色の太枠
            bg.lineStyle(4, 0xFFD700, 1);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        } else {
            // ★ 未解放：神秘的なダークカード（金色の縁取り）
            // 外側の金色グロー（ヒント感）
            bg.fillStyle(0xFFD700, 0.2);
            bg.fillRoundedRect(-size / 2 - 4, -size / 2 - 4, size + 8, size + 8, 16);
            // カード本体（ダークだけど少しだけ金色がかった）
            bg.fillStyle(0x3D3D3D, 1);
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            // 金色の枠線（太めで存在感）
            bg.lineStyle(3, 0xFFD700, 0.7);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        }
        card.add(bg);

        if (isUnlocked) {
            // 🐕 解放済み：輝くワンコ
            const dog = DogFaceRenderer.draw(this, 0, -8, dogId, 24, 'happy');
            card.add(dog);
        } else {
            // 🔒 未解放：シルエット（少し見える程度）
            const silhouette = DogFaceRenderer.draw(this, 0, -8, dogId, 24, 'neutral');
            silhouette.setAlpha(0.35);
            silhouette.list.forEach(child => {
                if (child.setTint) child.setTint(0x111111);
            });
            card.add(silhouette);
            
            // ✨ キラキラエフェクト（ワクワク感！）
            this.addSparkleEffect(card, size);
        }

        // 名前
        const rawName = isUnlocked ? data.name : '？？？';
        const displayName = rawName.length >= 6 
            ? rawName.slice(0, Math.ceil(rawName.length / 2)) + '\n' + rawName.slice(Math.ceil(rawName.length / 2))
            : rawName;
        const name = this.add.text(0, size / 2 - 22, displayName, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: isUnlocked ? '#B8860B' : '#FFD700',  // 金色（未解放も特別感）
            align: 'center',
            lineSpacing: -2,
            stroke: isUnlocked ? '#FFFFFF' : '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5);
        card.add(name);

        card.setSize(size, size);
        card.setInteractive({ useHandCursor: true });

        card.on('pointerdown', (pointer) => {
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            this.tweens.add({ targets: card, scale: 0.93, duration: 50 });
        });
        card.on('pointerup', (pointer) => {
            this.tweens.add({ targets: card, scale: 1, duration: 80 });
            
            if (this.isScrolling) return;
            
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            
            if (isUnlocked) {
                this.showDogDetail(dogId, data);
            } else {
                this.showLegendaryHint(dogId);  // 伝説ワンコ専用ヒント
            }
        });
        card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 80 }));

        return card;
    }
    
    // ✨ キラキラエフェクト（伝説ワンコ用）
    addSparkleEffect(container, size) {
        const sparklePositions = [
            { x: -size / 3, y: -size / 3 },
            { x: size / 3, y: -size / 4 },
            { x: -size / 4, y: size / 5 },
            { x: size / 4, y: size / 4 },
        ];
        
        sparklePositions.forEach((pos, i) => {
            const sparkle = this.add.text(pos.x, pos.y, '✦', {
                fontSize: '10px',
                color: '#FFD700',
            }).setOrigin(0.5).setAlpha(0);
            container.add(sparkle);
            
            // 順番にキラキラ
            this.tweens.add({
                targets: sparkle,
                alpha: { from: 0, to: 0.9 },
                scale: { from: 0.5, to: 1.2 },
                duration: 600,
                delay: i * 300,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
    }
    
    // ★ 伝説ワンコの入手ヒント表示（豪華版！）
    showLegendaryHint(dogId) {
        const { width, height } = this.scale;

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setInteractive();
        const dialog = this.add.container(width / 2, height / 2);

        // ✨ 豪華な背景（金色グラデーション風）- 高さを拡大！
        const bg = this.add.graphics();
        // 外側の金色グロー
        bg.fillStyle(0xFFD700, 0.25);
        bg.fillRoundedRect(-145, -118, 290, 236, 24);
        // メイン背景
        bg.fillStyle(0xFFFAE6, 1);
        bg.fillRoundedRect(-130, -105, 260, 210, 18);
        // 金色の太枠
        bg.lineStyle(5, 0xFFD700, 1);
        bg.strokeRoundedRect(-130, -105, 260, 210, 18);
        // 上部アクセントライン
        bg.fillStyle(0xFFD700, 0.9);
        bg.fillRoundedRect(-130, -105, 260, 8, { tl: 18, tr: 18, bl: 0, br: 0 });
        dialog.add(bg);

        // ✨ タイトル（大きく豪華に）
        const title = this.add.text(0, -70, '✨ でんせつワンコ ✨', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#B8860B',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5);
        dialog.add(title);

        // ヒントメッセージ（LEGEND_ENCOUNTERSから取得）
        const legendInfo = LEGEND_ENCOUNTERS[dogId];
        let hintText = 'とっても めずらしい\nワンコだよ！\n\nどうやったら\nあえるかな…？';
        
        if (legendInfo) {
            // 未獲得時は名前を「？？？」に
            hintText = `【？？？】\n\n${legendInfo.description}`;
        }
        
        const hint = this.add.text(0, 5, hintText, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#5D4037',
            align: 'center',
            lineSpacing: 4,
        }).setOrigin(0.5);
        dialog.add(hint);

        // ✨ 豪華な閉じるボタン
        const btnContainer = this.add.container(0, 83);
        const btnBg = this.add.graphics();
        // ボタンの影
        btnBg.fillStyle(0xB8860B, 0.3);
        btnBg.fillRoundedRect(-52, -14, 104, 32, 12);
        // ボタン本体（金色グラデーション風）
        btnBg.fillStyle(0xFFD700, 1);
        btnBg.fillRoundedRect(-50, -16, 100, 32, 10);
        btnBg.fillStyle(0xFFF8DC, 1);
        btnBg.fillRoundedRect(-48, -14, 96, 16, { tl: 8, tr: 8, bl: 0, br: 0 });
        btnContainer.add(btnBg);
        
        const btnText = this.add.text(0, 0, 'とじる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#5D4037',
        }).setOrigin(0.5);
        btnContainer.add(btnText);
        
        btnContainer.setSize(100, 32);
        btnContainer.setInteractive({ useHandCursor: true });
        dialog.add(btnContainer);

        // ホバーエフェクト
        btnContainer.on('pointerover', () => {
            this.tweens.add({ targets: btnContainer, scale: 1.08, duration: 80 });
        });
        btnContainer.on('pointerout', () => {
            this.tweens.add({ targets: btnContainer, scale: 1, duration: 80 });
        });

        const close = () => {
            overlay.destroy();
            dialog.destroy();
        };

        overlay.on('pointerup', close);
        btnContainer.on('pointerup', close);
    }

    createDogCard(x, y, dogId, data) {
        const isUnlocked = GameData.isDogUnlocked(gameData, dogId);
        const size = 95;  // 90→95（大きく！）

        const card = this.add.container(x, y);

        // 🎨 桜井イズム：美しいカード背景（共通仕様）
        const bg = this.add.graphics();
        if (isUnlocked) {
            // ★ 共通仕様：暖色アイボリー背景で白カードから浮かせる
            bg.fillStyle(0x000000, 0.06);
            bg.fillRoundedRect(-size / 2 + 3, -size / 2 + 3, size, size, 14);
            bg.fillStyle(0xFFFBF5, 1);  // アイボリー
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(3, data.color, 0.8);  // 犬種カラーの枠線
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        } else {
            // ★ 共通仕様：明るいグレーで視認性UP
            bg.fillStyle(0x000000, 0.04);
            bg.fillRoundedRect(-size / 2 + 2, -size / 2 + 2, size, size, 14);
            bg.fillStyle(0xA8A8A8, 1);  // 明るいグレー
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(2, 0x909090, 1);  // グレー枠
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        }
        card.add(bg);

        if (isUnlocked) {
            // 🐕 アンロック済み（大きく！）
            const dog = DogFaceRenderer.draw(this, 0, -8, dogId, 24, 'happy');
            card.add(dog);
        } else {
            // 🔒 シルエット表示（大きく！ワクワク感を演出）
            const silhouette = DogFaceRenderer.draw(this, 0, -8, dogId, 24, 'neutral');
            silhouette.setAlpha(0.5);  // 見やすく
            silhouette.list.forEach(child => {
                if (child.setTint) child.setTint(0x222222);  // ダークシルエット
            });
            card.add(silhouette);
        }

        // 名前（14px、長い名前は2行に分割）
        const rawName = isUnlocked ? data.name : '？？？';
        const displayName = rawName.length >= 6 
            ? rawName.slice(0, Math.ceil(rawName.length / 2)) + '\n' + rawName.slice(Math.ceil(rawName.length / 2))
            : rawName;
        const name = this.add.text(0, size / 2 - 22, displayName, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: isUnlocked ? PALETTE.textDark : '#888888',
            align: 'center',
            lineSpacing: -2,
        }).setOrigin(0.5);
        card.add(name);

        card.setSize(size, size);
        card.setInteractive({ useHandCursor: true });

        card.on('pointerdown', (pointer) => {
            // ★ マスク領域外のタップは無視
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            this.tweens.add({ targets: card, scale: 0.93, duration: 50 });
        });
        card.on('pointerup', (pointer) => {
            this.tweens.add({ targets: card, scale: 1, duration: 80 });
            
            // ★ スクロール中のタップは無視
            if (this.isScrolling) {
                return;
            }
            
            // ★ マスク領域外のタップは無視
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            
            if (isUnlocked) {
                this.showDogDetail(dogId, data);
            } else {
                this.showUnlockCondition(dogId);
            }
        });
        card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 80 }));

        return card;  // コンテナに追加するために返す
    }

    showDogDetail(dogId, data) {
        const { width, height } = this.scale;
        const trivia = DOG_TRIVIA[dogId] || {};

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive();
        const dialog = this.add.container(width / 2, height / 2);

        // 背景
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 1);
        bg.fillRoundedRect(-150, -180, 300, 360, 16);
        bg.lineStyle(3, data.color, 1);
        bg.strokeRoundedRect(-150, -180, 300, 360, 16);
        dialog.add(bg);

        // 犬の顔（大きく）
        const dog = DogFaceRenderer.draw(this, 0, -110, dogId, 35, 'happy');
        dialog.add(dog);

        // 名前
        const nameText = this.add.text(0, -55, data.name, {
            ...TEXT_STYLE.heading,
            fontSize: '24px',
        }).setOrigin(0.5);
        dialog.add(nameText);

        // 🎯 桜井イズム：「出会った日」で思い出を（物語の設計）
        const unlockDate = gameData.dogUnlockDates?.[dogId];
        let metDateText = '';
        if (unlockDate) {
            const date = new Date(unlockDate);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            metDateText = `${month}がつ ${day}にち`;
        }
        
        // 情報
        const infoY = -25;
        const info = [
            `🌍 げんさんち: ${trivia.origin || '???'}`,
            `💖 せいかく: ${trivia.personality || '???'}`,
        ];
        
        // 出会った日を追加（存在する場合）
        if (metDateText) {
            info.push(`📅 であったひ: ${metDateText}`);
        }
        
        info.forEach((txt, i) => {
            const t = this.add.text(0, infoY + i * 22, txt, {
                ...TEXT_STYLE.body,
                fontSize: '12px',
            }).setOrigin(0.5);
            dialog.add(t);
        });

        // 豆知識
        const triviaY = info.length > 2 ? 55 : 50;
        const triviaText = this.add.text(0, triviaY, `📝 ${trivia.trivia || '???'}`, {
            ...TEXT_STYLE.body,
            fontSize: '11px',
            align: 'center',
            lineSpacing: 3,
            wordWrap: { width: 270 },
        }).setOrigin(0.5);
        dialog.add(triviaText);

        // おもしろ豆知識
        const funFactText = this.add.text(0, 110, `💡 ${trivia.funFact || '???'}`, {
            ...TEXT_STYLE.small,
            fontSize: '10px',
            color: '#666666',
            align: 'center',
            lineSpacing: 3,
            wordWrap: { width: 270 },
        }).setOrigin(0.5);
        dialog.add(funFactText);

        // 閉じるボタン
        const closeBtn = this.add.text(0, 155, '❤️ とじる', {
            ...TEXT_STYLE.button,
            fontSize: '16px',
            backgroundColor: '#FF6B8A',
            padding: { x: 30, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        dialog.add(closeBtn);

        closeBtn.on('pointerup', () => {
            dialog.destroy();
            overlay.destroy();
        });

        overlay.on('pointerup', () => {
            dialog.destroy();
            overlay.destroy();
        });

        // 登場アニメーション
        dialog.setScale(0.5);
        dialog.setAlpha(0);
        this.tweens.add({
            targets: dialog,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
    }

    showUnlockCondition(dogId) {
        const { width, height } = this.scale;
        const achievement = Object.values(ACHIEVEMENTS).find(a => a.dogId === dogId);

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setInteractive();
        const dialog = this.add.container(width / 2, height / 2);

        // 背景（シルエット用に拡大）
        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 1);
        bg.fillRoundedRect(-140, -120, 280, 240, 12);
        dialog.add(bg);

        // 🐕 大きなシルエット表示（ワクワク感！）
        const silhouette = DogFaceRenderer.draw(this, 0, -55, dogId, 32, 'neutral');
        silhouette.setAlpha(0.6);
        silhouette.list.forEach(child => {
            if (child.setTint) child.setTint(0x111111);
        });
        dialog.add(silhouette);

        // ？？？ を目立たせる
        const mystery = this.add.text(0, 5, '？？？', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        dialog.add(mystery);

        // 解除条件（隠し実績・ゴールデンワンコは条件も隠す）
        let condText;
        let progressText = '';
        
        // ゴールデンワンコ（ID=29）は特別：入手条件を秘密にする
        if (dogId === 29) {
            condText = '🔓 ？？？';  // 入手条件は秘密！
        } else if (achievement) {
            if (achievement.isSecret) {
                condText = '🔓 ？？？';  // 隠し犬種は条件も秘密
            } else {
                condText = `🔓 ${achievement.description}`;
                // 進捗を計算
                progressText = this.getProgressText(achievement.condition);
            }
        } else {
            condText = '🔓 ???';
        }
        const text = this.add.text(0, 50, condText, {
            ...TEXT_STYLE.body,
            fontSize: '13px',
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: 240 },
        }).setOrigin(0.5);
        dialog.add(text);

        // 進捗表示
        if (progressText) {
            const progress = this.add.text(0, 85, progressText, {
                fontSize: '11px',
                color: '#AAAAAA',
                align: 'center',
            }).setOrigin(0.5);
            dialog.add(progress);
        }

        // 閉じる
        overlay.on('pointerup', () => {
            dialog.destroy();
            overlay.destroy();
        });

        dialog.setScale(0.8);
        dialog.setAlpha(0);
        this.tweens.add({ targets: dialog, scale: 1, alpha: 1, duration: 150, ease: 'Back.easeOut' });
    }

    // 進捗テキストを生成
    getProgressText(condition) {
        if (!condition) return '';

        const stats = gameData.stats || {};
        let current = 0;
        let required = condition.value || 0;
        let unit = '';

        switch (condition.type) {
            case 'total_clears':
                current = stats.totalClears || 0;
                unit = '回クリア';
                break;
            case 'total_pieces':
                current = stats.totalPieces || 0;
                unit = 'ピース';
                break;
            case 'max_combo':
                current = stats.maxComboCount || 0;
                unit = 'コンボ';
                break;
            case 'consecutive_clears':
                current = stats.consecutiveClears || 0;
                unit = '連続';
                break;
            case 'consecutive_logins':
                current = stats.consecutiveLogins || 0;
                unit = '日';
                break;
            case 'challenge_streak':
                current = stats.challengeHighScore || 0;
                unit = '連勝';
                break;
            case 'golden_clears':
                current = stats.goldenClears || 0;
                unit = '回';
                break;
            case 'no_miss_clears':
                current = stats.noMissClears || 0;
                unit = '回';
                break;
            case 'weekly_complete':
                current = gameData.rewards?.totalWeeklyComplete || 0;
                unit = '回';
                break;
            case 'theme_clears':
                current = stats.themeClears?.[condition.theme] || 0;
                unit = '回';
                break;
            case 'day_of_week_clears':
                current = stats.dayOfWeekClears?.[condition.day] || 0;
                unit = '回';
                break;
            case 'dog_specific_clears':
                current = stats.dogSpecificClears?.[condition.dogId] || 0;
                unit = '回';
                break;
            default:
                return '';
        }

        return `（現在: ${current}${unit} / ${required}${unit}）`;
    }

    // ========================================
    // ★ チュートリアル機能（図鑑用）
    // ========================================
    showZukanTutorial() {
        const { width, height } = this.scale;

        // チュートリアルコンテナ
        this.tutorialContainer = this.add.container(0, 0).setDepth(1000);

        // 半透明の黒背景
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, width, height);
        this.tutorialContainer.add(overlay);

        // ゴールデンレトリバーをハイライト
        if (this.goldenCardPos) {
            const glow = this.add.graphics();
            glow.fillStyle(0xFFD700, 0.4);
            glow.fillRoundedRect(
                this.goldenCardPos.x - 55,
                this.goldenCardPos.y - 55,
                110,
                110,
                16
            );
            this.tutorialContainer.add(glow);

            // パルスアニメーション
            this.tweens.add({
                targets: glow,
                alpha: { from: 0.4, to: 0.7 },
                scaleX: { from: 1, to: 1.05 },
                scaleY: { from: 1, to: 1.05 },
                duration: 500,
                yoyo: true,
                repeat: -1,
            });

            // 矢印
            const arrow = this.add.text(this.goldenCardPos.x, this.goldenCardPos.y - 70, '👇', {
                fontSize: '32px',
            }).setOrigin(0.5);
            this.tutorialContainer.add(arrow);

            // 矢印アニメーション
            this.tweens.add({
                targets: arrow,
                y: this.goldenCardPos.y - 60,
                duration: 400,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        // 説明テキスト用の背景
        const textBgY = height * 0.78;
        const textBg = this.add.graphics();
        textBg.fillStyle(0xFFFFFF, 0.95);
        textBg.fillRoundedRect(30, textBgY - 50, width - 60, 130, 16);
        this.tutorialContainer.add(textBg);

        // メインテキスト
        const mainText = this.add.text(width / 2, textBgY - 15, 'ゴールデンレトリバーを\nタップして設定しよう！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '22px',
            color: '#5D4037',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        this.tutorialContainer.add(mainText);

        // サブテキスト
        const subText = this.add.text(width / 2, textBgY + 35, 'お気に入りのワンコを選んで遊ぼう！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#8D6E63',
        }).setOrigin(0.5);
        this.tutorialContainer.add(subText);

        // タップで閉じる（ゴールデンカード選択を監視）
        this.waitForGoldenSelection();
    }

    waitForGoldenSelection() {
        // ゴールデンレトリバー(dogId=5)が選択されたかチェック
        const checkInterval = this.time.addEvent({
            delay: 100,
            callback: () => {
                if (gameData.selectedDogs.includes(5)) {
                    checkInterval.destroy();
                    this.completeTutorial();
                }
            },
            loop: true
        });

        // オーバーレイをタップで消すことも可能に
        const hitArea = this.add.rectangle(
            this.scale.width / 2, 
            this.scale.height / 2, 
            this.scale.width, 
            this.scale.height, 
            0x000000, 0
        ).setInteractive({ useHandCursor: true });
        this.tutorialContainer.add(hitArea);

        hitArea.on('pointerdown', () => {
            // オーバーレイを消す
            this.hideTutorialOverlay();
        });
    }

    completeTutorial() {
        const { width, height } = this.scale;

        // チュートリアル完了フラグを立てる
        gameData.tutorial.completed = true;
        gameData.tutorial.inProgress = false;
        GameData.save(gameData);

        // 既存のオーバーレイを消す
        this.hideTutorialOverlay();

        // 完了メッセージを表示
        this.tutorialContainer = this.add.container(0, 0).setDepth(1000);

        // 半透明背景
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, width, height);
        this.tutorialContainer.add(overlay);

        // 完了メッセージカード
        const cardW = width - 60;
        const cardH = 260;
        const cardY = height / 2;

        const card = this.add.graphics();
        card.fillStyle(0xFFFFFF, 0.98);
        card.fillRoundedRect(-cardW / 2 + width / 2, cardY - cardH / 2, cardW, cardH, 20);
        this.tutorialContainer.add(card);

        // 🎉 タイトル
        const titleText = this.add.text(width / 2, cardY - 70, '🎉 準備かんりょう！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '28px',
            color: '#FF6F00',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.tutorialContainer.add(titleText);

        // メッセージ
        const msgText = this.add.text(width / 2, cardY - 15, 'これで準備はOK！\nいっぱい遊んでね！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#5D4037',
            align: 'center',
        }).setOrigin(0.5);
        this.tutorialContainer.add(msgText);

        const infoText = this.add.text(
            width / 2,
            cardY + 45,
            'きょうのおさんぽを達成すると\nおさんぽメダルがもらえるよ！\nおさんぽメダルは きせかえの\nこうかんで使えるよ！',
            {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '16px',
                color: '#6D4C41',
                align: 'center',
                lineSpacing: 4,
            }
        ).setOrigin(0.5);
        this.tutorialContainer.add(infoText);

        // 「はじめる」ボタン
        const btnW = 160;
        const btnH = 50;
        const btnY = cardY + 110;

        const btn = this.add.container(width / 2, btnY);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFF8F00, 1);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
        btn.add(btnBg);

        const btnText = this.add.text(0, 0, 'はじめる！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#FFFFFF',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        btn.add(btnText);

        btn.setSize(btnW, btnH);
        btn.setInteractive({ useHandCursor: true });
        this.tutorialContainer.add(btn);

        // ボタンインタラクション
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.05, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.95, duration: 40 });
            HapticManager.selection();
            AudioManager.playSfx(this, 'sfx_ui_tap');
        });
        btn.on('pointerup', () => {
            // メインメニューへ（チュートリアル完了！）
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('MainMenuScene');
            });
        });
    }

    hideTutorialOverlay() {
        if (this.tutorialContainer) {
            this.tutorialContainer.destroy();
            this.tutorialContainer = null;
        }
    }
}

// ========================================
// 犬選択シーン
// ========================================
class DogSelectScene extends Phaser.Scene {
    constructor() { super({ key: 'DogSelectScene' }); }

    // Phaserはrestart()でデータをinit()に渡す
    init(data) {
        // シーン再起動時にデータを引き継ぐ
        if (data && data.selectedDogs && data.selectedDogs.length > 0) {
            this.selectedDogs = [...data.selectedDogs];
        } else {
            this.selectedDogs = [...gameData.selectedDogs];
        }
        // ★ チュートリアルモード
        this.tutorialMode = data?.tutorialMode || false;
        this.tutorialContainer = null;
        this.dogOptionMap = new Map();
        this.dogGridStartY = 0;
        this.dogGridVisibleHeight = 0;
        this.dogGridMaxScroll = 0;
    }

    create() {
        const { width, height } = this.scale;

        AudioManager.playBgm(this, 'bgm_select');

        // 🎨 背景画像を設定（画面にフィット）
        const bg = this.add.image(width / 2, height / 2, 'erabu_bg');
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const scale = Math.max(scaleX, scaleY);
        bg.setScale(scale).setDepth(0);

        this.createHeader();
        this.createSelectedDisplay();
        this.createDogGrid();
        this.createConfirmButton();

        this.cameras.main.fadeIn(300);

        // ★ チュートリアルモードの場合、説明を表示
        // （ただし完了済み or ゴールデンレトリバーが既に選択済みなら表示しない）
        if (this.tutorialMode && !gameData.tutorial.completed && !this.selectedDogs.includes(5)) {
            this.time.delayedCall(500, () => {
                this.showErabuTutorial();
            });
        }
    }

    createHeader() {
        const { width } = this.scale;
        const headerY = SAFE.TOP;

        // ヘッダー背景は削除（背景画像を活かす）

        const hideBackButton = this.tutorialMode && !gameData.tutorial?.completed;

        if (!hideBackButton) {
            // 戻るボタン（メインメニューと同じ背景付きスタイル）
            this.createBackButton(50, headerY + 32);
        }

        // タイトル（メインメニューと統一）
        const titleText = this.add.text(width / 2, headerY + 32, '🐕 えらぶ', {
            ...TEXT_STYLE.heading,
            fontSize: '22px',
        }).setOrigin(0.5);
        titleText.setDepth(101);
    }

    createBackButton(x, y) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRoundedRect(-38, -16, 76, 32, 10);
        bg.lineStyle(2.5, DOG_TYPES[3].color, 1);
        bg.strokeRoundedRect(-38, -16, 76, 32, 10);

        // 桜井イズム: KeiFont + 縁取りで統一感
        const txt = this.add.text(0, 0, '← もどる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#5D4037',
            stroke: '#FFFFFF',
            strokeThickness: 2,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(76, 32);
        btn.setInteractive({ useHandCursor: true });
        btn.setDepth(101);

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.08, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('MainMenuScene'));
        });

        return btn;
    }

    createSelectedDisplay() {
        const { width } = this.scale;
        const y = SAFE.TOP + 75;

        // ★ ハートピア風：白カードでグループ化（視覚的分離を強化）
        const sectionBg = this.add.graphics();
        
        // 外側の影（深みを出す）
        sectionBg.fillStyle(0x000000, 0.08);
        sectionBg.fillRoundedRect(18, y - 3, width - 32, 115, 20);
        
        // 白カード本体（ハートピア風）
        sectionBg.fillStyle(0xFFFFFF, 1);
        sectionBg.fillRoundedRect(15, y - 8, width - 30, 115, 18);
        
        // 上部にアクセントライン（金色で「選択中」を強調）
        const count = this.selectedDogs.length;
        const accentColor = count === 4 ? 0xFFD700 : 0xFF8C00;
        sectionBg.fillStyle(accentColor, 0.9);
        sectionBg.fillRoundedRect(15, y - 8, width - 30, 6, { tl: 18, tr: 18, bl: 0, br: 0 });

        // 選択数に応じてタイトル変更
        const titleText = count === 4 
            ? '🐾 つかうワンコ（4ひき）' 
            : `🐾 つかうワンコ（${count}/4ひき）`;
        const titleColor = count === 4 ? '#5D4037' : '#E65100';
        
        // 桜井イズム: section + 縁取り
        this.add.text(width / 2, y + 16, titleText, {
            ...TEXT_STYLE.section,
            fontSize: '16px',
            color: titleColor,
        }).setOrigin(0.5);

        this.selectedContainer = this.add.container(width / 2, y + 65);
        this.updateSelectedDisplay();
    }

    updateSelectedDisplay() {
        this.selectedContainer.removeAll(true);

        const gap = 65;
        const startX = -1.5 * gap;

        this.selectedDogs.forEach((dogId, i) => {
            const x = startX + i * gap;
            const dog = DogFaceRenderer.draw(this, x, 0, dogId, 22, 'happy');  // 少し大きく
            this.selectedContainer.add(dog);
        });
    }

    createDogGrid() {
        const { width, height } = this.scale;
        const startY = SAFE.TOP + 210;
        const visibleHeight = height - startY - SAFE.BOTTOM - 70;
        this.dogGridStartY = startY;
        this.dogGridVisibleHeight = visibleHeight;

        // ★ 通常ワンコと伝説ワンコを分離
        const normalDogs = Object.entries(DOG_TYPES).filter(([id, data]) => {
            // 伝説ワンコは別枠
            if (data.isLegendary) return false;
            // 通常の隠し犬種の処理
            if (data.isSecret && !GameData.isDogUnlocked(gameData, parseInt(id))) {
                return false;
            }
            return true;
        });
        
        // ★ 伝説ワンコは常に表示（未解放でもシルエットで表示！）
        const legendaryDogs = Object.entries(DOG_TYPES).filter(([id, data]) => data.isLegendary);

        const cols = 3;
        const size = 105;
        const gap = 8;  // 横の隙間を詰める
        const rowGap = 8;  // 縦の隙間も詰める（名前込み）
        const normalRows = Math.ceil(normalDogs.length / cols);
        
        // 伝説セクションの高さ（複数体対応！タイトル分も確保）
        const legendaryRows = Math.ceil(legendaryDogs.length / cols);
        const legendaryHeight = legendaryDogs.length > 0 ? (100 + legendaryRows * (95 + rowGap + 12) + 40) : 0;
        const gridHeight = normalRows * (size + rowGap + 12) + 70 + legendaryHeight;
        const totalW = cols * size + (cols - 1) * gap;
        const startX = (width - totalW) / 2 + size / 2;

        // ★ ハートピア風：白カードでグループ化
        const sectionBg = this.add.graphics();
        
        // 外側の影
        sectionBg.fillStyle(0x000000, 0.08);
        sectionBg.fillRoundedRect(18, startY - 8, width - 32, visibleHeight, 20);
        
        // 白カード本体
        sectionBg.fillStyle(0xFFFFFF, 1);
        sectionBg.fillRoundedRect(15, startY - 13, width - 30, visibleHeight, 18);
        
        // ★ 上部アクセントライン（ピンク系に変更 - 背景の水色と対比）
        sectionBg.fillStyle(0xFF69B4, 0.75);
        sectionBg.fillRoundedRect(15, startY - 13, width - 30, 6, { tl: 18, tr: 18, bl: 0, br: 0 });

        // タイトル（桜井イズム: section + 縁取り）
        this.add.text(width / 2, startY + 14, `🎀 えらべるワンコ`, {
            ...TEXT_STYLE.section,
            fontSize: '16px',
        }).setOrigin(0.5);

        // スクロール可能なコンテナ
        this.dogGridContainer = this.add.container(0, 0);

        // ★ 通常ワンコを追加
        normalDogs.forEach(([id, data], i) => {
            const dogId = parseInt(id);
            const x = startX + (i % cols) * (size + gap);
            const y = startY + 90 + Math.floor(i / cols) * (size + rowGap + 12);  // 行間を詰める
            this.createDogOption(x, y, dogId, data, this.dogGridContainer);
        });

        // ★ 伝説ワンコセクション（解放済みの場合のみ）
        if (legendaryDogs.length > 0) {
            const legendaryY = startY + 90 + normalRows * (size + rowGap + 12) + 20;
            this.createLegendarySelectSection(legendaryY, legendaryDogs, this.dogGridContainer);
        }

        // スクロール用マスク（選択グローが見切れないように調整）
        const maskGraphics = this.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        maskGraphics.fillRect(0, startY + 30, width, visibleHeight - 50);  // 上部に余裕を持たせる
        const mask = maskGraphics.createGeometryMask();
        this.dogGridContainer.setMask(mask);

        // スクロール制御
        this.scrollY = 0;
        this.maxScroll = Math.max(0, gridHeight - visibleHeight + 85);  // 余白分調整
        this.dogGridMaxScroll = this.maxScroll;

        // ★ スクロール状態をシーン変数に保存（犬タップ判定で使用）
        this.isScrolling = false;
        this.scrollStartPointer = { x: 0, y: 0 };
        
        // ★ スクロール可能領域の境界を保存（マスク領域と対応）
        this.scrollBounds = {
            top: startY + 30,
            bottom: startY + visibleHeight - 20,
            left: 15,
            right: width - 15
        };

        // シーン全体でスクロール処理（ボタンクリックを妨げない）
        let isDragging = false;
        let dragStartY = 0;
        let scrollStartY = 0;

        this.input.on('pointerdown', (pointer) => {
            // スクロール領域内の場合のみ（X軸も制限を追加）
            if (pointer.y >= startY + 25 && pointer.y <= startY + visibleHeight - 15 &&
                pointer.x >= 15 && pointer.x <= width - 15) {
                isDragging = true;
                dragStartY = pointer.y;
                scrollStartY = this.scrollY;
                this.scrollStartPointer = { x: pointer.x, y: pointer.y };
                this.isScrolling = false;  // まだスクロール開始していない
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (!isDragging) return;
            const delta = Math.abs(pointer.y - dragStartY);
            if (delta > 10) {  // 10px以上動いたらスクロール
                this.isScrolling = true;  // ★ スクロール中フラグを立てる
                this.scrollY = Phaser.Math.Clamp(scrollStartY - (pointer.y - dragStartY), 0, this.maxScroll);
                this.dogGridContainer.y = -this.scrollY;
            }
        });

        this.input.on('pointerup', () => {
            isDragging = false;
            // ★ 少し遅延してスクロールフラグをリセット（タップ判定との競合を防ぐ）
            this.time.delayedCall(50, () => {
                this.isScrolling = false;
            });
        });
    }

    // ★ 伝説ワンコセクション（えらぶ画面用）- 複数体対応！
    createLegendarySelectSection(startY, legendaryDogs, container) {
        const { width } = this.scale;
        const cardSize = 95;
        const cols = 3;
        const gap = 8;
        const rowGap = 8;
        const rows = Math.ceil(legendaryDogs.length / cols);
        // タイトル(80px) + カード行 + 余白
        const sectionHeight = 90 + rows * (cardSize + rowGap + 12) + 30;
        
        // ✨ 伝説セクション背景（金色グラデーション風）
        const sectionBg = this.add.graphics();
        
        // 金色のグロー（外側）
        sectionBg.fillStyle(0xFFD700, 0.15);
        sectionBg.fillRoundedRect(20, startY, width - 40, sectionHeight, 16);
        
        // 内側の背景（暖かみのあるクリーム）
        sectionBg.fillStyle(0xFFFAE6, 1);
        sectionBg.fillRoundedRect(25, startY + 5, width - 50, sectionHeight - 10, 14);
        
        // 金色の枠線
        sectionBg.lineStyle(3, 0xFFD700, 1);
        sectionBg.strokeRoundedRect(25, startY + 5, width - 50, sectionHeight - 10, 14);
        
        // 上部アクセント（金色）
        sectionBg.fillStyle(0xFFD700, 0.9);
        sectionBg.fillRoundedRect(25, startY + 5, width - 50, 6, { tl: 14, tr: 14, bl: 0, br: 0 });
        
        container.add(sectionBg);
        
        // ★ 伝説ワンコカードをグリッド配置（タイトルより先に追加！）
        const totalW = cols * cardSize + (cols - 1) * gap;
        const gridStartX = (width - totalW) / 2 + cardSize / 2;
        
        legendaryDogs.forEach(([id, data], i) => {
            const dogId = parseInt(id);
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = gridStartX + col * (cardSize + gap);
            const y = startY + 120 + row * (cardSize + rowGap + 12);
            this.createLegendaryOption(x, y, dogId, data, container);
        });
        
        // ✨ セクションタイトル（カードの後に追加して前面に表示！）
        const titleText = this.add.text(width / 2, startY + 50, '✨ でんせつワンコ ✨', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#B8860B',  // ダークゴールド
            stroke: '#FFFFFF',
            strokeThickness: 3,
        }).setOrigin(0.5);
        container.add(titleText);
    }
    
    // ★ 伝説ワンコ専用オプション（えらぶ画面用）
    createLegendaryOption(x, y, dogId, data, container) {
        const isUnlocked = GameData.isDogUnlocked(gameData, dogId);
        const isSelected = this.selectedDogs.includes(dogId);
        const size = 95;

        const btn = this.add.container(x, y);

        // ✨ 特別なカード背景（金色グロー）
        const bg = this.add.graphics();
        
        if (isUnlocked && isSelected) {
            // ★ 選択中：超豪華な金色エフェクト
            bg.fillStyle(0xFFD700, 0.5);
            bg.fillRoundedRect(-size / 2 - 10, -size / 2 - 10, size + 20, size + 20, 18);
            bg.fillStyle(0xFFF8DC, 1);
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(5, 0xFFD700, 1);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
            
            // パルスアニメーション
            this.tweens.add({
                targets: btn,
                scale: { from: 1, to: 1.05 },
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else if (isUnlocked) {
            // ★ 解放済み・未選択：金色の豪華カード
            bg.fillStyle(0xFFD700, 0.3);
            bg.fillRoundedRect(-size / 2 - 6, -size / 2 - 6, size + 12, size + 12, 16);
            bg.fillStyle(0xFFF8DC, 1);
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(3, 0xFFD700, 1);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        } else {
            // ★ 未解放：神秘的なダークカード（図鑑と同じデザイン！）
            bg.fillStyle(0xFFD700, 0.2);
            bg.fillRoundedRect(-size / 2 - 4, -size / 2 - 4, size + 8, size + 8, 16);
            bg.fillStyle(0x3D3D3D, 1);
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(3, 0xFFD700, 0.7);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        }
        btn.add(bg);

        if (isUnlocked) {
            // 🐕 解放済み：輝くワンコ
            const dog = DogFaceRenderer.draw(this, 0, -8, dogId, 20, isSelected ? 'happy' : 'neutral');
            btn.add(dog);
        } else {
            // 🔒 未解放：シルエット
            const silhouette = DogFaceRenderer.draw(this, 0, -8, dogId, 20, 'neutral');
            silhouette.setAlpha(0.35);
            silhouette.list.forEach(child => {
                if (child.setTint) child.setTint(0x111111);
            });
            btn.add(silhouette);
            
            // ✨ キラキラエフェクト
            this.addSelectSparkleEffect(btn, size);
        }

        // 名前
        const rawName = isUnlocked ? data.name : '？？？';
        const displayName = rawName.length >= 6 
            ? rawName.slice(0, Math.ceil(rawName.length / 2)) + '\n' + rawName.slice(Math.ceil(rawName.length / 2))
            : rawName;
        const name = this.add.text(0, size / 2 - 22, displayName, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: isUnlocked ? '#B8860B' : '#FFD700',
            align: 'center',
            lineSpacing: -2,
            stroke: isUnlocked ? '#FFFFFF' : '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5);
        btn.add(name);

        btn.setSize(size, size);
        btn.setInteractive({ useHandCursor: true });

        // ★ dogOptionMapに登録（選択状態更新用）- 解放済みのみ
        if (isUnlocked) {
            this.dogOptionMap.set(dogId, btn);
        }

        btn.on('pointerdown', (pointer) => {
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            this.tweens.add({ targets: btn, scale: isSelected ? 1.05 : 0.93, duration: 50 });
        });
        
        btn.on('pointerup', (pointer) => {
            this.tweens.add({ targets: btn, scale: isSelected ? 1.05 : 1, duration: 80 });
            
            if (this.isScrolling) return;
            
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            
            if (isUnlocked) {
                this.toggleDogSelection(dogId);
            } else {
                // 未解放時はヒントダイアログを表示
                this.showLegendarySelectHint(dogId);
            }
        });
        
        btn.on('pointerout', () => {
            this.tweens.add({ targets: btn, scale: isSelected ? 1.05 : 1, duration: 80 });
        });

        container.add(btn);
    }
    
    // ✨ キラキラエフェクト（えらぶ画面・伝説ワンコ用）
    addSelectSparkleEffect(container, size) {
        const sparklePositions = [
            { x: -size / 3, y: -size / 3 },
            { x: size / 3, y: -size / 4 },
            { x: -size / 4, y: size / 5 },
            { x: size / 4, y: size / 4 },
        ];
        
        sparklePositions.forEach((pos, i) => {
            const sparkle = this.add.text(pos.x, pos.y, '✦', {
                fontSize: '10px',
                color: '#FFD700',
            }).setOrigin(0.5).setAlpha(0);
            container.add(sparkle);
            
            this.tweens.add({
                targets: sparkle,
                alpha: { from: 0, to: 0.9 },
                scale: { from: 0.5, to: 1.2 },
                duration: 600,
                delay: i * 300,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
    }
    
    // ★ 犬の選択をトグル（共通処理）
    toggleDogSelection(dogId) {
        const isSelected = this.selectedDogs.includes(dogId);
        
        // シンプルに選択/解除
        if (isSelected) {
            if (this.selectedDogs.length > 1) {
                this.selectedDogs = this.selectedDogs.filter(d => d !== dogId);
            }
        } else {
            if (this.selectedDogs.length < 4) {
                this.selectedDogs.push(dogId);
            } else {
                this.selectedDogs.shift();
                this.selectedDogs.push(dogId);
            }
        }
        
        // シーン再起動（チュートリアル完了済みの場合は通常モードで再起動）
        const continuesTutorial = this.tutorialMode && !gameData.tutorial.completed;
        this.scene.restart({ selectedDogs: this.selectedDogs, tutorialMode: continuesTutorial });
    }
    
    // ★ 伝説ワンコの入手ヒント（えらぶ画面用）- ずかんと同じ仕様！
    showLegendarySelectHint(dogId) {
        const { width, height } = this.scale;

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setInteractive();
        const dialog = this.add.container(width / 2, height / 2);

        // ✨ 豪華な背景（金色グラデーション風）- 高さを拡大！
        const bg = this.add.graphics();
        // 外側の金色グロー
        bg.fillStyle(0xFFD700, 0.25);
        bg.fillRoundedRect(-145, -118, 290, 236, 24);
        // メイン背景
        bg.fillStyle(0xFFFAE6, 1);
        bg.fillRoundedRect(-130, -105, 260, 210, 18);
        // 金色の太枠
        bg.lineStyle(5, 0xFFD700, 1);
        bg.strokeRoundedRect(-130, -105, 260, 210, 18);
        // 上部アクセントライン
        bg.fillStyle(0xFFD700, 0.9);
        bg.fillRoundedRect(-130, -105, 260, 8, { tl: 18, tr: 18, bl: 0, br: 0 });
        dialog.add(bg);

        // ✨ タイトル（大きく豪華に）
        const title = this.add.text(0, -70, '✨ でんせつワンコ ✨', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#B8860B',
            stroke: '#FFFFFF',
            strokeThickness: 4,
        }).setOrigin(0.5);
        dialog.add(title);

        // ヒントメッセージ（LEGEND_ENCOUNTERSから取得）
        const legendInfo = LEGEND_ENCOUNTERS[dogId];
        let hintText = 'とっても めずらしい\nワンコだよ！\n\nどうやったら\nあえるかな…？';
        
        if (legendInfo) {
            // 未獲得時は名前を「？？？」に
            hintText = `【？？？】\n\n${legendInfo.description}`;
        }
        
        const hint = this.add.text(0, 5, hintText, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#5D4037',
            align: 'center',
            lineSpacing: 4,
        }).setOrigin(0.5);
        dialog.add(hint);

        // ✨ 豪華な閉じるボタン
        const btnContainer = this.add.container(0, 83);
        const btnBg = this.add.graphics();
        // ボタンの影
        btnBg.fillStyle(0xB8860B, 0.3);
        btnBg.fillRoundedRect(-52, -14, 104, 32, 12);
        // ボタン本体（金色グラデーション風）
        btnBg.fillStyle(0xFFD700, 1);
        btnBg.fillRoundedRect(-50, -16, 100, 32, 10);
        btnBg.fillStyle(0xFFF8DC, 1);
        btnBg.fillRoundedRect(-48, -14, 96, 16, { tl: 8, tr: 8, bl: 0, br: 0 });
        btnContainer.add(btnBg);
        
        const btnText = this.add.text(0, 0, 'とじる', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#5D4037',
        }).setOrigin(0.5);
        btnContainer.add(btnText);
        
        btnContainer.setSize(100, 32);
        btnContainer.setInteractive({ useHandCursor: true });
        dialog.add(btnContainer);

        // ホバーエフェクト
        btnContainer.on('pointerover', () => {
            this.tweens.add({ targets: btnContainer, scale: 1.08, duration: 80 });
        });
        btnContainer.on('pointerout', () => {
            this.tweens.add({ targets: btnContainer, scale: 1, duration: 80 });
        });

        const close = () => {
            overlay.destroy();
            dialog.destroy();
        };

        overlay.on('pointerup', close);
        btnContainer.on('pointerup', close);
    }

    createDogOption(x, y, dogId, data, container) {
        const isUnlocked = GameData.isDogUnlocked(gameData, dogId);
        const isSelected = this.selectedDogs.includes(dogId);
        const size = 95;

        const btn = this.add.container(x, y);

        // 🎨 桜井イズム：選択状態を一目で分かるように！（共通仕様）
        const bg = this.add.graphics();
        
        if (isSelected) {
            // ✨ 選択中：ゴールドグロー + パルスアニメ
            bg.fillStyle(0xFFD700, 0.3);
            bg.fillRoundedRect(-size / 2 - 8, -size / 2 - 8, size + 16, size + 16, 16);
            bg.fillStyle(0xFFFAE6, 1);
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(4, 0xFFD700, 1);
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
            
            // ★ パルスアニメーション
            this.tweens.add({
                targets: btn,
                scale: { from: 1, to: 1.03 },
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        } else if (isUnlocked) {
            // ★ 共通仕様：暖色アイボリー背景で白カードから浮かせる
            bg.fillStyle(0x000000, 0.06);
            bg.fillRoundedRect(-size / 2 + 3, -size / 2 + 3, size, size, 14);
            bg.fillStyle(0xFFFBF5, 1);  // アイボリー
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(2.5, 0xDDC8B8, 1);  // 暖色ベージュ枠
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        } else {
            // ★ 共通仕様：明るいグレーで視認性UP（ワクワク感も残す）
            bg.fillStyle(0x000000, 0.04);
            bg.fillRoundedRect(-size / 2 + 2, -size / 2 + 2, size, size, 14);
            bg.fillStyle(0xA8A8A8, 1);  // 明るいグレー
            bg.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
            bg.lineStyle(2, 0x909090, 1);  // グレー枠
            bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
        }
        btn.add(bg);

        if (isUnlocked) {
            // 🐕 アンロック済み：かわいい顔
            const dog = DogFaceRenderer.draw(this, 0, -8, dogId, 20, isSelected ? 'happy' : 'neutral');
            btn.add(dog);
        } else {
            // 🔒 ロック中：シルエット表示（ずかんと同じ仕様）
            const silhouette = DogFaceRenderer.draw(this, 0, -8, dogId, 20, 'neutral');
            silhouette.setAlpha(0.5);
            silhouette.list.forEach(child => {
                if (child.setTint) child.setTint(0x222222);  // ダークシルエット
            });
            btn.add(silhouette);
        }

        // 名前（14px、長い名前は2行に分割）- ずかんと同じ仕様
        const rawName = isUnlocked ? data.name : '？？？';
        const displayName = rawName.length >= 6 
            ? rawName.slice(0, Math.ceil(rawName.length / 2)) + '\n' + rawName.slice(Math.ceil(rawName.length / 2))
            : rawName;
        const name = this.add.text(0, size / 2 - 22, displayName, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: isUnlocked ? PALETTE.textDark : '#888888',  // ずかんと同じグレー
            align: 'center',
            lineSpacing: -2,
        }).setOrigin(0.5);
        btn.add(name);

        btn.setSize(size, size);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerdown', (pointer) => {
            // ★ マスク領域外のタップは無視
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }
            this.tweens.add({ targets: btn, scale: 0.92, duration: 40 });
            HapticManager.impact('Light');
        });
        btn.on('pointerup', (pointer) => {
            this.tweens.add({ targets: btn, scale: 1, duration: 80 });

            // ★ スクロール中のタップは無視
            if (this.isScrolling) {
                return;
            }
            
            // ★ マスク領域外のタップは無視（スクロール後に見えなくなった領域）
            if (this.scrollBounds && 
                (pointer.y < this.scrollBounds.top || pointer.y > this.scrollBounds.bottom)) {
                return;
            }

            // ★ チュートリアルオーバーレイを閉じる（問題1の修正）
            this.hideTutorialOverlay();

            if (!isUnlocked) {
                this.showUnlockCondition(dogId);
                return;
            }

            // シンプルに選択/解除
            if (isSelected) {
                if (this.selectedDogs.length > 1) {
                    this.selectedDogs = this.selectedDogs.filter(d => d !== dogId);
                }
            } else {
                if (this.selectedDogs.length < 4) {
                    this.selectedDogs.push(dogId);
                } else {
                    this.selectedDogs.shift();
                    this.selectedDogs.push(dogId);
                }
            }
            
            // シーン再起動（チュートリアル完了済みの場合は通常モードで再起動）
            const continuesTutorial = this.tutorialMode && !gameData.tutorial.completed;
            this.scene.restart({ selectedDogs: this.selectedDogs, tutorialMode: continuesTutorial });
        });
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));

        // コンテナに追加
        if (container) {
            container.add(btn);
        }

        // チュートリアル用参照を保存
        this.dogOptionMap.set(dogId, btn);
    }

    showUnlockCondition(dogId) {
        const { width, height } = this.scale;
        const achievement = Object.values(ACHIEVEMENTS).find(a => a.dogId === dogId);

        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0);
        const dialog = this.add.container(width / 2, height / 2);

        // 背景（シルエット用に拡大）
        const bg = this.add.graphics();
        bg.fillStyle(0x333333, 1);
        bg.fillRoundedRect(-140, -120, 280, 240, 12);
        dialog.add(bg);

        // 🐕 大きなシルエット表示（ワクワク感！）
        const silhouette = DogFaceRenderer.draw(this, 0, -55, dogId, 32, 'neutral');
        silhouette.setAlpha(0.6);
        silhouette.list.forEach(child => {
            if (child.setTint) child.setTint(0x111111);
        });
        dialog.add(silhouette);

        // ？？？ を目立たせる
        const mystery = this.add.text(0, 5, '？？？', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#FFFFFF',
        }).setOrigin(0.5);
        dialog.add(mystery);

        // 隠し実績は条件も隠す
        let desc;
        let progressText = '';
        if (achievement) {
            if (achievement.isSecret) {
                desc = '🔓 ？？？';
            } else {
                desc = `🔓 ${achievement.description}`;
                // 進捗を計算
                progressText = this.getProgressText(achievement.condition);
            }
        } else {
            desc = '🔓 ???';
        }

        const cond = this.add.text(0, 50, desc, {
            ...TEXT_STYLE.body,
            fontSize: '13px',
            color: '#FFFFFF',
            align: 'center',
            wordWrap: { width: 240 },
        }).setOrigin(0.5);
        dialog.add(cond);

        // 進捗表示
        if (progressText) {
            const progress = this.add.text(0, 85, progressText, {
                fontSize: '11px',
                color: '#AAAAAA',
                align: 'center',
            }).setOrigin(0.5);
            dialog.add(progress);
        }

        overlay.setInteractive();
        overlay.on('pointerup', () => {
            overlay.destroy();
            dialog.destroy();
        });

        // アニメーション
        dialog.setScale(0.8);
        dialog.setAlpha(0);
        this.tweens.add({ targets: dialog, scale: 1, alpha: 1, duration: 150, ease: 'Back.easeOut' });
    }

    // 進捗テキストを生成
    getProgressText(condition) {
        if (!condition) return '';

        const stats = gameData.stats || {};
        let current = 0;
        let required = condition.value || 0;
        let unit = '';

        switch (condition.type) {
            case 'total_clears':
                current = stats.totalClears || 0;
                unit = '回クリア';
                break;
            case 'total_pieces':
                current = stats.totalPieces || 0;
                unit = 'ピース';
                break;
            case 'max_combo':
                current = stats.maxComboCount || 0;
                unit = 'コンボ';
                break;
            case 'consecutive_clears':
                current = stats.maxConsecutiveClears || 0;
                unit = '連続';
                break;
            case 'consecutive_logins':
                current = stats.consecutiveLogins || 0;
                unit = '日';
                break;
            case 'challenge_streak':
                current = stats.challengeHighScore || 0;
                unit = '連勝';
                break;
            case 'golden_clears':
                current = stats.goldenClears || 0;
                unit = '回';
                break;
            case 'no_miss_clears':
                current = stats.noMissClears || 0;
                unit = '回';
                break;
            case 'weekly_complete':
                current = gameData.rewards?.totalWeeklyComplete || 0;
                unit = '回';
                break;
            case 'theme_clears':
                current = stats.themeClears?.[condition.theme] || 0;
                unit = '回';
                break;
            case 'day_of_week_clears':
                current = stats.dayOfWeekClears?.[condition.day] || 0;
                unit = '回';
                break;
            case 'dog_specific_clears':
                current = stats.dogSpecificClears?.[condition.dogId] || 0;
                unit = '回';
                break;
            default:
                return '';
        }

        return `（現在: ${current}${unit} / ${required}${unit}）`;
    }

    createConfirmButton() {
        const { width, height } = this.scale;
        const startY = SAFE.TOP + 205;
        const visibleHeight = height - startY - SAFE.BOTTOM - 70;
        const y = startY + visibleHeight + 15;  // 背景枠のすぐ下に配置

        // 4体選んでいるかチェック
        const isValid = this.selectedDogs.length === 4;

        const btn = this.add.container(width / 2, y);

        const bg = this.add.graphics();
        // 4体選んでいないときはグレーアウト
        bg.fillStyle(isValid ? 0x4CAF50 : 0x999999, 1);
        bg.fillRoundedRect(-80, -22, 160, 44, 8);

        const txt = this.add.text(0, 0, 'けってい', {
            ...TEXT_STYLE.button,
            fontSize: '18px',
            color: isValid ? '#FFFFFF' : '#CCCCCC',
        }).setOrigin(0.5);

        btn.add([bg, txt]);

        // 4体選んでいないときは注意メッセージ
        if (!isValid) {
            const hint = this.add.text(0, 32, `🐾 あと${4 - this.selectedDogs.length}ひきえらんでね！`, {
                fontSize: '12px',
                color: '#FF6B6B',
            }).setOrigin(0.5);
            btn.add(hint);
        }

        btn.setSize(160, 44);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerup', () => {
            // 4体選んでいないときは何もしない
            if (this.selectedDogs.length !== 4) {
                // ブルブル震えて無効を示す（桜井イズム：即座のフィードバック！）
                this.tweens.add({
                    targets: btn,
                    x: btn.x - 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                });
                return;
            }

            // チュートリアル中はゴールデンが必須（ただし完了済みなら通常フロー）
            if (this.tutorialMode && !gameData.tutorial.completed && !this.selectedDogs.includes(5)) {
                this.tweens.add({
                    targets: btn,
                    x: btn.x - 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                });
                this.showErabuTutorial();
                return;
            }
            
            gameData.selectedDogs = this.selectedDogs;
            GameData.save(gameData);
            
            // ★ チュートリアルモードの場合は完了処理（ただし完了済みなら通常フロー）
            if (this.tutorialMode && !gameData.tutorial.completed) {
                this.completeTutorial();
                return;
            }
            
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('MainMenuScene'));
        });
    }

    // ========================================
    // ★ チュートリアル機能（えらぶ画面用）
    // ========================================
    showErabuTutorial() {
        const { width, height } = this.scale;

        // 既存のオーバーレイを削除
        this.hideTutorialOverlay();

        // チュートリアルコンテナ
        this.tutorialContainer = this.add.container(0, 0).setDepth(1000);

        // 半透明の黒背景
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, width, height);
        this.tutorialContainer.add(overlay);

        // ゴールデンを中央付近にスクロールしてハイライト
        const goldenBtn = this.dogOptionMap.get(5);
        if (goldenBtn) {
            this.scrollToDogOption(goldenBtn);
            this.highlightDogOption(goldenBtn);
        }

        // 説明テキスト用の背景
        const textBgY = height * 0.78;
        const textBg = this.add.graphics();
        textBg.fillStyle(0xFFFFFF, 0.95);
        textBg.fillRoundedRect(30, textBgY - 50, width - 60, 130, 16);
        this.tutorialContainer.add(textBg);

        // メインテキスト
        const mainText = this.add.text(width / 2, textBgY - 15, 'ゴールデンレトリバーを\n選んでみよう！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '22px',
            color: '#5D4037',
            fontStyle: 'bold',
            align: 'center',
        }).setOrigin(0.5);
        this.tutorialContainer.add(mainText);

        // サブテキスト
        const subText = this.add.text(width / 2, textBgY + 35, '4匹選んで「けってい」を押そう！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#8D6E63',
        }).setOrigin(0.5);
        this.tutorialContainer.add(subText);

        // タップで閉じる
        const hitArea = this.add.rectangle(
            width / 2, 
            height / 2, 
            width, 
            height, 
            0x000000, 0
        ).setInteractive({ useHandCursor: true });
        this.tutorialContainer.add(hitArea);

        hitArea.on('pointerdown', () => {
            HapticManager.selection();
            AudioManager.playSfx(this, 'sfx_ui_tap');
            this.hideTutorialOverlay();
        });
    }

    scrollToDogOption(btn) {
        if (!this.dogGridContainer) return;
        if (!this.dogGridVisibleHeight) return;

        const targetScroll = btn.y - (this.dogGridStartY + this.dogGridVisibleHeight / 2);
        this.scrollY = Phaser.Math.Clamp(targetScroll, 0, this.dogGridMaxScroll);
        this.dogGridContainer.y = -this.scrollY;
    }

    highlightDogOption(btn) {
        const bounds = btn.getBounds();

        const glow = this.add.graphics();
        glow.fillStyle(0xFFFFFF, 0.25);
        glow.fillRoundedRect(bounds.x - 10, bounds.y - 10, bounds.width + 20, bounds.height + 20, 16);
        glow.lineStyle(3, 0xFFD54F, 1);
        glow.strokeRoundedRect(bounds.x - 10, bounds.y - 10, bounds.width + 20, bounds.height + 20, 16);
        this.tutorialContainer.add(glow);

        this.tweens.add({
            targets: glow,
            alpha: { from: 0.3, to: 0.8 },
            duration: 600,
            yoyo: true,
            repeat: -1,
        });
    }

    completeTutorial() {
        const { width, height } = this.scale;

        // チュートリアル完了フラグを立てる
        gameData.tutorial.completed = true;
        gameData.tutorial.inProgress = false;
        GameData.save(gameData);

        // 完了メッセージを表示
        this.tutorialContainer = this.add.container(0, 0).setDepth(1000);

        // 半透明背景
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.6);
        overlay.fillRect(0, 0, width, height);
        this.tutorialContainer.add(overlay);

        // 完了メッセージカード
        const cardW = width - 60;
        const cardH = 200;
        const cardY = height / 2;

        const card = this.add.graphics();
        card.fillStyle(0xFFFFFF, 0.98);
        card.fillRoundedRect(-cardW / 2 + width / 2, cardY - cardH / 2, cardW, cardH, 20);
        this.tutorialContainer.add(card);

        // 🎉 タイトル
        const titleText = this.add.text(width / 2, cardY - 50, '🎉 準備かんりょう！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '28px',
            color: '#FF6F00',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        this.tutorialContainer.add(titleText);

        // メッセージ
        const msgText = this.add.text(width / 2, cardY + 5, 'これで準備はOK！\nいっぱい遊んでね！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#5D4037',
            align: 'center',
        }).setOrigin(0.5);
        this.tutorialContainer.add(msgText);

        // 「はじめる」ボタン
        const btnW = 160;
        const btnH = 50;
        const btnY = cardY + 70;

        const btn = this.add.container(width / 2, btnY);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFF8F00, 1);
        btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
        btn.add(btnBg);

        const btnText = this.add.text(0, 0, 'はじめる！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: '#FFFFFF',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        btn.add(btnText);

        btn.setSize(btnW, btnH);
        btn.setInteractive({ useHandCursor: true });
        this.tutorialContainer.add(btn);

        // ボタンインタラクション
        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.05, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => {
            this.tweens.add({ targets: btn, scale: 0.95, duration: 40 });
            HapticManager.selection();
            AudioManager.playSfx(this, 'sfx_ui_tap');
        });
        btn.on('pointerup', () => {
            // メインメニューへ（チュートリアル完了！）
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('MainMenuScene');
            });
        });
    }

    hideTutorialOverlay() {
        if (this.tutorialContainer) {
            this.tutorialContainer.destroy();
            this.tutorialContainer = null;
        }
    }
}

// ========================================
// メダル獲得シーン（桜井イズム：最高の祝福演出！）
// ========================================
class MedalCelebrationScene extends Phaser.Scene {
    constructor() { super({ key: 'MedalCelebrationScene' }); }

    init(data) {
        this.medalData = data || { totalMedals: 1, newCostumes: [], stampCount: 0 };
    }

    create() {
        const { width, height } = this.scale;

        AudioManager.playBgm(this, 'bgm_select');
        
        // ★ メダル獲得SE！
        AudioManager.playSfx(this, 'sfx_medal');

        // 背景（キラキラ感！）
        const bg = this.add.rectangle(0, 0, width, height, 0x1a1a2e, 0.95).setOrigin(0);

        // ★ 桜井イズム：即座の祝福！画面を揺らして達成感を増幅！
        this.cameras.main.shake(300, 0.01);

        // キラキラパーティクル（背景に散りばめ）
        this.createSparkles();

        // メインコンテナ
        const container = this.add.container(width / 2, height / 2);

        // メダル本体（大きく！キラキラ！）
        const medalY = -80;
        this.createMedal(container, 0, medalY);

        // 「おさんぽメダル獲得！」テキスト
        const titleText = this.add.text(0, medalY + 90, '🎉 おさんぽメダルGET！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '24px',
            color: '#FFD700',
            stroke: '#8B4513',
            strokeThickness: 4,
            shadow: { offsetX: 2, offsetY: 2, color: '#FFD70066', blur: 8, fill: true },
        }).setOrigin(0.5);
        container.add(titleText);

        // タイトルの登場アニメーション
        titleText.setScale(0);
        this.tweens.add({
            targets: titleText,
            scale: 1,
            duration: 400,
            delay: 500,
            ease: 'Back.easeOut',
        });

        // 累計メダル数
        const totalText = this.add.text(0, medalY + 130, `累計 ${this.medalData.totalMedals} 枚`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '16px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2,
        }).setOrigin(0.5).setAlpha(0);
        container.add(totalText);

        this.tweens.add({
            targets: totalText,
            alpha: 1,
            duration: 300,
            delay: 800,
        });

        // 新しいきせかえ解放があれば表示！
        if (this.medalData.newCostumes && this.medalData.newCostumes.length > 0) {
            this.time.delayedCall(1200, () => {
                this.showNewCostumes(container, this.medalData.newCostumes);
            });
        }

        // タップで閉じる
        this.time.delayedCall(1500, () => {
            const tapText = this.add.text(width / 2, height - 80, 'タップしてつづける', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '14px',
                color: '#FFFFFF',
            }).setOrigin(0.5);

            this.tweens.add({
                targets: tapText,
                alpha: { from: 1, to: 0.4 },
                duration: 600,
                yoyo: true,
                repeat: -1,
            });

            this.input.once('pointerup', () => {
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => {
                    // 🆕 returnSceneが指定されていればそこに戻る
                    const returnScene = this.medalData.returnScene || 'TitleScene';
                    
                    // ★ 新しい衣装がある場合は獲得演出へ
                    if (this.medalData.newCostumes && this.medalData.newCostumes.length > 0) {
                        // 衣装データをItemUnlockScene用に変換
                        const costumeUnlocks = this.medalData.newCostumes.map(c => ({
                            type: 'costume',
                            ...c
                        }));
                        this.scene.start('ItemUnlockScene', {
                            unlocks: costumeUnlocks,
                            returnScene: returnScene,
                            returnData: {}
                        });
                    } else {
                        this.scene.start(returnScene);
                    }
                });
            });
        });
    }

    createMedal(container, x, y) {
        // メダルグラフィック
        const medalContainer = this.add.container(x, y);

        // 光背景（グロー効果）
        const glow = this.add.graphics();
        glow.fillStyle(0xFFD700, 0.3);
        glow.fillCircle(0, 0, 70);
        medalContainer.add(glow);

        // グローアニメーション
        this.tweens.add({
            targets: glow,
            scale: { from: 0.8, to: 1.2 },
            alpha: { from: 0.5, to: 0.2 },
            duration: 1000,
            yoyo: true,
            repeat: -1,
        });

        // メダル本体
        const medal = this.add.graphics();
        // 外枠（金色）
        medal.fillStyle(0xFFD700, 1);
        medal.fillCircle(0, 0, 50);
        // 内側（オレンジグラデーション風）
        medal.fillStyle(0xFFA500, 1);
        medal.fillCircle(0, 0, 42);
        // ハイライト
        medal.fillStyle(0xFFE066, 0.6);
        medal.fillCircle(-15, -15, 15);
        medalContainer.add(medal);

        // 肉球マーク（メダル中央）
        const paw = PawPrint.draw(this, 0, 0, 0xFFFFFF, 18);
        paw.setAlpha(0.9);
        medalContainer.add(paw);

        // メダルの登場アニメーション（ドーン！と登場）
        medalContainer.setScale(0);
        this.tweens.add({
            targets: medalContainer,
            scale: 1,
            duration: 500,
            ease: 'Back.easeOut',
        });

        // キラキラ回転
        this.tweens.add({
            targets: medalContainer,
            angle: { from: -5, to: 5 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        container.add(medalContainer);
    }

    createSparkles() {
        const { width, height } = this.scale;

        // キラキラエフェクトを散りばめ
        for (let i = 0; i < 20; i++) {
            this.time.delayedCall(i * 100, () => {
                const x = Phaser.Math.Between(20, width - 20);
                const y = Phaser.Math.Between(50, height - 50);
                const sparkle = this.add.text(x, y, '✨', {
                    fontSize: `${Phaser.Math.Between(12, 24)}px`,
                }).setOrigin(0.5).setAlpha(0);

                this.tweens.add({
                    targets: sparkle,
                    alpha: { from: 0, to: 1 },
                    scale: { from: 0.5, to: 1.2 },
                    y: y - 30,
                    duration: 800,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => sparkle.destroy(),
                });
            });
        }
    }

    showNewCostumes(container, costumes) {
        const { width } = this.scale;

        const newY = 100;
        const bg = this.add.graphics();
        bg.fillStyle(0x4CAF50, 0.9);
        bg.fillRoundedRect(-140, newY - 30, 280, 60, 10);
        container.add(bg);

        const newText = this.add.text(0, newY - 10, '🎀 NEW きせかえ解放！', {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '14px',
            color: '#FFFFFF',
            fontStyle: 'bold',
        }).setOrigin(0.5);
        container.add(newText);

        const costumeNames = costumes.map(c => `${c.icon} ${c.name}`).join('　');
        const namesText = this.add.text(0, newY + 12, costumeNames, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '12px',
            color: '#FFEB3B',
        }).setOrigin(0.5);
        container.add(namesText);

        // 登場アニメーション
        bg.setAlpha(0);
        newText.setAlpha(0);
        namesText.setAlpha(0);

        this.tweens.add({
            targets: [bg, newText, namesText],
            alpha: 1,
            duration: 300,
            ease: 'Power2',
        });
    }
}

// ========================================
// スタンプラリーシーン（週間ボーナス！）
// ========================================
class StampRallyScene extends Phaser.Scene {
    constructor() { super({ key: 'StampRallyScene' }); }

    create() {
        const { width, height } = this.scale;

        AudioManager.playBgm(this, 'bgm_select');

        // 背景
        this.add.rectangle(0, 0, width, height, PALETTE.sky).setOrigin(0);

        this.createHeader();
        this.createStampBoard();
        this.createBonusArea();
        this.createMedalInfo();

        this.cameras.main.fadeIn(300);
    }

    createHeader() {
        const { width } = this.scale;
        const headerY = SAFE.TOP;

        const headerBg = this.add.graphics();
        headerBg.fillStyle(PALETTE.uiBg, 1);
        headerBg.fillRect(0, headerY, width, 55);

        const backBtn = this.add.text(15, headerY + 28, '← もどる', {
            ...TEXT_STYLE.body,
        }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

        backBtn.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('TitleScene'));
        });

        this.add.text(width / 2, headerY + 28, '📅 スタンプラリー', {
            ...TEXT_STYLE.heading,
        }).setOrigin(0.5);
    }

    createStampBoard() {
        const { width } = this.scale;
        const startY = SAFE.TOP + 90;

        // 背景カード
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 0.95);
        bg.fillRoundedRect(20, startY, width - 40, 180, 16);
        bg.lineStyle(3, 0xFFD700, 1);
        bg.strokeRoundedRect(20, startY, width - 40, 180, 16);

        // タイトル
        this.add.text(width / 2, startY + 20, '🐾 こんしゅうのスタンプ', {
            ...TEXT_STYLE.section,
            fontSize: '14px',
        }).setOrigin(0.5);

        // 曜日ラベル
        const days = ['月', '火', '水', '木', '金', '土', '日'];
        const stampInfo = DailyManager.getStampRallyInfo(gameData);
        const stamps = stampInfo.stamps || [];

        const stampY = startY + 80;
        const stampSize = 38;
        const gap = 8;
        const totalW = 7 * stampSize + 6 * gap;
        const startX = (width - totalW) / 2 + stampSize / 2;

        days.forEach((day, i) => {
            const x = startX + i * (stampSize + gap);

            // 曜日ラベル
            const dayColor = i >= 5 ? '#FF6B6B' : '#666666'; // 土日は赤
            this.add.text(x, stampY - 25, day, {
                fontSize: '12px',
                color: dayColor,
                fontStyle: 'bold',
            }).setOrigin(0.5);

            // スタンプ枠
            const hasStamp = stamps.includes(i);
            const circle = this.add.graphics();

            if (hasStamp) {
                // スタンプ済み！（肉球スタンプ）
                circle.fillStyle(0xFFE082, 1);
                circle.fillCircle(x, stampY, stampSize / 2);
                circle.lineStyle(2, 0xFFD700, 1);
                circle.strokeCircle(x, stampY, stampSize / 2);

                const paw = PawPrint.draw(this, x, stampY, DOG_TYPES[1].color, 10);
            } else {
                // 未スタンプ（点線枠）
                circle.lineStyle(2, 0xCCCCCC, 1);
                circle.strokeCircle(x, stampY, stampSize / 2);

                // 「？」マーク
                this.add.text(x, stampY, '?', {
                    fontSize: '16px',
                    color: '#CCCCCC',
                    fontStyle: 'bold',
                }).setOrigin(0.5);
            }
        });

        // 進捗テキスト
        const progressText = `${stamps.length}/7`;
        this.add.text(width / 2, startY + 145, progressText, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '20px',
            color: stamps.length >= 7 ? '#4CAF50' : '#FF6B6B',
            fontStyle: 'bold',
        }).setOrigin(0.5);

        // 残り日数
        const remaining = 7 - stamps.length;
        if (remaining > 0 && stamps.length < 7) {
            this.add.text(width / 2, startY + 165, `あと ${remaining} 日！`, {
                fontSize: '12px',
                color: '#888888',
            }).setOrigin(0.5);
        }
    }

    createBonusArea() {
        const { width } = this.scale;
        const startY = SAFE.TOP + 290;

        // 週間ボーナスカード
        const bg = this.add.graphics();
        const bonusCheck = DailyManager.checkWeeklyBonus(gameData);
        const canClaim = bonusCheck.canClaim;

        if (canClaim) {
            // 受け取り可能！キラキラ！
            bg.fillStyle(0xFFD700, 0.2);
        } else {
            bg.fillStyle(0xFFFFFF, 0.9);
        }
        bg.fillRoundedRect(20, startY, width - 40, 120, 16);
        bg.lineStyle(2, canClaim ? 0xFFD700 : 0xCCCCCC, 1);
        bg.strokeRoundedRect(20, startY, width - 40, 120, 16);

        // タイトル
        this.add.text(width / 2, startY + 20, '🎁 しゅうまつボーナス', {
            ...TEXT_STYLE.section,
            fontSize: '14px',
        }).setOrigin(0.5);

        // 報酬説明
        this.add.text(width / 2, startY + 50, '7日コンプリートで\nメダル3枚 ＋ 特別きせかえ！', {
            fontSize: '12px',
            color: '#666666',
            align: 'center',
            lineSpacing: 4,
        }).setOrigin(0.5);

        if (canClaim) {
            // 受け取りボタン
            const btn = this.add.container(width / 2, startY + 95);
            const btnBg = this.add.graphics();
            btnBg.fillStyle(0x4CAF50, 1);
            btnBg.fillRoundedRect(-70, -18, 140, 36, 8);
            btn.add(btnBg);

            const btnText = this.add.text(0, 0, '🎉 うけとる！', {
                fontFamily: 'KeiFont, sans-serif',
                fontSize: '16px',
                color: '#FFFFFF',
                fontStyle: 'bold',
            }).setOrigin(0.5);
            btn.add(btnText);

            btn.setSize(140, 36);
            btn.setInteractive({ useHandCursor: true });

            btn.on('pointerup', () => {
                const result = DailyManager.claimWeeklyBonus(gameData);
                if (result.success) {
                    // ボーナス獲得演出へ！
                    this.scene.start('MedalCelebrationScene', {
                        totalMedals: result.totalMedals,
                        bonusMedals: result.bonusMedals,
                        newCostumes: result.newCostumes,
                        isWeeklyBonus: true,
                    });
                }
            });

            // ボタンを揺らす（注目！）
            this.tweens.add({
                targets: btn,
                scale: { from: 1, to: 1.05 },
                duration: 500,
                yoyo: true,
                repeat: -1,
            });
        } else if (bonusCheck.alreadyClaimed) {
            // 今週は受け取り済み
            this.add.text(width / 2, startY + 95, '✅ 今週はうけとりずみ！', {
                fontSize: '14px',
                color: '#4CAF50',
                fontStyle: 'bold',
            }).setOrigin(0.5);
        }
    }

    createMedalInfo() {
        const { width, height } = this.scale;
        const startY = SAFE.TOP + 430;

        // メダル情報カード
        const bg = this.add.graphics();
        bg.fillStyle(0xFFF8E1, 0.95);
        bg.fillRoundedRect(20, startY, width - 40, 100, 16);

        // 累計メダル
        const medals = gameData.rewards?.medals || 0;
        this.add.text(width / 2, startY + 25, '🏅 累計おさんぽメダル', {
            ...TEXT_STYLE.section,
            fontSize: '14px',
        }).setOrigin(0.5);

        this.add.text(width / 2, startY + 55, `${medals} 枚`, {
            fontFamily: 'KeiFont, sans-serif',
            fontSize: '28px',
            color: '#FFD700',
            stroke: '#8B4513',
            strokeThickness: 3,
        }).setOrigin(0.5);

        // 週間完走回数
        const weeklyComplete = gameData.rewards?.totalWeeklyComplete || 0;
        this.add.text(width / 2, startY + 85, `週間コンプリート: ${weeklyComplete} 回`, {
            fontSize: '11px',
            color: '#888888',
        }).setOrigin(0.5);
    }
}

// ========================================
// Phaser 設定
// ========================================
const DPR = Math.min(window.devicePixelRatio || 1, 3);
const GAME_W = 390;
const GAME_H = 844;

const gameConfig = {
    type: Phaser.WEBGL,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    antialias: true,
    pixelArt: false,
    render: {
        antialias: true,
        antialiasGL: true,
        roundPixels: true,
        mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
        powerPreference: 'high-performance',
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H,
    },
    autoFocus: false,
    audio: {
        // AudioContextの自動開始を防ぐ（ユーザー操作後に手動で開始）
        disableWebAudio: false,
        noAudio: false,
    },
    scene: [
        BootScene,
        TitleScene,
        MainMenuScene,    // メインメニュー（ゲームをはじめる押下後）
        ModeSelectScene,  // 旧モード選択（互換性のため残す）
        SelectScene,
        GameScene,
        AchievementUnlockScene,  // ★ 実績解放演出
        ItemUnlockScene,         // ★ 汎用アイテム獲得演出（衣装・にくきゅう・テーマ）
        LegendUnlockScene,       // ✨ でんせつワンコ獲得演出
        ClearScene,
        GameOverScene,
        ShopScene,
        SettingsScene,
        CustomizeScene,
        ZukanScene,
        DogSelectScene,
        MedalCelebrationScene,
        StampRallyScene
    ]
};

// 高DPI Graphics品質: 楕円のデフォルトセグメント数を32→64に引き上げ
const _Graphics = Phaser.GameObjects.Graphics.prototype;
['fillEllipse', 'strokeEllipse'].forEach(method => {
    const orig = _Graphics[method];
    _Graphics[method] = function(x, y, w, h, smoothness) {
        return orig.call(this, x, y, w, h, smoothness || 64);
    };
});
['fillEllipseShape', 'strokeEllipseShape'].forEach(method => {
    const orig = _Graphics[method];
    _Graphics[method] = function(ellipse, smoothness) {
        return orig.call(this, ellipse, smoothness || 64);
    };
});

// 高DPI テキスト対応: テキスト生成時に resolution: DPR を自動付与
if (DPR > 1) {
    const _origText = Phaser.GameObjects.GameObjectFactory.prototype.text;
    Phaser.GameObjects.GameObjectFactory.prototype.text = function(x, y, text, style) {
        if (style) {
            style = { ...style, resolution: DPR };
        }
        return _origText.call(this, x, y, text, style);
    };
}

// ゲーム開始
console.log('🐕 ワンこねくと - 桜井イズム適用版');
if (TEST_MODE) {
    console.log('⚠️ ======================================');
    console.log('⚠️ テストモード: ON');
    console.log('⚠️ - 全ワンコ・きせかえ・テーマ解放済み');
    console.log('⚠️ - チュートリアルスキップ');
    console.log('⚠️ ※本番リリース前にOFFにすること！');
    console.log('⚠️ ======================================');
}
const game = new Phaser.Game(gameConfig);

// 高DPI Canvas: 物理ピクセル解像度でレンダリング
// Phaserのゲーム座標(390x844)を維持しつつ、canvasバッキングストアを
// DPR倍の物理解像度(1170x2532@3x)にすることでジャギーを解消する。
// 方式: gl.viewport/scissorをObject.definePropertyで確実にインターセプトし、
// rendererのresizeとdrawingBufferHeightを正しくDPR対応にオーバーライド。
if (DPR > 1) {
    game.events.once('ready', () => {
        const canvas = game.canvas;
        const renderer = game.renderer;
        const gl = renderer.gl;
        const glProto = Object.getPrototypeOf(gl);
        const _viewport = glProto.viewport;
        const _scissor = glProto.scissor;
        const _bindFB = glProto.bindFramebuffer;

        let renderingToCanvas = true;

        Object.defineProperty(gl, 'bindFramebuffer', {
            value: function(target, fb) {
                renderingToCanvas = (fb === null);
                return _bindFB.call(gl, target, fb);
            },
            writable: true, configurable: true
        });

        Object.defineProperty(gl, 'viewport', {
            value: function(x, y, w, h) {
                if (renderingToCanvas) {
                    return _viewport.call(gl, x * DPR, y * DPR, w * DPR, h * DPR);
                }
                return _viewport.call(gl, x, y, w, h);
            },
            writable: true, configurable: true
        });

        Object.defineProperty(gl, 'scissor', {
            value: function(x, y, w, h) {
                if (renderingToCanvas) {
                    return _scissor.call(gl, x * DPR, y * DPR, w * DPR, h * DPR);
                }
                return _scissor.call(gl, x, y, w, h);
            },
            writable: true, configurable: true
        });

        let _storedDBH = GAME_H;
        Object.defineProperty(renderer, 'drawingBufferHeight', {
            get: function() { return renderingToCanvas ? GAME_H : _storedDBH; },
            set: function(v) { _storedDBH = v; },
            configurable: true
        });

        renderer.resize = function(width, height) {
            this.width = width;
            this.height = height;
            this.setProjectionMatrix(width, height);

            canvas.width = width * DPR;
            canvas.height = height * DPR;

            gl.viewport(0, 0, width, height);

            _storedDBH = canvas.height;

            gl.scissor(0, 0, width, height);

            this.defaultScissor[0] = 0;
            this.defaultScissor[1] = 0;
            this.defaultScissor[2] = width;
            this.defaultScissor[3] = height;

            this.emit('resize', width, height);
        };

        renderer.resize(GAME_W, GAME_H);
    });
}

// 本番ビルドではグローバル公開しない
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    window.game = game;
    window.gameData = gameData;
}
