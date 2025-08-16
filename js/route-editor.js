// ルート編集機能を管理するモジュール
export class RouteEditor {
    constructor(map, imageOverlay, gpsData) {
        this.map = map;
        this.imageOverlay = imageOverlay;
        this.gpsData = gpsData;
        this.routeData = [];
        this.loadedRoutes = [];
        this.waypointMarkers = [];
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        const loadRouteJsonBtn = document.getElementById('loadRouteJsonBtn');
        const routeJsonInput = document.getElementById('routeJsonInput');
        const routeSelect = document.getElementById('routeSelect');

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
        
        if (routeSelect) {
            routeSelect.addEventListener('change', () => {
                this.onRouteSelectionChange();
            });
        }
    }

    loadRouteJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const routeData = JSON.parse(e.target.result);
                    
                    
                    // JSONファイル内容の検証
                    const validationResult = this.validateRouteJSON(routeData);
                    if (!validationResult.isValid) {
                        this.showWarningMessage('ルートJSONファイル検証警告', validationResult.warnings.join('\n'));
                    }
                    
                    this.addRouteToMap(routeData);
                    
                    // ルートデータを保存
                    this.loadedRoutes.push(routeData);
                    this.updateRouteSelector();
                    
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
        // 既存のwaypointマーカーをクリア
        this.waypointMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.waypointMarkers = [];
        
        // waypointを画像上の位置でマーカー追加
        const wayPoint = routeData.wayPoint || routeData.wayPoints || routeData.points;
        
