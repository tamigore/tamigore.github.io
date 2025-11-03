// Reveal squares as the mini cube passes and redirect afterward
(function () {
    // Boot sound: try to play on load; if blocked, retry on first interaction
    const audioSrc = '/assets/music/gamecube-startup-fx.wav';
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
    const caption = document.querySelector('.caption');
    if (!mini) return;

    // Sync sound with the drop start if it hasn't played yet
    mini.addEventListener('animationstart', (e) => {
        if (e.animationName === 'preDrop')
            tryPlayBoot();
    });

    // When the main path ends (cubeMini), navigate after a short beat
    mini.addEventListener('animationend', (e) => {
        if (e.animationName !== 'cubeMini') return;
        if (caption) caption.textContent = 'Play';
        setTimeout(() => { window.location.replace(target); }, 1000);
    });
})();
