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
  function prev() { if (games.length) load(index - 1); }

  function announce(msg) {
    // Optionally add a live region if needed; here we use document.title to hint
    try { document.title = `Arcade — ${msg}`; } catch (e) { }
  }

  // Map hotspots
  document.querySelector('.dpad .left')?.addEventListener('click', prev);
  document.querySelector('.dpad .up')?.addEventListener('click', prev);
  document.querySelector('.dpad .right')?.addEventListener('click', next);
  document.querySelector('.dpad .down')?.addEventListener('click', next);
  document.querySelector('.ab .a')?.addEventListener('click', () => load(index));
  document.querySelector('.ab .b')?.addEventListener('click', () => history.back());
  document.querySelector('.start')?.addEventListener('click', toggleFullscreen);
  document.querySelector('.select')?.addEventListener('click', next);

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowLeft': case 'a': case 'A': prev(); break;
      case 'ArrowRight': case 'd': case 'D': next(); break;
      case 'ArrowUp': case 'w': case 'W': prev(); break;
      case 'ArrowDown': case 's': case 'S': next(); break;
      case 'Enter': case ' ': load(index); break;
      case 'Escape': history.back(); break;
      case 'f': case 'F': toggleFullscreen(); break;
    }
  });

  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) { el.requestFullscreen?.(); }
    else { document.exitFullscreen?.(); }
  }

  // Initial
  load(0);
})();
