/**
 * PurchaseManager.js - アプリ内課金管理モジュール
 * 
 * このモジュールは@capgo/native-purchasesを使用してアプリ内課金を管理します。
 * iOS (StoreKit 2) と Android (Google Play Billing) の両方に対応しています。
 * 
 * 【商品構成】
 * 1. プレミアムセット（deluxe）- 広告削除＋いろどりパックのセット
 * 2. いろどりパック（customize）- 肉球カラー・きせかえ・テーマ全解放
 * 3. こうこくけし（removeAds）- 広告削除
 * 4. ワンコを迎える（singleDog）- 犬1匹解放（消費型）
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
        customize: false,      // いろどりパック（全カスタマイズ解放）
        deluxe: false,         // プレミアムセット購入済み
    },
    
    // 商品ID定義
    // Google Play Console / App Store Connect で登録する商品ID
    PRODUCT_IDS: {
        // プレミアムセット（非消費型）- 広告削除＋いろどりパック
        DELUXE: 'com.kerofen.inusanpo.deluxe',
        // いろどりパック（非消費型）- 全カスタマイズ解放
        CUSTOMIZE: 'com.kerofen.inusanpo.customize',
        // 広告削除（非消費型）
        REMOVE_ADS: 'com.kerofen.inusanpo.remove_ads',
        // ワンコを迎える（消費型）- 犬1匹解放
        SINGLE_DOG: 'com.kerofen.inusanpo.single_dog',
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
            // 非消費型商品を取得
            const { products: inappProducts } = await NativePurchases.getProducts({
                productIdentifiers: [
                    this.PRODUCT_IDS.DELUXE,
                    this.PRODUCT_IDS.CUSTOMIZE,
                    this.PRODUCT_IDS.REMOVE_ADS,
                ],
                productType: PURCHASE_TYPE.INAPP,
            });
            
            // 消費型商品を取得（ワンコを迎える）
            const { products: consumableProducts } = await NativePurchases.getProducts({
                productIdentifiers: [
                    this.PRODUCT_IDS.SINGLE_DOG,
                ],
                productType: PURCHASE_TYPE.INAPP, // 消費型もINAPPで取得
            });
            
            this.products = [...(inappProducts || []), ...(consumableProducts || [])];
            console.log('[PurchaseManager] 商品情報取得:', this.products);
            console.log('[PurchaseManager] 取得した商品数:', this.products.length);
            if (this.products.length === 0) {
                console.warn('[PurchaseManager] ⚠️ 商品が0件です。App Store Connectで商品が正しく設定されているか確認してください。');
                console.warn('[PurchaseManager] 期待される商品ID:', [
                    this.PRODUCT_IDS.DELUXE,
                    this.PRODUCT_IDS.CUSTOMIZE,
                    this.PRODUCT_IDS.REMOVE_ADS,
                    this.PRODUCT_IDS.SINGLE_DOG,
                ]);
            }
            
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
     * プレミアムセットを購入
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async purchaseDeluxe() {
        const result = await this.purchaseProduct(this.PRODUCT_IDS.DELUXE, 'deluxe');
        if (result.success) {
            // プレミアムセットは広告削除＋いろどりパック両方を解放
            this.purchaseState.removeAds = true;
            this.purchaseState.customize = true;
            this.savePurchaseState();
            this.onRemoveAdsPurchased();
            this.onCustomizePurchased();
        }
        return result;
    },
    
    /**
     * いろどりパックを購入
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async purchaseCustomize() {
        const result = await this.purchaseProduct(this.PRODUCT_IDS.CUSTOMIZE, 'customize');
        if (result.success) {
            this.onCustomizePurchased();
        }
        return result;
    },
    
    /**
     * 広告削除を購入
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async purchaseRemoveAds() {
        const result = await this.purchaseProduct(this.PRODUCT_IDS.REMOVE_ADS, 'removeAds');
        if (result.success) {
            this.onRemoveAdsPurchased();
        }
        return result;
    },
    
    /**
     * ワンコを迎える（消費型）
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async purchaseSingleDog() {
        if (Capacitor.getPlatform() === 'web') {
            return { success: false, error: 'Web環境では購入できません' };
        }
        
        if (!this.billingSupported) {
            return { success: false, error: 'この端末では課金がサポートされていません' };
        }
        
        try {
            console.log(`[PurchaseManager] 購入開始: ${this.PRODUCT_IDS.SINGLE_DOG}`);
            
            const result = await NativePurchases.purchaseProduct({
                productIdentifier: this.PRODUCT_IDS.SINGLE_DOG,
                productType: PURCHASE_TYPE.INAPP,
                quantity: 1,
            });
            
            console.log('[PurchaseManager] 購入結果:', result);
            
            // @capgo/native-purchases は Transaction を直接返す（result.transaction ではなく result.transactionId 等）
            if (result && (result.transactionId || result.transaction || result.productIdentifier)) {
                // 消費型なので状態は保存しない（購入ごとに犬を選ぶ）
                // ゲーム側でどの犬を解放するか選択させる
                window.dispatchEvent(new CustomEvent('singleDogPurchased'));
                return { success: true };
            }
            
            return { success: false, error: '購入がキャンセルされました' };
            
        } catch (error) {
            console.error('[PurchaseManager] 購入エラー:', error);
            console.error('[PurchaseManager] エラー詳細:', JSON.stringify(error, null, 2));
            
            if (error.code === 'PURCHASE_CANCELLED' || 
                error.message?.includes('cancel') ||
                error.message?.includes('Cancel') ||
                error.message?.includes('User cancelled')) {
                return { success: false, error: '購入がキャンセルされました' };
            }
            
            // 商品が見つからない場合
            if (error.message?.includes('Cannot find product')) {
                return { success: false, error: '商品が見つかりません。App Store Connectで商品が正しく設定されているか確認してください。' };
            }
            
            return { success: false, error: error.message || '購入処理中にエラーが発生しました' };
        }
    },
    
    /**
     * 商品を購入（非消費型）
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
            // @capgo/native-purchases は Transaction を直接返す（result.transaction ではなく result.transactionId 等）
            if (result && (result.transactionId || result.transaction || result.productIdentifier)) {
                this.purchaseState[stateKey] = true;
                this.savePurchaseState();
                return { success: true };
            }
            
            return { success: false, error: '購入がキャンセルされました' };
            
        } catch (error) {
            console.error('[PurchaseManager] 購入エラー:', error);
            console.error('[PurchaseManager] エラー詳細:', JSON.stringify(error, null, 2));
            
            // ユーザーキャンセルの場合
            if (error.code === 'PURCHASE_CANCELLED' || 
                error.message?.includes('cancel') ||
                error.message?.includes('Cancel') ||
                error.message?.includes('User cancelled')) {
                return { success: false, error: '購入がキャンセルされました' };
            }
            
            // 商品が見つからない場合
            if (error.message?.includes('Cannot find product')) {
                return { success: false, error: '商品が見つかりません。App Store Connectで商品が正しく設定されているか確認してください。' };
            }
            
            return { success: false, error: error.message || '購入処理中にエラーが発生しました' };
        }
    },
    
    /**
     * 購入履歴からトランザクションを処理する共通メソッド
     * @param {Array} purchases トランザクション配列
     * @returns {string[]} 復元された商品名の配列
     */
    _processPurchases(purchases) {
        const restored = [];
        
        for (const transaction of purchases) {
            const productId = transaction.productIdentifier;
            
            if (productId === this.PRODUCT_IDS.DELUXE) {
                this.purchaseState.deluxe = true;
                this.purchaseState.removeAds = true;
                this.purchaseState.customize = true;
                restored.push('プレミアムセット');
                this.onRemoveAdsPurchased();
                this.onCustomizePurchased();
            }
            
            if (productId === this.PRODUCT_IDS.CUSTOMIZE) {
                this.purchaseState.customize = true;
                restored.push('いろどりパック');
                this.onCustomizePurchased();
            }
            
            if (productId === this.PRODUCT_IDS.REMOVE_ADS) {
                this.purchaseState.removeAds = true;
                restored.push('広告削除');
                this.onRemoveAdsPurchased();
            }
        }
        
        if (restored.length > 0) {
            this.savePurchaseState();
        }
        
        return restored;
    },
    
    /**
     * 購入を復元
     * restorePurchases() でストア側キャッシュを更新し、
     * getPurchases() で購入履歴を取得して反映する
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
            
            // ストア側のキャッシュを更新
            await NativePurchases.restorePurchases();
            
            // 購入履歴を取得
            const { purchases } = await NativePurchases.getPurchases({
                productType: PURCHASE_TYPE.INAPP,
            });
            console.log('[PurchaseManager] 購入履歴:', purchases);
            
            const restored = this._processPurchases(purchases || []);
            
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
            await NativePurchases.restorePurchases();
            
            const { purchases } = await NativePurchases.getPurchases({
                productType: PURCHASE_TYPE.INAPP,
            });
            
            this._processPurchases(purchases || []);
        } catch (error) {
            console.log('[PurchaseManager] サイレント復元スキップ:', error.message);
        }
    },
    
    /**
     * 広告削除購入時のコールバック
     */
    onRemoveAdsPurchased() {
        try {
            // グローバルイベントを発火
            window.dispatchEvent(new CustomEvent('adsRemoved'));
            // LocalStorageにも保存（AdManager用）
            localStorage.setItem('inusanpo_ads_removed', 'true');
        } catch (error) {
            console.error('[PurchaseManager] 広告削除通知エラー:', error);
        }
    },
    
    /**
     * いろどりパック購入時のコールバック
     */
    onCustomizePurchased() {
        try {
            // グローバルイベントを発火（ゲーム側で全カスタマイズを解放）
            window.dispatchEvent(new CustomEvent('customizeUnlocked'));
        } catch (error) {
            console.error('[PurchaseManager] カスタマイズ解放通知エラー:', error);
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
     * いろどりパックを持っているか確認
     * @returns {boolean}
     */
    hasCustomize() {
        return this.purchaseState.customize;
    },
    
    /**
     * プレミアムセットを持っているか確認
     * @returns {boolean}
     */
    hasDeluxe() {
        return this.purchaseState.deluxe;
    },
    
    /**
     * プレミアム犬種パックを持っているか確認（いろどりパックまたはプレミアムセット）
     * @returns {boolean}
     */
    hasPremiumDogs() {
        return this.purchaseState.customize || this.purchaseState.deluxe;
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
                id: this.PRODUCT_IDS.DELUXE,
                name: 'プレミアムセット',
                description: '広告けし＋いろどりパック まとめておとく！',
                price: this.getFormattedPrice(this.PRODUCT_IDS.DELUXE),
                purchased: this.purchaseState.deluxe,
                icon: 'pack_premium',
                isHero: true,
            },
            {
                id: this.PRODUCT_IDS.CUSTOMIZE,
                name: 'いろどりパック',
                description: '肉球カラーやきせかえ、テーマをぜんぶ解放！',
                price: this.getFormattedPrice(this.PRODUCT_IDS.CUSTOMIZE),
                purchased: this.purchaseState.customize,
                icon: 'pack_customize',
            },
            {
                id: this.PRODUCT_IDS.REMOVE_ADS,
                name: 'こうこくけし',
                description: 'すべての広告を削除します',
                price: this.getFormattedPrice(this.PRODUCT_IDS.REMOVE_ADS),
                purchased: this.purchaseState.removeAds,
                icon: 'pack_noads',
            },
            {
                id: this.PRODUCT_IDS.SINGLE_DOG,
                name: 'ワンコを迎える',
                description: 'すきなワンコを１匹えらべる！',
                price: this.getFormattedPrice(this.PRODUCT_IDS.SINGLE_DOG),
                purchased: false, // 消費型なので常にfalse
                icon: 'pack_dog',
                isConsumable: true,
            },
        ];
    },
};

export default PurchaseManager;
