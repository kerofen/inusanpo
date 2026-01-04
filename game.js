/**
 * いぬさんぽ - ねこあつめ風スタイル版
 * 温かみのある手描き風イラストデザイン
 */

import Phaser from 'phaser';
import { LevelGenerator } from './levelGenerator.js';

const CONFIG = {
    GRID_SIZE: 6,
    CELL_PADDING: 6,
    CORNER_RADIUS: 8,
};

// ねこあつめ風カラーパレット
const PALETTE = {
    // 背景
    sky: 0xF5F5F0,
    grass: 0x8FBC8F,
    grassDark: 0x6B8E6B,
    ground: 0xDEB887,
    groundDark: 0xC4A573,
    wood: 0x8B7355,
    woodDark: 0x6B5344,

    // セル
    cellBg: 0xFFFAF0,
    cellOutline: 0x4A4A4A,

    // おやつ
    snack1: 0xE07A5F, // お肉（テラコッタ）
    snack2: 0x81B29A, // お魚（セージグリーン）
    snack3: 0xF2CC8F, // チーズ（マスタード）
    snack4: 0x9DC183, // やさい（ライトグリーン）

    // UI
    uiBg: 0xFFFDF5,
    uiOutline: 0x5D4E37,
    textDark: '#4A4A4A',
    textLight: '#FFFFFF',
};

const SNACKS = {
    1: { color: PALETTE.snack1, name: 'おにく', icon: 'snack_meat', key: 'snack_meat' },
    2: { color: PALETTE.snack2, name: 'たいやき', icon: 'snack_taiyaki', key: 'snack_taiyaki' },
    3: { color: PALETTE.snack3, name: 'クッキー', icon: 'snack_bone', key: 'snack_bone' },
    4: { color: PALETTE.snack4, name: 'だんご', icon: 'snack_dango', key: 'snack_dango' },
};

