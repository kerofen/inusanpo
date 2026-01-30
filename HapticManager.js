/**
 * HapticManager.js
 * 桜井イズム：触覚フィードバックの管理
 * "手触り"をコードで制御する
 */
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export class HapticManager {
    static isEnabled = true;
    static hasUserGesture = false;
    static gestureListenersBound = false;
    static gestureEvents = ['pointerdown', 'touchstart', 'mousedown', 'keydown'];

    // 初期化（必要なら設定読み込みなど）
    static init() {
        // 設定から有効無効を読み込む場合はここに記述
        // ユーザージェスチャーリスナーを早期にセットアップ
        this.ensureUserGestureListener();
        console.log('📳 HapticManager Initialized');
    }

    /**
     * インパクトフィードバック（衝突、決定など）
     * @param {string} style 'Light' | 'Medium' | 'Heavy'
     */
    static async impact(style = 'Medium') {
        if (!this.isEnabled) return;
        if (!this.isInteractionReady()) return;

        try {
            let impactStyle;
            switch (style) {
                case 'Light': impactStyle = ImpactStyle.Light; break;
                case 'Medium': impactStyle = ImpactStyle.Medium; break;
                case 'Heavy': impactStyle = ImpactStyle.Heavy; break;
                default: impactStyle = ImpactStyle.Medium;
            }
            await Haptics.impact({ style: impactStyle });
        } catch (e) {
            // Web実行時などでエラーが出ないように抑制
            console.debug('Haptics not available:', e);
        }
    }

    /**
     * 通知フィードバック（成功、警告、エラー）
     * @param {string} type 'Success' | 'Warning' | 'Error'
     */
    static async notification(type = 'Success') {
        if (!this.isEnabled) return;
        if (!this.isInteractionReady()) return;

        try {
            await Haptics.notification({ type: type });
        } catch (e) {
            console.debug('Haptics notification not available:', e);
        }
    }

    /**
     * 選択フィードバック（ピッカー、軽い選択など）
     */
    static async selection() {
        if (!this.isEnabled) return;
        if (!this.isInteractionReady()) return;

        try {
            await Haptics.selectionChanged();
        } catch (e) {
            console.debug('Haptics selection not available:', e);
        }
    }

    /**
     * 汎用振動（持続時間指定）
     * @param {number} duration ms
     */
    static async vibrate(duration = 200) {
        if (!this.isEnabled) return;
        if (!this.isInteractionReady()) return;

        try {
            await Haptics.vibrate({ duration });
        } catch (e) {
            console.debug('Haptics vibrate not available:', e);
        }
    }

    /**
     * Web上でのユーザー操作を検出し、ブラウザの制限を回避する
     */
    static ensureUserGestureListener() {
        if (this.gestureListenersBound || typeof window === 'undefined') return;
        this.gestureListenersBound = true;

        const markInteraction = () => {
            this.hasUserGesture = true;
            this.gestureEvents.forEach(evt => {
                window.removeEventListener(evt, markInteraction, true);
            });
        };

        this.gestureEvents.forEach(evt => {
            window.addEventListener(evt, markInteraction, { capture: true, once: true });
        });
    }

    static isInteractionReady() {
        if (typeof window === 'undefined') return true;
        if (this.hasUserGesture) return true;
        this.ensureUserGestureListener();
        return false;
    }
}
