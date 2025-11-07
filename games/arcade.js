// Arcade hub: manage selection and load games into the screen iframe
(function () {
  const games = (window.ARCADE_GAMES || []).filter(g => g && g.src);
  const frame = document.getElementById('screenFrame');
  let index = 0;

  function load(i) {
    if (!games.length) return;
    index = ((i % games.length) + games.length) % games.length;
    const g = games[index];
    frame.src = g.src;
    announce(`Loaded ${g.title || g.id}`);
  }

  function next() { if (games.length) load(index + 1); }
  function left() { if (games.length) load(index - 1); }
  function right() { if (games.length) load(index + 1); }
  function up() { if (games.length) load(index - 1); }
  function down() { if (games.length) load(index + 1); }
  function a() { if (games.length) load(index); }
  function b() { if (games.length) history.back(); }
  function select() { toggleFullscreen(); }
  function start() { toggleFullscreen(); }

  function announce(msg) {
    // Optionally add a live region if needed; here we use document.title to hint
    try { document.title = `Arcade — ${msg}`; } catch (e) { }
  }

  // Map buttons
  document.querySelector('.dpad .left')?.addEventListener('click', left);
  document.querySelector('.dpad .up')?.addEventListener('click', up);
  document.querySelector('.dpad .right')?.addEventListener('click', right);
  document.querySelector('.dpad .down')?.addEventListener('click', down);
  document.querySelector('.ab .a')?.addEventListener('click', a);
  document.querySelector('.ab .b')?.addEventListener('click', b);
  document.querySelector('.start')?.addEventListener('click', start);
  document.querySelector('.select')?.addEventListener('click', select);

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': left(); break;
      case 'ArrowRight': case 'd': case 'D': right(); break;
      case 'ArrowUp': case 'w': case 'W': up(); break;
      case 'ArrowDown': case 's': case 'S': down(); break;
      case 'Enter': case ' ': start(); break;
      case 'Escape': select(); break;
      case 'q': case 'Q': a(); break;
      case 'e': case 'E': b(); break;
      case 'f': case 'F': toggleFullscreen(); break;
    }
  });

  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) { el.requestFullscreen?.(); }
    else { document.exitFullscreen?.(); }
  }

  /*
   * Debug helper: show temporary labels for device buttons.
   * - Clicking any button will show its name near the control.
   * - Call `debugShowAllButtonNames(timeout)` from the console to show all labels
   *   (useful for tuning CSS variables that position hotspots).
   */
  (function addDebugButtonLabels() {
    const wrap = document.querySelector('.device-wrap');
    if (!wrap) return;

    // create stylesheet for labels
    const style = document.createElement('style');
    style.textContent = `
      .hot-label{
        position: absolute;
        pointer-events: none;
        padding: 4px 8px;
        font-size: 12px;
        background: rgba(0,0,0,0.75);
        color: #fff;
        border-radius: 6px;
        transform: translate(-50%, -120%);
        white-space: nowrap;
        z-index: 9999;
        opacity: 0;
        transition: opacity 160ms ease, transform 160ms ease;
      }
      .hot-label.show{ opacity: 1; transform: translate(-50%, -140%); }
    `;
    document.head.appendChild(style);

    function createLabel(text) {
      const el = document.createElement('div');
      el.className = 'hot-label';
      el.textContent = text;
      return el;
    }

    function positionLabel(label, target) {
      const wrapRect = wrap.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const x = rect.left + rect.width / 2 - wrapRect.left;
      const y = rect.top + rect.height / 2 - wrapRect.top;
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
    }

    function showLabel(target, text, timeout = 1200) {
      const label = createLabel(text);
      wrap.appendChild(label);
      // position after next frame so fonts/layout are stable
      requestAnimationFrame(() => {
        positionLabel(label, target);
        // small delay to allow CSS transition
        requestAnimationFrame(() => label.classList.add('show'));
      });
      if (timeout > 0) setTimeout(() => label.remove(), timeout);
      return label;
    }

    // attach click listeners to each device button to reveal its label
    wrap.querySelectorAll('button, .dpad > button, .ab > button, .start, .select').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = btn.getAttribute('aria-label') || btn.getAttribute('title') || btn.className || 'button';
        showLabel(btn, text, 1200);
      });
    });

    // expose helper for dev console: show all labels at once
    window.debugShowAllButtonNames = function (timeout = 2000) {
      const nodes = wrap.querySelectorAll('button, .dpad > button, .ab > button, .start, .select');
      nodes.forEach((btn, i) => {
        const name = btn.getAttribute('aria-label') || btn.getAttribute('title') || btn.className || `btn-${i}`;
        // stagger slightly so labels don't all overlap during placement
        setTimeout(() => showLabel(btn, name, timeout), i * 60);
      });
    };
  })();

  // Initial
  load(0);

  // expose a small API for the debug menu and console
  window.arcade = {
    next: right,
    prev: left,
    load,
    toggleFullscreen
  };

  // Inject a small burger menu at top-left with useful commands
  (function injectBurgerMenu() {
    const container = document.createElement('div');
    container.className = 'burger';

    const btn = document.createElement('button');
    btn.setAttribute('aria-label', 'Menu');
    btn.type = 'button';
    btn.innerHTML = `<p id="helper">Info</p>`;

    const panel = document.createElement('div');
    panel.className = 'menu-panel';
    panel.innerHTML = `
      <div class="title">Arcade</div>
      <button data-cmd="show-names">Show button names</button>
      <button data-cmd="toggle-outlines">Toggle outlines</button>
      <button data-cmd="prev">Previous</button>
      <button data-cmd="next">Next</button>
      <button data-cmd="fullscreen">Toggle fullscreen</button>
    `;

    container.appendChild(btn);
    document.body.appendChild(container);
    document.body.appendChild(panel);

    function closePanel() { panel.classList.remove('show'); }
    function openPanel() { panel.classList.add('show'); }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('show');
    });

    // close when clicking outside
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== btn) closePanel();
    });

    // keyboard: Esc to close
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanel(); });

    panel.addEventListener('click', (e) => {
      const cmd = e.target.closest('button')?.dataset?.cmd;
      if (!cmd) return;
      switch (cmd) {
        case 'show-names':
          if (typeof window.debugShowAllButtonNames === 'function') window.debugShowAllButtonNames(2000);
          else console.info('debugShowAllButtonNames not available');
          break;
        case 'toggle-outlines':
          document.body.classList.toggle('hot-debug');
          break;
        case 'prev':
          left();
          break;
        case 'next':
          right();
          break;
        case 'fullscreen':
          toggleFullscreen();
          break;
      }
      // keep panel open for a short moment so user can see action, then close
      setTimeout(closePanel, 300);
    });
  })();
})();
