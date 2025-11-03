// Grid background interaction — attach to the whole body so the effect covers the entire page
(function () {
    const area = document.body;
    if (area) {
        function enter() { area.classList.add('grid-hover'); }
        function leave() { area.classList.remove('grid-hover'); area.style.removeProperty('--mouse-x'); area.style.removeProperty('--mouse-y'); area.style.removeProperty('--mouse-x-px'); area.style.removeProperty('--mouse-y-px'); }

        area.addEventListener('mouseenter', enter);
        area.addEventListener('mouseleave', leave);

        // Focused pulse: update mouse position CSS variables for the radial glow only.
        // Use requestAnimationFrame to avoid per-event layout thrashing.
        (function pulse() {
            let raf = null;
            let lastX = '50%';
            let lastY = '50%';

            function setMouseVars(xPct, yPct, xPx, yPx) {
                // avoid setting if unchanged to reduce style churn
                if (lastX === xPct && lastY === yPct) return;
                lastX = xPct; lastY = yPct;
                document.body.style.setProperty('--mouse-x', xPct);
                document.body.style.setProperty('--mouse-y', yPct);
                if (xPx && yPx) {
                    document.body.style.setProperty('--mouse-x-px', xPx);
                    document.body.style.setProperty('--mouse-y-px', yPx);
                }
            }

            area.addEventListener('mousemove', (e) => {
                const x = e.clientX / window.innerWidth; // 0..1
                const y = e.clientY / window.innerHeight;
                const xPct = Math.round(x * 100) + '%';
                const yPct = Math.round(y * 100) + '%';
                const xPx = e.clientX + 'px';
                const yPx = e.clientY + 'px';

                if (raf) cancelAnimationFrame(raf);
                raf = requestAnimationFrame(() => setMouseVars(xPct, yPct, xPx, yPx));
            }, { passive: true });

            // Reset to center on leave for a clean fallback
            area.addEventListener('mouseleave', () => {
                if (raf) cancelAnimationFrame(raf);
                setMouseVars('50%', '50%', '50vw', '50vh');
            }, { passive: true });
        })();

        // touch fallback: pulse briefly on touch
        area.addEventListener('touchstart', () => {
            area.classList.add('grid-hover');
            setTimeout(() => area.classList.remove('grid-hover'), 1100);
        }, { passive: true });
    }
})();
