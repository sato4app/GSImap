// 編集モード切り替え機能を管理するモジュール
export class ModeSwitcher {
    constructor() {
        this.currentMode = 'image-gps';
        this.setupEventHandlers();
        this.showCurrentModePanel();
    }

    setupEventHandlers() {
        const modeRadios = document.querySelectorAll('input[name="editingMode"]');
        
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.switchMode(e.target.value);
                }
            });
        });
    }

    switchMode(newMode) {
        if (this.currentMode === newMode) return;
        
        this.currentMode = newMode;
        this.showCurrentModePanel();
        
        // モード切り替え時の処理を追加できる
        console.log(`編集モードを ${newMode} に切り替えました`);
    }

    showCurrentModePanel() {
        const imageGpsEditor = document.getElementById('imageGpsEditor');
        const pointRouteEditor = document.getElementById('pointRouteEditor');
        
        if (this.currentMode === 'image-gps') {
            if (imageGpsEditor) imageGpsEditor.style.display = 'block';
            if (pointRouteEditor) pointRouteEditor.style.display = 'none';
        } else if (this.currentMode === 'point-route') {
            if (imageGpsEditor) imageGpsEditor.style.display = 'none';
            if (pointRouteEditor) pointRouteEditor.style.display = 'block';
        }
    }

    getCurrentMode() {
        return this.currentMode;
    }
}