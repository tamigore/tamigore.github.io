(function () {
    // Simple prefetch to warm the HTTP cache for GLB assets while the loading animation runs.
    const models = [
        '../assets/3D/Raytracer.glb',
        '../assets/3D/Turing.glb',
        '../assets/3D/LonelyBot.glb',
        '../assets/3D/Minecraft.glb',
        '../assets/3D/BeyondBad.glb',
        '../assets/3D/ETZ.glb',
        '../assets/3D/H42N42.glb',
        '../assets/3D/Leaffliction.glb',
        '../assets/3D/Malloc.glb'
    ];

    const percentEl = document.querySelector('.three-loader-percent');
    const textEl = document.querySelector('.three-loader-text');
    const captionEl = document.querySelector('.caption');

    // --- IndexedDB helper (small, promise-based) ---
    function openDB() {
        return new Promise((resolve, reject) => {
            try {
                const req = indexedDB.open('three-glb-store', 1);
                req.onupgradeneeded = (e) => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains('models'))
                        db.createObjectStore('models');
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error || new Error('IDB open failed'));
            } catch (err) {
                reject(err);
            }
        });
    }

    async function idbPut(key, value) {
        try {
            const db = await openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction('models', 'readwrite');
                tx.objectStore('models').put(value, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error || new Error('IDB put failed'));
            });
        } catch (err) {
            console.warn('idbPut failed', err);
        }
    }

    function renderStatus(p, message) {
        const pct = Math.min(100, Math.round(p));
        const formatted = pct + '%';
        if (percentEl) percentEl.textContent = formatted;
        if (message) {
            if (textEl) textEl.textContent = message;
            if (captionEl) captionEl.textContent = message;
        } else {
            const fallback = 'Prefetching 3D assets… ' + formatted;
            if (textEl) textEl.textContent = fallback;
            if (captionEl) captionEl.textContent = fallback;
        }
    }

    async function fetchWithProgress(url, onProgress) {
        try {
            const res = await fetch(url, { method: 'GET', credentials: 'same-origin' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const len = parseInt(res.headers.get('Content-Length')) || 0;
            if (!res.body || !len) {
                // if streaming/body length unavailable, just read the blob to warm cache
                const buf = await res.arrayBuffer();
                // store arraybuffer to IDB so next page can reuse it
                try { await idbPut(url, buf); } catch (e) { /* ignore */ }
                if (onProgress) onProgress(len || 1, len || 1);
                return;
            }
            // stream-read while tracking progress, accumulate chunks to a single ArrayBuffer
            const reader = res.body.getReader();
            let received = 0;
            const chunks = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += (value ? value.length : 0);
                if (onProgress) onProgress(received, len);
            }
            // concat to a single ArrayBuffer
            let buffer = new Uint8Array(received);
            let offset = 0;
            for (let i = 0; i < chunks.length; i++) {
                buffer.set(chunks[i], offset);
                offset += chunks[i].length;
            }
            const arrayBuffer = buffer.buffer;
            // store arraybuffer to IDB so next page can reuse it
            try { await idbPut(url, arrayBuffer); } catch (e) { /* ignore */ }
        } catch (err) {
            // don't block the loading screen if a fetch fails
            console.warn('prefetch failed for', url, err);
            if (onProgress) onProgress(1, 1);
        }
    }

    const prefetchPromise = (async function () {
        const sizes = new Array(models.length).fill(0);
        const loaded = new Array(models.length).fill(0);
        // try HEAD to get sizes (best-effort)
        await Promise.all(models.map(async (m, i) => {
            try {
                const h = await fetch(m, { method: 'HEAD', credentials: 'same-origin' });
                if (h.ok) sizes[i] = parseInt(h.headers.get('Content-Length')) || 0;
            } catch (e) { /* ignore */ }
        }));

        let total = sizes.reduce((a, b) => a + (b || 0), 0);
        if (total === 0) total = models.length; // fallback to per-file equal weight
        // start fetching
        await Promise.all(models.map((m, idx) => fetchWithProgress(m, (received, expected) => {
            const expect = sizes[idx] || expected || 1;
            loaded[idx] = Math.min(received || expect, expect);
            const sum = loaded.reduce((a, b) => a + b, 0);
            const pct = (sum / total) * 100;
            renderStatus(pct);
        })));

        renderStatus(100, '3D assets prefetched');
    })();

    if (typeof window !== 'undefined') {
        // Expose promise so the reveal logic can delay redirect until fetches finish.
        window.__projectGLBPrefetchPromise = prefetchPromise;
    }

    prefetchPromise.catch(() => {
        // ensure uncaught rejections do not bubble to console as errors in production
    });
})();
