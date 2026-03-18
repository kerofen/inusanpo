/**
 * AnalyticsManager - Firebase Analytics ラッパー
 * ネイティブ（Capacitor）環境では @capacitor-firebase/analytics を使用
 * Web環境では Firebase JS SDK にフォールバック
 */
import { Capacitor } from '@capacitor/core';

let FirebaseAnalytics = null;
let initialized = false;

async function loadPlugin() {
    if (Capacitor.isNativePlatform()) {
        const mod = await import('@capacitor-firebase/analytics');
        FirebaseAnalytics = mod.FirebaseAnalytics;
    }
}

export class AnalyticsManager {
    static async initialize() {
        try {
            await loadPlugin();
            if (FirebaseAnalytics) {
                await FirebaseAnalytics.setEnabled({ enabled: true });
                initialized = true;
                console.log('[Analytics] Firebase Analytics initialized (native)');
            } else {
                console.log('[Analytics] Skipped - not a native platform');
            }
        } catch (e) {
            console.warn('[Analytics] Initialization failed:', e.message);
        }
    }

    static async logEvent(name, params = {}) {
        if (!initialized || !FirebaseAnalytics) return;
        try {
            await FirebaseAnalytics.logEvent({ name, params });
        } catch (e) {
            console.warn(`[Analytics] logEvent(${name}) failed:`, e.message);
        }
    }

    static async setScreenName(screenName) {
        if (!initialized || !FirebaseAnalytics) return;
        try {
            await FirebaseAnalytics.setCurrentScreen({ screenName });
        } catch (e) {
            console.warn(`[Analytics] setScreenName failed:`, e.message);
        }
    }

    static async setUserProperty(key, value) {
        if (!initialized || !FirebaseAnalytics) return;
        try {
            await FirebaseAnalytics.setUserProperty({ key, value: String(value) });
        } catch (e) {
            console.warn(`[Analytics] setUserProperty failed:`, e.message);
        }
    }

    // ---- ゲーム固有イベント ----

    static logLevelStart(mode, levelIndex) {
        return this.logEvent('level_start', {
            mode,
            level_index: String(levelIndex),
        });
    }

    static logLevelComplete(mode, levelIndex, timeMs) {
        return this.logEvent('level_end', {
            mode,
            level_index: String(levelIndex),
            success: 'true',
            time_ms: String(Math.round(timeMs)),
        });
    }

    static logLevelFail(mode, levelIndex) {
        return this.logEvent('level_end', {
            mode,
            level_index: String(levelIndex),
            success: 'false',
        });
    }

    static logChallengeScore(score) {
        return this.logEvent('post_score', {
            score: String(score),
        });
    }

    static logPurchase(productId, success) {
        return this.logEvent('purchase_attempt', {
            product_id: productId,
            success: String(success),
        });
    }

    static logAdWatched(adType) {
        return this.logEvent('ad_impression', {
            ad_type: adType,
        });
    }

    static logDogUnlock(dogId) {
        return this.logEvent('unlock_achievement', {
            achievement_id: dogId,
            type: 'dog',
        });
    }

    static logCustomize(itemType, itemId) {
        return this.logEvent('select_content', {
            content_type: itemType,
            item_id: itemId,
        });
    }

    static logTutorialBegin() {
        return this.logEvent('tutorial_begin');
    }

    static logTutorialComplete() {
        return this.logEvent('tutorial_complete');
    }

    static logAppOpen() {
        return this.logEvent('app_open');
    }
}
