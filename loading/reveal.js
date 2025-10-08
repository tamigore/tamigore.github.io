// Reveal squares as the mini cube passes and redirect afterward
(function () {
    // Boot sound: try to play on load; if blocked, retry on first interaction
    const audioSrc = '/assets/loading/music/Nintendo%20GameCube%20Boot%20Up%20Sound%201.mp3';
    let bootPlayed = false;
    let audioEl = null;
    function ensureAudioEl() {
        if (audioEl) return audioEl;
        // Reuse existing element if present
        audioEl = document.getElementById('boot-sound');
        if (!audioEl) {
            audioEl = new Audio(audioSrc);
            audioEl.id = 'boot-sound';
            audioEl.preload = 'auto';
            // Attach to DOM to help some platforms load
            try { document.body.appendChild(audioEl); } catch { /* noop */ }
        }
        return audioEl;
    }
    function tryPlayBoot() {
        if (bootPlayed) return;
        const el = ensureAudioEl();
        el.currentTime = 0;
        const p = el.play();
        if (p && typeof p.catch === 'function') {
            p.then(() => { bootPlayed = true; }).catch(() => { /* will fall back to user gesture */ });
        } else {
            // Older browsers without promise
            bootPlayed = true;
        }
    }
    function enableGestureFallback() {
        const resume = () => { tryPlayBoot(); cleanup(); };
        function cleanup() {
            document.removeEventListener('pointerdown', resume);
            document.removeEventListener('keydown', resume);
        }
        document.addEventListener('pointerdown', resume, { once: true });
        document.addEventListener('keydown', resume, { once: true });
    }
    // Attempt immediately
    tryPlayBoot();
    enableGestureFallback();

    const target = '/games/';
    const mini = document.querySelector('.cube.mini');
    const squares = Array.from(document.querySelectorAll('.square'));
    const caption = document.querySelector('.caption');
    if (!mini || squares.length === 0) return;

    // Gate revealing until the main path (cubeMini) starts; ignore the preDrop phase
    let active = false;
    mini.addEventListener('animationstart', (e) => {
        if (e.animationName === 'preDrop') {
            // Sync sound with the drop start if it hasn't played yet
            tryPlayBoot();
        }
        if (e.animationName !== 'cubeMini') return;
        setTimeout(() => { active = true; }, 50);
    });

    // Use bounding box intersection each frame with an overlap ratio threshold to reduce false positives
    const revealed = new Set();
    let doneTriggered = false;

    function overlapRatio(a, b) {
        const left = Math.max(a.left, b.left);
        const right = Math.min(a.right, b.right);
        const top = Math.max(a.top, b.top);
        const bottom = Math.min(a.bottom, b.bottom);
        const w = Math.max(0, right - left);
        const h = Math.max(0, bottom - top);
        const inter = w * h;
        const areaB = Math.max(1, (b.right - b.left) * (b.bottom - b.top));
        return inter / areaB;
    }

    function step() {
        if (active) {
            const mb = mini.getBoundingClientRect();
            squares.forEach((sq) => {
                if (revealed.has(sq)) return;
                const b = sq.getBoundingClientRect();
                // require at least 20% overlap of the square's projected area
                if (overlapRatio(mb, b) >= 0.2) {
                    sq.classList.add('revealed');
                    revealed.add(sq);
                }
            });
        }
        if (!doneTriggered) requestAnimationFrame(step);
    }

    // When the main path ends (cubeMini), navigate after a short beat
    mini.addEventListener('animationend', (e) => {
        if (e.animationName !== 'cubeMini') return;
        if (doneTriggered) return; doneTriggered = true;
        if (caption) caption.textContent = 'Entering arcade…';
        // setTimeout(() => { window.location.replace(target); }, 450);
    });

    // Kick off
    requestAnimationFrame(step);

    // Escape to skip
    // window.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.location.replace(target); });
})();
