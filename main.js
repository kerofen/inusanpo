/**
 * いぬさんぽ - かわいいパズルゲーム
 * Pure JavaScript + Canvas版
 */

// ========================================
// ゲーム設定
// ========================================
const CONFIG = {
    GRID_SIZE: 6,           // 6x6グリッド
    SNACK_TYPES: 4,         // おやつの種類（最大4）
    CELL_PADDING: 6,        // セル間の隙間
    CORNER_RADIUS: 10,      // 角丸
    PAW_COLOR: '#5D4037',   // 肉球のデフォルトカラー（こげちゃ）
    PAW_HIGHLIGHT: '#795548', // 肉球のハイライト
    PAW_SHADOW: '#3E2723',   // 肉球の影
};

// おやつの色とEmoji（最大4種類）
const SNACKS = {
    1: { color: '#FF6B6B', emoji: '🍖', name: 'お肉' },
    2: { color: '#4ECDC4', emoji: '🐟', name: 'お魚' },
    3: { color: '#FFE66D', emoji: '🧀', name: 'チーズ' },
    4: { color: '#A8E6CF', emoji: '🥬', name: 'やさい' },
};

// レベルデータ（自動生成 or 手動定義）
let LEVELS = [];

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

/**
 * ステージがクリア済みかどうかを確認
 */
function isStageClear(stageId) {
    const cleared = loadClearedStages();
    return cleared.includes(stageId);
}

// レベル生成器の初期化（500ステージ）
// シード付き乱数で毎回同じステージが生成される
function initializeLevels() {
    const TOTAL_STAGES = 500;
    
    if (typeof LevelGenerator !== 'undefined') {
        console.log(`🎲 ${TOTAL_STAGES}ステージ生成開始（シード固定）...`);
        console.time('生成時間');
        
        LEVELS = [];
        
        for (let stageNum = 1; stageNum <= TOTAL_STAGES; stageNum++) {
            // ステージ番号をシードとして使用（同じ番号なら同じステージ）
            const seed = stageNum * 12345; // シードをばらけさせる
            const generator = new LevelGenerator(6, seed);
            
            // 難易度設定
            let difficulty;
            if (stageNum <= 100) difficulty = 1;
            else if (stageNum <= 300) difficulty = 2;
            else difficulty = 3;
            
            const level = generator.generate({
                difficulty: difficulty,
                maxAttempts: 100
            });
            
            if (level) {
                level.id = stageNum;
                level.name = `ステージ ${stageNum}`;
                LEVELS.push(level);
                
                if (stageNum % 100 === 0) {
                    console.log(`✅ ${stageNum} / ${TOTAL_STAGES}`);
                }
            } else {
                // 失敗時は別シードで再試行
                const retryGenerator = new LevelGenerator(6, seed + 99999);
                const retryLevel = retryGenerator.generate({
                    difficulty: difficulty,
                    maxAttempts: 100
                });
                if (retryLevel) {
                    retryLevel.id = stageNum;
                    retryLevel.name = `ステージ ${stageNum}`;
                    LEVELS.push(retryLevel);
                }
            }
        }
        
        console.timeEnd('生成時間');
        console.log(`🎉 ${LEVELS.length} ステージ生成完了！`);
        
    } else {
        console.log('⚠️ LevelGenerator未読込');
        LEVELS = getBackupLevels();
    }
}

// バックアップ用の手動定義レベル
function getBackupLevels() {
    return [
        {
            id: 1,
            name: 'ステージ 1',
            gridSize: 6,
            pathCount: 4,
            snacks: [
                { row: 0, col: 0, type: 1 },
                { row: 5, col: 5, type: 1 },
                { row: 0, col: 5, type: 2 },
                { row: 5, col: 0, type: 2 },
                { row: 2, col: 0, type: 3 },
                { row: 3, col: 5, type: 3 },
                { row: 3, col: 0, type: 4 },
                { row: 2, col: 5, type: 4 },
            ]
        }
    ];
}

