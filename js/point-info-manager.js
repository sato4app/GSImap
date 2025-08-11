// ポイント情報管理クラス - クリックされたポイントの詳細情報を管理
export class PointInfoManager {
    constructor(map) {
        this.map = map;
        this.container = document.getElementById('pointInfoContainer');
        this.currentPoint = null;
        this.setupEventHandlers();
        this.setupMapClickHandler();
    }

    // 10進数緯度経度をDMS形式に変換
    decimalToDMS(decimal, isLongitude = false) {
        const absolute = Math.abs(decimal);
        const degrees = Math.floor(absolute);
        const minutes = Math.floor((absolute - degrees) * 60);
        const seconds = ((absolute - degrees) * 60 - minutes) * 60;
        
        const direction = decimal >= 0 
            ? (isLongitude ? 'E' : 'N')
            : (isLongitude ? 'W' : 'S');
        
        return `${degrees}°${minutes.toString().padStart(2, '0')}'${seconds.toFixed(2).padStart(5, '0')}"${direction}`;
    }

    // DMS形式を10進数に変換
    dmsToDecimal(dmsString) {
        const match = dmsString.match(/(\d+)°(\d+)'([\d.]+)"([NSEW])/);
        if (!match) return null;
        
        const [, degrees, minutes, seconds, direction] = match;
        let decimal = parseInt(degrees) + parseInt(minutes) / 60 + parseFloat(seconds) / 3600;
        
        if (direction === 'S' || direction === 'W') {
            decimal = -decimal;
        }
        
        return decimal;
    }

    // 地理院標高APIから標高を取得（仮実装）
    async fetchGSIElevation(lat, lng) {
        // 実際の実装では地理院の標高APIを呼び出す
        // 現在は仮の値を返す
        return Math.round(Math.random() * 1000 + 100);
    }

    // ポイント情報フィールドを表示
    showPointInfo(pointData = {}) {
        this.container.style.display = 'block';
        this.currentPoint = pointData;

        // フィールドに値を設定
        document.getElementById('pointIdField').value = pointData.id || '未登録ポイント';
        
        const latDecimal = pointData.lat || '';
        const lngDecimal = pointData.lng || '';
        
        document.getElementById('latDecimalField').value = latDecimal;
        document.getElementById('lngDecimalField').value = lngDecimal;
        
        // DMS形式に変換して表示
        if (latDecimal && lngDecimal) {
            document.getElementById('latDmsField').value = this.decimalToDMS(parseFloat(latDecimal), false);
            document.getElementById('lngDmsField').value = this.decimalToDMS(parseFloat(lngDecimal), true);
            
            // 地理院標高を取得
            this.fetchGSIElevation(latDecimal, lngDecimal).then(elevation => {
                document.getElementById('gsiElevationField').textContent = elevation + 'm';
            }).catch(() => {
                document.getElementById('gsiElevationField').textContent = '取得失敗';
            });
        } else {
            document.getElementById('latDmsField').value = '';
            document.getElementById('lngDmsField').value = '';
            document.getElementById('gsiElevationField').textContent = '---';
        }
        
        document.getElementById('elevationField').value = pointData.elevation || '';
        document.getElementById('locationField').value = pointData.location || '';
    }

    // ポイント情報フィールドを隠す
    hidePointInfo() {
        this.container.style.display = 'none';
        this.currentPoint = null;
    }

    // 座標クリック時の処理
    onMapClick(lat, lng, pointData = null) {
        if (pointData) {
            // 登録済みポイントがクリックされた場合
            this.showPointInfo({
                id: pointData.id || pointData.name || 'GPS-' + Date.now(),
                lat: lat,
                lng: lng,
                elevation: pointData.elevation || '',
                location: pointData.location || pointData.name || ''
            });
        } else {
            // 未登録地点がクリックされた場合
            this.showPointInfo({
                id: '',
                lat: lat,
                lng: lng,
                elevation: '',
                location: ''
            });
        }
    }

    // イベントハンドラーの設定
    setupEventHandlers() {
        // 緯度の10進数フィールドが変更された時のDMS自動更新
        const latDecimalField = document.getElementById('latDecimalField');
        latDecimalField.addEventListener('input', (e) => {
            const decimal = parseFloat(e.target.value);
            if (!isNaN(decimal)) {
                document.getElementById('latDmsField').value = this.decimalToDMS(decimal, false);
                if (this.currentPoint) {
                    this.currentPoint.lat = decimal;
                }
            } else {
                document.getElementById('latDmsField').value = '';
            }
        });

        // 経度の10進数フィールドが変更された時のDMS自動更新
        const lngDecimalField = document.getElementById('lngDecimalField');
        lngDecimalField.addEventListener('input', (e) => {
            const decimal = parseFloat(e.target.value);
            if (!isNaN(decimal)) {
                document.getElementById('lngDmsField').value = this.decimalToDMS(decimal, true);
                if (this.currentPoint) {
                    this.currentPoint.lng = decimal;
                }
            } else {
                document.getElementById('lngDmsField').value = '';
            }
        });

        // 場所フィールドが変更された時の更新
        const locationField = document.getElementById('locationField');
        locationField.addEventListener('input', (e) => {
            if (this.currentPoint) {
                this.currentPoint.location = e.target.value;
            }
        });
    }

    // 地図クリックハンドラーの設定
    setupMapClickHandler() {
        this.map.on('click', (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            // クリック位置にポイントがあるかチェック
            // 現在はシンプルに未登録として処理
            this.onMapClick(lat, lng, null);
        });
    }

    // 現在のポイント情報を取得
    getCurrentPointInfo() {
        if (!this.currentPoint) return null;
        
        return {
            id: document.getElementById('pointIdField').value,
            lat: parseFloat(document.getElementById('latDecimalField').value),
            lng: parseFloat(document.getElementById('lngDecimalField').value),
            elevation: document.getElementById('elevationField').value,
            location: document.getElementById('locationField').value
        };
    }
}