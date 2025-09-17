// ---------- tiny event helper ----------
function on(root, type, selectorOrHandler, maybeHandler) {
  if (typeof selectorOrHandler === 'function') {
    root.addEventListener(type, selectorOrHandler, { passive: true });
    return;
  }
  const selector = selectorOrHandler, handler = maybeHandler;
  root.addEventListener(type, (e) => {
    const m = e.target.closest(selector);
    if (m && root.contains(m)) handler.call(m, e);
  }, { passive: true });
}

// ---------- page UI (no jQuery) ----------
function wirePageToggles() {
  on(document, 'click', '.index', () => {
    const el = document.querySelector('.list-projects');
    if (el) el.classList.toggle('is-hidden1');
  });

  on(document, 'click', '.section-about-us', () => {
    const el = document.querySelector('.description-text');
    if (el) el.classList.toggle('is-hidden');
  });

  on(document, 'click', '.list-projects1', function () {
    const next = this.nextElementSibling;
    if (next && next.classList.contains('index-item')) next.classList.toggle('is-hidden');
    const arrow = this.querySelector('.nav-svg1');
    if (arrow) arrow.classList.toggle('rotated');
  });

  on(document, 'click', '.nav-svg2', (e) => {
    const el = document.querySelector('.search-filter');
    if (el) el.classList.toggle('is-hidden');
    e.stopPropagation();
  });

  on(document, 'click', '.list-item', function (e) {
    if (e.target.closest('.nav-svg2')) return;
    const arrow = this.querySelector('.nav-svg1');
    if (arrow) arrow.classList.toggle('rotated');
  });
}

// ---------- mobile menu (single source of truth) ----------
function initMobileMenu() {
  const trigger  = document.getElementById('mobileTrigger');
  const overlay  = document.getElementById('mobileOverlay');
  const closeBtn = document.getElementById('mobileClose');
  if (!overlay || !trigger) return;

  let busy = false;
  const isOpen = () => overlay.classList.contains('open');

  const allCanvases = () => Array.from(document.querySelectorAll('canvas'));
  const machine = document.getElementById('machine');

  function disableCanvasPointer() {
    allCanvases().forEach(c => c.style.pointerEvents = 'none');
    if (machine) machine.style.pointerEvents = 'none';
  }
  function enableCanvasPointer() {
    allCanvases().forEach(c => c.style.pointerEvents = '');
    if (machine) machine.style.pointerEvents = '';
  }

  function open() {
    overlay.classList.add('open');
    document.body.classList.add('menu-open');   // lock bg scroll
    trigger.setAttribute('aria-expanded', 'true');
    disableCanvasPointer();                     // <- critical on nodes page
  }
  function close() {
    overlay.classList.remove('open');
    document.body.classList.remove('menu-open');
    trigger.setAttribute('aria-expanded', 'false');
    enableCanvasPointer();
  }
  function toggle() {
    if (busy) return;
    busy = true;
    isOpen() ? close() : open();
    setTimeout(() => busy = false, 320);
  }

  // Open/close
  trigger.addEventListener('click', (e) => { e.stopPropagation(); toggle(); }, { passive: true });
  trigger.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); toggle(); }, { passive: false });

  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); }, { passive: true });

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); }, { passive: true });

  // Links: always navigate (Swup if available), even if something prevented default
  overlay.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault(); // we will drive navigation
      const href = a.getAttribute('href');
      close();
      if (window.swup && typeof window.swup.navigate === 'function') {
        window.swup.navigate(href);
      } else if (href) {
        window.location.href = href;
      }
    }, { passive: false });
  });

  // ESC to close
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });
}

// ---------- boot + swup rebind ----------
function boot() {
  wirePageToggles();
  initMobileMenu();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// When Swup swaps content, elements are replaced -> rebind everything
document.addEventListener('swup:contentReplaced', () => {
  boot();
});


(function () {
  function initSlider(root) {
    const track = root.querySelector('.slides');
    const slides = Array.from(track.children);
    const prev = root.querySelector('.slider-arrow.prev');
    const next = root.querySelector('.slider-arrow.next');
    let index = 0;

    function go(i) {
      index = (i + slides.length) % slides.length;   // wrap around
      track.style.transform = `translateX(${-index * 100}%)`;
    }

    prev.addEventListener('click', () => go(index - 1));
    next.addEventListener('click', () => go(index + 1));
    window.addEventListener('resize', () => go(index)); // keep position on resize
    go(0);
  }

  document.querySelectorAll('.index-item-images.slider').forEach(initSlider);
})();

