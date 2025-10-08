// GameCube-inspired original boot sequence controller
(function () {
    const target = '/games/';
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    const track = document.getElementById('gTrack');
    const caption = document.querySelector('.caption');

    if (!track) return;

    // Place cubelets along a G-like path (polar coordinates)
    // We approximate a G by a spiral arc plus a radial notch
    const cubeCount = 34;
    const rect = track.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const R0 = Math.min(rect.width, rect.height) * 0.46;
    const R1 = R0 * 0.62;
    const els = [];
    for (let i = 0; i < cubeCount; i++) {
        const el = document.createElement('div');
        el.className = 'cubelet';
        track.appendChild(el);
        els.push(el);
    }
    function place(time) {
        const t = Math.min(1, time);
        els.forEach((el, i) => {
            const p = i / (cubeCount - 1);
            // Spiral angle from 30deg to 420deg
            const ang = (30 + 390 * p) * Math.PI / 180;
            // Ease radius from R0 to R1
            const r = R0 - (R0 - R1) * p;
            const x = cx + r * Math.cos(ang);
            const y = cy + r * Math.sin(ang);
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            // notch (small gap) around 260deg to suggest the G entry
            const notch = ang > Math.PI * 1.4 && ang < Math.PI * 1.55;
            const scale = notch ? 0 : (0.85 + 0.15 * Math.sin(p * Math.PI));
            el.style.transform = `translate(-50%,-50%) scale(${t * scale})`;
            el.style.opacity = notch ? 0 : t;
        });
    }

    // Animate: build the track then spin the logo briefly
    const start = performance.now();
    const durBuild = prefersReduced ? 300 : 900;
    const durSpin = prefersReduced ? 400 : 1100;

    function tick(now) {
        const t = Math.min(1, (now - start) / durBuild);
        place(t);
        if (t < 1) requestAnimationFrame(tick);
        else kickSpin();
    }

    function kickSpin() {
        track.classList.add('spin');
        setTimeout(done, durSpin);
    }

    function done() {
        if (caption) caption.textContent = 'Entering arcade…';
        // window.location.replace(target);
    }

    // ESC or click skip link should also navigate
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(); });
    document.querySelector('.skip')?.addEventListener('click', (e) => { e.preventDefault(); done(); });

    // Build once layout is ready for accurate measurements
    if (document.readyState === 'complete' || document.readyState === 'interactive') requestAnimationFrame(tick);
    else document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(tick));
})();
