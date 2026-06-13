importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = 'kitabbul-v2';

self.addEventListener('install', (event) => {
    // Dərhal köhnə xətalı SW-ni ləğv edib təzəsini işə salır!
    self.skipWaiting(); 
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// YALNIZ ŞƏKİLLƏR ÜÇÜN KƏŞ (Sürət üçün) və SƏHİFƏLƏR ÜÇÜN NETWORK-FIRST
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            // Uğurlu cavabı arxada kəşə at ki, interneti kəsiləndə oflyayn oxuya bilsin
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
            }
            return networkResponse; // Bütün hallarda ən təzə, ən canlı səhifəni internetdən gətir!
        }).catch(() => {
            // ƏGƏR İNTERNET KƏSİLİBSƏ VƏ YA ZƏİFDİRSƏ O ZAMAN YADDAŞI VER!
            return caches.match(event.request);
        })
    );
});
