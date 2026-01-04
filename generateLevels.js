/**
 * 500ステージ一括生成スクリプト
 * ブラウザのコンソールで実行してください
 */

function generate500Levels() {
    console.log('🐕 500ステージ生成開始...');
    console.time('生成時間');
    
    const generator = new LevelGenerator(6);
    const levels = [];
    const targetCount = 500;
    
    // 重複チェック用
    const usedPatterns = new Set();
    
    let attempts = 0;
    const maxAttempts = targetCount * 3;
    
    while (levels.length < targetCount && attempts < maxAttempts) {
        attempts++;
        
        const level = generator.generate({
            difficulty: Math.ceil((levels.length % 30 + 1) / 10), // 1-3を繰り返す
            maxAttempts: 50
        });
        
        if (level) {
            // 重複チェック（おやつ配置のハッシュ）
            const hash = level.snacks
                .map(s => `${s.row},${s.col},${s.type}`)
                .sort()
                .join('|');
            
            if (!usedPatterns.has(hash)) {
                usedPatterns.add(hash);
                
                level.id = levels.length + 1;
                level.name = `ステージ ${level.id}`;
                
                // 解答データは保存しない（軽量化）
                const lightLevel = {
                    id: level.id,
                    gridSize: level.gridSize,
                    pathCount: level.pathCount,
                    difficulty: level.difficulty,
                    snacks: level.snacks
                };
                
                levels.push(lightLevel);
                
                if (levels.length % 50 === 0) {
                    console.log(`✅ ${levels.length} / ${targetCount} 完了`);
                }
            }
        }
    }
    
    console.timeEnd('生成時間');
    console.log(`🎉 ${levels.length} ステージ生成完了！`);
    
    // 統計
    const stats = {
        total: levels.length,
        path3: levels.filter(l => l.pathCount === 3).length,
        path4: levels.filter(l => l.pathCount === 4).length,
        diff1: levels.filter(l => l.difficulty === 1).length,
        diff2: levels.filter(l => l.difficulty === 2).length,
        diff3: levels.filter(l => l.difficulty === 3).length,
    };
    console.log('📊 統計:', stats);
    
    return levels;
}

// JSONとしてダウンロード
function downloadLevelsAsJSON(levels) {
    const json = JSON.stringify(levels, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'levels.json';
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('📥 levels.json をダウンロードしました');
}

// 実行用関数
function generateAndDownload() {
    const levels = generate500Levels();
    downloadLevelsAsJSON(levels);
    return levels;
}

// グローバル公開
window.generate500Levels = generate500Levels;
window.downloadLevelsAsJSON = downloadLevelsAsJSON;
window.generateAndDownload = generateAndDownload;

console.log('📦 500ステージ生成スクリプト読み込み完了');
console.log('💡 generateAndDownload() を実行してください');

