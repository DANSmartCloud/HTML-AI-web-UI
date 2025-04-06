const CACHE_NAME = 'ollama-web-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/animations.css',
    '/css/performance.css',
    '/js/utils.js',
    '/js/api.js',
    '/js/chat.js',
    '/js/markdown.js',
    '/js/ui.js',
    '/js/webgl-background.js',
    '/assets/logo.svg'
];

// 安装Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// 激活新的Service Worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// 处理资源请求
self.addEventListener('fetch', event => {
    // 只处理GET请求
    if (event.request.method !== 'GET') return;

    // API请求不缓存
    if (event.request.url.includes('/api/')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 返回缓存的资源
                if (response) {
                    // 在后台更新缓存
                    fetch(event.request)
                        .then(freshResponse => {
                            if (freshResponse && freshResponse.status === 200) {
                                caches.open(CACHE_NAME)
                                    .then(cache => cache.put(event.request, freshResponse));
                            }
                        });
                    return response;
                }

                // 如果没有缓存，发起网络请求
                return fetch(event.request)
                    .then(response => {
                        // 检查是否成功
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        // 克隆响应，因为响应流只能被读取一次
                        const responseToCache = response.clone();

                        // 将新响应添加到缓存
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, responseToCache));

                        return response;
                    });
            })
            .catch(() => {
                // 如果是HTML请求，返回离线页面
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/offline.html');
                }
            })
    );
});

// 后台同步
self.addEventListener('sync', event => {
    if (event.tag === 'sync-messages') {
        event.waitUntil(syncMessages());
    }
});

// 消息同步逻辑
async function syncMessages() {
    const pendingMessages = await getPendingMessages();
    
    for (const message of pendingMessages) {
        try {
            await sendMessage(message);
            await markMessageAsSynced(message.id);
        } catch (error) {
            console.error('Message sync failed:', error);
        }
    }
}

// 推送通知
self.addEventListener('push', event => {
    const options = {
        body: event.data.text(),
        icon: '/assets/logo.svg',
        badge: '/assets/badge.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: '打开应用'
            },
            {
                action: 'close',
                title: '关闭通知'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('新消息提醒', options)
    );
});