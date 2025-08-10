// GeoJSON データ読み込み機能を管理するモジュール
export class GeoJSONLoader {
    constructor(map) {
        this.map = map;
        this.geojsonLayer = null;
    }

    loadGeoJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const geojsonData = JSON.parse(e.target.result);
                    this.addGeoJSONToMap(geojsonData);
                    resolve(geojsonData);
                } catch (error) {
                    reject(new Error('GeoJSON ファイルの解析に失敗しました: ' + error.message));
                }
            };
            
            reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
            reader.readAsText(file);
        });
    }

    addGeoJSONToMap(geojsonData) {
        // 既存のGeoJSONレイヤーがあれば削除
        if (this.geojsonLayer) {
            this.map.removeLayer(this.geojsonLayer);
        }

        this.geojsonLayer = L.geoJSON(geojsonData, {
            style: (feature) => {
                return {
                    color: '#ff7800',
                    weight: 3,
                    opacity: 0.8,
                    fillOpacity: 0.5
                };
            },
            pointToLayer: (feature, latlng) => {
                return L.circleMarker(latlng, {
                    radius: 6,
                    fillColor: '#ff7800',
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },
            onEachFeature: (feature, layer) => {
                if (feature.properties && feature.properties.name) {
                    layer.bindPopup(feature.properties.name);
                }
            }
        }).addTo(this.map);
        
        console.log('GeoJSONファイルを読み込みました');
    }
}