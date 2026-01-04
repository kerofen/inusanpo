/**
 * いぬさんぽ - リッチエフェクト集
 * ゲームをより華やかにするエフェクト
 */

// ========================================
// エフェクトマネージャー
// ========================================
class EffectManager {
    constructor(scene) {
        this.scene = scene;
    }

    // タップ時の波紋エフェクト
    ripple(x, y, color = 0xFFB6C1) {
        const circles = [];
        for (let i = 0; i < 3; i++) {
            const circle = this.scene.add.circle(x, y, 10, color, 0);
            circle.setStrokeStyle(3, color, 1);
            circles.push(circle);
            
            this.scene.tweens.add({
                targets: circle,
                radius: 80 + i * 20,
                alpha: 0,
                duration: 600,
                delay: i * 100,
                ease: 'Cubic.easeOut',
                onComplete: () => circle.destroy()
            });
        }
    }

    // スター爆発
    starBurst(x, y, count = 8, colors = ['⭐', '✨', '💫']) {
        for (let i = 0; i < count; i++) {
            const emoji = colors[Phaser.Math.Between(0, colors.length - 1)];
            const star = this.scene.add.text(x, y, emoji, {
                fontSize: `${Phaser.Math.Between(16, 28)}px`
            }).setOrigin(0.5);
            
            const angle = (i / count) * Math.PI * 2;
            const distance = Phaser.Math.Between(60, 100);
            
            this.scene.tweens.add({
                targets: star,
                x: x + Math.cos(angle) * distance,
                y: y + Math.sin(angle) * distance - 30,
                alpha: 0,
                scale: { from: 0.5, to: 1.5 },
                rotation: Phaser.Math.Between(-1, 1),
                duration: 600,
                ease: 'Cubic.easeOut',
                onComplete: () => star.destroy()
            });
        }
    }

    // ハート噴水
    heartFountain(x, y, count = 12) {
        const hearts = ['💕', '💗', '💖', '❤️', '🧡', '💛'];
        
        for (let i = 0; i < count; i++) {
            const heart = this.scene.add.text(x, y, 
                hearts[Phaser.Math.Between(0, hearts.length - 1)], {
                fontSize: `${Phaser.Math.Between(20, 36)}px`
            }).setOrigin(0.5).setAlpha(0);
            
            const targetX = x + Phaser.Math.Between(-120, 120);
            const peakY = y - Phaser.Math.Between(100, 200);
            const targetY = y + Phaser.Math.Between(50, 150);
            
            this.scene.tweens.add({
                targets: heart,
                alpha: 1,
                duration: 100,
                delay: i * 50
            });
            
            // 放物線運動
            this.scene.tweens.add({
                targets: heart,
                x: targetX,
                duration: 1200,
                delay: i * 50,
                ease: 'Linear'
            });
            
            this.scene.tweens.add({
                targets: heart,
                y: peakY,
                duration: 600,
                delay: i * 50,
                ease: 'Cubic.easeOut',
                onComplete: () => {
                    this.scene.tweens.add({
                        targets: heart,
                        y: targetY,
                        alpha: 0,
                        duration: 600,
                        ease: 'Cubic.easeIn',
                        onComplete: () => heart.destroy()
                    });
                }
            });
            
            this.scene.tweens.add({
                targets: heart,
                rotation: Phaser.Math.Between(-2, 2),
                duration: 1200,
                delay: i * 50
            });
        }
    }

    // 肉球トレイル（線を引いている時）
    pawTrailEffect(x, y, color) {
        const paw = this.scene.add.text(x, y, '🐾', {
            fontSize: '20px'
        }).setOrigin(0.5).setAlpha(0.8);
        
        this.scene.tweens.add({
            targets: paw,
            scale: { from: 0.5, to: 1.2 },
            alpha: 0,
            y: y - 20,
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => paw.destroy()
        });
    }

    // キラキラパーティクル（常時）
    sparkle(x, y) {
        const sparkle = this.scene.add.text(x, y, '✨', {
            fontSize: '16px'
        }).setOrigin(0.5).setAlpha(0);
        
        this.scene.tweens.add({
            targets: sparkle,
            alpha: { from: 0, to: 1 },
            scale: { from: 0, to: 1 },
            duration: 200,
            yoyo: true,
            onComplete: () => sparkle.destroy()
        });
    }

