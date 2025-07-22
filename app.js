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

// 5. 現在地取得機能
const getLocationBtn = document.getElementById('getLocationBtn');

if (getLocationBtn) {
    getLocationBtn.addEventListener('click', () => {
        // Geolocation APIが利用可能かチェック
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const userLocation = [lat, lng];

                    // 地図の中心を現在地に移動
                    map.setView(userLocation, 15);

                    // 現在地にマーカーを立てる
                    L.marker(userLocation).addTo(map).bindPopup('あなたの現在地').openPopup();
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert(`現在地の取得に失敗しました。エラーコード: ${error.code}`);
                }
            );
        } else {
            alert('このブラウザは位置情報取得に対応していません。');
        }
    });
}