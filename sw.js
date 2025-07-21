const CACHE_NAME = 'gsimap-cache-v1';
// キャッシュするファイルのリスト
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/app.js'
  // アイコンもキャッシュする場合はリストに追加します
  // '/icons/MapIcon-192.png',
  // '/icons/MapIcon-512.png'
];

// installイベント: Service Workerがインストールされたときに実行
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// fetchイベント: ページがリクエストを送信したときに実行
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});