// ========================================
// ゲームクラス
// ========================================
class InuSanpoGame {
    constructor() {
        // DOM要素
        this.titleScreen = document.getElementById('title-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.clearScreen = document.getElementById('clear-screen');
        this.selectScreen = document.getElementById('select-screen');
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.dogCharacter = document.getElementById('dog-character');
        this.progressBar = document.getElementById('progress-bar');
        this.levelText = document.getElementById('level-text');
        
        // ゲーム状態
        this.currentLevel = 0;
        this.gridData = [];
        this.paths = {};
        this.pawTrails = {};
        this.isDrawing = false;
        this.currentType = null;
        this.lastCell = null;
        
        // チャレンジモード
        this.isChallengeMode = false;
        this.challengeScore = 0;
        this.challengeHighScore = parseInt(localStorage.getItem('challengeHighScore') || '0');
        
        // DOM追加（チャレンジ用）
        this.gameOverScreen = document.getElementById('gameover-screen');
        this.challengeClearScreen = document.getElementById('challenge-clear-screen');
        
        // レイアウト
        this.cellSize = 0;
        this.gridStartX = 0;
        this.gridStartY = 0;
        
        // 初期化
        this.init();
    }
    
    init() {
        // イベントリスナー設定
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('select-btn').addEventListener('click', () => this.showStageSelect());
        document.getElementById('challenge-btn').addEventListener('click', () => this.startChallengeMode());
        document.getElementById('back-to-title').addEventListener('click', () => this.backToTitle());
        document.getElementById('back-to-select').addEventListener('click', () => this.backToStageSelect());
        document.getElementById('regenerate-btn').addEventListener('click', () => this.regenerateLevels());
        document.getElementById('reset-btn').addEventListener('click', () => this.resetLevel());
        document.getElementById('hint-btn').addEventListener('click', () => this.showHint());
        document.getElementById('next-btn').addEventListener('click', () => this.nextLevel());
        document.getElementById('retry-btn').addEventListener('click', () => this.startChallengeMode());
        document.getElementById('back-title-btn').addEventListener('click', () => this.backToTitleFromGameOver());
        
        // タッチ/マウスイベント
        this.canvas.addEventListener('mousedown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('mouseup', () => this.onPointerUp());
        this.canvas.addEventListener('mouseleave', () => this.onPointerUp());
        
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', () => this.onPointerUp());
        
        // リサイズ
        window.addEventListener('resize', () => this.resize());
        
        // タイトル画面のハイスコア表示
        this.updateTitleHighScore();
        
        console.log('🐕 いぬさんぽ 初期化完了！');
    }
    
    updateTitleHighScore() {
        const highScoreElement = document.getElementById('title-high-score-value');
        if (highScoreElement) {
            highScoreElement.textContent = this.challengeHighScore;
        }
    }
    
    // ========================================
    // 画面遷移
    // ========================================
    startGame() {
        // 通常モード開始（チャレンジモードオフ）
        this.isChallengeMode = false;
        
        this.titleScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        this.clearScreen.classList.add('hidden');
        
        // レベルが生成されているか確認
        if (LEVELS.length === 0) {
            console.error('❌ レベルがありません。再生成します...');
            initializeLevels();
        }
        
        if (LEVELS.length > 0) {
            this.loadLevel(LEVELS[this.currentLevel]);
            this.resize();
            this.render();
        } else {
            console.error('❌ レベル生成に失敗しました');
        }
    }
    
    nextLevel() {
        this.currentLevel = (this.currentLevel + 1) % LEVELS.length;
        this.clearScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        
        this.loadLevel(LEVELS[this.currentLevel]);
        this.resize();
        this.render();
    }
    
    showClearScreen() {
        this.clearScreen.classList.remove('hidden');
        this.hideDog();
    }
    
    // ========================================
    // レベル管理
    // ========================================
    loadLevel(level) {
        const size = level.gridSize || CONFIG.GRID_SIZE;
        this.currentGridSize = size; // 現在のグリッドサイズを保存
        
        // おやつタイプの最大値を取得
        const maxType = Math.max(...level.snacks.map(s => s.type));
        this.currentMaxType = maxType;
        
        // グリッド初期化
        this.gridData = [];
        for (let row = 0; row < size; row++) {
            this.gridData[row] = [];
            for (let col = 0; col < size; col++) {
                this.gridData[row][col] = {
                    type: 0,
                    isEndpoint: false,
                    pathType: 0,
                };
            }
        }
        
        // おやつ配置
        level.snacks.forEach(snack => {
            if (snack.row < size && snack.col < size) {
                this.gridData[snack.row][snack.col] = {
                    type: snack.type,
                    isEndpoint: true,
                    pathType: snack.type,
                };
            }
        });
        
        // パス初期化
        this.paths = {};
        this.pawTrails = {};
        for (let i = 1; i <= maxType; i++) {
            this.paths[i] = [];
            this.pawTrails[i] = [];
        }
        
        // UI更新
        this.levelText.textContent = `レベル ${level.id}`;
        if (level.difficulty) {
            this.levelText.textContent += ` ${'★'.repeat(level.difficulty)}`;
        }
        this.updateProgress();
        
        // デバッグ情報
        console.log(`📦 レベル ${level.id} 読み込み完了`);
        console.log(`   グリッド: ${size}x${size}`);
        console.log(`   おやつ数: ${level.snacks.length / 2} ペア`);
        if (level.difficulty) {
            console.log(`   難易度: ${'★'.repeat(level.difficulty)}`);
        }
    }
    
    resetLevel() {
        const maxType = this.currentMaxType || CONFIG.SNACK_TYPES;
        
        // パスをクリア
        for (let type = 1; type <= maxType; type++) {
            this.clearPath(type);
        }
        
        // グリッドリセット
        const size = this.gridData.length;
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (!this.gridData[row][col].isEndpoint) {
                    this.gridData[row][col].pathType = 0;
                }
            }
        }
        
        this.updateProgress();
        this.render();
        this.hideDog();
        
        console.log('🔄 リセット完了');
    }
    
