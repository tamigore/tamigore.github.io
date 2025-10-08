// Minimal gallery loader and lightbox for Life of Tad
(function () {
  const items = [
    // Replace with your real assets; using placeholders for now
    { src: '/assets/life-of-tad/screenshots/placeholder.svg', alt: 'Overworld exploration', cap: 'Overworld exploration' },
    { src: '/assets/life-of-tad/screenshots/placeholder.svg', alt: 'Dungeon combat', cap: 'Dungeon combat' },
    { src: '/assets/life-of-tad/screenshots/placeholder.svg', alt: 'Parry and dash showcase', cap: 'Parry and dash showcase' },
  ];

  const grid = document.getElementById('galleryGrid');
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbCap = document.getElementById('lightboxCaption');

  if (!grid) return;

  items.forEach(({ src, alt, cap }) => {
    const a = document.createElement('button');
    a.className = 'thumb';
    a.ariaLabel = `Open ${alt}`;
    a.innerHTML = `<img loading="lazy" src="${src}" alt="${alt}">`;
    a.addEventListener('click', () => openLightbox(src, cap, alt));
    grid.appendChild(a);
  });

  function openLightbox(src, cap, alt) {
    lbImg.src = src;
    lbImg.alt = alt;
    lbCap.textContent = cap || '';
    lb.showModal();
  }

  window.Lightbox = {
    close() { lb.close(); }
  };
})();