let LEVELS = [];

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

    // かわいい犬アイコン（スプライト版）
    static dogIcon(scene, x, y, scale = 1, spriteKey = 'shiba_idle') {
        // スプライトがロードされていればスプライトを使用
        if (scene.textures.exists(spriteKey)) {
            const sprite = scene.add.image(x, y, spriteKey);
            // 1024px画像を適切なサイズに（scale=1で約60pxになるよう調整）
            sprite.setScale(scale * 0.06);
            return sprite;
        }

        // フォールバック: グラフィックス描画（従来の処理）
        const container = scene.add.container(x, y);
        const color = 0xDEB887;

        // 体
        const body = scene.add.graphics();
        body.fillStyle(color, 1);
        body.fillEllipse(0, 15 * scale, 30 * scale, 20 * scale);
        body.lineStyle(2, PALETTE.cellOutline, 1);
        body.strokeEllipse(0, 15 * scale, 30 * scale, 20 * scale);

        // 顔
        const face = scene.add.graphics();
        face.fillStyle(color, 1);
        face.fillCircle(0, -5 * scale, 22 * scale);
        face.lineStyle(2, PALETTE.cellOutline, 1);
        face.strokeCircle(0, -5 * scale, 22 * scale);

        // 耳
        const ears = scene.add.graphics();
        ears.fillStyle(color, 1);
        ears.fillEllipse(-18 * scale, -20 * scale, 12 * scale, 18 * scale);
        ears.fillEllipse(18 * scale, -20 * scale, 12 * scale, 18 * scale);
        ears.lineStyle(2, PALETTE.cellOutline, 1);
        ears.strokeEllipse(-18 * scale, -20 * scale, 12 * scale, 18 * scale);
        ears.strokeEllipse(18 * scale, -20 * scale, 12 * scale, 18 * scale);

        // 目
        const eyes = scene.add.graphics();
        eyes.fillStyle(PALETTE.cellOutline, 1);
        eyes.fillCircle(-8 * scale, -8 * scale, 4 * scale);
        eyes.fillCircle(8 * scale, -8 * scale, 4 * scale);
        eyes.fillStyle(0xFFFFFF, 1);
        eyes.fillCircle(-6 * scale, -10 * scale, 1.5 * scale);
        eyes.fillCircle(10 * scale, -10 * scale, 1.5 * scale);

        // 鼻
        const nose = scene.add.graphics();
        nose.fillStyle(PALETTE.cellOutline, 1);
        nose.fillCircle(0, 0, 4 * scale);

        // 口
        const mouth = scene.add.graphics();
        mouth.lineStyle(2, PALETTE.cellOutline, 1);
        mouth.beginPath();
        mouth.moveTo(0, 4 * scale);
        mouth.lineTo(0, 8 * scale);
        mouth.moveTo(-6 * scale, 10 * scale);
        mouth.lineTo(0, 14 * scale);
        mouth.lineTo(6 * scale, 10 * scale);
        mouth.strokePath();

        container.add([body, ears, face, eyes, nose, mouth]);
        return container;
    }

    // おやつアイコン（スプライト版）
    static snackIcon(scene, x, y, type, size = 20) {
        const snack = SNACKS[type];

        // スプライトがロードされていればスプライトを使用
        if (snack.key && scene.textures.exists(snack.key)) {
            const sprite = scene.add.image(x, y, snack.key);
            // テクスチャのフレームサイズを取得して適切にスケール
            const frame = scene.textures.getFrame(snack.key);
            const textureWidth = frame ? frame.width : sprite.width;
            const targetSize = size * 2;
            const scale = targetSize / textureWidth;
            sprite.setScale(scale);
            return sprite;
        }

        // フォールバック: シンプルな円形アイコン
        const container = scene.add.container(x, y);
        const g = scene.add.graphics();
        g.fillStyle(snack.color, 1);
        g.fillCircle(0, 0, size * 0.5);
        g.lineStyle(2, PALETTE.cellOutline, 1);
        g.strokeCircle(0, 0, size * 0.5);
        container.add(g);
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
// ブートシーン
// ========================================
class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }

    preload() {
        // 柴犬キャラクター
        this.load.image('shiba_idle', 'assets/shiba_idle.png');
        this.load.image('shiba_walk', 'assets/shiba_walk.png');
        this.load.image('shiba_happy', 'assets/shiba_happy.png');

        // おやつアイコン
        this.load.image('snack_meat', 'assets/snack_meat.png');
        this.load.image('snack_taiyaki', 'assets/snack_taiyaki.png');
        this.load.image('snack_bone', 'assets/snack_bone.png');
        this.load.image('snack_dango', 'assets/snack_dango.png');

        // パーティクル・UI
        this.load.image('paw_print', 'assets/paw_print.png');
        this.load.image('particle_sparkle', 'assets/particle_sparkle.png');
        this.load.image('particle_heart', 'assets/particle_heart.png');
        this.load.image('particle_star', 'assets/particle_star.png');

        // 背景・ボタン
        this.load.image('bg_japanese', 'assets/bg_japanese.png');
        this.load.image('ui_button', 'assets/ui_button.png');
    }

    create() {
        console.log('BootScene started');
        const { width, height } = this.scale;
        console.log(`Scale detected: ${width}x${height}`);

        try {
            // 背景
            console.log('Adding background...');
            this.add.rectangle(0, 0, width, height, PALETTE.sky).setOrigin(0);

            // 地面
            console.log('Adding ground...');
            const ground = this.add.graphics();
            ground.fillStyle(PALETTE.grass, 1);
            ground.fillRect(0, height * 0.7, width, height * 0.3);

            // 犬アイコン
            console.log('Adding dog icon...');
            if (typeof DrawUtils === 'undefined') {
                console.error('DrawUtils is undefined!');
            } else {
                this.dog = DrawUtils.dogIcon(this, width / 2, height / 2 - 20, 1.5);
                console.log('Dog icon created');

                this.tweens.add({
                    targets: this.dog,
                    y: this.dog.y - 15,
                    duration: 500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }

            // テキスト
            console.log('Adding text...');
            this.statusText = this.add.text(width / 2, height / 2 + 60, 'よみこみちゅう...', {
                fontSize: '18px',
                fontFamily: 'sans-serif',
                color: PALETTE.textDark,
            }).setOrigin(0.5);

            // 肉球プログレス
            console.log('Adding paw progress...');
            this.pawProgress = this.add.container(width / 2, height / 2 + 95);

            setTimeout(() => this.initializeLevels(), 300);
            // console.log('Skipping level generation for debugging');
            // this.statusText.setText('デバッグモード');
            console.log('BootScene create completed');

        } catch (e) {
            console.error('CRITICAL ERROR in BootScene:', e);
            console.error(e.stack);
        }
    }

    initializeLevels() {
        const TOTAL = 100;
        if (typeof LevelGenerator !== 'undefined') {
            const gen = new LevelGenerator(6);
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

                // 肉球でプログレス表示
                this.pawProgress.removeAll(true);
                const pawCount = Math.floor(LEVELS.length / 10);
                for (let i = 0; i < pawCount; i++) {
                    const paw = DrawUtils.pawPrint(this, (i - 4.5) * 25, 0, PALETTE.snack1, 12);
                    this.pawProgress.add(paw);
                }

                if (LEVELS.length < TOTAL) {
                    setTimeout(batch, 10);
                } else {
                    this.statusText.setText('かんりょう！');
                    setTimeout(() => this.scene.start('TitleScene'), 600);
                }
            };
            batch();
        } else {
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
}

// ========================================
// タイトルシーン
// ========================================
class TitleScene extends Phaser.Scene {
    constructor() { super({ key: 'TitleScene' }); }

    create() {
        const { width, height } = this.scale;

        // 背景（公園風）
        this.createBackground();

        // タイトルロゴ
        this.createTitle();

        // 犬キャラ
        this.createDog();

        // ボタン
        this.createButtons();

        this.cameras.main.fadeIn(500);
    }

    createBackground() {
        const { width, height } = this.scale;

        // 空
        this.add.rectangle(0, 0, width, height, PALETTE.sky).setOrigin(0);

        // 遠景（建物シルエット）
        const bg = this.add.graphics();
        bg.fillStyle(0xD3D3C0, 1);
        bg.fillRect(20, height * 0.35, 60, 80);
        bg.fillRect(width - 100, height * 0.32, 80, 90);

        // 屋根
        bg.fillStyle(0xCD5C5C, 1);
        bg.beginPath();
        bg.moveTo(10, height * 0.35);
        bg.lineTo(50, height * 0.28);
        bg.lineTo(90, height * 0.35);
        bg.closePath();
        bg.fillPath();

        // 生垣
        bg.fillStyle(PALETTE.grass, 1);
        for (let x = 0; x < width; x += 30) {
            bg.fillCircle(x, height * 0.45, 20);
        }
        bg.lineStyle(2, PALETTE.grassDark, 1);
        for (let x = 0; x < width; x += 30) {
            bg.strokeCircle(x, height * 0.45, 20);
        }

        // 地面
        bg.fillStyle(PALETTE.ground, 1);
        bg.fillRect(0, height * 0.5, width, height * 0.5);

        // 芝生エリア
        bg.fillStyle(PALETTE.grass, 1);
        bg.fillEllipse(width / 2, height * 0.75, width * 0.9, height * 0.35);
        bg.lineStyle(2, PALETTE.grassDark, 1);
        bg.strokeEllipse(width / 2, height * 0.75, width * 0.9, height * 0.35);

        // 装飾
        DrawUtils.tree(this, 50, height * 0.55, 0.8);
        DrawUtils.tree(this, width - 40, height * 0.52, 0.6);

        // 花
        for (let i = 0; i < 5; i++) {
            DrawUtils.flower(this,
                Phaser.Math.Between(60, width - 60),
                height * 0.65 + Phaser.Math.Between(-10, 10),
                [0xFFFFFF, 0xFFB6C1, 0xFFFF00][Phaser.Math.Between(0, 2)]
            );
        }

        // 草
        for (let i = 0; i < 8; i++) {
            DrawUtils.grassCluster(this,
                Phaser.Math.Between(30, width - 30),
                height * 0.7 + Phaser.Math.Between(-5, 15)
            );
        }
    }

    createTitle() {
        const { width, height } = this.scale;

        // タイトル背景板
        const titleBg = this.add.graphics();
        titleBg.fillStyle(PALETTE.uiBg, 1);
        titleBg.fillRoundedRect(width / 2 - 130, height * 0.12, 260, 70, 10);
        titleBg.lineStyle(3, PALETTE.uiOutline, 1);
        titleBg.strokeRoundedRect(width / 2 - 130, height * 0.12, 260, 70, 10);

        // タイトルテキスト
        this.add.text(width / 2, height * 0.15 + 35, 'いぬさんぽ', {
            fontSize: '36px',
            fontFamily: 'sans-serif',
            fontStyle: 'bold',
            color: PALETTE.textDark,
        }).setOrigin(0.5);

        // 肉球アイコン
        DrawUtils.pawPrint(this, width / 2 - 100, height * 0.15 + 35, PALETTE.snack1, 14);
        DrawUtils.pawPrint(this, width / 2 + 100, height * 0.15 + 35, PALETTE.snack2, 14);
    }

    createDog() {
        const { width, height } = this.scale;

        // 犬小屋
        DrawUtils.dogHouse(this, width / 2 + 80, height * 0.58, 0.7);

        // メイン犬
        this.dog = DrawUtils.dogIcon(this, width / 2 - 40, height * 0.52, 1.8, 0xDEB887);

        // バウンスアニメ
        this.tweens.add({
            targets: this.dog,
            y: this.dog.y - 10,
            scaleY: 0.95,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // 時々ハート
        this.time.addEvent({
            delay: 2500,
            callback: () => {
                const heart = this.add.text(
                    this.dog.x + Phaser.Math.Between(-20, 20),
                    this.dog.y - 50,
                    '♥',
                    { fontSize: '24px', color: '#FF6B6B' }
                ).setOrigin(0.5).setAlpha(0);

                this.tweens.add({
                    targets: heart,
                    y: heart.y - 40,
                    alpha: { from: 1, to: 0 },
                    scale: { from: 0.5, to: 1.2 },
                    duration: 1000,
                    onComplete: () => heart.destroy()
                });
            },
            loop: true
        });
    }

    createButtons() {
        const { width, height } = this.scale;

        // あそぶボタン
        this.createButton(width / 2, height * 0.78, 'あそぶ', PALETTE.snack2, () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('SelectScene'));
        });

        // チャレンジボタン
        this.createButton(width / 2, height * 0.88, 'チャレンジ', PALETTE.snack1, () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('GameScene', { mode: 'challenge' }));
        });

        // ハイスコア
        const hs = localStorage.getItem('challengeHighScore') || '0';
        this.add.text(width - 15, 20, `🏆 ${hs}`, {
            fontSize: '16px',
            color: PALETTE.textDark,
        }).setOrigin(1, 0);
    }

    createButton(x, y, text, color, cb) {
        const btn = this.add.container(x, y);

        // 影
        const shadow = this.add.graphics();
        shadow.fillStyle(0x888888, 0.3);
        shadow.fillRoundedRect(-85, -18, 170, 40, 8);
        shadow.y = 4;

        // 背景
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-85, -20, 170, 40, 8);
        bg.lineStyle(2, PALETTE.cellOutline, 1);
        bg.strokeRoundedRect(-85, -20, 170, 40, 8);

        // テキスト
        const txt = this.add.text(0, 0, text, {
            fontSize: '20px',
            fontFamily: 'sans-serif',
            fontStyle: 'bold',
            color: PALETTE.textLight,
        }).setOrigin(0.5);

        btn.add([shadow, bg, txt]);
        btn.setSize(170, 40);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => this.tweens.add({ targets: btn, scale: 1.05, duration: 80 }));
        btn.on('pointerout', () => this.tweens.add({ targets: btn, scale: 1, duration: 80 }));
        btn.on('pointerdown', () => this.tweens.add({ targets: btn, y: y + 3, duration: 50 }));
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, y: y, duration: 80 });
            cb();
        });

        return btn;
    }
}

