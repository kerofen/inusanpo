/**
 * AdManager.js - AdMob広告管理モジュール
 * 
 * このモジュールはGoogle AdMobのインタースティシャル広告を管理します。
 * 
 * 【重要】本番リリース前に以下を変更してください：
 * 1. PRODUCTION_AD_IDS に実際の広告ユニットIDを設定
 * 2. initialize() の isTesting を false に変更
 * 3. AndroidManifest.xml と Info.plist のAdMob App IDを本番IDに変更
 */

import { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export const AdManager = {
    // 広告削除フラグ（課金で広告を削除した場合trueに）
    isAdRemoved: false,
    
    // インタースティシャル広告の読み込み状態
    interstitialLoaded: false,
    
    // 初期化済みフラグ
    initialized: false,
    
    // ステージクリアカウンター（広告表示頻度管理用）
    clearCount: 0,
    
    // 広告表示間隔（何ステージごとに広告を表示するか）
    AD_INTERVAL: 5,
    
    // テスト用広告ユニットID（Google公式テストID）
    TEST_AD_IDS: {
        android: {
            interstitial: 'ca-app-pub-3940256099942544/1033173712'
        },
        ios: {
            interstitial: 'ca-app-pub-3940256099942544/4411468910'
        }
    },
    
    // 本番用広告ユニットID（リリース前に設定してください）
    PRODUCTION_AD_IDS: {
        android: {
            interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' // TODO: 本番ID
        },
        ios: {
            interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' // TODO: 本番ID
        }
    },
    
    /**
     * AdMobを初期化
     * アプリ起動時に一度だけ呼び出してください
     */
    async initialize() {
        // Web環境では初期化しない
        if (Capacitor.getPlatform() === 'web') {
            console.log('[AdManager] Web環境のため広告は無効です');
            return;
        }
        
        if (this.initialized) {
            console.log('[AdManager] 既に初期化済みです');
            return;
        }
        
        try {
            // LocalStorageから広告削除状態を復元
            this.loadAdRemovedState();
            
            if (this.isAdRemoved) {
                console.log('[AdManager] 広告は削除されています');
                this.initialized = true;
                return;
            }
            
            // AdMob初期化
            await AdMob.initialize({
                // テストモード（本番リリース前にfalseに変更）
                testingDevices: [],
                initializeForTesting: true
            });
            
            // イベントリスナーを設定
            this.setupEventListeners();
            
            // iOS: App Tracking Transparency 許可リクエスト
            if (Capacitor.getPlatform() === 'ios') {
                const trackingStatus = await AdMob.trackingAuthorizationStatus();
                if (trackingStatus.status === 'notDetermined') {
                    await AdMob.requestTrackingAuthorization();
                }
            }
            
            // 初回のインタースティシャル広告を準備
            await this.prepareInterstitial();
            
            this.initialized = true;
            console.log('[AdManager] 初期化完了');
            
        } catch (error) {
            console.error('[AdManager] 初期化エラー:', error);
        }
    },
    
    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // インタースティシャル広告の読み込み完了
        AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
            console.log('[AdManager] インタースティシャル広告読み込み完了');
            this.interstitialLoaded = true;
        });
        
        // インタースティシャル広告の読み込み失敗
        AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
            console.error('[AdManager] インタースティシャル広告読み込み失敗:', error);
            this.interstitialLoaded = false;
            // 5秒後にリトライ
            setTimeout(() => this.prepareInterstitial(), 5000);
        });
        
        // インタースティシャル広告が閉じられた
        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
            console.log('[AdManager] インタースティシャル広告が閉じられました');
            this.interstitialLoaded = false;
            // 次の広告を準備
            this.prepareInterstitial();
        });
        
        // インタースティシャル広告の表示失敗
        AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (error) => {
            console.error('[AdManager] インタースティシャル広告表示失敗:', error);
            this.interstitialLoaded = false;
            this.prepareInterstitial();
        });
    },
    
    /**
     * 広告ユニットIDを取得
     */
    getInterstitialId() {
        const platform = Capacitor.getPlatform();
        // テストモード時はテストIDを使用（本番リリース前に変更）
        const useTesting = true; // TODO: 本番リリース時にfalseに変更
        
        if (useTesting) {
            return this.TEST_AD_IDS[platform]?.interstitial || '';
        }
        return this.PRODUCTION_AD_IDS[platform]?.interstitial || '';
    },
    
    /**
     * インタースティシャル広告を準備（プリロード）
     */
    async prepareInterstitial() {
        if (this.isAdRemoved) {
            return;
        }
        
        if (Capacitor.getPlatform() === 'web') {
            return;
        }
        
        try {
            const adId = this.getInterstitialId();
            if (!adId) {
                console.error('[AdManager] 広告ユニットIDが設定されていません');
                return;
            }
            
            await AdMob.prepareInterstitial({
                adId: adId,
                isTesting: true // TODO: 本番リリース時にfalseに変更
            });
            
            console.log('[AdManager] インタースティシャル広告を準備中...');
            
        } catch (error) {
            console.error('[AdManager] インタースティシャル広告準備エラー:', error);
        }
    },
    
    /**
     * インタースティシャル広告を表示
     * @returns {Promise<boolean>} 広告が表示されたかどうか
     */
    async showInterstitial() {
        if (this.isAdRemoved) {
            console.log('[AdManager] 広告は削除されています');
            return false;
        }
        
        if (Capacitor.getPlatform() === 'web') {
            console.log('[AdManager] Web環境のため広告は表示されません');
            return false;
        }
        
        if (!this.interstitialLoaded) {
            console.log('[AdManager] 広告がまだ読み込まれていません');
            // 読み込みを開始
            await this.prepareInterstitial();
            return false;
        }
        
        try {
            await AdMob.showInterstitial();
            console.log('[AdManager] インタースティシャル広告を表示しました');
            return true;
            
        } catch (error) {
            console.error('[AdManager] インタースティシャル広告表示エラー:', error);
            this.interstitialLoaded = false;
            this.prepareInterstitial();
            return false;
        }
    },
    
    /**
     * ステージクリア時に呼び出す
     * AD_INTERVAL ステージごとに広告を表示
     * @returns {Promise<boolean>} 広告が表示されたかどうか
     */
    async onStageClear() {
        if (this.isAdRemoved) {
            return false;
        }
        
        this.clearCount++;
        
        if (this.clearCount >= this.AD_INTERVAL) {
            this.clearCount = 0;
            return await this.showInterstitial();
        }
        
        return false;
    },
    
    /**
     * 広告を削除（課金後に呼び出す）
     */
    removeAds() {
        this.isAdRemoved = true;
        this.saveAdRemovedState();
        console.log('[AdManager] 広告を削除しました');
    },
    
    /**
     * 広告削除状態をLocalStorageに保存
     */
    saveAdRemovedState() {
        try {
            localStorage.setItem('inusanpo_ads_removed', 'true');
        } catch (error) {
            console.error('[AdManager] 状態保存エラー:', error);
        }
    },
    
    /**
     * 広告削除状態をLocalStorageから復元
     */
    loadAdRemovedState() {
        try {
            const removed = localStorage.getItem('inusanpo_ads_removed');
            this.isAdRemoved = removed === 'true';
        } catch (error) {
            console.error('[AdManager] 状態復元エラー:', error);
        }
    },
    
    /**
     * 広告表示間隔を設定
     * @param {number} interval 何ステージごとに広告を表示するか
     */
    setAdInterval(interval) {
        this.AD_INTERVAL = Math.max(1, interval);
        console.log(`[AdManager] 広告表示間隔を ${this.AD_INTERVAL} ステージごとに設定`);
    }
};

export default AdManager;
