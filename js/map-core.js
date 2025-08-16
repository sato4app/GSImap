// 地図コア機能を管理するモジュール
export class MapCore {
    constructor() {
        this.initialCenter = [34.853667, 135.472041];
        this.map = null;
        this.init();
    }

    init() {
        // 地図の初期化
        this.map = L.map('map').setView(this.initialCenter, 15);

        // スケールバーを右下に追加
        L.control.scale({ position: 'bottomright', imperial: false, maxWidth: 150 }).addTo(this.map);

        // 国土地理院タイルレイヤー
        L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
            attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>",
            minZoom: 2, maxZoom: 18
        }).addTo(this.map);

        // ドラッグハンドル用の専用ペインを作成
        this.map.createPane('dragHandles');
        this.map.getPane('dragHandles').style.zIndex = 650;

        // 中心マーカー用の専用ペインを作成
        this.map.createPane('centerMarker');
        this.map.getPane('centerMarker').style.zIndex = 700;

        // wayPointマーカー用の専用ペインを作成
        this.map.createPane('waypointMarkers');
        this.map.getPane('waypointMarkers').style.zIndex = 750;
    }

    getMap() {
        return this.map;
    }

    getInitialCenter() {
        return this.initialCenter;
    }
}