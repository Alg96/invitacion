// sw.js — Service Worker con estrategia Cache-First
// Requisitos: 1.2, 1.3

const CACHE_NAME = 'elotes-v1'

const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/db.js',
  '/js/app.js',
  '/js/ventas.js',
  '/js/gastos.js',
  '/js/dashboard.js',
  '/js/analisis.js',
  '/js/historial.js',
  '/js/configuracion.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
]

/**
 * Evento install — precachea todos los archivos estáticos.
 * El Service Worker no se activa hasta que el caché esté completo.
 */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_FILES)
    })
  )
})

/**
 * Evento fetch — estrategia Cache-First.
 * Sirve desde caché si el recurso existe; si no, cae a la red.
 */
self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return cached || fetch(event.request)
    })
  )
})
