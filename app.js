// 1. Service Workerの登録
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }).catch(err => {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}

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

// 5. 画像読み込み機能の追加
(function() {
    let imageOverlay = null; // 表示中の画像レイヤーを保持する変数

    // --- DOM要素の取得とイベントリスナーの設定 ---
    const imageInput = document.getElementById('imageInput');
    const loadImageBtn = document.getElementById('loadImageBtn');
    const scaleInput = document.getElementById('scaleInput');

    // 「画像読込」ボタンがクリックされたら、隠れているファイル選択ダイアログを開く
    loadImageBtn.addEventListener('click', () => imageInput.click());

    // ファイルが選択されたときの処理
    imageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return; // ファイル選択がキャンセルされた場合は何もしない

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
                if (imageOverlay) map.removeLayer(imageOverlay); // 既存の画像を削除

                const scale = parseFloat(scaleInput.value);
                const displayScale = !isNaN(scale) && scale > 0 ? scale : 0.3; // 不正な値なら0.3を適用

                const mapSize = map.getSize();
                const mapCenterLatLng = map.getCenter();
                const imageAspectRatio = img.height / img.width;
                const displayWidthPx = mapSize.x * displayScale;
                const displayHeightPx = displayWidthPx * imageAspectRatio; // 縦横比を維持
                const centerPoint = map.latLngToLayerPoint(mapCenterLatLng);
                const topLeftPoint = L.point(centerPoint.x - displayWidthPx / 2, centerPoint.y - displayHeightPx / 2);
                const bottomRightPoint = L.point(centerPoint.x + displayWidthPx / 2, centerPoint.y + displayHeightPx / 2);
                const imageBounds = L.latLngBounds(map.layerPointToLatLng(topLeftPoint), map.layerPointToLatLng(bottomRightPoint));
                imageOverlay = L.imageOverlay(imageUrl, imageBounds).addTo(map);
            };
            img.src = imageUrl;
        };
        reader.readAsDataURL(file);
        event.target.value = ''; // 同じファイルを連続で選択できるようにリセット
    });
})();