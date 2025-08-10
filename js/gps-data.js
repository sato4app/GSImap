// GPS データ処理機能を管理するモジュール
export class GPSData {
    constructor(map) {
        this.map = map;
    }

    // GPS値（Excel）読み込み処理
    loadGPSData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    const processedData = this.processGPSData(jsonData);
                    this.addGPSMarkersToMap(processedData);
                    
                    resolve(processedData);
                } catch (error) {
                    reject(new Error('GPS データの処理に失敗しました: ' + error.message));
                }
            };
            
            reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsArrayBuffer(file);
        });
    }

    processGPSData(jsonData) {
        const processedData = [];
        
        if (jsonData.length < 2) {
            return processedData;
        }
        
        // ヘッダー行から列のインデックスを取得
        const headers = jsonData[0];
        
        const columnMap = {
            pointId: this.findColumnIndex(headers, '緊急ポイント'),
            lat: this.findColumnIndex(headers, '緯度'),
            lng: this.findColumnIndex(headers, '経度'),
            location: this.findLocationColumnIndex(headers),
            altitude: this.findColumnIndex(headers, '標高')
        };
        
        // 必須列のチェック（緊急ポイント、緯度、経度のみ）
        if (columnMap.pointId === -1 || columnMap.lat === -1 || columnMap.lng === -1) {
            return processedData;
        }
        
        // データ行を処理（ヘッダー行をスキップするため i=1 から開始）
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            try {
                const pointIdStr = String(row[columnMap.pointId] || '').trim();
                const latStr = String(row[columnMap.lat] || '').trim();
                const lngStr = String(row[columnMap.lng] || '').trim();
                
                // オプション列の安全な取得
                const locationStr = columnMap.location !== -1 ? String(row[columnMap.location] || '').trim() : '';
                const altitudeStr = columnMap.altitude !== -1 ? String(row[columnMap.altitude] || '').trim() : '';
                
                if (!latStr || !lngStr || latStr === 'undefined' || lngStr === 'undefined') {
                    continue;
                }
                
                const lat = this.parseCoordinate(latStr, 'lat');
                const lng = this.parseCoordinate(lngStr, 'lng');
                
                // ポイントID名を "ポイントID 場所" の形式で作成
                const displayId = pointIdStr + (locationStr ? ` ${locationStr}` : '');
                
                // 標高を数値に変換（オプション）
                let altitude = null;
                if (altitudeStr && altitudeStr !== 'undefined') {
                    const altitudeNum = parseFloat(altitudeStr.replace(/[^\d.-]/g, ''));
                    if (!isNaN(altitudeNum)) {
                        altitude = altitudeNum;
                    }
                }
                
                if (lat !== null && lng !== null) {
                    const pointData = {
                        id: displayId || `ポイント${i}`,
                        lat: lat,
                        lng: lng,
                        altitude: altitude,
                        location: locationStr,
                        pointId: pointIdStr
                    };
                    
                    processedData.push(pointData);
                }
            } catch (error) {
                // エラーは静かにスキップ
            }
        }
        
        return processedData;
    }

    findColumnIndex(headers, columnName) {
        for (let i = 0; i < headers.length; i++) {
            if (String(headers[i]).trim() === columnName) {
                return i;
            }
        }
        return -1;
    }

    findLocationColumnIndex(headers) {
        // "位置"または"場所"の列を検索
        let index = this.findColumnIndex(headers, '位置');
        if (index === -1) {
            index = this.findColumnIndex(headers, '場所');
        }
        return index;
    }

    parseCoordinate(coordStr, coordType) {
        if (!coordStr) {
            throw new Error('座標データが空です');
        }
        
        // 文字列から数値のみを抽出（マイナス符号と小数点も含める）
        const cleanedStr = coordStr.toString().replace(/[^\d.-]/g, '');
        
        if (!cleanedStr) {
            throw new Error('有効な数値データがありません');
        }
        
        // 10進数形式として解析
        const decimalValue = parseFloat(cleanedStr);
        
        if (isNaN(decimalValue)) {
            throw new Error(`座標の解析に失敗しました: ${coordStr}`);
        }
        
        return decimalValue;
    }

    // 色を明るく/暗くするヘルパー関数
    adjustColor(color, amount) {
        const hex = color.replace('#', '');
        const num = parseInt(hex, 16);
        let r = (num >> 16) + amount * 255;
        let g = (num >> 8 & 0x00FF) + amount * 255;
        let b = (num & 0x0000FF) + amount * 255;
        
        r = Math.max(0, Math.min(255, Math.round(r)));
        g = Math.max(0, Math.min(255, Math.round(g)));
        b = Math.max(0, Math.min(255, Math.round(b)));
        
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }

    addGPSMarkersToMap(gpsData, markerColor = '#00ff00') {
        gpsData.forEach((point, index) => {
            // 逆三角形アイコンを作成（GPS座標の正確な位置に合わせる）
            const triangleIcon = L.divIcon({
                className: 'gps-triangle-marker',
                html: `<div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 18px solid ${markerColor}; position: relative; outline: 1px solid ${this.adjustColor(markerColor, -0.3)};"></div>`,
                iconSize: [20, 18],
                iconAnchor: [10, 18] // 下の頂点（三角形の底辺中央）をGPS座標に正確に合わせる
            });

            const marker = L.marker([point.lat, point.lng], {
                icon: triangleIcon
            }).addTo(this.map);
            
            // ポップアップ内容を作成（指定された順序で表示）
            let popupContent = `<div><strong>${point.pointId}</strong><br>`;
            popupContent += `<strong>緯度:</strong> ${point.lat.toFixed(6)}<br>`;
            popupContent += `<strong>経度:</strong> ${point.lng.toFixed(6)}<br>`;
            
            // 標高がある場合
            if (point.altitude !== null && point.altitude !== undefined) {
                popupContent += `<strong>標高:</strong> ${point.altitude}m<br>`;
            }
            
            // 場所がある場合
            if (point.location) {
                popupContent += `<strong>場所:</strong> ${point.location}<br>`;
            }
            
            popupContent += `</div>`;
            
            marker.bindPopup(popupContent);
            
            // マーカーにクリックイベントを追加
            marker.on('click', () => {
                // マーカーがクリックされたときの処理
                console.log(`GPSポイント ${point.pointId} がクリックされました:`, point);
            });
        });
        
        if (gpsData.length > 0) {
            // すべてのGPSポイントを含む範囲を計算
            const bounds = L.latLngBounds(gpsData.map(point => [point.lat, point.lng]));
            this.map.fitBounds(bounds.pad(0.1));
        }
    }
}