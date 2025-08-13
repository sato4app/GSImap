// ポイントオーバーレイ機能を管理するモジュール
export class PointOverlay {
    constructor(map, imageOverlay = null, gpsData = null) {
        this.map = map;
        this.imageOverlay = imageOverlay;
        this.gpsData = gpsData;
        this.pointData = [];
        this.pointMarkers = [];
        this.originalPointData = []; // 元の画像座標を保持
        this.setupEventHandlers();
        
        // 画像更新時のコールバックを登録
        if (this.imageOverlay) {
            this.imageOverlay.addImageUpdateCallback(() => {
                this.updatePointPositions();
            });
        }
    }

    setupEventHandlers() {
        const loadPointJsonBtn = document.getElementById('loadPointJsonBtn');
        const pointJsonInput = document.getElementById('pointJsonInput');
        const matchPointsBtn = document.getElementById('matchPointsBtn');
        const overlayImageBtn = document.getElementById('overlayImageBtn');

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

        if (matchPointsBtn) {
            matchPointsBtn.addEventListener('click', () => {
                this.matchPointsWithGPS();
            });
        }

        if (overlayImageBtn) {
            overlayImageBtn.addEventListener('click', () => {
                this.autoAdjustImageToGPS();
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

    addPointsToMap(pointData) {
        // 既存のポイントマーカーを削除
        this.clearPointMarkers();
        
        // 元の画像座標データを保存
        this.originalPointData = [];
        
        // ポイントデータの処理と地図への追加
        if (pointData.points && Array.isArray(pointData.points)) {
            pointData.points.forEach((point) => {
                if (point.x !== undefined && point.y !== undefined) {
                    // 元の画像座標を保存
                    this.originalPointData.push({
                        x: point.x,
                        y: point.y,
                        id: point.id
                    });
                    
                    // 画像左上からの位置を地図座標に変換
                    const imageCoords = this.convertImageCoordsToMapCoords(point.x, point.y);
                    
                    if (imageCoords) {
                        // オレンジ丸マーカーを作成（位置を丸の中心とする）
                        const marker = L.circleMarker(imageCoords, {
                            radius: 6,
                            fillColor: '#ff8c00',
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
            
            // ポイント数を表示フィールドに更新
            this.updatePointCountDisplay(pointData.points.length);
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
        this.originalPointData = [];
        this.updatePointCountDisplay(0);
        this.updateMatchedPointCountDisplay(0);
    }

    // ポイント数表示を更新
    updatePointCountDisplay(count) {
        const pointCountField = document.getElementById('jsonPointCountField');
        if (pointCountField) {
            pointCountField.value = count.toString();
        }
    }

    // 一致ポイント数表示を更新
    updateMatchedPointCountDisplay(count) {
        const matchedPointCountField = document.getElementById('matchedPointCountField');
        if (matchedPointCountField) {
            matchedPointCountField.value = count.toString();
        }
    }

    // 画像の移動・拡大縮小時にポイント位置を更新
    updatePointPositions() {
        if (this.originalPointData.length === 0 || this.pointMarkers.length === 0) {
            return;
        }

        // 元の画像座標から新しい地図座標を計算して、マーカー位置を更新
        this.originalPointData.forEach((originalPoint, index) => {
            if (index < this.pointMarkers.length) {
                const newImageCoords = this.convertImageCoordsToMapCoords(originalPoint.x, originalPoint.y);
                if (newImageCoords) {
                    this.pointMarkers[index].setLatLng(newImageCoords);
                }
            }
        });
    }

    // ポイントマッチング機能
    matchPointsWithGPS() {
        if (!this.gpsData || this.originalPointData.length === 0) {
            this.showErrorMessage('マッチングエラー', 'GPSデータまたはポイントデータが見つかりません');
            return;
        }

        const gpsMarkers = this.gpsData.getGPSMarkers();
        if (gpsMarkers.length === 0) {
            this.showErrorMessage('マッチングエラー', 'GPS マーカーが見つかりませんでした');
            return;
        }

        // ID 名が一致するマーカーペアを検索
        const matchedPairs = [];
        this.originalPointData.forEach((jsonPoint, index) => {
            const matchingGPS = gpsMarkers.find(gps => gps.id === jsonPoint.id);
            if (matchingGPS && index < this.pointMarkers.length) {
                matchedPairs.push({
                    jsonPoint: jsonPoint,
                    gpsPoint: matchingGPS,
                    jsonMarker: this.pointMarkers[index]
                });
            }
        });

        // 一致数を表示
        this.updateMatchedPointCountDisplay(matchedPairs.length);
    }

    // GPS マーカーとポイント JSON マーカーの自動調整
    autoAdjustImageToGPS() {
        if (!this.gpsData || !this.imageOverlay || this.originalPointData.length === 0) {
            this.showErrorMessage('調整エラー', 'GPSデータ、画像、またはポイントデータが見つかりません');
            return;
        }

        const gpsMarkers = this.gpsData.getGPSMarkers();
        if (gpsMarkers.length === 0) {
            this.showErrorMessage('調整エラー', 'GPS マーカーが見つかりませんでした');
            return;
        }

        // ID 名が一致するマーカーペアを検索
        const matchedPairs = [];
        this.originalPointData.forEach((jsonPoint, index) => {
            const matchingGPS = gpsMarkers.find(gps => gps.id === jsonPoint.id);
            if (matchingGPS && index < this.pointMarkers.length) {
                matchedPairs.push({
                    jsonPoint: jsonPoint,
                    gpsPoint: matchingGPS,
                    jsonMarker: this.pointMarkers[index]
                });
            }
        });

        if (matchedPairs.length < 2) {
            this.showErrorMessage('調整エラー', '自動調整には少なくとも2つの一致するマーカーが必要です');
            return;
        }

        // 最適な画像調整を計算
        this.calculateImageAdjustment(matchedPairs);
    }

    // 画像調整パラメータを計算
    calculateImageAdjustment(matchedPairs) {
        // 2つ以上のペアから最適な位置とスケールを計算
        const pair1 = matchedPairs[0];
        const pair2 = matchedPairs[1];

        // データの妥当性をチェック
        if (!pair1.gpsPoint || !pair2.gpsPoint || !pair1.jsonPoint || !pair2.jsonPoint) {
            this.showErrorMessage('調整エラー', 'マーカーペアのデータが不完全です');
            return;
        }

        // GPS座標の妥当性をチェック
        if (typeof pair1.gpsPoint.lat !== 'number' || typeof pair1.gpsPoint.lng !== 'number' ||
            typeof pair2.gpsPoint.lat !== 'number' || typeof pair2.gpsPoint.lng !== 'number') {
            this.showErrorMessage('調整エラー', 'GPS座標データが無効です');
            return;
        }

        // 画像座標の妥当性をチェック
        if (typeof pair1.jsonPoint.x !== 'number' || typeof pair1.jsonPoint.y !== 'number' ||
            typeof pair2.jsonPoint.x !== 'number' || typeof pair2.jsonPoint.y !== 'number') {
            this.showErrorMessage('調整エラー', '画像座標データが無効です');
            return;
        }

        // GPS座標間の距離を計算
        const gpsDistance = this.calculateDistance(
            pair1.gpsPoint.lat, pair1.gpsPoint.lng,
            pair2.gpsPoint.lat, pair2.gpsPoint.lng
        );

        // 画像座標間の距離を計算（ピクセル単位）
        const imageDistance = Math.sqrt(
            Math.pow(pair2.jsonPoint.x - pair1.jsonPoint.x, 2) + 
            Math.pow(pair2.jsonPoint.y - pair1.jsonPoint.y, 2)
        );

        if (imageDistance === 0) {
            this.showErrorMessage('調整エラー', '画像上のポイント距離が0のため調整できません');
            return;
        }

        // 新しい中心位置を計算（GPS座標の中心）
        const newCenterLat = (pair1.gpsPoint.lat + pair2.gpsPoint.lat) / 2;
        const newCenterLng = (pair1.gpsPoint.lng + pair2.gpsPoint.lng) / 2;

        // 画像上の中心位置
        const imageCenterX = (pair1.jsonPoint.x + pair2.jsonPoint.x) / 2;
        const imageCenterY = (pair1.jsonPoint.y + pair2.jsonPoint.y) / 2;

        // スケール計算のための緯度での距離変換
        const lat = newCenterLat;
        const metersPerPixel = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, this.map.getZoom());
        
        // 必要なスケールを計算
        const requiredScaleRatio = (gpsDistance * 1000) / (imageDistance * metersPerPixel); // GPSはメートル、画像はピクセル
        
        // 現在のスケールを取得
        const scaleInput = document.getElementById('scaleInput');
        const currentScale = scaleInput ? parseFloat(scaleInput.value) : 0.3;
        const newScale = currentScale * requiredScaleRatio;

        // 計算結果の妥当性をチェック
        if (!isFinite(gpsDistance) || !isFinite(imageDistance) || !isFinite(newScale) || 
            !isFinite(newCenterLat) || !isFinite(newCenterLng)) {
            this.showErrorMessage('調整エラー', '計算結果が無効です');
            return;
        }

        // 画像調整を適用
        this.applyImageAdjustment(newCenterLat, newCenterLng, newScale);
    }

    // 2点間の距離を計算（km単位）
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // 地球の半径（km）
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // 画像調整を適用
    applyImageAdjustment(newCenterLat, newCenterLng, newScale) {
        // 引数の妥当性をチェック
        if (!isFinite(newCenterLat) || !isFinite(newCenterLng) || !isFinite(newScale)) {
            this.showErrorMessage('調整エラー', '画像調整のパラメータが無効です');
            return;
        }

        // 新しい中心位置を設定
        this.imageOverlay.setCenterPosition([newCenterLat, newCenterLng]);
        
        // 新しいスケールを設定
        const scaleInput = document.getElementById('scaleInput');
        if (scaleInput && isFinite(newScale)) {
            scaleInput.value = newScale.toFixed(3);
        }
        
        // 画像表示を更新
        if (this.imageOverlay) {
            this.imageOverlay.updateImageDisplay();
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