// ========================================
// ステージセレクト
// ========================================
class SelectScene extends Phaser.Scene {
    constructor() { super({ key: 'SelectScene' }); this.page = 0; this.perPage = 12; }

    create() {
        const { width, height } = this.scale;

        // 背景
        this.add.rectangle(0, 0, width, height, PALETTE.sky).setOrigin(0);

        const ground = this.add.graphics();
        ground.fillStyle(PALETTE.ground, 1);
        ground.fillRect(0, height * 0.15, width, height * 0.85);

        // ヘッダー
        const headerBg = this.add.graphics();
        headerBg.fillStyle(PALETTE.uiBg, 1);
        headerBg.fillRect(0, 0, width, 55);
        headerBg.lineStyle(2, PALETTE.uiOutline, 1);
        headerBg.lineBetween(0, 55, width, 55);

        // 戻るボタン
        this.createBackButton(45, 28);

        // タイトル
        this.add.text(width / 2, 28, 'ステージせんたく', {
            fontSize: '20px',
            fontFamily: 'sans-serif',
            fontStyle: 'bold',
            color: PALETTE.textDark,
        }).setOrigin(0.5);

        this.createGrid();
        this.createPagination();

        this.cameras.main.fadeIn(300);
    }

    createBackButton(x, y) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(PALETTE.snack3, 1);
        bg.fillRoundedRect(-30, -18, 60, 36, 8);
        bg.lineStyle(2, PALETTE.cellOutline, 1);
        bg.strokeRoundedRect(-30, -18, 60, 36, 8);

