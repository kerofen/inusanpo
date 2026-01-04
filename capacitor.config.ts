import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    // アプリID (Google Play / App Store用)
    appId: 'com.kerofen.inusanpo',
    
    // アプリ名
    appName: 'いぬさんぽ',
    
    // Webアセットのディレクトリ
    webDir: 'dist',
    
    // サーバー設定
    server: {
        // 本番環境ではfalseに
        androidScheme: 'https',
        // 開発時のライブリロード（開発中のみ有効化）
        // url: 'http://192.168.x.x:5173',
        // cleartext: true,
    },
    
    // Android固有設定
    android: {
        // Edge-to-Edge対応 (Android 15+)
        // システムバー領域まで描画エリアを拡張
        backgroundColor: '#000000',
        
        // スプラッシュスクリーン設定
        // allowMixedContent: true, // 開発時のみ
    },
    
    // iOS固有設定
    ios: {
        // ステータスバー背景色
        backgroundColor: '#000000',
        
        // コンテンツがステータスバー下に表示されることを許可
        contentInset: 'automatic',
        
        // スクロールの動作
        scrollEnabled: false,
    },
    
    // プラグイン設定
    plugins: {
        // ステータスバー設定
        StatusBar: {
            // 背景色を透明に（Edge-to-Edge用）
            backgroundColor: '#00000000',
            
            // オーバーレイモード（コンテンツがステータスバー下に表示）
            overlaysWebView: true,
            
            // スタイル（dark = 白いアイコン、light = 黒いアイコン）
            style: 'dark',
        },
        
        // スプラッシュスクリーン設定
        SplashScreen: {
            // 自動非表示の遅延時間（ミリ秒）
            launchAutoHide: true,
            launchShowDuration: 2000,
            
            // 背景色
            backgroundColor: '#000000',
            
            // スピナー表示
            showSpinner: false,
            
            // フェードアウト時間
            launchFadeOutDuration: 500,
            
            // Android用
            androidScaleType: 'CENTER_CROP',
            
            // iOS用
            iosSpinnerStyle: 'small',
        },
        
        // キーボード設定
        Keyboard: {
            // キーボード表示時のリサイズモード
            resize: 'none',
            
            // スクロール
            scrollAssist: false,
        },
    },
};

export default config;

