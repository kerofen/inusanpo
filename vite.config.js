import { defineConfig } from 'vite';

export default defineConfig({
    // ベースパス（Capacitor用）
    base: './',
    
    // 開発サーバー設定
    server: {
        // ポート番号
        port: 5173,
        
        // ホスト（LAN内からのアクセスを許可）
        host: true,
        
        // 自動でブラウザを開く
        open: true,
    },
    
    // ビルド設定
    build: {
        // 出力ディレクトリ
        outDir: 'dist',
        
        // アセットのインライン化閾値
        assetsInlineLimit: 4096,
        
        // ソースマップ生成（本番では無効化推奨）
        sourcemap: false,
        
        // ミニファイ
        minify: 'terser',
        
        // Terser設定
        terserOptions: {
            compress: {
                // console.logを削除（本番用）
                // drop_console: true,
            },
        },
        
        // ロールアップ設定
        rollupOptions: {
            output: {
                // チャンク分割戦略
                manualChunks: {
                    phaser: ['phaser'],
                },
            },
        },
    },
    
    // 最適化設定
    optimizeDeps: {
        // 事前バンドルする依存関係
        include: ['phaser'],
    },
});

