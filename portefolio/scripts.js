// Slider controls + grid background interaction
(function(){
  // Slider
  const viewport = document.getElementById('viewport');
  const prev = document.getElementById('prevBtn');
  const next = document.getElementById('nextBtn');

  function scrollByDir(dir){
    const distance = Math.round(viewport.clientWidth * 0.8);
    viewport.scrollBy({left: dir * distance, behavior: 'smooth'});
  }

  if(prev && next && viewport){
    prev.addEventListener('click', ()=>scrollByDir(-1));
    next.addEventListener('click', ()=>scrollByDir(1));

    // keyboard support
    viewport.addEventListener('keydown', (e)=>{
      if(e.key === 'ArrowRight') next.click();
      if(e.key === 'ArrowLeft') prev.click();
    });

    // make cards focusable for keyboard scroll
    Array.from(viewport.querySelectorAll('.card')).forEach(c=>c.setAttribute('tabindex', '0'));
  }

  // Grid background interaction
  const wrap = document.querySelector('.wrap');
  if(wrap){
    let lastMove = 0;
    const throttle = 16; // ms

    function enter(){ document.body.classList.add('grid-hover'); }
    function leave(){ document.body.classList.remove('grid-hover'); document.body.style.removeProperty('--grid-x'); document.body.style.removeProperty('--grid-y'); }

    wrap.addEventListener('mouseenter', enter);
    wrap.addEventListener('mouseleave', leave);

    // Removed per-frame movement: keep pulse but do not move the grid with the cursor.
    // If you'd like a very subtle static offset based on entry point, uncomment below.
    /*
    wrap.addEventListener('mousemove', (e)=>{
      const rect = wrap.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0..1
      const y = (e.clientY - rect.top) / rect.height;
      const offsetX = Math.round((x - 0.5) * 20); // smaller range if used
      const offsetY = Math.round((y - 0.5) * 20);
      document.body.style.setProperty('--grid-x', offsetX + 'px');
      document.body.style.setProperty('--grid-y', offsetY + 'px');
    }, {passive:true});
    */

    // touch fallback: pulse briefly on touch
    wrap.addEventListener('touchstart', ()=>{
      document.body.classList.add('grid-hover');
      setTimeout(()=>document.body.classList.remove('grid-hover'), 1100);
    }, {passive:true});
  }
})();
