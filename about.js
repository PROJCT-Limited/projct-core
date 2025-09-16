document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.header');
    const mobileOverlay = document.getElementById('mobileOverlay');
    if (!header) return;
  
    let lastY = window.scrollY;
    let ticking = false;
    const SOLID_AT = 10;     // add .is-solid after 10px
    const SHOW_ZONE = 60;    // never hide near the very top
    const MIN_DELTA = 8;     // ignore tiny scroll jitter
  
    function update() {
      const y = window.scrollY;
      const goingDown = y > lastY;
      const delta = Math.abs(y - lastY);
      const overlayOpen = mobileOverlay?.classList.contains('open');
  
      // Solid background when slightly scrolled
      if (y > SOLID_AT) header.classList.add('is-solid');
      else header.classList.remove('is-solid');
  
      // Hide on scroll-down, show on scroll-up/near top (unless overlay open)
      if (!overlayOpen) {
        if (y > SHOW_ZONE && goingDown && delta > MIN_DELTA) {
          header.classList.add('is-hidden');
        } else if ((!goingDown && delta > MIN_DELTA) || y <= SHOW_ZONE) {
          header.classList.remove('is-hidden');
        }
      } else {
        header.classList.remove('is-hidden');
      }
  
      lastY = y;
      ticking = false;
    }
  
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }
  
    window.addEventListener('scroll', onScroll, { passive: true });
    update(); // set initial state
  });

/////////////


const header = document.querySelector('.header');

const hero   = document.querySelector('.panel.hero'); // was '#hero'

const io = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) header.classList.add('on-white');
  else header.classList.remove('on-white');
}, { threshold: 0.01 });

io.observe(hero);