    // コンボテキスト
    comboText(x, y, combo) {
        const texts = ['Nice!', 'Good!', 'Great!', 'Excellent!', 'Amazing!', 'Perfect!'];
        const colors = ['#FFB6C1', '#FF69B4', '#FF1493', '#FF6B6B', '#FF4500', '#FFD700'];
        
        const index = Math.min(combo - 1, texts.length - 1);
        const text = this.scene.add.text(x, y, texts[index], {
            fontSize: '32px',
            fontFamily: 'sans-serif',
            fontStyle: 'bold',
            color: colors[index],
            stroke: '#FFFFFF',
            strokeThickness: 4
        }).setOrigin(0.5).setScale(0);
        
        this.scene.tweens.add({
            targets: text,
            scale: { from: 0, to: 1.2 },
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: text,
                    scale: 1,
                    duration: 100,
                    onComplete: () => {
                        this.scene.tweens.add({
                            targets: text,
                            alpha: 0,
                            y: y - 50,
                            duration: 500,
                            delay: 300,
                            onComplete: () => text.destroy()
                        });
                    }
                });
            }
        });
    }

    // 画面フラッシュ
    flash(color = 0xFFFFFF, duration = 200) {
        this.scene.cameras.main.flash(duration, 
            (color >> 16) & 0xFF,
            (color >> 8) & 0xFF,
            color & 0xFF,
            true
        );
    }

    // 画面シェイク
    shake(duration = 200, intensity = 0.01) {
        this.scene.cameras.main.shake(duration, intensity);
    }

    // クリア時の大演出
    celebrateClear() {
        const { width, height } = this.scene.scale;
        
        // 画面フラッシュ
        this.flash(0xFFD700, 300);
        
        // 中央から星爆発
        this.scene.time.delayedCall(100, () => {
            this.starBurst(width / 2, height / 2, 16);
        });
        
        // ハート噴水
        this.scene.time.delayedCall(200, () => {
            this.heartFountain(width / 2, height / 2, 20);
        });
        
        // 周囲からキラキラ
        for (let i = 0; i < 30; i++) {
            this.scene.time.delayedCall(i * 50, () => {
                this.sparkle(
                    Phaser.Math.Between(50, width - 50),
                    Phaser.Math.Between(50, height - 50)
                );
            });
        }
    }

    // ゲームオーバー演出
    gameOverEffect() {
        // 赤フラッシュ
        this.scene.cameras.main.flash(300, 255, 50, 50, true);
        
        // 強シェイク
        this.scene.cameras.main.shake(500, 0.03);
        
        // 💔パーティクル
        const { width, height } = this.scene.scale;
        for (let i = 0; i < 10; i++) {
            this.scene.time.delayedCall(i * 30, () => {
                const heart = this.scene.add.text(
                    width / 2 + Phaser.Math.Between(-50, 50),
                    height / 2,
                    '💔',
                    { fontSize: '32px' }
                ).setOrigin(0.5);
                
                this.scene.tweens.add({
                    targets: heart,
                    y: heart.y + Phaser.Math.Between(100, 200),
                    x: heart.x + Phaser.Math.Between(-80, 80),
                    alpha: 0,
                    rotation: Phaser.Math.Between(-2, 2),
                    duration: 1000,
                    ease: 'Cubic.easeOut',
                    onComplete: () => heart.destroy()
                });
            });
        }
    }

    // スクイッシュ（押しつぶし）
    squish(target, duration = 100) {
        this.scene.tweens.add({
            targets: target,
            scaleX: 1.2,
            scaleY: 0.8,
            duration: duration,
            yoyo: true,
            ease: 'Quad.easeOut'
        });
    }

    // バウンス
    bounce(target, height = 20, duration = 300) {
        const originalY = target.y;
        this.scene.tweens.add({
            targets: target,
            y: originalY - height,
            duration: duration / 2,
            ease: 'Quad.easeOut',
            yoyo: true
        });
    }

    // ぷるぷる
    wobble(target, intensity = 5, duration = 300) {
        this.scene.tweens.add({
            targets: target,
            x: { from: target.x - intensity, to: target.x + intensity },
            duration: duration / 4,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut'
        });
    }

    // 回転しながらスケール
    spinScale(target, scale = 1.3, duration = 400) {
        this.scene.tweens.add({
            targets: target,
            scale: scale,
            rotation: Math.PI * 2,
            duration: duration,
            ease: 'Back.easeOut',
            onComplete: () => {
                target.rotation = 0;
            }
        });
    }
}

// ========================================
// 背景マネージャー（動く装飾）
// ========================================
class BackgroundManager {
    constructor(scene) {
        this.scene = scene;
        this.decorations = [];
    }

