// メインアプリケーションファイル - 全モジュールを統合
import { MapCore } from './map-core.js';
import { ImageOverlay } from './image-overlay.js';
import { GPSData } from './gps-data.js';
import { PointOverlay } from './point-overlay.js';
import { RouteEditor } from './route-editor.js';
import { ModeSwitcher } from './mode-switcher.js';
import { PointInfoManager } from './point-info-manager.js';

class GSIMapApp {
    constructor() {
        this.mapCore = null;
        this.imageOverlay = null;
        this.gpsData = null;
        this.pointOverlay = null;
        this.routeEditor = null;
        this.modeSwitcher = null;
        this.pointInfoManager = null;
    }

    init() {
        // コアモジュール初期化
        this.mapCore = new MapCore();
        
        // PointInfoManagerを先に初期化
        this.pointInfoManager = new PointInfoManager(this.mapCore.getMap());
        
        // 各機能モジュール初期化（PointInfoManager参照を渡す）
        this.imageOverlay = new ImageOverlay(this.mapCore);
        this.gpsData = new GPSData(this.mapCore.getMap(), this.pointInfoManager);
        this.pointOverlay = new PointOverlay(this.mapCore.getMap(), this.imageOverlay, this.gpsData);
        this.routeEditor = new RouteEditor(this.mapCore.getMap(), this.imageOverlay, this.gpsData);
        this.modeSwitcher = new ModeSwitcher();
        
        // イベントハンドラー設定
        this.setupEventHandlers();
        
        console.log('GSIMap アプリケーションが初期化されました');
    }

    setupEventHandlers() {
        // 画像読み込みボタンのイベントハンドラー
        const loadImageBtn = document.getElementById('loadImageBtn');
        const imageInput = document.getElementById('imageInput');
        
        if (loadImageBtn && imageInput) {
            loadImageBtn.addEventListener('click', () => {
                imageInput.click();
            });
            
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type === 'image/png') {
                    this.imageOverlay.loadImage(file).catch(error => {
                        this.showErrorMessage('画像読み込みエラー', error.message);
                    });
                } else if (file) {
                    this.showErrorMessage('ファイル形式エラー', 'PNG形式の画像ファイルを選択してください。');
                }
            });
        }

        // GPS読み込みボタンのイベントハンドラー
        const loadGpsBtn = document.getElementById('loadGpsBtn');
        const gpsCsvInput = document.getElementById('gpsCsvInput');
        
        if (loadGpsBtn && gpsCsvInput) {
            loadGpsBtn.addEventListener('click', () => {
                gpsCsvInput.click();
            });
            
            gpsCsvInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.gpsData.loadGPSData(file).catch(error => {
                        this.showErrorMessage('GPS データ読み込みエラー', error.message);
                    });
                }
            });
        }

    }

    showErrorMessage(title, message) {
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border: 1px solid #ccc;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            border-radius: 8px;
            font-family: sans-serif;
            text-align: center;
        `;
        messageBox.innerHTML = `
            <h3>${title}</h3>
            <p>${message}</p>
            <button onclick="this.parentNode.remove()" style="
                padding: 8px 16px;
                margin-top: 10px;
                border: none;
                background-color: #007bff;
                color: white;
                border-radius: 4px;
                cursor: pointer;
            ">OK</button>
        `;
        document.body.appendChild(messageBox);
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    const app = new GSIMapApp();
    app.init();
});