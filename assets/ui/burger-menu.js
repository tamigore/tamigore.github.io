(function () {
    const cssHref = '/assets/ui/burger-menu.css';
    const defaultLinks = [
        { label: 'Home', href: '/loading/' },
        { label: 'CV', href: '/cv/' },
        { label: 'Projects', href: '/projects/' },
        { label: 'Games', href: '/games/' }
    ];

    function ensureStyles() {
        if (document.querySelector(`link[data-burger-css="true"]`)) return;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssHref;
        link.dataset.burgerCss = 'true';
        document.head.appendChild(link);
    }

    function normalizePath(path) {
        if (!path) return '/';
        try {
            const url = new URL(path, window.location.origin);
            path = url.pathname;
        } catch (err) {
            /* ignore */
        }
        if (path.length > 1 && path.endsWith('/'))
            path = path.slice(0, -1);
        return path || '/';
    }

    function focusables(root) {
        if (!root) return [];
        const selector = [
            'a[href]:not([tabindex="-1"])',
            'button:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(',');
        return Array.from(root.querySelectorAll(selector)).filter((el) => !el.hasAttribute('hidden'));
    }

    function init() {
        if (!document.body || document.querySelector('[data-burger-root]')) return;
        ensureStyles();

        const links = Array.isArray(window.BURGER_MENU_LINKS) && window.BURGER_MENU_LINKS.length
            ? window.BURGER_MENU_LINKS
            : defaultLinks;

        const body = document.body;
        const root = document.createElement('div');
        root.className = 'burger-root';
        root.dataset.burgerRoot = 'true';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'burger-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', 'burger-panel');
        toggle.innerHTML = '<span class="sr-only">Toggle navigation</span><span class="burger-line" aria-hidden="true"></span>';

        const backdrop = document.createElement('div');
        backdrop.className = 'burger-backdrop';

        const panel = document.createElement('nav');
        panel.className = 'burger-panel';
        panel.id = 'burger-panel';
        panel.setAttribute('aria-hidden', 'true');
        panel.setAttribute('aria-label', 'Site navigation');

        const heading = document.createElement('h2');
        heading.className = 'burger-heading';
        heading.textContent = 'Navigate';

        const list = document.createElement('ul');
        list.className = 'burger-nav';

        const current = normalizePath(window.location.pathname);

        links.forEach((item) => {
            if (!item || !item.href || !item.label) return;
            const li = document.createElement('li');
            const anchor = document.createElement('a');
            anchor.href = item.href;
            anchor.textContent = item.label;
            if (normalizePath(item.href) === current)
                anchor.setAttribute('aria-current', 'page');
            li.appendChild(anchor);
            list.appendChild(li);
        });

        const footer = document.createElement('div');
        footer.className = 'burger-footer';
        footer.textContent = 'Use the menu to jump between sections.';

        panel.appendChild(heading);
        panel.appendChild(list);
        panel.appendChild(footer);

        root.appendChild(toggle);
        body.appendChild(root);
        body.appendChild(backdrop);
        body.appendChild(panel);

        let isOpen = false;
        let lastFocused = null;

        function setOpen(next) {
            const open = Boolean(next);
            if (open === isOpen) return;
            isOpen = open;
            body.classList.toggle('burger-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            panel.setAttribute('aria-hidden', String(!open));
            if (open) {
                lastFocused = document.activeElement;
                const first = focusables(panel)[0];
                if (first) first.focus({ preventScroll: true });
            } else if (lastFocused && typeof lastFocused.focus === 'function') {
                lastFocused.focus({ preventScroll: true });
            }
        }

        toggle.addEventListener('click', () => setOpen(!isOpen));
        backdrop.addEventListener('click', () => setOpen(false));
        list.addEventListener('click', (event) => {
            const target = event.target;
            if (target && target.tagName === 'A')
                setOpen(false);
        });

        document.addEventListener('keydown', (event) => {
            if (!isOpen) return;
            if (event.key === 'Escape') {
                event.preventDefault();
                setOpen(false);
                return;
            }
            if (event.key !== 'Tab') return;
            const nodes = focusables(panel);
            if (!nodes.length) {
                event.preventDefault();
                toggle.focus({ preventScroll: true });
                return;
            }
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            const active = document.activeElement;
            if (event.shiftKey && active === first) {
                event.preventDefault();
                last.focus({ preventScroll: true });
            } else if (!event.shiftKey && active === last) {
                event.preventDefault();
                first.focus({ preventScroll: true });
            }
        });

        window.addEventListener('resize', () => {
            if (!isOpen) return;
            const first = focusables(panel)[0];
            if (first) first.focus({ preventScroll: true });
        });

        window.addEventListener('pageshow', (event) => {
            if (event.persisted)
                setOpen(false);
        });
    }

    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', init, { once: true });
    else
        init();
})();
