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
        
        console.log('=== GPS データ処理開始 ===');
        console.log('総行数:', jsonData.length);
        
        if (jsonData.length < 2) {
            console.error('データが不足しています。ヘッダー行とデータ行が必要です。');
            return processedData;
        }
        
        // ヘッダー行から列のインデックスを取得
        const headers = jsonData[0];
        console.log('ヘッダー行:', headers);
        
        const columnMap = {
            pointId: this.findColumnIndex(headers, '緊急ポイント'),
            lat: this.findColumnIndex(headers, '緯度'),
            lng: this.findColumnIndex(headers, '経度'),
            location: this.findColumnIndex(headers, '位置'),
            altitude: this.findColumnIndex(headers, '標高')
        };
        
        console.log('列マッピング:', columnMap);
        
        // 必須列のチェック（緊急ポイント、緯度、経度のみ）
        if (columnMap.pointId === -1 || columnMap.lat === -1 || columnMap.lng === -1) {
            console.error('必須列が見つかりません:', {
                '緊急ポイント': columnMap.pointId !== -1 ? '見つかった' : '見つからない',
                '緯度': columnMap.lat !== -1 ? '見つかった' : '見つからない',
                '経度': columnMap.lng !== -1 ? '見つかった' : '見つからない'
            });
            console.log('オプション列の状況:', {
                '位置': columnMap.location !== -1 ? '見つかった' : '見つからない',
                '標高': columnMap.altitude !== -1 ? '見つかった' : '見つからない'
            });
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
                
                // デバッグ出力（最初の5件のみ）
                if (processedData.length < 5) {
                    console.log(`--- 行 ${i + 1} ---`);
                    console.log('元データ:', {
                        緊急ポイント: `"${pointIdStr}"`,
                        位置: `"${locationStr}"`,
                        緯度文字列: `"${latStr}"`,
                        経度文字列: `"${lngStr}"`,
                        標高: `"${altitudeStr}"`,
                        行全体: row
                    });
                }
                
                if (!latStr || !lngStr || latStr === 'undefined' || lngStr === 'undefined') {
                    if (processedData.length < 5) {
                        console.log('→ スキップ: 空の座標データ');
                    }
                    continue;
                }
                
                const lat = this.parseCoordinate(latStr, 'lat');
                const lng = this.parseCoordinate(lngStr, 'lng');
                
                // ポイントID名を "ポイントID 位置" の形式で作成
                const displayId = pointIdStr + (locationStr ? ` ${locationStr}` : '');
                
                // 標高を数値に変換（オプション）
                let altitude = null;
                if (altitudeStr && altitudeStr !== 'undefined') {
                    const altitudeNum = parseFloat(altitudeStr.replace(/[^\d.-]/g, ''));
                    if (!isNaN(altitudeNum)) {
                        altitude = altitudeNum;
                    }
                }
                
                // デバッグ出力（最初の5件のみ）
                if (processedData.length < 5) {
                    console.log('変換結果:', {
                        表示ID: displayId,
                        緯度: lat,
                        経度: lng,
                        標高: altitude
                    });
                }
                
                if (lat !== null && lng !== null) {
                    const pointData = {
                        id: displayId || `ポイント${i}`,
                        lat: lat,
                        lng: lng,
                        altitude: altitude,
                        original: {
                            pointId: pointIdStr,
                            location: locationStr,
                            lat: latStr,
                            lng: lngStr,
                            altitude: altitudeStr
                        }
                    };
                    
                    processedData.push(pointData);
                    
                    // デバッグ出力（最初の5件のみ）
                    if (processedData.length <= 5) {
                        console.log('追加されたポイント:', pointData);
                        console.log('地図座標:', `[${lat}, ${lng}]`);
                    }
                }
            } catch (error) {
                console.warn(`行 ${i + 1} の処理をスキップしました:`, error.message);
                if (processedData.length < 5) {
                    console.log('エラー詳細:', error);
                }
            }
        }
        
        console.log(`=== GPS データ処理完了 ===`);
        console.log('処理成功件数:', processedData.length);
        console.log('最初の3件の座標:', processedData.slice(0, 3).map(p => `[${p.lat}, ${p.lng}]`));
        
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

    addGPSMarkersToMap(gpsData) {
        console.log('=== GPS マーカー配置開始 ===');
        console.log('配置予定マーカー数:', gpsData.length);
        
        gpsData.forEach((point, index) => {
            // 最初の5件のデバッグ情報
            if (index < 5) {
                console.log(`--- マーカー ${index + 1} ---`);
                console.log('ポイントデータ:', point);
                console.log(`Leaflet座標: [${point.lat}, ${point.lng}]`);
                console.log('元データ:', point.original);
            }
            
            const marker = L.circleMarker([point.lat, point.lng], {
                radius: 5,
                fillColor: '#00ff00',
                color: '#008000',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(this.map);
            
            // ポップアップ内容を作成
            let popupContent = `
                <div>
                    <strong>${point.id}</strong><br>
                    緯度: ${point.lat.toFixed(6)}<br>
                    経度: ${point.lng.toFixed(6)}<br>`;
            
            // 標高情報がある場合は追加
            if (point.altitude !== null && point.altitude !== undefined) {
                popupContent += `標高: ${point.altitude}m<br>`;
            }
            
            popupContent += `<small>元データ: ${point.original.pointId || ''} ${point.original.location || ''}</small>
                </div>`;
            
            marker.bindPopup(popupContent);
            
            if (index < 5) {
                console.log('→ マーカー配置完了');
            }
        });
        
        if (gpsData.length > 0) {
            const group = new L.featureGroup(gpsData.map(point => 
                L.marker([point.lat, point.lng])
            ));
            const bounds = group.getBounds();
            
            console.log('地図範囲調整:', {
                北東: bounds.getNorthEast(),
                南西: bounds.getSouthWest(),
                中心: bounds.getCenter()
            });
            
            this.map.fitBounds(bounds.pad(0.1));
        }
        
        console.log('=== GPS マーカー配置完了 ===');
    }
}