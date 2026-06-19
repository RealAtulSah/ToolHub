const CACHE_NAME = 'toolhub-pro-v3';
const ASSETS_TO_CACHE = [
  './',
  './assets/css/responsive.css',
  './assets/css/style.css',
  './assets/images/favicon.ico',
  './assets/images/icon-192.png',
  './assets/images/icon-512.png',
  './assets/images/logo-icon.png',
  './assets/images/logo.png',
  './assets/js/app.js',
  './assets/js/image-helper.js',
  './assets/js/pdf-helper.js',
  './assets/js/search.js',
  './assets/js/storage.js',
  './assets/js/theme.js',
  './components/footer.js',
  './components/header.js',
  './components/sidebar.js',
  './data/tools.json',
  './index.html',
  './manifest.json',
  './tools/converter/base64-decode.html',
  './tools/converter/base64-encode.html',
  './tools/converter/binary-to-text.html',
  './tools/converter/csv-to-json.html',
  './tools/converter/csv-to-xml.html',
  './tools/converter/currency.html',
  './tools/converter/data-converters.js',
  './tools/converter/encoders-decoders.js',
  './tools/converter/excel-to-pdf.html',
  './tools/converter/format-converters.js',
  './tools/converter/hex-to-rgb.html',
  './tools/converter/hex-to-text.html',
  './tools/converter/hsl-to-rgb.html',
  './tools/converter/html-decode.html',
  './tools/converter/html-encode.html',
  './tools/converter/html-to-markdown.html',
  './tools/converter/image-to-pdf.html',
  './tools/converter/jpg-to-png.html',
  './tools/converter/json-to-csv.html',
  './tools/converter/json-to-xml.html',
  './tools/converter/markdown-to-html.html',
  './tools/converter/math-converters.js',
  './tools/converter/morse-to-text.html',
  './tools/converter/pdf-to-excel.html',
  './tools/converter/pdf-to-image.html',
  './tools/converter/pdf-to-text.html',
  './tools/converter/pdf-to-word.html',
  './tools/converter/png-to-jpg.html',
  './tools/converter/rgb-to-hex.html',
  './tools/converter/rgb-to-hsl.html',
  './tools/converter/svg-to-png.html',
  './tools/converter/system-converters.js',
  './tools/converter/text-to-binary.html',
  './tools/converter/text-to-hex.html',
  './tools/converter/text-to-morse.html',
  './tools/converter/text-to-pdf.html',
  './tools/converter/timestamp.html',
  './tools/converter/unit.html',
  './tools/converter/url-decode.html',
  './tools/converter/url-encode.html',
  './tools/converter/webp-to-jpg.html',
  './tools/converter/word-to-pdf.html',
  './tools/converter/xml-to-csv.html',
  './tools/converter/xml-to-json.html',
  './tools/image/background-remover.html',
  './tools/image/base64-to-image.html',
  './tools/image/blur.html',
  './tools/image/border.html',
  './tools/image/brightness.html',
  './tools/image/collage.html',
  './tools/image/color-picker.html',
  './tools/image/compositors.js',
  './tools/image/compressor.html',
  './tools/image/compressor.js',
  './tools/image/contrast.html',
  './tools/image/converters.js',
  './tools/image/cropper.html',
  './tools/image/cropper.js',
  './tools/image/dominant-colors.html',
  './tools/image/exif.html',
  './tools/image/extractors.js',
  './tools/image/favicon.html',
  './tools/image/filters.js',
  './tools/image/flip.html',
  './tools/image/frame.html',
  './tools/image/geometry.js',
  './tools/image/grayscale.html',
  './tools/image/histogram.html',
  './tools/image/image-to-base64.html',
  './tools/image/image-to-svg.html',
  './tools/image/jpg-to-png.html',
  './tools/image/meme.html',
  './tools/image/merge.html',
  './tools/image/ocr.html',
  './tools/image/ocr.js',
  './tools/image/pixelate.html',
  './tools/image/png-to-jpg.html',
  './tools/image/png-to-webp.html',
  './tools/image/qr-generator.html',
  './tools/image/qr-generator.js',
  './tools/image/qr-reader.html',
  './tools/image/remove-metadata.html',
  './tools/image/resizer.html',
  './tools/image/resizer.js',
  './tools/image/rotate.html',
  './tools/image/round-corners.html',
  './tools/image/saturation.html',
  './tools/image/sepia.html',
  './tools/image/sharpen.html',
  './tools/image/splitter.html',
  './tools/image/thumbnail.html',
  './tools/image/watermark.html',
  './tools/image/webp-to-png.html',
  './tools/pdf/annotate.html',
  './tools/pdf/batch-processor.html',
  './tools/pdf/book-creator.html',
  './tools/pdf/compare.html',
  './tools/pdf/compress.html',
  './tools/pdf/csv-to-pdf.html',
  './tools/pdf/delete-pages.html',
  './tools/pdf/editor.html',
  './tools/pdf/excel-to-pdf.html',
  './tools/pdf/extract-images.html',
  './tools/pdf/extract-pages.html',
  './tools/pdf/form-filler.html',
  './tools/pdf/highlighter.html',
  './tools/pdf/html-to-pdf.html',
  './tools/pdf/image-to-pdf.html',
  './tools/pdf/json-to-pdf.html',
  './tools/pdf/merge.html',
  './tools/pdf/metadata.html',
  './tools/pdf/ocr.html',
  './tools/pdf/page-numbers.html',
  './tools/pdf/pdf-converters.js',
  './tools/pdf/pdf-creative.js',
  './tools/pdf/pdf-editors.js',
  './tools/pdf/pdf-modifiers.js',
  './tools/pdf/pdf-security.js',
  './tools/pdf/pdf-to-csv.html',
  './tools/pdf/pdf-to-excel.html',
  './tools/pdf/pdf-to-html.html',
  './tools/pdf/pdf-to-image.html',
  './tools/pdf/pdf-to-json.html',
  './tools/pdf/pdf-to-text.html',
  './tools/pdf/pdf-to-word.html',
  './tools/pdf/protect.html',
  './tools/pdf/rearrange.html',
  './tools/pdf/redact.html',
  './tools/pdf/remove-watermark.html',
  './tools/pdf/rotate.html',
  './tools/pdf/scan.html',
  './tools/pdf/sign.html',
  './tools/pdf/size-analyzer.html',
  './tools/pdf/split.html',
  './tools/pdf/unlock.html',
  './tools/pdf/viewer.html',
  './tools/pdf/watermark.html',
  './tools/pdf/word-to-pdf.html',
  './tools/timezone.html'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(keyList.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  // Only handle GET requests and local scope
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const fetchedResponse = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Silent catch for network failure
        });
        
        return cachedResponse || fetchedResponse;
      });
    })
  );
});
