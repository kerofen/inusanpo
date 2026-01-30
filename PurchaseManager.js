/**
 * PurchaseManager.js - アプリ内課金管理モジュール
 * 
 * このモジュールは@capgo/native-purchasesを使用してアプリ内課金を管理します。
 * iOS (StoreKit 2) と Android (Google Play Billing) の両方に対応しています。
 * 
 * 【重要】本番リリース前に以下を設定してください：
 * 1. Google Play Console で商品を登録
 * 2. App Store Connect で商品を登録
 * 3. PRODUCT_IDS を実際の商品IDに変更
 */

import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import { Capacitor } from '@capacitor/core';

export const PurchaseManager = {
    // 初期化済みフラグ
    initialized: false,
    
    // 課金サポート状態
    billingSupported: false,
    
    // 購入済み商品の状態
    purchaseState: {
        removeAds: false,      // 広告削除
        premiumDogs: false,    // プレミアム犬種パック
    },
    
    // 商品ID定義
    // 【重要】Google Play Console / App Store Connect で登録した商品IDに変更してください
    PRODUCT_IDS: {
        // 広告削除（非消費型）
        REMOVE_ADS: 'com.kerofen.inusanpo.remove_ads',
        // プレミアム犬種パック（非消費型）
        PREMIUM_DOGS: 'com.kerofen.inusanpo.premium_dogs',
    },
    
    // 商品情報キャッシュ
    products: [],
    
    /**
     * 課金システムを初期化
     * アプリ起動時に一度だけ呼び出してください
     */
    async initialize() {
        // Web環境では初期化しない
        if (Capacitor.getPlatform() === 'web') {
            console.log('[PurchaseManager] Web環境のため課金は無効です');
            return;
        }
        
        if (this.initialized) {
            console.log('[PurchaseManager] 既に初期化済みです');
            return;
        }
        
        try {
            // 課金サポート確認
            const { isBillingSupported } = await NativePurchases.isBillingSupported();
            this.billingSupported = isBillingSupported;
            
            if (!isBillingSupported) {
                console.warn('[PurchaseManager] この端末では課金がサポートされていません');
                return;
            }
            
            // LocalStorageから購入状態を復元
            this.loadPurchaseState();
            
            // 商品情報を取得
            await this.loadProducts();
            
            // 購入履歴を復元（サイレント）
            await this.restorePurchasesSilent();
            
            this.initialized = true;
            console.log('[PurchaseManager] 初期化完了');
            
        } catch (error) {
            console.error('[PurchaseManager] 初期化エラー:', error);
        }
    },
    
    /**
     * 商品情報を取得
     */
    async loadProducts() {
        if (!this.billingSupported) {
            return [];
        }
        
        try {
            // 非消費型（一度購入したら永続）商品を取得
            const { products } = await NativePurchases.getProducts({
                productIdentifiers: [
                    this.PRODUCT_IDS.REMOVE_ADS,
                    this.PRODUCT_IDS.PREMIUM_DOGS,
                ],
                productType: PURCHASE_TYPE.INAPP, // 非消費型
            });
            
            this.products = products || [];
            console.log('[PurchaseManager] 商品情報取得:', this.products);
            
            return this.products;
            
        } catch (error) {
            console.error('[PurchaseManager] 商品情報取得エラー:', error);
            return [];
        }
    },
    
    /**
     * 商品情報を取得（キャッシュ優先）
     * @param {string} productId 商品ID
     * @returns {Object|null} 商品情報
     */
    getProduct(productId) {
        return this.products.find(p => p.productIdentifier === productId) || null;
    },
    
    /**
     * 広告削除商品を購入
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async purchaseRemoveAds() {
        return await this.purchaseProduct(this.PRODUCT_IDS.REMOVE_ADS, 'removeAds');
    },
    
    /**
     * プレミアム犬種パックを購入
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async purchasePremiumDogs() {
        return await this.purchaseProduct(this.PRODUCT_IDS.PREMIUM_DOGS, 'premiumDogs');
    },
    
    /**
     * 商品を購入
     * @param {string} productId 商品ID
     * @param {string} stateKey purchaseStateのキー
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async purchaseProduct(productId, stateKey) {
        if (Capacitor.getPlatform() === 'web') {
            return { success: false, error: 'Web環境では購入できません' };
        }
        
        if (!this.billingSupported) {
            return { success: false, error: 'この端末では課金がサポートされていません' };
        }
        
        try {
            console.log(`[PurchaseManager] 購入開始: ${productId}`);
            
            const result = await NativePurchases.purchaseProduct({
                productIdentifier: productId,
                productType: PURCHASE_TYPE.INAPP,
                quantity: 1,
            });
            
            console.log('[PurchaseManager] 購入結果:', result);
            
            // 購入成功時の処理
            if (result && result.transaction) {
                this.purchaseState[stateKey] = true;
                this.savePurchaseState();
                
                // 広告削除の場合、AdManagerにも通知
                if (stateKey === 'removeAds') {
                    this.onRemoveAdsPurchased();
                }
                
                return { success: true };
            }
            
            return { success: false, error: '購入がキャンセルされました' };
            
        } catch (error) {
            console.error('[PurchaseManager] 購入エラー:', error);
            
            // ユーザーキャンセルの場合
            if (error.code === 'PURCHASE_CANCELLED' || 
                error.message?.includes('cancel') ||
                error.message?.includes('Cancel')) {
                return { success: false, error: '購入がキャンセルされました' };
            }
            
            return { success: false, error: error.message || '購入処理中にエラーが発生しました' };
        }
    },
    
    /**
     * 購入を復元
     * @returns {Promise<{success: boolean, restored: string[], error?: string}>}
     */
    async restorePurchases() {
        if (Capacitor.getPlatform() === 'web') {
            return { success: false, restored: [], error: 'Web環境では復元できません' };
        }
        
        if (!this.billingSupported) {
            return { success: false, restored: [], error: 'この端末では課金がサポートされていません' };
        }
        
        try {
            console.log('[PurchaseManager] 購入復元開始');
            
            const result = await NativePurchases.restorePurchases();
            console.log('[PurchaseManager] 復元結果:', result);
            
            const restored = [];
            
            if (result && result.transactions) {
                for (const transaction of result.transactions) {
                    const productId = transaction.productIdentifier;
                    
                    if (productId === this.PRODUCT_IDS.REMOVE_ADS) {
                        this.purchaseState.removeAds = true;
                        restored.push('広告削除');
                        this.onRemoveAdsPurchased();
                    }
                    
                    if (productId === this.PRODUCT_IDS.PREMIUM_DOGS) {
                        this.purchaseState.premiumDogs = true;
                        restored.push('プレミアム犬種パック');
                    }
                }
                
                this.savePurchaseState();
            }
            
            if (restored.length > 0) {
                console.log('[PurchaseManager] 復元完了:', restored);
                return { success: true, restored };
            }
            
            return { success: true, restored: [], error: '復元可能な購入がありませんでした' };
            
        } catch (error) {
            console.error('[PurchaseManager] 購入復元エラー:', error);
            return { success: false, restored: [], error: error.message || '復元処理中にエラーが発生しました' };
        }
    },
    
    /**
     * 購入を復元（サイレント - エラーを表示しない）
     */
    async restorePurchasesSilent() {
        try {
            const result = await NativePurchases.restorePurchases();
            
            if (result && result.transactions) {
                for (const transaction of result.transactions) {
                    const productId = transaction.productIdentifier;
                    
                    if (productId === this.PRODUCT_IDS.REMOVE_ADS) {
                        this.purchaseState.removeAds = true;
                        this.onRemoveAdsPurchased();
                    }
                    
                    if (productId === this.PRODUCT_IDS.PREMIUM_DOGS) {
                        this.purchaseState.premiumDogs = true;
                    }
                }
                
                this.savePurchaseState();
            }
        } catch (error) {
            // サイレント復元なのでエラーは無視
            console.log('[PurchaseManager] サイレント復元スキップ:', error.message);
        }
    },
    
    /**
     * 広告削除購入時のコールバック
     */
    onRemoveAdsPurchased() {
        // AdManagerの広告削除フラグを設定
        try {
            // 動的インポートを避けるため、グローバルイベントを発火
            window.dispatchEvent(new CustomEvent('adsRemoved'));
            
            // LocalStorageにも保存（AdManager用）
            localStorage.setItem('inusanpo_ads_removed', 'true');
        } catch (error) {
            console.error('[PurchaseManager] 広告削除通知エラー:', error);
        }
    },
    
    /**
     * 購入状態をLocalStorageに保存
     */
    savePurchaseState() {
        try {
            localStorage.setItem('inusanpo_purchase_state', JSON.stringify(this.purchaseState));
        } catch (error) {
            console.error('[PurchaseManager] 状態保存エラー:', error);
        }
    },
    
    /**
     * 購入状態をLocalStorageから復元
     */
    loadPurchaseState() {
        try {
            const saved = localStorage.getItem('inusanpo_purchase_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.purchaseState = { ...this.purchaseState, ...parsed };
            }
        } catch (error) {
            console.error('[PurchaseManager] 状態復元エラー:', error);
        }
    },
    
    /**
     * 広告が削除されているか確認
     * @returns {boolean}
     */
    isAdsRemoved() {
        return this.purchaseState.removeAds;
    },
    
    /**
     * プレミアム犬種パックを持っているか確認
     * @returns {boolean}
     */
    hasPremiumDogs() {
        return this.purchaseState.premiumDogs;
    },
    
    /**
     * 商品価格をフォーマットして取得
     * @param {string} productId 商品ID
     * @returns {string} フォーマットされた価格
     */
    getFormattedPrice(productId) {
        const product = this.getProduct(productId);
        if (product) {
            return product.priceString || product.price?.toString() || '---';
        }
        return '---';
    },
    
    /**
     * 全商品情報を取得（ショップUI用）
     * @returns {Array} 商品情報の配列
     */
    getShopItems() {
        return [
            {
                id: this.PRODUCT_IDS.REMOVE_ADS,
                name: '広告削除',
                description: 'すべての広告を永久に削除します',
                price: this.getFormattedPrice(this.PRODUCT_IDS.REMOVE_ADS),
                purchased: this.purchaseState.removeAds,
                icon: 'pack_noads',
            },
            {
                id: this.PRODUCT_IDS.PREMIUM_DOGS,
                name: 'プレミアム犬種パック',
                description: '特別な犬種をすべて解放します',
                price: this.getFormattedPrice(this.PRODUCT_IDS.PREMIUM_DOGS),
                purchased: this.purchaseState.premiumDogs,
                icon: 'pack_dog',
            },
        ];
    },
};

export default PurchaseManager;
