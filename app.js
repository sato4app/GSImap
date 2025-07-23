// 2. 地図の初期化
// 箕面大滝の座標 (緯度, 経度)
const minohFall = [34.853667, 135.472041];
const map = L.map('map').setView(minohFall, 15);

// 3. 国土地理院の標準地図タイルレイヤーを追加
L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', {
    attribution: "<a href='https://maps.gsi.go.jp/development/ichiran.html' target='_blank'>地理院タイル</a>"
}).addTo(map);

// 4. マーカーの追加
L.marker(minohFall).addTo(map)
    .bindPopup('箕面大滝')
    .openPopup();

/**
 * 画像オーバーレイ機能を初期化する。
 * この関数は、ページのすべてのリソースが読み込まれた後に呼び出される。
 */
function initializeImageOverlayFeature() {
    (function() {
        let distortableImage = null; // 表示中の画像レイヤーを保持する変数
        const currentImage = new Image(); // 表示中の画像のImageオブジェクトを保持
    
        // --- DOM要素の取得とイベントリスナーの設定 ---
        const imageInput = document.getElementById('imageInput');
        const loadImageBtn = document.getElementById('loadImageBtn');
        const scaleInput = document.getElementById('scaleInput');
        const opacityInput = document.getElementById('opacityInput');
    
        /**
         * opacityInputから0-1の範囲の透過度を取得する
         * @returns {number} 透過度 (0-1)
         */
        function getDisplayOpacity() {
            const opacityValue = parseInt(opacityInput.value, 10);
            // 不正な値なら0.5を適用
            const displayOpacity = !isNaN(opacityValue) && opacityValue >= 0 && opacityValue <= 100 ? opacityValue / 100 : 0.5;
            return displayOpacity;
        }
    
        /**
         * 現在の画像と設定値に基づいて、地図上の画像オーバーレイを更新する
         */
        function updateImageDisplay() {
            // 表示すべき画像がない、または画像がまだ読み込まれていない場合は何もしない
            if (!currentImage.src || !currentImage.complete) {
                return;
            }
    
            // 既存の画像を削除
            if (distortableImage) {
                map.removeLayer(distortableImage);
            }
    
            const scale = parseFloat(scaleInput.value);
            const displayScale = !isNaN(scale) && scale > 0 ? scale : 0.3; // 不正な値なら0.3を適用
    
            const displayOpacity = getDisplayOpacity();
            const mapSize = map.getSize();
            const mapCenterLatLng = map.getCenter();
            // 画像の本来のサイズを使用し、0除算を避ける
            if (currentImage.naturalWidth === 0 || currentImage.naturalHeight === 0) {
                console.error("画像のサイズが不正です。");
                return;
            }
            const imageAspectRatio = currentImage.naturalHeight / currentImage.naturalWidth;
            const displayWidthPx = mapSize.x * displayScale;
            const displayHeightPx = displayWidthPx * imageAspectRatio; // 縦横比を維持
            const centerPoint = map.latLngToLayerPoint(mapCenterLatLng);
            const topLeftPoint = L.point(centerPoint.x - displayWidthPx / 2, centerPoint.y - displayHeightPx / 2);
            const bottomRightPoint = L.point(centerPoint.x + displayWidthPx / 2, centerPoint.y + displayHeightPx / 2);
            
            // L.distortableImageOverlayは4隅の座標(LatLng)で初期化する
            const topLeft = map.layerPointToLatLng(topLeftPoint);
            const topRight = map.layerPointToLatLng(L.point(bottomRightPoint.x, topLeftPoint.y));
            const bottomLeft = map.layerPointToLatLng(L.point(topLeftPoint.x, bottomRightPoint.y));
            const bottomRight = map.layerPointToLatLng(bottomRightPoint);
    
            distortableImage = L.distortableImageOverlay(currentImage.src, {
                corners: [topLeft, topRight, bottomLeft, bottomRight],
                // 利用可能なアクション（ドラッグ、リサイズ、変形、回転、ロック）
                actions: [L.DragAction, L.ScaleAction, L.DistortAction, L.RotateAction, L.LockAction],
            }).addTo(map);
    
            // 初期透過度を設定
            distortableImage.setOpacity(displayOpacity);
        }
    
        /**
         * 画像の透過度のみを更新する
         */
        function updateOpacity() {
            if (!distortableImage) return;
            distortableImage.setOpacity(getDisplayOpacity());
        }
    
        // 「画像読込」ボタンがクリックされたら、隠れているファイル選択ダイアログを開く
        loadImageBtn.addEventListener('click', () => imageInput.click());
    
        // 表示倍率のテキストボックスの値が変更されたら、画像の表示を更新
        scaleInput.addEventListener('input', updateImageDisplay);
    
        // 透過度のテキストボックスの値が変更されたら、画像の表示を更新
        opacityInput.addEventListener('input', updateOpacity);
    
        // ファイルが選択されたときの処理
        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return; // ファイル選択がキャンセルされた場合は何もしない
    
            const reader = new FileReader();
    
            // FileReaderで読み込みが完了したときの処理
            reader.onload = (e) => {
                // 画像データの読み込みが成功したときの処理
                currentImage.onload = () => {
                    // 画像のサイズが正常に取得できているか確認
                    if (currentImage.naturalWidth === 0 || currentImage.naturalHeight === 0) {
                        alert("有効な画像ファイルではありません。別のファイルを選択してください。");
                        return;
                    }
                    updateImageDisplay();
                };
                // 画像データの読み込みに失敗したときの処理
                currentImage.onerror = () => {
                    alert("画像の読み込みに失敗しました。ファイルが破損している可能性があります。");
                };
                // Imageオブジェクトに、FileReaderで読み込んだデータURLを設定
                currentImage.src = e.target.result;
            };
    
            // FileReaderでファイルの読み込みを開始
            reader.readAsDataURL(file);
            event.target.value = ''; // 同じファイルを連続で選択できるようにリセット
        });
    })();
}

// ページのすべてのリソースが読み込まれたら、画像オーバーレイ機能を初期化する
window.addEventListener('load', initializeImageOverlayFeature);