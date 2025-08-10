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
        
        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length < 3) continue;
            
            try {
                const latStr = String(row[1]).trim();
                const lngStr = String(row[2]).trim();
                
                if (!latStr || !lngStr || latStr === 'undefined' || lngStr === 'undefined') {
                    continue;
                }
                
                const lat = this.parseCoordinate(latStr, 'lat');
                const lng = this.parseCoordinate(lngStr, 'lng');
                
                if (lat !== null && lng !== null) {
                    processedData.push({
                        id: row[0] || i,
                        lat: lat,
                        lng: lng,
                        original: {
                            lat: latStr,
                            lng: lngStr
                        }
                    });
                }
            } catch (error) {
                console.warn(`行 ${i + 1} の処理をスキップしました:`, error.message);
            }
        }
        
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
        gpsData.forEach((point, index) => {
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
        });
        
        if (gpsData.length > 0) {
            const group = new L.featureGroup(gpsData.map(point => 
                L.marker([point.lat, point.lng])
            ));
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
}