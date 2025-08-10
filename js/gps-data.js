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
        
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < 3) continue;
            
            try {
                const latStr = String(row[1]).trim();
                const lngStr = String(row[2]).trim();
                
                // デバッグ出力（最初の5件のみ）
                if (processedData.length < 5) {
                    console.log(`--- 行 ${i + 1} ---`);
                    console.log('元データ:', {
                        ID: row[0],
                        緯度文字列: `"${latStr}"`,
                        経度文字列: `"${lngStr}"`,
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
                
                // デバッグ出力（最初の5件のみ）
                if (processedData.length < 5) {
                    console.log('変換結果:', {
                        緯度: lat,
                        経度: lng
                    });
                }
                
                if (lat !== null && lng !== null) {
                    const pointData = {
                        id: row[0] || i,
                        lat: lat,
                        lng: lng,
                        original: {
                            lat: latStr,
                            lng: lngStr
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
            
            marker.bindPopup(`
                <div>
                    <strong>ポイント ${point.id}</strong><br>
                    緯度: ${point.lat.toFixed(6)}<br>
                    経度: ${point.lng.toFixed(6)}<br>
                    <small>元データ: ${point.original.lat}, ${point.original.lng}</small>
                </div>
            `);
            
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