    // ========================================
    // リサイズ処理
    // ========================================
    resize() {
        const gameArea = document.getElementById('game-area');
        const rect = gameArea.getBoundingClientRect();
        
        // キャンバスサイズを計算（正方形）
        const maxSize = Math.min(rect.width - 32, rect.height - 32);
        const canvasSize = Math.floor(maxSize);
        
        this.canvas.width = canvasSize;
        this.canvas.height = canvasSize;
        this.canvas.style.width = `${canvasSize}px`;
        this.canvas.style.height = `${canvasSize}px`;
        
        // セルサイズ計算
        const gridSize = this.currentGridSize || this.gridData.length || CONFIG.GRID_SIZE;
        const totalPadding = CONFIG.CELL_PADDING * (gridSize + 1);
        this.cellSize = (canvasSize - totalPadding) / gridSize;
        this.gridStartX = CONFIG.CELL_PADDING;
        this.gridStartY = CONFIG.CELL_PADDING;
        
        this.render();
    }
    
    // ========================================
    // 描画
    // ========================================
    render() {
        const ctx = this.ctx;
        const size = this.gridData.length;
        
        // 背景クリア
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // グリッド描画
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                this.drawCell(row, col);
            }
        }
        
        // 肉球トレイル描画
        for (let type = 1; type <= CONFIG.SNACK_TYPES; type++) {
            this.drawPawTrail(type);
        }
        
        // おやつ描画
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (this.gridData[row][col].isEndpoint) {
                    this.drawSnack(row, col);
                }
            }
        }
    }
    
    drawCell(row, col) {
        const ctx = this.ctx;
        const x = this.gridStartX + col * (this.cellSize + CONFIG.CELL_PADDING);
        const y = this.gridStartY + row * (this.cellSize + CONFIG.CELL_PADDING);
        const cellData = this.gridData[row][col];
        
        // セル背景
        ctx.beginPath();
        this.roundRect(ctx, x, y, this.cellSize, this.cellSize, CONFIG.CORNER_RADIUS);
        
        if (cellData.pathType > 0) {
            // 経路が通っているセル
            ctx.fillStyle = this.hexToRgba(SNACKS[cellData.pathType].color, 0.4);
        } else {
            // 空のセル
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        }
        ctx.fill();
        
        // セル枠線
        ctx.strokeStyle = 'rgba(255, 182, 193, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    drawSnack(row, col) {
        const ctx = this.ctx;
        const cellData = this.gridData[row][col];
        const snack = SNACKS[cellData.type];
        
        const x = this.gridStartX + col * (this.cellSize + CONFIG.CELL_PADDING) + this.cellSize / 2;
        const y = this.gridStartY + row * (this.cellSize + CONFIG.CELL_PADDING) + this.cellSize / 2;
        
        // おやつの背景円
        ctx.beginPath();
        ctx.arc(x, y, this.cellSize * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = snack.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 絵文字描画
        ctx.font = `${this.cellSize * 0.4}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(snack.emoji, x, y + 2);
    }
    
    drawPawTrail(type) {
        const trail = this.pawTrails[type];
        if (!trail || trail.length === 0) return;
        
        const ctx = this.ctx;
        
        trail.forEach((paw, index) => {
            const alpha = 0.7 + (index / trail.length) * 0.3;
            const size = this.cellSize * 0.28;
            ctx.save();
            ctx.translate(paw.x, paw.y);
            ctx.rotate(paw.angle);
            ctx.globalAlpha = alpha;
            this.drawPuniPuniPaw(ctx, 0, 0, size);
            ctx.restore();
        });
    }
    
    // 黒くてぷにぷにしたかわいい肉球を描画
    drawPuniPuniPaw(ctx, x, y, size) {
        const pawColor = CONFIG.PAW_COLOR;
        const highlight = CONFIG.PAW_HIGHLIGHT;
        const shadow = CONFIG.PAW_SHADOW;
        
        // メインパッド（ハート型に近い形状）
        const mainPadW = size * 1.0;
        const mainPadH = size * 0.85;
        
        // メインパッドの位置（少し下寄り）
        const mainY = y + size * 0.2;
        
        // メインパッド描画
        ctx.beginPath();
        this.drawPawPad(ctx, x, mainY, mainPadW, mainPadH);
        
        // グラデーションでぷにぷに感を出す
        const mainGradient = ctx.createRadialGradient(
            x - mainPadW * 0.2, mainY - mainPadH * 0.2, 0,
            x, mainY, mainPadW * 0.7
        );
        mainGradient.addColorStop(0, highlight);
        mainGradient.addColorStop(0.5, pawColor);
        mainGradient.addColorStop(1, shadow);
        ctx.fillStyle = mainGradient;
        ctx.fill();
        
        // ハイライト（つやつや感）
        ctx.beginPath();
        ctx.ellipse(
            x - mainPadW * 0.15, 
            mainY - mainPadH * 0.2, 
            mainPadW * 0.2, 
            mainPadH * 0.15, 
            -0.3, 0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.fill();
        
        // 指の肉球（4つ）
        const toePositions = [
            { x: -size * 0.42, y: -size * 0.35, scale: 0.38 },
            { x: -size * 0.15, y: -size * 0.52, scale: 0.35 },
            { x: size * 0.15, y: -size * 0.52, scale: 0.35 },
            { x: size * 0.42, y: -size * 0.35, scale: 0.38 },
        ];
        
        toePositions.forEach(toe => {
            const toeSize = size * toe.scale;
            const toeX = x + toe.x;
            const toeY = y + toe.y;
            
            // 指パッド
            ctx.beginPath();
            ctx.ellipse(toeX, toeY, toeSize * 0.5, toeSize * 0.55, 0, 0, Math.PI * 2);
            
            // 指パッドのグラデーション
            const toeGradient = ctx.createRadialGradient(
                toeX - toeSize * 0.15, toeY - toeSize * 0.15, 0,
                toeX, toeY, toeSize * 0.5
            );
            toeGradient.addColorStop(0, highlight);
            toeGradient.addColorStop(0.5, pawColor);
            toeGradient.addColorStop(1, shadow);
            ctx.fillStyle = toeGradient;
            ctx.fill();
            
            // 指パッドのハイライト
            ctx.beginPath();
            ctx.ellipse(
                toeX - toeSize * 0.1, 
                toeY - toeSize * 0.12, 
                toeSize * 0.15, 
                toeSize * 0.1, 
                -0.3, 0, Math.PI * 2
            );
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        });
    }
    
    // 肉球パッドの形状（ハート型に近い楕円）
    drawPawPad(ctx, x, y, w, h) {
        // 上部を少しへこませたかわいい形状
        ctx.moveTo(x, y - h * 0.5);
        ctx.bezierCurveTo(
            x + w * 0.6, y - h * 0.5,
            x + w * 0.55, y + h * 0.1,
            x + w * 0.45, y + h * 0.4
        );
        ctx.bezierCurveTo(
            x + w * 0.3, y + h * 0.6,
            x - w * 0.3, y + h * 0.6,
            x - w * 0.45, y + h * 0.4
        );
        ctx.bezierCurveTo(
            x - w * 0.55, y + h * 0.1,
            x - w * 0.6, y - h * 0.5,
            x, y - h * 0.5
        );
        ctx.closePath();
    }
    
    // ========================================
    // 入力処理
    // ========================================
    onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.handlePointerDown(x, y);
    }
    
    onTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.handlePointerMove(x, y);
    }
    
    onPointerDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.handlePointerDown(x, y);
    }
    
    onPointerMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.handlePointerMove(x, y);
    }
    
    onPointerUp() {
        // チャレンジモードでのミス判定
        if (this.isChallengeMode && this.isDrawing && this.currentType) {
            // パスが完成していない（ペアが繋がっていない）場合はミス
            if (!this.isPathComplete(this.currentType)) {
                console.log('💔 ミス！ペアが完成していません');
                this.gameOver();
                return;
            }
        }
        
        this.isDrawing = false;
        this.currentType = null;
        this.lastCell = null;
        this.hideDog();
    }
    
    // パスが完成しているかチェック（両端のおやつが繋がっているか）
    isPathComplete(type) {
        const path = this.paths[type];
        if (!path || path.length < 2) return false;
        
        const size = this.gridData.length;
        const endpoints = [];
        
        // このタイプのエンドポイントを取得
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (this.gridData[row][col].isEndpoint && 
                    this.gridData[row][col].type === type) {
                    endpoints.push({ row, col });
                }
            }
        }
        
        if (endpoints.length !== 2) return false;
        
        // パスの始点と終点がそれぞれエンドポイントに接続しているか
        const first = path[0];
        const last = path[path.length - 1];
        
        const hasStart = (first.row === endpoints[0].row && first.col === endpoints[0].col) ||
                        (first.row === endpoints[1].row && first.col === endpoints[1].col);
        const hasEnd = (last.row === endpoints[0].row && last.col === endpoints[0].col) ||
                      (last.row === endpoints[1].row && last.col === endpoints[1].col);
        
        return hasStart && hasEnd && (first.row !== last.row || first.col !== last.col);
    }
    
    handlePointerDown(x, y) {
        const cell = this.getCellAt(x, y);
        if (!cell) return;
        
        const cellData = this.gridData[cell.row][cell.col];
        
        // おやつから開始
        if (cellData.isEndpoint) {
            this.startDrawing(cellData.type, cell.row, cell.col);
            this.showDog(x, y);
        }
        // 既存経路から開始
        else if (cellData.pathType > 0) {
            this.startFromPath(cellData.pathType, cell.row, cell.col);
            this.showDog(x, y);
        }
    }
    
    handlePointerMove(x, y) {
        if (!this.isDrawing) return;
        
        const cell = this.getCellAt(x, y);
        if (!cell) return;
        
        this.continueDrawing(cell.row, cell.col);
        this.moveDog(x, y);
    }
    
    getCellAt(x, y) {
        const size = this.gridData.length;
        
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                const cellX = this.gridStartX + col * (this.cellSize + CONFIG.CELL_PADDING);
                const cellY = this.gridStartY + row * (this.cellSize + CONFIG.CELL_PADDING);
                
                if (x >= cellX && x <= cellX + this.cellSize &&
                    y >= cellY && y <= cellY + this.cellSize) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    
    // ========================================
    // パス操作
    // ========================================
    startDrawing(type, row, col) {
        this.clearPath(type);
        
        this.isDrawing = true;
        this.currentType = type;
        this.lastCell = { row, col };
        
        this.paths[type].push({ row, col });
        
        console.log(`✏️ 描画開始: ${SNACKS[type].name} (${row}, ${col})`);
    }
    
    startFromPath(type, row, col) {
        const path = this.paths[type];
        const index = path.findIndex(p => p.row === row && p.col === col);
        
        if (index === -1) return;
        
        // タップ位置以降を削除
        const removed = path.splice(index + 1);
        removed.forEach(p => {
            if (!this.gridData[p.row][p.col].isEndpoint) {
                this.gridData[p.row][p.col].pathType = 0;
            }
        });
        
        // 肉球も削除
        this.pawTrails[type] = this.pawTrails[type].slice(0, index);
        
        this.isDrawing = true;
        this.currentType = type;
        this.lastCell = { row, col };
        
        this.render();
    }
    
    continueDrawing(row, col) {
        if (!this.isDrawing || !this.currentType) return;
        
        const { row: lastRow, col: lastCol } = this.lastCell;
        
        // 同じセル
        if (row === lastRow && col === lastCol) return;
        
        // 隣接チェック
        const rowDiff = Math.abs(row - lastRow);
        const colDiff = Math.abs(col - lastCol);
        if (rowDiff + colDiff !== 1) return;
        
        const cellData = this.gridData[row][col];
        const path = this.paths[this.currentType];
        
        // バックトラック
        if (path.length >= 2) {
            const prev = path[path.length - 2];
            if (prev.row === row && prev.col === col) {
                const removed = path.pop();
                if (!this.gridData[removed.row][removed.col].isEndpoint) {
                    this.gridData[removed.row][removed.col].pathType = 0;
                }
                this.pawTrails[this.currentType].pop();
                this.lastCell = { row, col };
                this.updateProgress();
                this.render();
                return;
            }
        }
        
        // 他の経路が通っている
        if (cellData.pathType > 0 && cellData.pathType !== this.currentType) {
            return;
        }
        
        // ゴール到達
        if (cellData.isEndpoint && cellData.type === this.currentType) {
            const isStart = path[0].row === row && path[0].col === col;
            if (isStart) return;
            
            path.push({ row, col });
            this.addPawTrail(lastRow, lastCol, row, col);
            this.lastCell = { row, col };
            this.updateProgress();
            this.render();
            this.checkClear();
            return;
        }
        
        // 既に訪問済み
        if (cellData.pathType === this.currentType) return;
        
        // 他のおやつには入れない
        if (cellData.isEndpoint && cellData.type !== this.currentType) return;
        
        // 新しいセルへ
        path.push({ row, col });
        cellData.pathType = this.currentType;
        this.addPawTrail(lastRow, lastCol, row, col);
        this.lastCell = { row, col };
        this.updateProgress();
        this.render();
    }
    
    addPawTrail(fromRow, fromCol, toRow, toCol) {
        const fromX = this.gridStartX + fromCol * (this.cellSize + CONFIG.CELL_PADDING) + this.cellSize / 2;
        const fromY = this.gridStartY + fromRow * (this.cellSize + CONFIG.CELL_PADDING) + this.cellSize / 2;
        const toX = this.gridStartX + toCol * (this.cellSize + CONFIG.CELL_PADDING) + this.cellSize / 2;
        const toY = this.gridStartY + toRow * (this.cellSize + CONFIG.CELL_PADDING) + this.cellSize / 2;
        
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        const angle = Math.atan2(toY - fromY, toX - fromX) + Math.PI / 4;
        
        this.pawTrails[this.currentType].push({
            x: midX,
            y: midY,
            angle: angle
        });
    }
    
    clearPath(type) {
        const path = this.paths[type];
        
        path.forEach(p => {
            if (!this.gridData[p.row][p.col].isEndpoint) {
                this.gridData[p.row][p.col].pathType = 0;
            }
        });
        
        this.paths[type] = [];
        this.pawTrails[type] = [];
    }
    
    // ========================================
    // 犬キャラクター
    // ========================================
    showDog(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        this.dogCharacter.classList.remove('hidden');
        this.dogCharacter.style.left = `${rect.left + x - 30}px`;
        this.dogCharacter.style.top = `${rect.top + y - 70}px`;
    }
    
    moveDog(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        this.dogCharacter.style.left = `${rect.left + x - 30}px`;
        this.dogCharacter.style.top = `${rect.top + y - 70}px`;
    }
    
    hideDog() {
        this.dogCharacter.classList.add('hidden');
    }
    
    // ========================================
    // 進捗・クリア判定
    // ========================================
    updateProgress() {
        const size = this.gridData.length;
        let filled = 0;
        let total = 0;
        
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                total++;
                if (this.gridData[row][col].pathType > 0) {
                    filled++;
                }
            }
        }
        
        const percent = (filled / total) * 100;
        this.progressBar.style.width = `${percent}%`;
    }
    
    checkClear() {
        const size = this.gridData.length;
        const maxType = this.currentMaxType || CONFIG.SNACK_TYPES;
        
        // 全ペア接続チェック
        for (let type = 1; type <= maxType; type++) {
            const path = this.paths[type];
            if (!path || path.length < 2) return false;
            
            // エンドポイント取得
            const endpoints = [];
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    if (this.gridData[row][col].isEndpoint && 
                        this.gridData[row][col].type === type) {
                        endpoints.push({ row, col });
                    }
                }
            }
            
            if (endpoints.length !== 2) continue;
            
            const hasStart = path.some(p => p.row === endpoints[0].row && p.col === endpoints[0].col);
            const hasEnd = path.some(p => p.row === endpoints[1].row && p.col === endpoints[1].col);
            
            if (!hasStart || !hasEnd) return false;
        }
        
        // 全マス埋まっているか
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                if (this.gridData[row][col].pathType === 0) {
                    return false;
                }
            }
        }
        
        // クリア！
        console.log('🎉 クリア！');
        
        // クリア状態を保存（チャレンジモード以外）
        if (!this.isChallengeMode) {
            const stageId = LEVELS[this.currentLevel]?.id;
            if (stageId) {
                saveClearedStage(stageId);
            }
        }
        
        if (this.isChallengeMode) {
            setTimeout(() => this.showChallengeClearScreen(), 500);
        } else {
            setTimeout(() => this.showClearScreen(), 500);
        }
        return true;
    }
    
    showHint() {
        // 現在のレベルの解答を表示
        const level = LEVELS[this.currentLevel];
        if (level && level.solution) {
            console.log('💡 ヒント: 解答データ');
            const generator = new LevelGenerator(level.gridSize);
            console.log(generator.visualizeSolution(level));
        }
    }
    
    // ========================================
    // チャレンジモード
    // ========================================
    startChallengeMode() {
        console.log('🔥 チャレンジモード開始！');
        
        this.isChallengeMode = true;
        this.challengeScore = 0;
        
        // 画面を隠す
        this.titleScreen.classList.add('hidden');
        this.clearScreen.classList.add('hidden');
        this.selectScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.challengeClearScreen.classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        
        // ランダムなレベルを生成
        this.loadRandomChallengeLevel();
        this.resize();
        this.render();
        
        // UIを更新
        this.updateChallengeUI();
    }
    
    loadRandomChallengeLevel() {
        // 新しいレベルをランダム生成
        if (typeof LevelGenerator !== 'undefined') {
            const generator = new LevelGenerator(6);
            const difficulty = Math.min(3, 1 + Math.floor(this.challengeScore / 5)); // 5ステージごとに難易度上昇
            
            let level = null;
            for (let i = 0; i < 10; i++) {
                level = generator.generate({ difficulty: difficulty, maxAttempts: 50 });
                if (level) break;
            }
            
            if (level) {
                level.id = `C-${this.challengeScore + 1}`;
                level.name = `チャレンジ ${this.challengeScore + 1}`;
                this.loadLevel(level);
            } else {
                // フォールバック：既存のレベルからランダム選択
                const randomIndex = Math.floor(Math.random() * LEVELS.length);
                const fallbackLevel = { ...LEVELS[randomIndex] };
                fallbackLevel.id = `C-${this.challengeScore + 1}`;
                fallbackLevel.name = `チャレンジ ${this.challengeScore + 1}`;
                this.loadLevel(fallbackLevel);
            }
        } else {
            // LevelGeneratorがない場合
            const randomIndex = Math.floor(Math.random() * LEVELS.length);
            this.loadLevel(LEVELS[randomIndex]);
        }
    }
    
    updateChallengeUI() {
        // レベルテキストを更新
        this.levelText.textContent = `🔥 チャレンジ ${this.challengeScore + 1}`;
    }
    
    gameOver() {
        console.log(`💔 ゲームオーバー！ クリア数: ${this.challengeScore}`);
        
        // ハイスコア更新
        if (this.challengeScore > this.challengeHighScore) {
            this.challengeHighScore = this.challengeScore;
            localStorage.setItem('challengeHighScore', this.challengeHighScore.toString());
            console.log(`🏆 新記録！ ${this.challengeHighScore}`);
        }
        
        // 状態リセット
        this.isDrawing = false;
        this.currentType = null;
        this.lastCell = null;
        this.hideDog();
        
        // ゲームオーバー画面表示
        document.getElementById('final-score').textContent = this.challengeScore;
        document.getElementById('high-score').textContent = this.challengeHighScore;
        this.gameOverScreen.classList.remove('hidden');
    }
    
    backToTitleFromGameOver() {
        this.isChallengeMode = false;
        this.gameOverScreen.classList.add('hidden');
        this.gameScreen.classList.add('hidden');
        this.titleScreen.classList.remove('hidden');
        
        // ハイスコア表示を更新
        this.updateTitleHighScore();
    }
    
    showChallengeClearScreen() {
        this.challengeScore++;
        
        // クリア表示
        document.getElementById('challenge-count').textContent = this.challengeScore;
        this.challengeClearScreen.classList.remove('hidden');
        
        // 1.5秒後に次のステージへ
        setTimeout(() => {
            this.challengeClearScreen.classList.add('hidden');
            this.loadRandomChallengeLevel();
            this.resize();
            this.render();
            this.updateChallengeUI();
        }, 1500);
    }

    // ========================================
    // ステージセレクト
    // ========================================
    
    showStageSelect() {
        this.titleScreen.classList.add('hidden');
        this.gameScreen.classList.add('hidden');
        this.clearScreen.classList.add('hidden');
        document.getElementById('select-screen').classList.remove('hidden');
        
        this.renderStageList();
    }
    
    backToTitle() {
        document.getElementById('select-screen').classList.add('hidden');
        this.titleScreen.classList.remove('hidden');
        
        // ハイスコア表示を更新
        this.updateTitleHighScore();
    }
    
    backToStageSelect() {
        // チャレンジモード中は確認
        if (this.isChallengeMode) {
            if (confirm('チャレンジモードを終了しますか？')) {
                this.isChallengeMode = false;
            } else {
                return;
            }
        }
        
        this.gameScreen.classList.add('hidden');
        this.clearScreen.classList.add('hidden');
        document.getElementById('select-screen').classList.remove('hidden');
        this.hideDog();
        this.renderStageList();
    }
    
    renderStageList() {
        const container = document.getElementById('stage-list');
        container.innerHTML = '';
        
        // クリア済みステージを取得
        const clearedStages = loadClearedStages();
        
        LEVELS.forEach((level, index) => {
            const isCleared = clearedStages.includes(level.id);
            
            const card = document.createElement('div');
            card.className = 'stage-card' + (isCleared ? ' cleared' : '');
            card.onclick = () => this.selectStage(index);
            
            // プレビューグリッド
            let previewHTML = '<div class="stage-preview">';
            for (let row = 0; row < 6; row++) {
                for (let col = 0; col < 6; col++) {
                    const snack = level.snacks.find(s => s.row === row && s.col === col);
                    const snackClass = snack ? `snack-${snack.type}` : '';
                    previewHTML += `<div class="preview-cell ${snackClass}"></div>`;
                }
            }
            previewHTML += '</div>';
            
            // クリアマーク
            const clearMark = isCleared ? '<div class="clear-mark">★</div>' : '';
            
            card.innerHTML = `
                ${clearMark}
                <div class="stage-number">${level.id}</div>
                <div class="stage-info">${level.pathCount}種類</div>
                ${previewHTML}
            `;
            
            container.appendChild(card);
        });
        
        // クリア進捗を表示
        console.log(`📊 クリア進捗: ${clearedStages.length} / ${LEVELS.length}`);
        
        // 検証情報も表示
        this.logLevelInfo();
    }
    
    selectStage(index) {
        // 通常モード（チャレンジモードオフ）
        this.isChallengeMode = false;
        
        this.currentLevel = index;
        document.getElementById('select-screen').classList.add('hidden');
        this.gameScreen.classList.remove('hidden');
        
        this.loadLevel(LEVELS[index]);
        this.resize();
        this.render();
        
        // 検証
        console.log(`\n🎮 ステージ ${index + 1} を選択`);
        verifyCurrentLevel();
    }
    
    regenerateLevels() {
        console.log('🔄 レベル再生成...');
        initializeLevels();
        this.renderStageList();
        console.log('✅ 再生成完了！');
    }
    
    logLevelInfo() {
        console.log('\n📋 全レベル情報:');
        LEVELS.forEach((level, index) => {
            console.log(`\nステージ ${level.id}:`);
            const generator = new LevelGenerator(level.gridSize);
            console.log(generator.visualize(level));
            if (level.solution) {
                console.log(generator.visualizeSolution(level));
            }
        });
    }
    
    // ========================================
    // ユーティリティ
    // ========================================
    roundRect(ctx, x, y, width, height, radius) {
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
    }
    
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}

// ========================================
// ゲーム開始
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🐕 いぬさんぽ へようこそ！');
    
    // レベルを初期化
    initializeLevels();
    
    // ゲームインスタンス作成
    window.game = new InuSanpoGame();
    
    // デバッグ用：コンソールからレベル再生成
    window.regenerateLevels = () => {
        initializeLevels();
        if (window.game) {
            window.game.currentLevel = 0;
            window.game.loadLevel(LEVELS[0]);
            window.game.resize();
            window.game.render();
        }
    };
    
    console.log('💡 ヒント: regenerateLevels() でレベル再生成できます');
});
