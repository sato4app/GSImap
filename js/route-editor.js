// ルート編集機能を管理するモジュール
export class RouteEditor {
    constructor(map) {
        this.map = map;
        this.routeData = [];
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        const loadRouteJsonBtn = document.getElementById('loadRouteJsonBtn');
        const routeJsonInput = document.getElementById('routeJsonInput');

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
            border: 2px solid #dc3545;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            border-radius: 8px;
            font-family: sans-serif;
            text-align: center;
            max-width: 400px;
        `;
        messageBox.innerHTML = `
            <h3 style="color: #dc3545; margin-top: 0;">${title}</h3>
            <p style="white-space: pre-line; color: #333;">${message}</p>
            <button onclick="this.parentNode.remove()" style="
                padding: 8px 16px;
                margin-top: 10px;
                border: none;
                background-color: #dc3545;
                color: white;
                border-radius: 4px;
                cursor: pointer;
            ">OK</button>
        `;
        document.body.appendChild(messageBox);
    }
}