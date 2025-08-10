// ポイント・ルート編集機能を管理するモジュール
export class PointRouteEditor {
    constructor(map) {
        this.map = map;
        this.pointData = [];
        this.routeData = [];
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        const loadPointJsonBtn = document.getElementById('loadPointJsonBtn');
        const pointJsonInput = document.getElementById('pointJsonInput');
        const loadRouteJsonBtn = document.getElementById('loadRouteJsonBtn');
        const routeJsonInput = document.getElementById('routeJsonInput');

        if (loadPointJsonBtn && pointJsonInput) {
            loadPointJsonBtn.addEventListener('click', () => {
                pointJsonInput.click();
            });

            pointJsonInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.loadPointJSON(file).catch(error => {
                        this.showErrorMessage('ポイントJSONファイルの読み込みに失敗しました', error.message);
                    });
                }
            });
        }

        if (loadRouteJsonBtn && routeJsonInput) {
            loadRouteJsonBtn.addEventListener('click', () => {
                routeJsonInput.click();
            });

            routeJsonInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.loadRouteJSON(file).catch(error => {
                        this.showErrorMessage('ルートJSONファイルの読み込みに失敗しました', error.message);
                    });
                }
            });
        }
    }

    loadPointJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const pointData = JSON.parse(e.target.result);
                    this.addPointsToMap(pointData);
                    resolve(pointData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsText(file);
        });
    }

    loadRouteJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const routeData = JSON.parse(e.target.result);
                    this.addRouteToMap(routeData);
                    resolve(routeData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsText(file);
        });
    }

    addPointsToMap(pointData) {
        // ポイントデータの処理と地図への追加
        if (pointData.points && Array.isArray(pointData.points)) {
            pointData.points.forEach((point) => {
                if (point.x && point.y && pointData.imageInfo) {
                    // 座標変換が必要な場合はここで処理
                    const marker = L.circleMarker([point.y, point.x], {
                        radius: 4,
                        fillColor: '#ff0000',
                        color: '#ffffff',
                        weight: 1.5,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).addTo(this.map);
                    
                    if (point.id) {
                        marker.bindPopup(`ポイント: ${point.id}`);
                    }
                }
            });
            
            console.log(`${pointData.points.length} 個のポイントを読み込みました`);
        }
    }

    addRouteToMap(routeData) {
        // ルートデータの処理と地図への追加
        if (routeData.points && Array.isArray(routeData.points)) {
            const waypoints = [];
            
            routeData.points.forEach((point) => {
                if (point.x && point.y) {
                    const marker = L.circleMarker([point.y, point.x], {
                        radius: 3,
                        fillColor: '#0000ff',
                        color: '#ffffff',
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).addTo(this.map);
                    
                    waypoints.push([point.y, point.x]);
                }
            });
            
            // ルートライン描画
            if (waypoints.length > 1) {
                L.polyline(waypoints, {
                    color: '#0000ff',
                    weight: 3,
                    opacity: 0.7
                }).addTo(this.map);
            }
            
            console.log(`${routeData.points.length} 個の中間点を読み込みました`);
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