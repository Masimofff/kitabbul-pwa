const CACHE_NAME = 'kitabbul-cache-v1';
const DYNAMIC_CACHE = 'kitabbul-dynamic-v1';
const IMAGE_CACHE = 'kitabbul-images-v1';

// Oflayn olanda görünəcək default səhifə (bunu da GitHub Pages-də yarada bilərsən və ya boş buraxa bilərsən)
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
    // '/', // Blogger üçün ana səhifəni network first edəcəyik deyə burda ehtiyac yoxdur
    // İstəsən Bəzi əvəzolunmaz CSS/JS fayllarını bura əlavə edə bilərsən
];

// Install Event
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching static assets');
            // return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE && key !== IMAGE_CACHE)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Smart Cache Strategy
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Yalnız GET sorğularını cache-ə alırıq
    if (event.request.method !== 'GET') return;

    // Şəkillər üçün Cache First
    if (event.request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp)$/)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((networkResponse) => {
                    return caches.open(IMAGE_CACHE).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return;
    }

    // Kitab Səhifələri üçün Stale-While-Revalidate (Əvvəlcə cache, arxada network yenilənir)
    // Blogger kitab səhifələrində adətən /2024/05/kitab-adi.html formatı olur
    if (url.pathname.match(/\/\d{4}\/\d{2}\/.*\.html/)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                    return networkResponse;
                }).catch(() => {
                    // Əgər network error olarsa və cache-də yoxdursa
                    return caches.match(OFFLINE_URL);
                });
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // Ana Səhifə və digər axtarış səhifələri üçün Network First
    event.respondWith(
        fetch(event.request).then((networkResponse) => {
            return caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
            });
        }).catch(() => {
            return caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Hər şey alınmazsa offline fallback
                if (event.request.destination === 'document') {
                    return caches.match(OFFLINE_URL) || new Response('Kitabbul: Oflayn rejimdəsiniz. Zəhmət olmasa internet bağlantınızı yoxlayın.', {
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    });
                }
            });
        })
    );
});
