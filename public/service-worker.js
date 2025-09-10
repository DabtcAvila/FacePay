// FacePay Service Worker for PWA and Performance Optimization
const CACHE_NAME = 'facepay-cache-v2';
const RUNTIME_CACHE = 'facepay-runtime-v2';
const STATIC_CACHE = 'facepay-static-v2';
const IMAGE_CACHE = 'facepay-images-v1';
const MOBILE_CACHE = 'facepay-mobile-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/m',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

// Mobile-specific routes to cache
const MOBILE_ROUTES = [
  '/m',
  '/payments',
  '/history',
  '/profile',
  '/dashboard',
];

// Image patterns for lazy caching
const IMAGE_PATTERNS = [
  /\.(png|jpg|jpeg|gif|svg|webp|avif)$/,
  /\/images\//,
  /\/screenshots\//,
  /\/icons\//,
];

// API routes to cache with network-first strategy
const API_ROUTES = [
  '/api/health',
  '/api/webauthn/capabilities',
  '/api/users/profile',
];

// Routes to cache with stale-while-revalidate
const DYNAMIC_ROUTES = [
  '/dashboard',
  '/payments',
  '/settings',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && 
                     cacheName !== RUNTIME_CACHE && 
                     cacheName !== STATIC_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImageRequest(request)) {
    event.respondWith(cacheFirstWithExpiration(request, IMAGE_CACHE, 7 * 24 * 60 * 60 * 1000)); // 7 days
  } else if (isMobileRoute(request)) {
    event.respondWith(staleWhileRevalidate(request, MOBILE_CACHE));
  } else if (isAPIRoute(request)) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
  } else if (isDynamicRoute(request)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigation(request));
  } else {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
  }
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from FacePay',
    icon: '/favicon-192x192.png',
    badge: '/favicon-96x96.png',
    vibrate: [200, 100, 200],
    tag: 'facepay-notification',
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('FacePay', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

// Caching strategies
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Network request failed:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      const cache = caches.open(cacheName);
      cache.then((c) => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

async function handleNavigation(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Fall back to cached index.html for SPA
    console.log('[SW] Navigation failed, serving cached index');
    const cachedResponse = await caches.match('/');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { 
      status: 503, 
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Enhanced caching strategy with expiration
async function cacheFirstWithExpiration(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const cachedTime = cachedResponse.headers.get('sw-cached-time');
    if (cachedTime) {
      const age = Date.now() - parseInt(cachedTime);
      if (age < maxAge) {
        return cachedResponse;
      }
    }
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      responseToCache.headers.set('sw-cached-time', Date.now().toString());
      cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse; // Return expired cache as fallback
    }
    console.error('[SW] Network request failed:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/);
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return IMAGE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

function isMobileRoute(request) {
  const url = new URL(request.url);
  return MOBILE_ROUTES.some(route => url.pathname === route || url.pathname.startsWith(route + '/'));
}

function isAPIRoute(request) {
  const url = new URL(request.url);
  return API_ROUTES.some(route => url.pathname.startsWith(route));
}

function isDynamicRoute(request) {
  const url = new URL(request.url);
  return DYNAMIC_ROUTES.some(route => url.pathname.startsWith(route));
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         (request.method === 'GET' && request.headers.get('accept').includes('text/html'));
}

async function doBackgroundSync() {
  console.log('[SW] Performing background sync');
  
  try {
    // Sync any pending data
    const pendingRequests = await getStoredRequests();
    
    for (const req of pendingRequests) {
      try {
        await fetch(req);
        await removeStoredRequest(req.id);
      } catch (error) {
        console.error('[SW] Failed to sync request:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

async function getStoredRequests() {
  // This would typically read from IndexedDB
  return [];
}

async function removeStoredRequest(id) {
  // This would typically remove from IndexedDB
  console.log('[SW] Removing stored request:', id);
}

// Performance monitoring
function reportWebVitals(metric) {
  console.log('[SW] Web Vital:', metric);
  
  // Send to analytics endpoint
  fetch('/api/analytics/web-vitals', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: {
      'Content-Type': 'application/json'
    }
  }).catch(error => {
    console.error('[SW] Failed to report web vital:', error);
  });
}

// Listen for web vitals from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'WEB_VITAL') {
    reportWebVitals(event.data.metric);
  }
});

console.log('[SW] Service worker loaded successfully');