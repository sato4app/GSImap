document.addEventListener('DOMContentLoaded', () => {
    const initialCenter = [34.853667, 135.472041];
    // 地図の初期化
    const map = L.map('map').setView(initialCenter, 15);

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
     * Updates the latitude and longitude input fields.
     * @param {L.LatLng} latlng The coordinates to display.
     */
    function updateCoordInputs(latlng) {
        if (latlng) {
            latInput.value = latlng.lat.toFixed(6);
            lngInput.value = latlng.lng.toFixed(6);
        }
    }

    updateCoordInputs(L.latLng(initialCenter)); // 初期座標を表示

    /**
     * Gets the opacity value (0-1 range) from the opacityInput.
     * @returns {number} Opacity (0-1)
     */
    function getDisplayOpacity() {
        const opacityValue = parseInt(opacityInput.value, 10);
        // Apply 0.5 if the value is invalid
        const displayOpacity = !isNaN(opacityValue) && opacityValue >= 0 && opacityValue <= 100 ? opacityValue / 100 : 0.5;
        return displayOpacity;
    }

    /**
     * Updates the image overlay on the map based on the current image and settings.
     */
    function updateImageDisplay() {
        // Do nothing if there's no image to display or if the image hasn't loaded yet
        if (!currentImage.src || !currentImage.complete) {
            return;
        }

        // Remove existing image
        if (imageOverlay) {
            map.removeLayer(imageOverlay);
        }

        const scale = parseFloat(scaleInput.value);
        const displayScale = !isNaN(scale) && scale > 0 ? scale : 0.3; // Apply 0.3 if the value is invalid

        const displayOpacity = getDisplayOpacity();
        const mapSize = map.getSize();
        const mapCenterLatLng = map.getCenter();

        // Use the image's natural size and avoid division by zero
        if (currentImage.naturalWidth === 0 || currentImage.naturalHeight === 0) {
            console.error("Invalid image size.");
            return;
        }
        const imageAspectRatio = currentImage.naturalHeight / currentImage.naturalWidth;
        const displayWidthPx = mapSize.x * displayScale;
        const displayHeightPx = displayWidthPx * imageAspectRatio; // Maintain aspect ratio
        const centerPoint = map.latLngToLayerPoint(mapCenterLatLng);
        const topLeftPoint = L.point(centerPoint.x - displayWidthPx / 2, centerPoint.y - displayHeightPx / 2);
        const bottomRightPoint = L.point(centerPoint.x + displayWidthPx / 2, centerPoint.y + displayHeightPx / 2);

        // L.imageOverlay requires LatLngBounds
        const bounds = L.latLngBounds(map.layerPointToLatLng(topLeftPoint), map.layerPointToLatLng(bottomRightPoint));

        imageOverlay = L.imageOverlay(currentImage.src, bounds, {
            opacity: displayOpacity // Set initial opacity
        }).addTo(map);
    }

    /**
     * Updates only the opacity of the image.
     */
    function updateOpacity() {
        if (!imageOverlay) return;
        imageOverlay.setOpacity(getDisplayOpacity());
    }

    // --- イベントリスナー設定 ---

    // 画像ファイル選択イベント
    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return; // Do nothing if file selection is cancelled

        const reader = new FileReader();

        // When FileReader finishes loading
        reader.onload = (e) => {
            // When image data loads successfully
            currentImage.onload = () => {
                // Check if image size is obtained correctly
                if (currentImage.naturalWidth === 0 || currentImage.naturalHeight === 0) {
                    // Use a custom message box instead of alert
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
            // When image data fails to load
            currentImage.onerror = () => {
                // Use a custom message box instead of alert
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
            // Set the data URL read by FileReader to the Image object
            currentImage.src = e.target.result;
        };

        // Start reading the file with FileReader
        reader.readAsDataURL(file);
        event.target.value = ''; // Reset to allow selecting the same file consecutively
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
                const lat = parseFloat(cols[3]); // D列（3番目、0始まりで3）
                const lng = parseFloat(cols[4]); // E列（4番目、0始まりで4）
                if (!name || isNaN(lat) || isNaN(lng)) continue;
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