    // パステル背景グラデーション
    createGradient(colors = [0xFFF5F5, 0xFFE4E1, 0xFFF0F5]) {
        const { width, height } = this.scene.scale;
        const graphics = this.scene.add.graphics();
        
        // 縦グラデーション
        for (let y = 0; y < height; y++) {
            const ratio = y / height;
            const colorIndex = Math.floor(ratio * (colors.length - 1));
            const nextIndex = Math.min(colorIndex + 1, colors.length - 1);
            const localRatio = (ratio * (colors.length - 1)) - colorIndex;
            
            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.ValueToColor(colors[colorIndex]),
                Phaser.Display.Color.ValueToColor(colors[nextIndex]),
                100,
                localRatio * 100
            );
            
            graphics.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
            graphics.fillRect(0, y, width, 1);
        }
        
        graphics.setDepth(-100);
        return graphics;
    }

    // 浮遊する装飾サークル
    createFloatingCircles(count = 15) {
        const { width, height } = this.scene.scale;
        const colors = [0xFFE4E1, 0xFFB6C1, 0xFFC0CB, 0xFFDAD9, 0xFFF0F5];
        
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const radius = Phaser.Math.Between(30, 100);
            const color = colors[Phaser.Math.Between(0, colors.length - 1)];
            
            const circle = this.scene.add.circle(x, y, radius, color, 0.25);
            circle.setDepth(-50);
            
            // ゆっくり浮遊
            this.scene.tweens.add({
                targets: circle,
                y: y + Phaser.Math.Between(-40, 40),
                x: x + Phaser.Math.Between(-20, 20),
                alpha: { from: 0.15, to: 0.35 },
                duration: Phaser.Math.Between(4000, 8000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Phaser.Math.Between(0, 2000)
            });
            
            this.decorations.push(circle);
        }
    }

    // 流れる雲
    createClouds(count = 5) {
        const { width, height } = this.scene.scale;
        
        for (let i = 0; i < count; i++) {
            const y = Phaser.Math.Between(50, height * 0.4);
            const cloud = this.scene.add.text(-100, y, '☁️', {
                fontSize: `${Phaser.Math.Between(40, 80)}px`
            }).setOrigin(0.5).setAlpha(0.3).setDepth(-40);
            
            const duration = Phaser.Math.Between(20000, 40000);
            
            this.scene.tweens.add({
                targets: cloud,
                x: width + 100,
                duration: duration,
                repeat: -1,
                delay: Phaser.Math.Between(0, duration)
            });
            
            this.decorations.push(cloud);
        }
    }

    // キラキラ星（ランダムに出現）
    startSparkles() {
        const { width, height } = this.scene.scale;
        
        this.sparkleEvent = this.scene.time.addEvent({
            delay: 500,
            callback: () => {
                const x = Phaser.Math.Between(50, width - 50);
                const y = Phaser.Math.Between(50, height - 50);
                
                const sparkle = this.scene.add.text(x, y, '✨', {
                    fontSize: `${Phaser.Math.Between(12, 20)}px`
                }).setOrigin(0.5).setAlpha(0).setDepth(-30);
                
                this.scene.tweens.add({
                    targets: sparkle,
                    alpha: { from: 0, to: 0.6 },
                    scale: { from: 0, to: 1 },
                    duration: 300,
                    yoyo: true,
                    onComplete: () => sparkle.destroy()
                });
            },
            loop: true
        });
    }

    // 浮遊する肉球
    createFloatingPaws(count = 8) {
        const { width, height } = this.scene.scale;
        
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(50, width - 50);
            const y = Phaser.Math.Between(100, height - 100);
            
            const paw = this.scene.add.text(x, y, '🐾', {
                fontSize: `${Phaser.Math.Between(20, 40)}px`
            }).setOrigin(0.5).setAlpha(0.3).setDepth(-45);
            
            // 浮遊アニメーション
            this.scene.tweens.add({
                targets: paw,
                y: y - 60,
                rotation: Phaser.Math.Between(-0.3, 0.3),
                duration: Phaser.Math.Between(3000, 6000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
                delay: Phaser.Math.Between(0, 2000)
            });
            
            this.decorations.push(paw);
        }
    }

    // すべてクリア
    clear() {
        this.decorations.forEach(d => d.destroy());
        this.decorations = [];
        if (this.sparkleEvent) {
            this.sparkleEvent.destroy();
        }
    }
}

// グローバルに公開
window.EffectManager = EffectManager;
window.BackgroundManager = BackgroundManager;

console.log('✨ エフェクトマネージャー読み込み完了');

