/**
 * いぬさんぽ - レベル自動生成システム v4
 * 
 * 【保証】
 * - 生成されるパズルは100%解ける
 * - 全マスが必ず埋まる
 * - 同じ種類のおやつは隣接しない
 * 
 * 【アルゴリズム】
 * 1. グリッド全体を1本の連続した蛇行パスで埋める
 * 2. そのパスを連続したセグメントに分割
 * 3. 各セグメントの端点がおやつの位置になる
 * 
 * 蛇行パスは数学的に連続性が保証されているため、
 * 分割後も各セグメントは必ず連続している。
 */

/**
 * シード付き乱数生成器（Mulberry32アルゴリズム）
 * 同じシードなら常に同じ乱数列を生成
 */
function createSeededRandom(seed) {
    let state = seed;
    return function() {
        state |= 0;
        state = state + 0x6D2B79F5 | 0;
        let t = Math.imul(state ^ state >>> 15, 1 | state);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export class LevelGenerator {
    constructor(gridSize = 6, seed = null) {
        this.gridSize = gridSize;
        this.totalCells = gridSize * gridSize;
        // シードが指定されていれば固定乱数、なければMath.random
        this.random = seed !== null ? createSeededRandom(seed) : Math.random;
    }
    
    /**
     * シードを設定して乱数生成器をリセット
     */
    setSeed(seed) {
        this.random = createSeededRandom(seed);
    }

    /**
     * レベルを生成
     */
    generate(options = {}) {
        const {
            difficulty = 2,
            maxAttempts = 100
        } = options;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const result = this.generateOnce();

            if (result) {
                // 厳密な検証
                if (this.strictValidate(result)) {
                    return this.formatLevelData(result, difficulty);
                }
            }
        }

        console.error('レベル生成に失敗');
        return null;
    }

    /**
     * 1回の生成試行
     */
    generateOnce() {
        // Step 1: 蛇行パスを生成（連続性保証）
        const fullPath = this.generateSnakePath();

        // Step 2: パスを3〜4本に分割
        const numPaths = this.random() < 0.5 ? 3 : 4;
        const segments = this.splitPathSafely(fullPath, numPaths);

        if (!segments) return null;

        // Step 3: 隣接チェック
        if (this.hasAdjacentEndpoints(segments)) {
            return null;
        }

        // グリッド構築
        const grid = this.createEmptyGrid();
        const paths = segments.map((segment, index) => {
            const id = index + 1;
            segment.forEach(cell => {
                grid[cell.row][cell.col] = id;
            });
            return {
                id: id,
                cells: [...segment], // コピー
                start: { ...segment[0] },
                end: { ...segment[segment.length - 1] },
                length: segment.length
            };
        });

        return { grid, paths };
    }

    /**
     * 蛇行パスを生成
     * 数学的に連続性が保証される
     */
    generateSnakePath() {
        const path = [];

        // ランダムな開始パターンを選択
        const pattern = Math.floor(this.random() * 4);

        switch (pattern) {
            case 0: // 左上から、横方向蛇行
                this.snakeHorizontal(path, 0, 1);
                break;
            case 1: // 右上から、横方向蛇行
                this.snakeHorizontal(path, this.gridSize - 1, -1);
                break;
            case 2: // 左上から、縦方向蛇行
                this.snakeVertical(path, 0, 1);
                break;
            case 3: // 左下から、縦方向蛇行
                this.snakeVertical(path, this.gridSize - 1, -1);
                break;
        }

        return path;
    }

    /**
     * 横方向の蛇行パス
     */
    snakeHorizontal(path, startCol, colDir) {
        for (let row = 0; row < this.gridSize; row++) {
            const goRight = (row % 2 === 0) === (colDir === 1);

            if (goRight) {
                for (let col = 0; col < this.gridSize; col++) {
                    path.push({ row, col });
                }
            } else {
                for (let col = this.gridSize - 1; col >= 0; col--) {
                    path.push({ row, col });
                }
            }
        }
    }

    /**
     * 縦方向の蛇行パス
     */
    snakeVertical(path, startRow, rowDir) {
        for (let col = 0; col < this.gridSize; col++) {
            const goDown = (col % 2 === 0) === (rowDir === 1);

            if (goDown) {
                for (let row = 0; row < this.gridSize; row++) {
                    path.push({ row, col });
                }
            } else {
                for (let row = this.gridSize - 1; row >= 0; row--) {
                    path.push({ row, col });
                }
            }
        }
    }

    /**
     * パスを安全に分割（連続性を保証）
     */
    splitPathSafely(fullPath, numSegments) {
        const minLen = 5; // 最小セグメント長（隣接を避けるため）
        const totalLen = fullPath.length;

        // 分割可能か確認
        if (totalLen < numSegments * minLen) {
            return null;
        }

        // 分割点を決定
        const splitPoints = [0];
        const segmentSize = Math.floor(totalLen / numSegments);

        for (let i = 1; i < numSegments; i++) {
            // 基準位置 ± ランダムなオフセット
            const basePos = i * segmentSize;
            const offset = Math.floor(this.random() * (segmentSize / 2)) - Math.floor(segmentSize / 4);
            let pos = basePos + offset;

            // 範囲制限
            const minPos = splitPoints[splitPoints.length - 1] + minLen;
            const maxPos = totalLen - (numSegments - i) * minLen;
            pos = Math.max(minPos, Math.min(maxPos, pos));

            splitPoints.push(pos);
        }
        splitPoints.push(totalLen);

        // セグメントを作成
        const segments = [];
        for (let i = 0; i < splitPoints.length - 1; i++) {
            const start = splitPoints[i];
            const end = splitPoints[i + 1];
            const segment = fullPath.slice(start, end);

            if (segment.length < minLen) {
                return null; // 安全のため
            }

            segments.push(segment);
        }

        return segments;
    }

    /**
     * 同じ種類のおやつが隣接しているかチェック
     */
    hasAdjacentEndpoints(segments) {
        for (const segment of segments) {
            const start = segment[0];
            const end = segment[segment.length - 1];

            // 同じセグメントの端点が隣接しているか
            const dist = Math.abs(start.row - end.row) + Math.abs(start.col - end.col);
            if (dist <= 1) {
                return true;
            }
        }
        return false;
    }

    /**
     * 厳密な検証
     */
    strictValidate(result) {
        const { grid, paths } = result;

        // 1. 全マスが埋まっているか
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                if (grid[row][col] === 0) {
                    console.log(`❌ 検証失敗: (${row},${col})が空`);
                    return false;
                }
            }
        }

        // 2. 各パスが連続しているか
        for (const path of paths) {
            for (let i = 1; i < path.cells.length; i++) {
                const prev = path.cells[i - 1];
                const curr = path.cells[i];
                const dist = Math.abs(prev.row - curr.row) + Math.abs(prev.col - curr.col);

                if (dist !== 1) {
                    console.log(`❌ 検証失敗: パス${path.id}が不連続 (${prev.row},${prev.col})→(${curr.row},${curr.col})`);
                    return false;
                }
            }
        }

        // 3. パス数が適切か
        if (paths.length < 3 || paths.length > 4) {
            console.log(`❌ 検証失敗: パス数が${paths.length}`);
            return false;
        }

        // 4. 端点が隣接していないか
        for (const path of paths) {
            const dist = Math.abs(path.start.row - path.end.row) +
                Math.abs(path.start.col - path.end.col);
            if (dist <= 1) {
                console.log(`❌ 検証失敗: パス${path.id}の端点が隣接`);
                return false;
            }
        }

        // 5. グリッドとパスの整合性
        const checkGrid = this.createEmptyGrid();
        for (const path of paths) {
            for (const cell of path.cells) {
                if (checkGrid[cell.row][cell.col] !== 0) {
                    console.log(`❌ 検証失敗: セル重複 (${cell.row},${cell.col})`);
                    return false;
                }
                checkGrid[cell.row][cell.col] = path.id;
            }
        }

        return true;
    }

    /**
     * レベルデータをフォーマット
     */
    formatLevelData(result, difficulty) {
        const snacks = [];

        result.paths.forEach((path, index) => {
            const type = index + 1;
            snacks.push({
                row: path.start.row,
                col: path.start.col,
                type: type
            });
            snacks.push({
                row: path.end.row,
                col: path.end.col,
                type: type
            });
        });

        return {
            gridSize: this.gridSize,
            snacks: snacks,
            pathCount: result.paths.length,
            solution: result.paths,
            difficulty: difficulty
        };
    }

    // ========================================
    // ユーティリティ
    // ========================================

    createEmptyGrid() {
        return Array.from({ length: this.gridSize }, () =>
            Array(this.gridSize).fill(0)
        );
    }

    /**
     * 問題を表示
     */
    visualize(levelData) {
        const grid = this.createEmptyGrid();
        const symbols = ['·', '①', '②', '③', '④'];

        levelData.snacks.forEach(snack => {
            grid[snack.row][snack.col] = snack.type;
        });

        let output = '【問題】\n';
        for (let row = 0; row < this.gridSize; row++) {
            output += grid[row].map(v => symbols[v] || '·').join(' ') + '\n';
        }
        return output;
    }

    /**
     * 解答を表示
     */
    visualizeSolution(levelData) {
        if (!levelData.solution) return '解答データなし';

        const grid = this.createEmptyGrid();
        const symbols = ['·', '①', '②', '③', '④'];

        levelData.solution.forEach((path, index) => {
            path.cells.forEach(cell => {
                grid[cell.row][cell.col] = index + 1;
            });
        });

        let output = '【解答】\n';
        for (let row = 0; row < this.gridSize; row++) {
            output += grid[row].map(v => symbols[v] || '·').join(' ') + '\n';
        }
        return output;
    }
}

