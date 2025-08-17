// 編集モード切り替え機能を管理するモジュール
export class ModeSwitcher {
    constructor() {
        this.currentMode = 'point-gps';
        // DOMContentLoadedの後で初期化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.init();
            });
        } else {
            this.init();
        }
    }
    
    init() {
        this.setupEventHandlers();
        this.showCurrentModePanel();
    }

    setupEventHandlers() {
        const modeRadios = document.querySelectorAll('input[name="editingMode"]');
        console.log('ModeSwitcher: ラジオボタンを見つけました:', modeRadios.length);
        
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                console.log('ModeSwitcher: モード変更イベント:', e.target.value);
                if (e.target.checked) {
                    this.switchMode(e.target.value);
                }
            });
        });
    }

    switchMode(newMode) {
        console.log('ModeSwitcher: モード切り替え:', this.currentMode, '->', newMode);
        if (this.currentMode === newMode) return;
        
        this.currentMode = newMode;
        this.showCurrentModePanel();
        
    }

    showCurrentModePanel() {
        console.log('ModeSwitcher: パネル表示切り替え:', this.currentMode);
        const pointGpsEditor = document.getElementById('pointGpsEditor');
        const imageOverlayEditor = document.getElementById('imageOverlayEditor');
        const routeEditor = document.getElementById('routeEditor');
        
        console.log('ModeSwitcher: パネル要素:', {
            pointGpsEditor: !!pointGpsEditor,
            imageOverlayEditor: !!imageOverlayEditor,
            routeEditor: !!routeEditor
        });
        
        // すべてのパネルを非表示にする
        if (pointGpsEditor) pointGpsEditor.style.display = 'none';
        if (imageOverlayEditor) imageOverlayEditor.style.display = 'none';
        if (routeEditor) routeEditor.style.display = 'none';
        
        // 選択されたモードのパネルを表示する
        if (this.currentMode === 'point-gps') {
            if (pointGpsEditor) pointGpsEditor.style.display = 'block';
            console.log('ModeSwitcher: point-gpsパネルを表示');
        } else if (this.currentMode === 'image-overlay') {
            if (imageOverlayEditor) imageOverlayEditor.style.display = 'block';
            console.log('ModeSwitcher: image-overlayパネルを表示');
        } else if (this.currentMode === 'route') {
            if (routeEditor) routeEditor.style.display = 'block';
            console.log('ModeSwitcher: routeパネルを表示');
        }
    }

    getCurrentMode() {
        return this.currentMode;
    }
}