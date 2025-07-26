document.addEventListener('DOMContentLoaded', () => {
    const initialCenter = [34.853667, 135.472041];
    // 地図の初期化
    const map = L.map('map').setView(initialCenter, 15);

    // スケールバーを右下に追加
    L.control.scale({ position: 'bottomright', imperial: false, maxWidth: 150 }).addTo(map);

    // 国土地理院タイルレイヤー
    L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
        attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
    }).addTo(map);

    // --- 変数定義 ---
    let imageOverlay = null; // 表示中の画像レイヤーを保持する変数
    const currentImage = new Image(); // 表示中の画像のImageオブジェクトを保持
    let centerMarker = null; // 地図の中心を示すマーカー
    let isCenteringMode = false; // 中心座標設定モードのフラグ

    // --- 初期マーカーの設置 ---
    centerMarker = L.marker(initialCenter).addTo(map);


    // --- DOM要素の取得 ---
    const imageInput = document.getElementById('imageInput');
    const loadImageBtn = document.getElementById('loadImageBtn');
    const centerCoordBtn = document.getElementById('centerCoordBtn');
    const scaleInput = document.getElementById('scaleInput');
    const opacityInput = document.getElementById('opacityInput');
    const latInput = document.getElementById('latInput');
    const lngInput = document.getElementById('lngInput');
    const mapContainer = document.getElementById('map');

    // GPS値読込用の要素取得
    const gpsCsvInput = document.getElementById('gpsCsvInput');
    const loadGpsBtn = document.getElementById('loadGpsBtn');

    // --- 関数定義 ---

    /**
     * 緯度・経度の入力フィールドを更新する
     * @param {L.LatLng} latlng 表示する座標
     */
    function updateCoordInputs(latlng) {
        if (latlng) {
            latInput.value = latlng.lat.toFixed(6);
            lngInput.value = latlng.lng.toFixed(6);
        }
    }

    updateCoordInputs(L.latLng(initialCenter)); // 初期座標を表示

    /**
     * opacityInputから透過度の値を取得する（0-1の範囲）
     * @returns {number} 透過度（0-1）
     */
    function getDisplayOpacity() {
        const opacityValue = parseInt(opacityInput.value, 10);
        // 値が無効な場合は0.5を適用
        const displayOpacity = !isNaN(opacityValue) && opacityValue >= 0 && opacityValue <= 100 ? opacityValue / 100 : 0.5;
        return displayOpacity;
    }

    /**
     * 現在の画像と設定に基づいて地図上の画像オーバーレイを更新する
     */
    function updateImageDisplay() {
        // 表示する画像がない場合、または画像がまだ読み込まれていない場合は何もしない
        if (!currentImage.src || !currentImage.complete) {
            return;
        }

        // 既存の画像を削除
        if (imageOverlay) {
            map.removeLayer(imageOverlay);
        }

        const scale = parseFloat(scaleInput.value);
        const displayScale = !isNaN(scale) && scale > 0 ? scale : 0.3; // 値が無効な場合は0.3を適用

        const displayOpacity = getDisplayOpacity();
        const mapSize = map.getSize();
        const mapCenterLatLng = map.getCenter();

        // 画像の自然なサイズを使用し、ゼロ除算を避ける
        if (currentImage.naturalWidth === 0 || currentImage.naturalHeight === 0) {
            console.error("無効な画像サイズです。");
            return;
        }
        const imageAspectRatio = currentImage.naturalHeight / currentImage.naturalWidth;
        const displayWidthPx = mapSize.x * displayScale;
        const displayHeightPx = displayWidthPx * imageAspectRatio; // アスペクト比を維持
        const centerPoint = map.latLngToLayerPoint(mapCenterLatLng);
        const topLeftPoint = L.point(centerPoint.x - displayWidthPx / 2, centerPoint.y - displayHeightPx / 2);
        const bottomRightPoint = L.point(centerPoint.x + displayWidthPx / 2, centerPoint.y + displayHeightPx / 2);

        // L.imageOverlayにはLatLngBoundsが必要
        const bounds = L.latLngBounds(map.layerPointToLatLng(topLeftPoint), map.layerPointToLatLng(bottomRightPoint));

        imageOverlay = L.imageOverlay(currentImage.src, bounds, {
            opacity: displayOpacity // 初期透過度を設定
        }).addTo(map);
    }

    /**
     * 画像の透過度のみを更新する
     */
    function updateOpacity() {
        if (!imageOverlay) return;
        imageOverlay.setOpacity(getDisplayOpacity());
    }

    // --- イベントリスナー設定 ---

    // 画像ファイル選択イベント
    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return; // ファイル選択がキャンセルされた場合は何もしない

        const reader = new FileReader();

        // FileReaderの読み込みが完了した時
        reader.onload = (e) => {
            // 画像データの読み込みが成功した時
            currentImage.onload = () => {
                // 画像サイズが正しく取得されているかチェック
                if (currentImage.naturalWidth === 0 || currentImage.naturalHeight === 0) {
                    // alertの代わりにカスタムメッセージボックスを使用
                    const messageBox = document.createElement('div');
                    messageBox.style.cssText = `
                            position: fixed;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            background-color: white;
                            padding: 20px;
                            border: 1px solid #ccc;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            z-index: 10000;
                            border-radius: 8px;
                            font-family: sans-serif;
                            text-align: center;
                        `;
                    messageBox.innerHTML = `
                            <p>有効な画像ファイルではありません。別のファイルを選択してください。</p>
                            <button onclick="this.parentNode.remove()" style="
                                padding: 8px 16px;
                                margin-top: 10px;
                                border: none;
                                background-color: #007bff;
                                color: white;
                                border-radius: 4px;
                                cursor: pointer;
                            ">OK</button>
                        `;
                    document.body.appendChild(messageBox);
                    return;
                }
                updateImageDisplay();
            };
            // 画像データの読み込みが失敗した時
            currentImage.onerror = () => {
                // alertの代わりにカスタムメッセージボックスを使用
                const messageBox = document.createElement('div');
                messageBox.style.cssText = `
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background-color: white;
                        padding: 20px;
                        border: 1px solid #ccc;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        z-index: 10000;
                        border-radius: 8px;
                        font-family: sans-serif;
                        text-align: center;
                    `;
                messageBox.innerHTML = `
                        <p>画像の読み込みに失敗しました。ファイルが破損している可能性があります。</p>
                        <button onclick="this.parentNode.remove()" style="
                            padding: 8px 16px;
                            margin-top: 10px;
                            border: none;
                            background-color: #007bff;
                            color: white;
                            border-radius: 4px;
                            cursor: pointer;
                        ">OK</button>
                    `;
                document.body.appendChild(messageBox);
            };
            // FileReaderで読み込んだデータURLをImageオブジェクトに設定
            currentImage.src = e.target.result;
        };

        // FileReaderでファイルの読み込みを開始
        reader.readAsDataURL(file);
        event.target.value = ''; // 同じファイルを連続して選択できるようにリセット
    });

    // 「画像読込」ボタンクリックイベント
    loadImageBtn.addEventListener('click', () => imageInput.click());

    // 表示倍率変更イベント
    scaleInput.addEventListener('input', updateImageDisplay);

    // 透過度変更イベント
    opacityInput.addEventListener('input', updateOpacity);

    // 「中心座標」ボタンクリックイベント
    centerCoordBtn.addEventListener('click', () => {
        isCenteringMode = !isCenteringMode; // モードをトグル
        centerCoordBtn.classList.toggle('active', isCenteringMode);
        mapContainer.style.cursor = isCenteringMode ? 'crosshair' : '';

        // 画像オーバーレイが存在すれば削除
        if (imageOverlay) {
            map.removeLayer(imageOverlay);
            imageOverlay = null;
        }
    });

    // 地図クリックイベント (中心座標設定モード時)
    map.on('click', (e) => {
        if (!isCenteringMode) return; // モードがオフなら何もしない

        const clickedLatLng = e.latlng;

        // 既存の中心マーカーがあれば削除
        if (centerMarker) {
            map.removeLayer(centerMarker);
        }

        // 新しいマーカーを追加して保持
        centerMarker = L.marker(clickedLatLng).addTo(map);
        updateCoordInputs(clickedLatLng); // 座標表示を更新

        // 地図の中心をクリック位置に移動
        map.setView(clickedLatLng);

        // 一度クリックしたらモードを自動的に解除
        isCenteringMode = false;
        centerCoordBtn.classList.remove('active');
        mapContainer.style.cursor = '';
    });

    // --- GPS値読込イベント ---
    loadGpsBtn.addEventListener('click', () => gpsCsvInput.click());

    gpsCsvInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            // CSVパース（1行目: name,lat,lng）
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',');
                const name = cols[0];
                const lat = parseFloat(cols[1]); // B列（1番目、0始まりで1）
                const lng = parseFloat(cols[2]); // C列（2番目、0始まりで2）
                if (!name || isNaN(lat) || isNaN(lng)) continue;
                if (lat <= 0 || lng <= 0) continue;
                if (i === 1) {
                    console.log('CSV 1件目:', { name, lat, lng });
                }
                const marker = L.marker([lat, lng]).addTo(map);
                marker.bindPopup(name);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    });
});