// ========================================
// テスト関数
// ========================================

function generateTestLevels() {
    const generator = new LevelGenerator(6);
    const levels = [];

    console.log('='.repeat(50));
    console.log('🐕 いぬさんぽ レベル生成 v4（完璧版）');
    console.log('='.repeat(50));

    for (let i = 1; i <= 5; i++) {
        console.log(`\n📦 ステージ ${i} 生成中...`);

        const level = generator.generate({
            difficulty: Math.ceil(i / 2),
            maxAttempts: 100
        });

        if (level) {
            level.id = i;
            level.name = `ステージ ${i}`;
            levels.push(level);

            console.log(`✅ 生成成功！ (${level.pathCount}種類)`);
            console.log(generator.visualize(level));
            console.log(generator.visualizeSolution(level));

            // 検証
            console.log(verifyLevel(level) ? '✅ 検証OK' : '❌ 検証NG');
        } else {
            console.log(`❌ 生成失敗`);
        }
    }

    return levels;
}

function verifyLevel(levelData) {
    if (!levelData.solution) return false;

    const gridSize = levelData.gridSize;
    const grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(0));

    // 解答でグリッドを埋める
    for (const path of levelData.solution) {
        for (const cell of path.cells) {
            if (grid[cell.row][cell.col] !== 0) {
                console.log('  重複検出');
                return false;
            }
            grid[cell.row][cell.col] = path.id;
        }
    }

    // 空きチェック
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (grid[r][c] === 0) {
                console.log(`  空きマス (${r},${c})`);
                return false;
            }
        }
    }

    // 連続性チェック
    for (const path of levelData.solution) {
        for (let i = 1; i < path.cells.length; i++) {
            const prev = path.cells[i - 1];
            const curr = path.cells[i];
            const dist = Math.abs(prev.row - curr.row) + Math.abs(prev.col - curr.col);
            if (dist !== 1) {
                console.log(`  パス${path.id}不連続`);
                return false;
            }
        }
    }

    return true;
}