        const txt = this.add.text(0, 0, '← ', {
            fontSize: '18px',
            color: PALETTE.textDark,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(60, 36);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerup', () => {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => this.scene.start('TitleScene'));
        });

        return btn;
    }

    createGrid() {
        const { width, height } = this.scale;
        const cols = 3, cardW = 90, cardH = 100, gap = 12;
        const totalW = cols * cardW + (cols - 1) * gap;
        const startX = (width - totalW) / 2;
        const startY = 75;

        const start = this.page * this.perPage;
        const end = Math.min(start + this.perPage, LEVELS.length);

        for (let i = start; i < end; i++) {
            const li = i - start;
            const col = li % cols, row = Math.floor(li / cols);
            const x = startX + col * (cardW + gap) + cardW / 2;
            const y = startY + row * (cardH + gap) + cardH / 2;

            this.createCard(x, y, cardW, cardH, i);
        }
    }

    createCard(x, y, w, h, levelIndex) {
        const card = this.add.container(x, y);
        const level = LEVELS[levelIndex];

        // 影
        const shadow = this.add.graphics();
        shadow.fillStyle(0x888888, 0.2);
        shadow.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
        shadow.x = 3;
        shadow.y = 3;

        // 背景
        const bg = this.add.graphics();
        bg.fillStyle(PALETTE.cellBg, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
        bg.lineStyle(2, PALETTE.cellOutline, 1);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

        // 番号
        const num = this.add.text(0, -h / 2 + 16, `${levelIndex + 1}`, {
            fontSize: '16px',
            fontStyle: 'bold',
            color: PALETTE.textDark,
        }).setOrigin(0.5);

        // ミニプレビュー
        const preview = this.createPreview(level, 42);

        card.add([shadow, bg, num, preview]);
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
                    dot.fillStyle(SNACKS[snack.type].color, 1);
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

        this.add.text(width / 2, height - 45, `${this.page + 1} / ${total}`, {
            fontSize: '14px', color: PALETTE.textDark
        }).setOrigin(0.5);

        if (this.page > 0) {
            const prev = this.add.text(width / 2 - 60, height - 45, '◀', {
                fontSize: '20px', color: PALETTE.textDark
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            prev.on('pointerup', () => { this.page--; this.scene.restart(); });
        }

        if (this.page < total - 1) {
            const next = this.add.text(width / 2 + 60, height - 45, '▶', {
                fontSize: '20px', color: PALETTE.textDark
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            next.on('pointerup', () => { this.page++; this.scene.restart(); });
        }
    }
}

// ========================================
// ゲームシーン
// ========================================
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    init(data) {
        this.mode = data.mode || 'normal';
        this.lvIndex = data.levelIndex || 0;
        this.chalScore = data.challengeScore || 0;
        this.combo = 0;
    }

    create() {
        const { width, height } = this.scale;

        this.createBackground();
        this.loadLevel();
        this.createGrid();
        this.createUI();
        this.setupInput();
        this.playEntryAnim();

        this.cameras.main.fadeIn(300);
    }

    createBackground() {
        const { width, height } = this.scale;

        // 空
        this.add.rectangle(0, 0, width, height, PALETTE.sky).setOrigin(0);

        // 地面
        const ground = this.add.graphics();
        ground.fillStyle(PALETTE.ground, 1);
        ground.fillRect(0, height * 0.12, width, height * 0.88);

        // 芝生マット（グリッドの下）
        ground.fillStyle(PALETTE.grass, 1);
        ground.fillRoundedRect(10, height * 0.16, width - 20, height * 0.68, 12);
        ground.lineStyle(2, PALETTE.grassDark, 1);
        ground.strokeRoundedRect(10, height * 0.16, width - 20, height * 0.68, 12);
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

        this.grid = [];
        for (let r = 0; r < 6; r++) {
            this.grid[r] = [];
            for (let c = 0; c < 6; c++) {
                this.grid[r][c] = { type: 0, isEnd: false, pathType: 0 };
            }
        }

        this.maxType = Math.max(...this.level.snacks.map(s => s.type));
        this.level.snacks.forEach(s => {
            this.grid[s.row][s.col] = { type: s.type, isEnd: true, pathType: s.type };
        });

        this.paths = {};
        this.trails = {};
        for (let i = 1; i <= this.maxType; i++) { this.paths[i] = []; this.trails[i] = []; }

        this.drawing = false;
        this.curType = null;
        this.lastCell = null;
    }

    createGrid() {
        const { width, height } = this.scale;
        const hdrH = 80, ftrH = 65;
        const pad = 25;
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

                const bg = this.add.graphics();
                DrawUtils.roundedRect(bg, 0, 0, this.cellSz, this.cellSz, CONFIG.CORNER_RADIUS, PALETTE.cellBg, PALETTE.cellOutline, 2);

                const fill = this.add.graphics();

                cell.add([bg, fill]);
                cell.setData('fill', fill);
                this.cells[r][c] = cell;
                this.cellCon.add(cell);
            }
        }

        // トレイル
        this.trailCon = this.add.container(0, 0);

        // おやつ
        this.snackCon = this.add.container(0, 0);
        this.snacks = {};

        this.level.snacks.forEach(s => {
            const x = this.gridX + s.col * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
            const y = this.gridY + s.row * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;

            const snackIcon = DrawUtils.snackIcon(this, x, y, s.type, this.cellSz * 0.35);
            this.snackCon.add(snackIcon);
            this.snacks[`${s.row},${s.col}`] = snackIcon;
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

        this.snackCon.list.forEach((snack, i) => {
            const originalScale = snack.scaleX; // 元のスケールを保存
            snack.setScale(0);
            this.tweens.add({
                targets: snack,
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

        // ヘッダー背景
        const header = this.add.graphics();
        header.fillStyle(PALETTE.uiBg, 1);
        header.fillRect(0, 0, width, 55);
        header.lineStyle(2, PALETTE.uiOutline, 1);
        header.lineBetween(0, 55, width, 55);

        // 戻るボタン
        this.createSmallButton(40, 28, '←', () => {
            if (this.mode === 'challenge') {
                this.showConfirm();
            } else {
                this.cameras.main.fadeOut(300);
                this.time.delayedCall(300, () => this.scene.start('SelectScene'));
            }
        });

        // レベル表示
        const lvTxt = this.mode === 'challenge' ? `🔥 ${this.chalScore + 1}` : `${this.lvIndex + 1}`;
        this.add.text(width / 2, 28, lvTxt, {
            fontSize: '22px',
            fontStyle: 'bold',
            color: PALETTE.textDark,
        }).setOrigin(0.5);

        // 進捗表示
        this.progContainer = this.add.container(width / 2, 65);
        this.updateProgress();

        // フッター
        const footer = this.add.graphics();
        footer.fillStyle(PALETTE.uiBg, 1);
        footer.fillRect(0, height - 50, width, 50);
        footer.lineStyle(2, PALETTE.uiOutline, 1);
        footer.lineBetween(0, height - 50, width, height - 50);

        // リセットボタン
        this.createSmallButton(width / 2 - 40, height - 25, '↺', () => this.resetLevel());

        // ヒントボタン
        this.createSmallButton(width / 2 + 40, height - 25, '?', () => console.log('ヒント'));
    }

    createSmallButton(x, y, text, cb) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(PALETTE.snack3, 1);
        bg.fillRoundedRect(-22, -18, 44, 36, 8);
        bg.lineStyle(2, PALETTE.cellOutline, 1);
        bg.strokeRoundedRect(-22, -18, 44, 36, 8);

        const txt = this.add.text(0, 0, text, {
            fontSize: '20px',
            fontStyle: 'bold',
            color: PALETTE.textDark,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(44, 36);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerdown', () => this.tweens.add({ targets: btn, scale: 0.9, duration: 50 }));
        btn.on('pointerup', () => {
            this.tweens.add({ targets: btn, scale: 1, duration: 80 });
            cb();
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

        if (data.isEnd) {
            this.startDraw(data.type, row, col);
            this.showDog(p.x, p.y);
        } else if (data.pathType > 0) {
            this.startFromPath(data.pathType, row, col);
            this.showDog(p.x, p.y);
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
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                const cx = this.gridX + c * (this.cellSz + CONFIG.CELL_PADDING);
                const cy = this.gridY + r * (this.cellSz + CONFIG.CELL_PADDING);
                if (x >= cx && x <= cx + this.cellSz && y >= cy && y <= cy + this.cellSz) {
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

        const key = `${row},${col}`;
        if (this.snacks[key]) {
            this.tweens.add({
                targets: this.snacks[key],
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

        if (data.pathType > 0 && data.pathType !== this.curType) return;

        // ゴール
        if (data.isEnd && data.type === this.curType) {
            if (path[0].row === row && path[0].col === col) return;
            path.push({ row, col });
            this.addTrail(lr, lc, row, col);
            this.lastCell = { row, col };

            this.combo++;
            const key = `${row},${col}`;
            if (this.snacks[key]) {
                this.tweens.add({
                    targets: this.snacks[key],
                    scale: 1.3,
                    duration: 150,
                    yoyo: true,
                    ease: 'Back.easeOut'
                });
            }

            // 接続エフェクト
            this.showConnectEffect(row, col);

            this.updateProgress();
            this.renderPaths();
            this.checkClear();
            return;
        }

        if (data.pathType === this.curType) return;
        if (data.isEnd && data.type !== this.curType) return;

        // 新セル
        path.push({ row, col });
        data.pathType = this.curType;
        this.addTrail(lr, lc, row, col);
        this.lastCell = { row, col };
        this.updateProgress();
        this.renderPaths();
    }

    addTrail(fr, fc, tr, tc) {
        const fx = this.gridX + fc * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
        const fy = this.gridY + fr * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
        const tx = this.gridX + tc * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
        const ty = this.gridY + tr * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;

        this.trails[this.curType].push({
            x: (fx + tx) / 2,
            y: (fy + ty) / 2,
            angle: Math.atan2(ty - fy, tx - fx)
        });
    }

    renderPaths() {
        // セル塗り
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                const fill = this.cells[r][c].getData('fill');
                const pt = this.grid[r][c].pathType;
                fill.clear();
                if (pt > 0) {
                    fill.fillStyle(SNACKS[pt].color, 0.5);
                    fill.fillRoundedRect(2, 2, this.cellSz - 4, this.cellSz - 4, CONFIG.CORNER_RADIUS - 2);
                }
            }
        }

        // 肉球トレイル
        this.trailCon.removeAll(true);
        for (let t = 1; t <= this.maxType; t++) {
            const trail = this.trails[t];
            if (!trail) continue;
            trail.forEach((p, i) => {
                const paw = DrawUtils.pawPrint(this, p.x, p.y, SNACKS[t].color, this.cellSz * 0.22);
                paw.setRotation(p.angle + Math.PI / 2);
                paw.setAlpha(0.6 + (i / trail.length) * 0.4);
                this.trailCon.add(paw);
            });
        }
    }

    showConnectEffect(row, col) {
        const x = this.gridX + col * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;
        const y = this.gridY + row * (this.cellSz + CONFIG.CELL_PADDING) + this.cellSz / 2;

        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const star = this.add.text(x, y, '✦', {
                fontSize: '16px',
                color: '#FFD700'
            }).setOrigin(0.5);

            this.tweens.add({
                targets: star,
                x: x + Math.cos(angle) * 40,
                y: y + Math.sin(angle) * 40,
                alpha: 0,
                scale: 0,
                duration: 400,
                ease: 'Cubic.easeOut',
                onComplete: () => star.destroy()
            });
        }
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
        for (let t = 1; t <= this.maxType; t++) this.clearPath(t);
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                if (!this.grid[r][c].isEnd) this.grid[r][c].pathType = 0;
            }
        }
        this.combo = 0;
        this.updateProgress();
        this.renderPaths();
        this.cameras.main.shake(100, 0.005);
    }

    showDog(x, y) {
        if (!this.dog) {
            this.dog = DrawUtils.dogIcon(this, x, y - 55, 0.8, 0xDEB887);
        }
        this.dog.setPosition(x, y - 55).setVisible(true);

        if (!this.dogTween) {
            this.dogTween = this.tweens.add({
                targets: this.dog,
                scaleX: { from: 1, to: 1.1 },
                duration: 100,
                yoyo: true,
                repeat: -1
            });
        }
    }

    hideDog() {
        if (this.dog) this.dog.setVisible(false);
        if (this.dogTween) { this.dogTween.stop(); this.dogTween = null; }
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
        for (let i = 0; i < pawCount; i++) {
            const paw = DrawUtils.pawPrint(this, (i - 4.5) * 18, 0, PALETTE.snack1, 8);
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
        for (let t = 1; t <= this.maxType; t++) {
            if (!this.pathComplete(t)) return false;
        }
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                if (this.grid[r][c].pathType === 0) return false;
            }
        }

        // クリア演出
        this.cameras.main.flash(200, 255, 255, 200);
        this.time.delayedCall(600, () => {
            if (this.mode === 'challenge') {
                this.scene.start('ClearScene', { mode: 'challenge', challengeScore: this.chalScore + 1 });
            } else {
                this.scene.start('ClearScene', { mode: 'normal', levelIndex: this.lvIndex });
            }
        });
        return true;
    }

    showConfirm() {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0);
        const dialog = this.add.container(width / 2, height / 2);

        const bg = this.add.graphics();
        bg.fillStyle(PALETTE.uiBg, 1);
        bg.fillRoundedRect(-110, -60, 220, 120, 12);
        bg.lineStyle(2, PALETTE.cellOutline, 1);
        bg.strokeRoundedRect(-110, -60, 220, 120, 12);

        const txt = this.add.text(0, -25, 'やめますか？', {
            fontSize: '18px', color: PALETTE.textDark
        }).setOrigin(0.5);

        const yes = this.add.text(-40, 25, 'はい', {
            fontSize: '16px', color: PALETTE.snack1
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const no = this.add.text(40, 25, 'いいえ', {
            fontSize: '16px', color: PALETTE.textDark
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        dialog.add([bg, txt, yes, no]);

        yes.on('pointerup', () => this.scene.start('TitleScene'));
        no.on('pointerup', () => { overlay.destroy(); dialog.destroy(); });
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
    }

    create() {
        const { width, height } = this.scale;

        // 背景
        this.add.rectangle(0, 0, width, height, PALETTE.sky).setOrigin(0);

        const ground = this.add.graphics();
        ground.fillStyle(PALETTE.grass, 1);
        ground.fillRect(0, height * 0.6, width, height * 0.4);

        // 紙吹雪
        this.createConfetti();

        if (this.mode === 'challenge') {
            this.createChallengeClear();
        } else {
            this.createNormalClear();
        }
    }

    createConfetti() {
        const { width, height } = this.scale;

        for (let i = 0; i < 25; i++) {
            const x = Phaser.Math.Between(20, width - 20);
            const colors = [PALETTE.snack1, PALETTE.snack2, PALETTE.snack3, PALETTE.snack4];
            const color = colors[Phaser.Math.Between(0, 3)];

            const conf = this.add.graphics();
            conf.fillStyle(color, 1);
            conf.fillRect(-4, -4, 8, 8);
            conf.x = x;
            conf.y = -20;

            this.tweens.add({
                targets: conf,
                y: height + 20,
                x: x + Phaser.Math.Between(-60, 60),
                rotation: Phaser.Math.Between(-5, 5),
                duration: Phaser.Math.Between(1500, 3000),
                delay: Phaser.Math.Between(0, 600),
                onComplete: () => conf.destroy()
            });
        }
    }

    createNormalClear() {
        const { width, height } = this.scale;

        // 犬
        const dog = DrawUtils.dogIcon(this, width / 2, height * 0.35, 2, 0xDEB887);
        dog.setScale(0);
        this.tweens.add({
            targets: dog,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: dog,
            y: dog.y - 15,
            duration: 500,
            delay: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // ハート
        for (let i = 0; i < 3; i++) {
            this.time.delayedCall(600 + i * 200, () => {
                const heart = this.add.text(
                    width / 2 + (i - 1) * 50,
                    height * 0.18,
                    '♥',
                    { fontSize: '36px', color: '#FF6B6B' }
                ).setOrigin(0.5).setAlpha(0);

                this.tweens.add({
                    targets: heart,
                    alpha: 1,
                    scale: { from: 0.5, to: 1 },
                    duration: 300,
                    ease: 'Back.easeOut'
                });
            });
        }

        // テキスト
        const clearText = this.add.text(width / 2, height * 0.55, 'クリア！', {
            fontSize: '36px',
            fontStyle: 'bold',
            color: PALETTE.textDark,
        }).setOrigin(0.5);

        const msg = this.add.text(width / 2, height * 0.62, 'おさんぽ たのしかったね！', {
            fontSize: '16px',
            color: PALETTE.textDark,
        }).setOrigin(0.5);

        // ボタン
        this.time.delayedCall(800, () => {
            const btn = this.createButton(width / 2, height * 0.78, 'つぎへ', PALETTE.snack2, () => {
                this.scene.start('GameScene', {
                    mode: 'normal',
                    levelIndex: (this.lvIndex + 1) % LEVELS.length
                });
            });

            btn.setScale(0);
            this.tweens.add({ targets: btn, scale: 1, duration: 300, ease: 'Back.easeOut' });
        });
    }

    createChallengeClear() {
        const { width, height } = this.scale;

        // スコア
        const score = this.add.text(width / 2, height * 0.3, this.chalScore.toString(), {
            fontSize: '80px',
            fontStyle: 'bold',
            color: PALETTE.snack1,
        }).setOrigin(0.5).setScale(0);

        this.tweens.add({
            targets: score,
            scale: 1,
            duration: 400,
            ease: 'Back.easeOut'
        });

        // 犬
        const dog = DrawUtils.dogIcon(this, width / 2, height * 0.5, 1.5, 0xDEB887);

        // テキスト
        this.add.text(width / 2, height * 0.65, 'つぎのステージへ！', {
            fontSize: '18px',
            color: PALETTE.textDark,
        }).setOrigin(0.5);

        // 自動で次へ
        this.time.delayedCall(1400, () => {
            this.scene.start('GameScene', {
                mode: 'challenge',
                challengeScore: this.chalScore
            });
        });
    }

    createButton(x, y, text, color, cb) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-70, -20, 140, 40, 8);
        bg.lineStyle(2, PALETTE.cellOutline, 1);
        bg.strokeRoundedRect(-70, -20, 140, 40, 8);

        const txt = this.add.text(0, 0, text, {
            fontSize: '18px',
            fontStyle: 'bold',
            color: PALETTE.textLight,
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

    init(data) { this.score = data.score || 0; }

    create() {
        const { width, height } = this.scale;

        // 背景
        this.add.rectangle(0, 0, width, height, 0x2F3542, 0.95).setOrigin(0);

        // 犬（しょんぼり）
        const dog = DrawUtils.dogIcon(this, width / 2, height * 0.25, 1.5, 0xA0A0A0);

        // テキスト
        this.add.text(width / 2, height * 0.42, 'ゲームオーバー', {
            fontSize: '28px',
            fontStyle: 'bold',
            color: PALETTE.snack1,
        }).setOrigin(0.5);

        // スコア
        this.add.text(width / 2, height * 0.52, 'クリアすう', {
            fontSize: '14px',
            color: '#888888',
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.6, this.score.toString(), {
            fontSize: '56px',
            fontStyle: 'bold',
            color: '#FFD700',
        }).setOrigin(0.5);

        // ハイスコア
        const hs = parseInt(localStorage.getItem('challengeHighScore') || '0');
        const isNew = this.score > hs;
        if (isNew) localStorage.setItem('challengeHighScore', this.score.toString());

        if (isNew) {
            this.add.text(width / 2, height * 0.7, 'NEW RECORD!', {
                fontSize: '18px',
                color: '#FFD700',
            }).setOrigin(0.5);
        }

        this.add.text(width / 2, height * 0.77, `ベスト: ${Math.max(hs, this.score)}`, {
            fontSize: '14px',
            color: '#FFD700',
        }).setOrigin(0.5);

        // ボタン
        this.time.delayedCall(500, () => {
            this.createButton(width / 2 - 55, height * 0.88, 'リトライ', PALETTE.snack1, () => {
                this.scene.start('GameScene', { mode: 'challenge' });
            });

            this.createButton(width / 2 + 55, height * 0.88, 'タイトル', 0x666666, () => {
                this.scene.start('TitleScene');
            });
        });
    }

    createButton(x, y, text, color, cb) {
        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-45, -16, 90, 32, 6);
        bg.lineStyle(2, PALETTE.cellOutline, 1);
        bg.strokeRoundedRect(-45, -16, 90, 32, 6);

        const txt = this.add.text(0, 0, text, {
            fontSize: '14px',
            color: PALETTE.textLight,
        }).setOrigin(0.5);

        btn.add([bg, txt]);
        btn.setSize(90, 32);
        btn.setInteractive({ useHandCursor: true });

        btn.setScale(0);
        this.tweens.add({ targets: btn, scale: 1, duration: 250, ease: 'Back.easeOut' });

        btn.on('pointerup', cb);
        return btn;
    }
}

// ========================================
// Phaser 設定
// ========================================
const gameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#F5F5F0',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 400,
        height: 680,
    },
    autoFocus: false, // フォーカス喪失時も停止しない
    scene: [BootScene, TitleScene, SelectScene, GameScene, ClearScene, GameOverScene]
};

// ゲーム開始
console.log('🐕 いぬさんぽ - ねこあつめ風スタイル');
const game = new Phaser.Game(gameConfig);

// デバッグ用にグローバル公開（必要であれば）
window.game = game;