        if (wayPoint && Array.isArray(wayPoint)) {
            wayPoint.forEach((point, index) => {
                
                // imageX, imageYプロパティを読み込み
                const imageX = point.imageX;
                const imageY = point.imageY;
                
                
                if (imageX !== undefined && imageY !== undefined) {
                    
                    // 画像座標から地図座標への変換
                    const mapPosition = this.convertImageToMapCoordinates(imageX, imageY);
                    
                    if (mapPosition) {
                        // オレンジ菱形マーカーを作成
                        const diamondIcon = L.divIcon({
                            className: 'waypoint-marker-icon',
                            html: '<div style="width: 8px; height: 8px; background-color: #ff8c00; border: 1.5px solid #ffffff; transform: rotate(45deg);"></div>',
                            iconSize: [12, 12],
                            iconAnchor: [6, 6]
                        });
                        
                        const marker = L.marker(mapPosition, {
                            icon: diamondIcon,
                            draggable: false,
                            zIndexOffset: 1000,
                            pane: 'waypointMarkers'
                        }).addTo(this.map);
                        
                        this.waypointMarkers.push(marker);
                    } else {
                    }
                } else {
                }
            });
        } else {
        }
    }

    // 画像座標から地図座標への変換
    convertImageToMapCoordinates(imageX, imageY) {
        
        if (!this.imageOverlay || !this.imageOverlay.imageOverlay) {
            return null;
        }
        
        const overlay = this.imageOverlay.imageOverlay;
        const bounds = overlay.getBounds();
        const imageElement = overlay.getElement();
        
        
        if (!imageElement) {
            return null;
        }
        
        // 画像の元のサイズを取得
        const imageNaturalWidth = imageElement.naturalWidth;
        const imageNaturalHeight = imageElement.naturalHeight;
        
        
        if (imageNaturalWidth === 0 || imageNaturalHeight === 0) {
            return null;
        }
        
        // 画像内の相対位置を計算（元画像サイズベース）
        const relativeX = imageX / imageNaturalWidth;
        const relativeY = imageY / imageNaturalHeight;
        
        
        // 地図座標に変換
        const lat = bounds.getNorth() - (bounds.getNorth() - bounds.getSouth()) * relativeY;
        const lng = bounds.getWest() + (bounds.getEast() - bounds.getWest()) * relativeX;
        
        const result = [lat, lng];
        
        return result;
    }
    
    // JSONファイル内容の検証
    validateRouteJSON(routeData) {
        const warnings = [];
        let isValid = true;
        
        // 実際のプロパティ名を動的に取得（routeInfo内も確認）
        const startPoint = routeData.startPoint || routeData.start || routeData.startPointId || (routeData.routeInfo && routeData.routeInfo.startPoint);
        const endPoint = routeData.endPoint || routeData.end || routeData.endPointId || (routeData.routeInfo && routeData.routeInfo.endPoint);
        const wayPoint = routeData.wayPoint || routeData.wayPoints || routeData.points;
        const wayPointCount = routeData.wayPointCount || routeData.waypointCount || (routeData.routeInfo && routeData.routeInfo.waypointCount);
        
        // imageReferenceの値が読み込んでいるpng画像のファイル名と一致するかチェック
        if (routeData.imageReference && this.imageOverlay && this.imageOverlay.currentImageFileName) {
            if (routeData.imageReference !== this.imageOverlay.currentImageFileName) {
                warnings.push(`imageReference "${routeData.imageReference}" が読み込んでいる画像ファイル名 "${this.imageOverlay.currentImageFileName}" と一致しません。`);
                isValid = false;
            }
        }
        
        // wayPointCountの値がwayPointの件数と一致するかチェック
        if (wayPointCount !== undefined && wayPoint && Array.isArray(wayPoint)) {
            if (wayPointCount !== wayPoint.length) {
                warnings.push(`wayPointCount "${wayPointCount}" がwayPointの実際の件数 "${wayPoint.length}" と一致しません。`);
                isValid = false;
            }
        }
        
        // startPointとendPointがGPSポイントに一致するかチェック
        if (this.gpsData && this.gpsData.gpsPoints) {
            const gpsPointIds = this.gpsData.gpsPoints.map(point => point.id);
            
            if (startPoint && !gpsPointIds.includes(startPoint)) {
                warnings.push(`startPoint "${startPoint}" がGPSポイントに見つかりません。`);
                isValid = false;
            }
            
            if (endPoint && !gpsPointIds.includes(endPoint)) {
                warnings.push(`endPoint "${endPoint}" がGPSポイントに見つかりません。`);
                isValid = false;
            }
        }
        
        return { isValid, warnings };
    }
    
    // ルート選択用ドロップダウンリストの更新
    updateRouteSelector() {
        const routeSelect = document.getElementById('routeSelect');
        if (!routeSelect) return;
        
        // 最後に読み込んだルートを選択
        const lastRoute = this.loadedRoutes[this.loadedRoutes.length - 1];
        if (lastRoute) {
            const startPoint = lastRoute.startPoint || lastRoute.start || lastRoute.startPointId || (lastRoute.routeInfo && lastRoute.routeInfo.startPoint);
            const endPoint = lastRoute.endPoint || lastRoute.end || lastRoute.endPointId || (lastRoute.routeInfo && lastRoute.routeInfo.endPoint);
            const optionValue = `${startPoint} ～ ${endPoint}`;
            
            // 既存のオプションをチェック
            let optionExists = false;
            for (let option of routeSelect.options) {
                if (option.value === optionValue) {
                    optionExists = true;
                    break;
                }
            }
            
            // 新しいオプションを追加
            if (!optionExists) {
                const option = document.createElement('option');
                option.value = optionValue;
                option.textContent = optionValue;
                routeSelect.appendChild(option);
            }
            
            // 最後に読み込んだルートを選択
            routeSelect.value = optionValue;
            this.updateRouteDetails(lastRoute);
        }
    }
    
    // ルート詳細情報の更新
    updateRouteDetails(routeData) {
        const startPointField = document.getElementById('startPointField');
        const endPointField = document.getElementById('endPointField');
        const waypointCountField = document.getElementById('waypointCountField');
        
        const startPoint = routeData.startPoint || routeData.start || routeData.startPointId || (routeData.routeInfo && routeData.routeInfo.startPoint);
        const endPoint = routeData.endPoint || routeData.end || routeData.endPointId || (routeData.routeInfo && routeData.routeInfo.endPoint);
        const wayPoint = routeData.wayPoint || routeData.wayPoints || routeData.points;
        
        if (startPointField) startPointField.value = startPoint || '';
        if (endPointField) endPointField.value = endPoint || '';
        // 中間点の数はJSON中の実際のポイント数を表示
        if (waypointCountField) waypointCountField.value = wayPoint ? wayPoint.length : 0;
    }
    
    // ルート選択変更時の処理
    onRouteSelectionChange() {
        const routeSelect = document.getElementById('routeSelect');
        if (!routeSelect) return;
        
        const selectedValue = routeSelect.value;
        const selectedRoute = this.loadedRoutes.find(route => {
            const startPoint = route.startPoint || route.start || route.startPointId || (route.routeInfo && route.routeInfo.startPoint);
            const endPoint = route.endPoint || route.end || route.endPointId || (route.routeInfo && route.routeInfo.endPoint);
            return `${startPoint} ～ ${endPoint}` === selectedValue;
        });
        
        if (selectedRoute) {
            this.updateRouteDetails(selectedRoute);
            this.addRouteToMap(selectedRoute);
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
    
    showWarningMessage(title, message) {
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border: 2px solid #ffc107;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 10000;
            border-radius: 8px;
            font-family: sans-serif;
            text-align: center;
            max-width: 400px;
        `;
        messageBox.innerHTML = `
            <h3 style="color: #ffc107; margin-top: 0;">${title}</h3>
            <p style="white-space: pre-line; color: #333;">${message}</p>
            <button onclick="this.parentNode.remove()" style="
                padding: 8px 16px;
                margin-top: 10px;
                border: none;
                background-color: #ffc107;
                color: white;
                border-radius: 4px;
                cursor: pointer;
            ">OK</button>
        `;
        document.body.appendChild(messageBox);
    }
}