function verifyCurrentLevel() {
    if (typeof LEVELS !== 'undefined' && LEVELS.length > 0 && window.game) {
        const level = LEVELS[window.game.currentLevel || 0];
        const generator = new LevelGenerator(level.gridSize);

        console.log(`\n📋 レベル ${level.id} の検証`);
        console.log(generator.visualize(level));
        console.log(generator.visualizeSolution(level));

        return verifyLevel(level);
    }
    return false;
}

/**
 * 全ステージの重複チェック
 */
function checkDuplicates() {
    if (typeof LEVELS === 'undefined' || LEVELS.length === 0) {
        console.log('❌ LEVELSが空です');
        return;
    }

    console.log(`\n🔍 ${LEVELS.length}ステージの重複チェック開始...`);
    console.time('チェック時間');

    const patterns = new Map(); // hash -> [level ids]
    let duplicateCount = 0;

    LEVELS.forEach(level => {
        // おやつ配置のハッシュを生成
        const hash = level.snacks
            .map(s => `${s.row},${s.col},${s.type}`)
            .sort()
            .join('|');

        if (patterns.has(hash)) {
            patterns.get(hash).push(level.id);
            duplicateCount++;
        } else {
            patterns.set(hash, [level.id]);
        }
    });

    console.timeEnd('チェック時間');

    // 重複を報告
    const duplicates = [];
    patterns.forEach((ids, hash) => {
        if (ids.length > 1) {
            duplicates.push({ ids, hash });
        }
    });

    if (duplicates.length === 0) {
        console.log('✅ 重複なし！全てユニークなステージです！');
        console.log(`📊 ユニークステージ数: ${patterns.size}`);
    } else {
        console.log(`⚠️ ${duplicates.length}組の重複が見つかりました:`);
        duplicates.forEach((dup, i) => {
            console.log(`  ${i + 1}. ステージ ${dup.ids.join(', ')} が同じ配置`);
        });
    }

    // 統計情報
    const stats = {
        total: LEVELS.length,
        unique: patterns.size,
        duplicateGroups: duplicates.length,
        path3: LEVELS.filter(l => l.pathCount === 3).length,
        path4: LEVELS.filter(l => l.pathCount === 4).length,
    };

    console.log('\n📊 統計情報:');
    console.log(`  総ステージ数: ${stats.total}`);
    console.log(`  ユニーク数: ${stats.unique}`);
    console.log(`  重複グループ: ${stats.duplicateGroups}`);
    console.log(`  3種類ステージ: ${stats.path3}`);
    console.log(`  4種類ステージ: ${stats.path4}`);

    return {
        hasDuplicates: duplicates.length > 0,
        duplicates,
        stats
    };
}

/**
 * 全ステージがクリア可能かチェック
 */
function verifyAllLevels() {
    if (typeof LEVELS === 'undefined' || LEVELS.length === 0) {
        console.log('❌ LEVELSが空です');
        return;
    }

    console.log(`\n🔍 ${LEVELS.length}ステージの検証開始...`);
    console.time('検証時間');

    let passCount = 0;
    let failCount = 0;
    const failedLevels = [];

    LEVELS.forEach(level => {
        if (verifyLevel(level)) {
            passCount++;
        } else {
            failCount++;
            failedLevels.push(level.id);
        }

        if ((passCount + failCount) % 100 === 0) {
            console.log(`  検証中... ${passCount + failCount} / ${LEVELS.length}`);
        }
    });

    console.timeEnd('検証時間');

    if (failCount === 0) {
        console.log(`✅ 全${passCount}ステージがクリア可能です！`);
    } else {
        console.log(`⚠️ ${failCount}ステージに問題があります:`);
        console.log(`  問題のあるステージ: ${failedLevels.join(', ')}`);
    }

    return {
        passed: passCount,
        failed: failCount,
        failedLevels
    };
}


