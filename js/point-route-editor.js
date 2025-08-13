// ポイント・ルート編集機能を管理するモジュール
export class PointRouteEditor {
    constructor(map, imageOverlay = null) {
        this.map = map;
        this.imageOverlay = imageOverlay;
        this.pointData = [];
        this.routeData = [];
        this.pointMarkers = [];
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
            // ファイル形式チェック
            if (!file.name.toLowerCase().endsWith('.json')) {
                reject(new Error('JSON形式のファイルのみ受け付けます'));
                return;
            }

            // 画像が読み込まれているかチェック
            if (!this.imageOverlay || !this.imageOverlay.getCurrentImageInfo().isLoaded) {
                reject(new Error('ポイントJSONを読み込む前に画像を読み込んでください'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const pointData = JSON.parse(e.target.result);
                    
                    // imageReferenceの一致チェック
                    if (pointData.imageReference) {
                        const currentImageInfo = this.imageOverlay.getCurrentImageInfo();
                        if (pointData.imageReference !== currentImageInfo.fileName) {
                            this.showWarningMessage(
                                '画像参照の不一致',
                                `JSONファイル内の画像参照: "${pointData.imageReference}"\n現在読み込まれている画像: "${currentImageInfo.fileName}"\n\n画像が一致しない可能性があります。`
                            );
                        }
                    }
                    
                    this.addPointsToMap(pointData);
                    resolve(pointData);
                } catch (error) {
                    reject(new Error('JSONファイルの解析に失敗しました: ' + error.message));
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
        // 既存のポイントマーカーを削除
        this.clearPointMarkers();
        
        // ポイントデータの処理と地図への追加
        if (pointData.points && Array.isArray(pointData.points)) {
            pointData.points.forEach((point) => {
                if (point.x !== undefined && point.y !== undefined) {
                    // 画像左上からの位置を地図座標に変換
                    const imageCoords = this.convertImageCoordsToMapCoords(point.x, point.y);
                    
                    if (imageCoords) {
                        // 赤丸マーカーを作成（位置を赤丸の中心とする）
                        const marker = L.circleMarker(imageCoords, {
                            radius: 6,
                            fillColor: '#ff0000',
                            color: '#ffffff',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.8
                        }).addTo(this.map);
                        
                        if (point.id) {
                            marker.bindPopup(`ポイント: ${point.id}`);
                        }
                        
                        this.pointMarkers.push(marker);
                    }
                }
            });
            
            console.log(`${pointData.points.length} 個のポイントを読み込みました`);
        }
    }

    // 画像座標から地図座標への変換
    convertImageCoordsToMapCoords(imageX, imageY) {
        if (!this.imageOverlay || !this.imageOverlay.imageOverlay) {
            return null;
        }

        const bounds = this.imageOverlay.imageOverlay.getBounds();
        const imageBounds = this.imageOverlay.imageOverlay._image;
        
        if (!imageBounds) return null;

        // 画像の実際のサイズ
        const imageWidth = this.imageOverlay.currentImage.naturalWidth;
        const imageHeight = this.imageOverlay.currentImage.naturalHeight;

        // 画像座標を正規化（0-1の範囲）
        const normalizedX = imageX / imageWidth;
        const normalizedY = imageY / imageHeight;

        // 地図座標に変換
        const lat = bounds.getNorth() - (bounds.getNorth() - bounds.getSouth()) * normalizedY;
        const lng = bounds.getWest() + (bounds.getEast() - bounds.getWest()) * normalizedX;

        return [lat, lng];
    }

    // ポイントマーカーをクリア
    clearPointMarkers() {
        this.pointMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.pointMarkers = [];
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
        this.showMessage(title, message, '#dc3545');
    }

    showWarningMessage(title, message) {
        this.showMessage(title, message, '#ffc107');
    }

    showMessage(title, message, backgroundColor) {
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border: 2px solid ${backgroundColor};
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            border-radius: 8px;
            font-family: sans-serif;
            text-align: center;
            max-width: 400px;
        `;
        messageBox.innerHTML = `
            <h3 style="color: ${backgroundColor}; margin-top: 0;">${title}</h3>
            <p style="white-space: pre-line; color: #333;">${message}</p>
            <button onclick="this.parentNode.remove()" style="
                padding: 8px 16px;
                margin-top: 10px;
                border: none;
                background-color: ${backgroundColor};
                color: white;
                border-radius: 4px;
                cursor: pointer;
            ">OK</button>
        `;
        document.body.appendChild(messageBox);
    }
}