// 画像オーバーレイ機能を管理するモジュール
export class ImageOverlay {
    constructor(mapCore) {
        this.map = mapCore.getMap();
        this.imageOverlay = null;
        this.currentImage = new Image();
        this.currentImageFileName = null;
        this.centerMarker = null;
        this.dragHandles = [];
        this.isDragging = false;
        this.dragCornerIndex = -1;
        this.resizeTooltip = null;
        this.isMovingImage = false;
        this.moveStartPoint = null;
        this.isCenteringMode = false;
        this.imageUpdateCallbacks = [];
        
        this.initializeCenterMarker(mapCore.getInitialCenter());
        this.setupEventHandlers();
    }

    initializeCenterMarker(position) {
        const centerIcon = L.divIcon({
            className: 'center-marker-icon',
            html: '<div style="width: 12px; height: 12px; background-color: #ff0000; border: 2px solid #ffffff; border-radius: 50%;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
        
        this.centerMarker = this.createCenterMarker(position, centerIcon);
    }

    createCenterMarker(position, icon) {
        const marker = L.marker(position, { 
            icon: icon,
            draggable: false,
            pane: 'centerMarker'
        }).addTo(this.map);
        
        marker.bindTooltip('ドラッグして画像移動', {
            permanent: false,
            direction: 'top',
            offset: [0, -10],
            className: 'center-marker-tooltip'
        });
        
        marker.on('mouseover', () => {
            if (!this.isMovingImage) {
                this.map.getContainer().style.cursor = 'move';
            }
        });
        
        marker.on('mouseout', () => {
            if (!this.isMovingImage) {
                this.map.getContainer().style.cursor = '';
                document.body.style.cursor = '';
            }
        });
        
        marker.on('mousedown', (e) => {
            if (!this.imageOverlay) return;
            
            this.isMovingImage = true;
            this.moveStartPoint = e.latlng;
            this.map.dragging.disable();
            this.map.getContainer().style.cursor = 'grabbing';
            
            const moveHandler = (moveEvent) => {
                if (!this.isMovingImage) return;
                
                const deltaLat = moveEvent.latlng.lat - this.moveStartPoint.lat;
                const deltaLng = moveEvent.latlng.lng - this.moveStartPoint.lng;
                
                this.moveImageToPosition([
                    this.centerMarker.getLatLng().lat + deltaLat,
                    this.centerMarker.getLatLng().lng + deltaLng
                ]);
                
                this.moveStartPoint = moveEvent.latlng;
            };
            
            const stopHandler = () => {
                this.isMovingImage = false;
                this.map.dragging.enable();
                this.map.getContainer().style.cursor = '';
                this.map.off('mousemove', moveHandler);
                this.map.off('mouseup', stopHandler);
            };
            
            this.map.on('mousemove', moveHandler);
            this.map.on('mouseup', stopHandler);
        });
        
        return marker;
    }

    moveImageToPosition(newPosition) {
        if (!this.imageOverlay) return;
        
        this.centerMarker.setLatLng(newPosition);
        this.updateImageDisplay();
        this.updateCoordInputs(this.centerMarker.getLatLng());
    }

    removeDragHandles() {
        console.log('removeDragHandles: ドラッグハンドルを削除中...', {
            現在のハンドル数: this.dragHandles.length
        });
        this.dragHandles.forEach(handle => {
            this.map.removeLayer(handle);
        });
        this.dragHandles = [];
    }

    createDragHandles(bounds) {
        console.log('createDragHandles: ドラッグハンドルを作成中...', {
            bounds: bounds.toBBoxString()
        });
        
        this.removeDragHandles();
        
        const corners = [
            { pos: bounds.getNorthWest(), cursor: 'nw-resize', tooltip: '左上角をドラッグしてリサイズ' },
            { pos: bounds.getNorthEast(), cursor: 'ne-resize', tooltip: '右上角をドラッグしてリサイズ' },
            { pos: bounds.getSouthEast(), cursor: 'se-resize', tooltip: '右下角をドラッグしてリサイズ' },
            { pos: bounds.getSouthWest(), cursor: 'sw-resize', tooltip: '左下角をドラッグしてリサイズ' }
        ];
        
        corners.forEach((corner, index) => {
            const handleIcon = L.divIcon({
                className: 'drag-handle-icon',
                html: '<div class="drag-handle-pulse" style="width: 8px; height: 8px; background-color: #ff0000; border: 1.5px solid #ffffff; border-radius: 50%;"></div>',
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });
            
            const handle = L.marker(corner.pos, { 
                icon: handleIcon,
                draggable: false,
                pane: 'dragHandles'
            }).addTo(this.map);
            
            handle.bindTooltip(corner.tooltip, {
                permanent: false,
                direction: 'top',
                offset: [0, -15],
                className: 'drag-handle-tooltip'
            });
            
            handle.on('mouseover', () => {
                this.map.getContainer().style.cursor = corner.cursor;
            });
            
            handle.on('mouseout', () => {
                if (!this.isDragging) {
                    this.map.getContainer().style.cursor = '';
                }
            });
            
            handle.on('mousedown', (e) => {
                this.isDragging = true;
                this.dragCornerIndex = index;
                this.map.dragging.disable();
                this.map.getContainer().style.cursor = corner.cursor;
                
                const moveHandler = (moveEvent) => {
                    if (this.isDragging && this.dragCornerIndex === index) {
                        this.updateImageBounds(moveEvent.latlng, index);
                    }
                };
                
                const stopHandler = () => {
                    this.isDragging = false;
                    this.dragCornerIndex = -1;
                    this.map.dragging.enable();
                    this.map.getContainer().style.cursor = '';
                    this.hideResizeInfo();
                    this.map.off('mousemove', moveHandler);
                    this.map.off('mouseup', stopHandler);
                };
                
                this.map.on('mousemove', moveHandler);
                this.map.on('mouseup', stopHandler);
            });
            
            this.dragHandles.push(handle);
        });
        
        console.log('createDragHandles: 作成完了', {
            ハンドル数: this.dragHandles.length
        });
    }

    updateImageBounds(newCornerPos, cornerIndex) {
        if (!this.imageOverlay) return;
        
        const currentBounds = this.imageOverlay.getBounds();
        const oppositeIndex = (cornerIndex + 2) % 4;
        
        // 対角コーナーの位置を取得
        let oppositeCorner;
        if (cornerIndex === 0) { // 左上
            oppositeCorner = currentBounds.getSouthEast();
        } else if (cornerIndex === 1) { // 右上
            oppositeCorner = currentBounds.getSouthWest();
        } else if (cornerIndex === 2) { // 右下
            oppositeCorner = currentBounds.getNorthWest();
        } else { // 左下
            oppositeCorner = currentBounds.getNorthEast();
        }
        
        // 画像の元のアスペクト比
        const imageAspectRatio = this.currentImage.width / this.currentImage.height;
        
        // 新しいコーナー位置と対角コーナー間の距離を計算（メートル単位）
        const centerLat = (newCornerPos.lat + oppositeCorner.lat) / 2;
        const latDistance = this.map.distance(
            [newCornerPos.lat, centerLat],
            [oppositeCorner.lat, centerLat]
        );
        const lngDistance = this.map.distance(
            [centerLat, newCornerPos.lng],
            [centerLat, oppositeCorner.lng]
        );
        
        // アスペクト比を維持するために調整
        const currentAspectRatio = lngDistance / latDistance;
        
        let adjustedLatDistance, adjustedLngDistance;
        if (currentAspectRatio > imageAspectRatio) {
            // 幅が広すぎる場合、幅を調整
            adjustedLngDistance = latDistance * imageAspectRatio;
            adjustedLatDistance = latDistance;
        } else {
            // 高さが高すぎる場合、高さを調整
            adjustedLatDistance = lngDistance / imageAspectRatio;
            adjustedLngDistance = lngDistance;
        }
        
        // 距離を緯度・経度の差分に変換
        const earthRadius = 6378137; // 地球の半径（メートル）
        const latDelta = (adjustedLatDistance / earthRadius) * (180 / Math.PI);
        const lngDelta = (adjustedLngDistance / (earthRadius * Math.cos(centerLat * Math.PI / 180))) * (180 / Math.PI);
        
        // 各コーナーに応じて新しい境界を計算
        let newBounds;
        if (cornerIndex === 0) { // 左上ハンドル
            const south = oppositeCorner.lat;
            const east = oppositeCorner.lng;
            const north = south + latDelta;
            const west = east - lngDelta;
            newBounds = L.latLngBounds([south, west], [north, east]);
        } else if (cornerIndex === 1) { // 右上ハンドル
            const south = oppositeCorner.lat;
            const west = oppositeCorner.lng;
            const north = south + latDelta;
            const east = west + lngDelta;
            newBounds = L.latLngBounds([south, west], [north, east]);
        } else if (cornerIndex === 2) { // 右下ハンドル
            const north = oppositeCorner.lat;
            const west = oppositeCorner.lng;
            const south = north - latDelta;
            const east = west + lngDelta;
            newBounds = L.latLngBounds([south, west], [north, east]);
        } else { // 左下ハンドル
            const north = oppositeCorner.lat;
            const east = oppositeCorner.lng;
            const south = north - latDelta;
            const west = east - lngDelta;
            newBounds = L.latLngBounds([south, west], [north, east]);
        }
        
        // 境界が有効であることを確認
        if (newBounds.isValid()) {
            this.imageOverlay.setBounds(newBounds);
            
            const newCenter = newBounds.getCenter();
            this.centerMarker.setLatLng(newCenter);
            this.updateCoordInputs(newCenter);
            
            this.createDragHandles(newBounds);
            this.updateScaleFromBounds(newBounds);
            this.showResizeInfo(newBounds, newCenter);
        }
    }

    showResizeInfo(bounds, center) {
        this.hideResizeInfo();
        
        const ne = bounds.getNorthEast();
        const sw = bounds.getSouthWest();
        
        const widthKm = this.map.distance(
            [center.lat, sw.lng],
            [center.lat, ne.lng]
        ) / 1000;
        const heightKm = this.map.distance(
            [sw.lat, center.lng],
            [ne.lat, center.lng]
        ) / 1000;
        
        this.resizeTooltip = L.tooltip({
            permanent: true,
            direction: 'center',
            className: 'resize-info-tooltip'
        })
        .setContent(`幅: ${widthKm.toFixed(2)}km<br>高さ: ${heightKm.toFixed(2)}km`)
        .setLatLng(center)
        .addTo(this.map);
    }

    hideResizeInfo() {
        if (this.resizeTooltip) {
            this.map.removeLayer(this.resizeTooltip);
            this.resizeTooltip = null;
        }
    }

    updateScaleFromBounds(bounds) {
        const scaleInput = document.getElementById('scaleInput');
        if (!scaleInput || !this.currentImage.width) return;
        
        const latLngBounds = bounds;
        const pixelBounds = this.map.latLngToLayerPoint(latLngBounds.getNorthEast())
            .distanceTo(this.map.latLngToLayerPoint(latLngBounds.getSouthWest()));
        
        const imagePixels = Math.sqrt(this.currentImage.width * this.currentImage.width + 
                                     this.currentImage.height * this.currentImage.height);
        
        const currentScale = pixelBounds / imagePixels;
        scaleInput.value = currentScale.toFixed(2);
    }

    updateCoordInputs(latlng) {
        const latInput = document.getElementById('latInput');
        const lngInput = document.getElementById('lngInput');
        
        if (latInput && lngInput) {
            latInput.value = latlng.lat.toFixed(6);
            lngInput.value = latlng.lng.toFixed(6);
        }
    }

    getDisplayOpacity() {
        const opacityInput = document.getElementById('opacityInput');
        return opacityInput ? parseInt(opacityInput.value) / 100 : 0.5;
    }

    updateImageDisplay() {
        if (!this.imageOverlay || !this.currentImage.src) {
            console.log('updateImageDisplay: 画像オーバーレイまたは画像が存在しません', {
                imageOverlay: !!this.imageOverlay,
                currentImageSrc: !!this.currentImage.src
            });
            return;
        }
        
        const scaleInput = document.getElementById('scaleInput');
        const scale = scaleInput ? parseFloat(scaleInput.value) : 0.3;
        
        const centerPos = this.centerMarker.getLatLng();
        
        console.log('updateImageDisplay: 実行開始', {
            scale: scale,
            center: { lat: centerPos.lat, lng: centerPos.lng }
        });
        
        // naturalWidth/naturalHeightを使用して正確なピクセル数を取得
        const imageWidth = this.currentImage.naturalWidth || this.currentImage.width;
        const imageHeight = this.currentImage.naturalHeight || this.currentImage.height;
        
        const metersPerPixel = 156543.03392 * Math.cos(centerPos.lat * Math.PI / 180) / Math.pow(2, this.map.getZoom());
        
        const scaledImageWidthMeters = imageWidth * scale * metersPerPixel;
        const scaledImageHeightMeters = imageHeight * scale * metersPerPixel;
        
        const earthRadius = 6378137;
        const latOffset = (scaledImageHeightMeters / 2) / earthRadius * (180 / Math.PI);
        const lngOffset = (scaledImageWidthMeters / 2) / (earthRadius * Math.cos(centerPos.lat * Math.PI / 180)) * (180 / Math.PI);
        
        const bounds = L.latLngBounds(
            [centerPos.lat - latOffset, centerPos.lng - lngOffset],
            [centerPos.lat + latOffset, centerPos.lng + lngOffset]
        );
        
        console.log('updateImageDisplay: 新しい境界を設定', {
            center: { lat: centerPos.lat, lng: centerPos.lng },
            scale: scale,
            bounds: {
                south: centerPos.lat - latOffset,
                north: centerPos.lat + latOffset,
                west: centerPos.lng - lngOffset,
                east: centerPos.lng + lngOffset
            }
        });
        
        // 画像レイヤーの境界を更新
        this.imageOverlay.setBounds(bounds);
        
        // 画像レイヤーが地図に追加されていない場合は再追加
        if (!this.map.hasLayer(this.imageOverlay)) {
            console.log('画像レイヤーが地図に存在しないため再追加します');
            this.imageOverlay.addTo(this.map);
        }
        
        // 強制的に画像レイヤーを再描画
        if (this.imageOverlay._image) {
            this.imageOverlay.redraw();
        }
        
        // 短時間後に地図の強制更新（レンダリングの遅延対策）
        setTimeout(() => {
            this.map.invalidateSize();
        }, 50);
        
        this.createDragHandles(bounds);
        this.updateCoordInputs(centerPos);
        
        // 画像更新をコールバックに通知
        this.notifyImageUpdate();
    }

    updateOpacity() {
        if (this.imageOverlay) {
            this.imageOverlay.setOpacity(this.getDisplayOpacity());
        }
    }

    setupEventHandlers() {
        const scaleInput = document.getElementById('scaleInput');
        const opacityInput = document.getElementById('opacityInput');
        const centerCoordBtn = document.getElementById('centerCoordBtn');
        const latInput = document.getElementById('latInput');
        const lngInput = document.getElementById('lngInput');
        
        if (scaleInput) {
            scaleInput.addEventListener('input', () => this.updateImageDisplay());
        }
        
        if (opacityInput) {
            opacityInput.addEventListener('input', () => this.updateOpacity());
        }
        
        // 座標入力フィールドの変更時に画像位置を更新
        if (latInput && lngInput) {
            const updateCenterFromInputs = () => {
                const lat = parseFloat(latInput.value);
                const lng = parseFloat(lngInput.value);
                if (!isNaN(lat) && !isNaN(lng)) {
                    const newLatLng = L.latLng(lat, lng);
                    this.centerMarker.setLatLng(newLatLng);
                    if (this.imageOverlay) {
                        this.updateImageDisplay();
                    }
                }
            };
            
            latInput.addEventListener('blur', updateCenterFromInputs);
            lngInput.addEventListener('blur', updateCenterFromInputs);
            latInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') updateCenterFromInputs();
            });
            lngInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') updateCenterFromInputs();
            });
        }
        
        if (centerCoordBtn) {
            centerCoordBtn.addEventListener('click', () => {
                this.isCenteringMode = !this.isCenteringMode;
                centerCoordBtn.classList.toggle('active', this.isCenteringMode);
                
                if (this.isCenteringMode) {
                    this.map.getContainer().style.cursor = 'crosshair';
                } else {
                    this.map.getContainer().style.cursor = '';
                }
            });
        }

        this.map.on('click', (e) => {
            if (this.isCenteringMode) {
                this.centerMarker.setLatLng(e.latlng);
                this.updateCoordInputs(e.latlng);
                if (this.imageOverlay) {
                    this.updateImageDisplay();
                }
                
                this.isCenteringMode = false;
                centerCoordBtn.classList.remove('active');
                this.map.getContainer().style.cursor = '';
            }
        });
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                this.currentImage.onload = () => {
                    if (this.imageOverlay) {
                        this.map.removeLayer(this.imageOverlay);
                        this.removeDragHandles();
                    }
                    
                    this.imageOverlay = L.imageOverlay(e.target.result, this.getInitialBounds(), {
                        opacity: this.getDisplayOpacity(),
                        interactive: false
                    }).addTo(this.map);
                    
                    // ファイル名を記録
                    this.currentImageFileName = file.name;
                    
                    // 画像レイヤーが完全に読み込まれるまで少し待つ
                    setTimeout(() => {
                        this.updateImageDisplay();
                        resolve();
                    }, 100);
                };
                
                this.currentImage.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
                this.currentImage.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsDataURL(file);
        });
    }

    // 現在読み込まれている画像の情報を取得
    getCurrentImageInfo() {
        return {
            fileName: this.currentImageFileName,
            isLoaded: this.imageOverlay !== null
        };
    }

    // 画像更新時のコールバックを登録
    addImageUpdateCallback(callback) {
        this.imageUpdateCallbacks.push(callback);
    }

    // 画像更新時のコールバックを実行
    notifyImageUpdate() {
        console.log('notifyImageUpdate: コールバックを実行中...', {
            コールバック数: this.imageUpdateCallbacks.length
        });
        this.imageUpdateCallbacks.forEach((callback, index) => {
            try {
                console.log(`コールバック${index + 1}を実行中...`);
                callback();
            } catch (error) {
                console.error('画像更新コールバックでエラーが発生しました:', error);
            }
        });
    }

    // 中心位置を設定（プログラマティック）
    setCenterPosition(latLng) {
        if (this.centerMarker) {
            this.centerMarker.setLatLng(latLng);
            this.updateCoordInputs(latLng);
            // 画像表示を更新
            if (this.imageOverlay) {
                this.updateImageDisplay();
            }
        }
    }

    getInitialBounds() {
        const center = this.centerMarker.getLatLng();
        const offset = 0.001;
        return L.latLngBounds(
            [center.lat - offset, center.lng - offset],
            [center.lat + offset, center.lng + offset]
        );
    }
}