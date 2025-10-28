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
    if (!next || !next.classList.contains('index-item')) return;
  
    const isOpening = next.classList.contains('is-hidden'); // current state before toggle
  
    // Close ALL other items
    document.querySelectorAll('.index-item:not(.is-hidden)').forEach(openItem => {
      if (openItem !== next) openItem.classList.add('is-hidden');
    });
  
    // Toggle the clicked one (open if it was closed; close if it was open)
    next.classList.toggle('is-hidden', !isOpening);
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



  (function(){
    const tip   = document.getElementById('hand-tip');
    const btnH  = document.getElementById('btn-hand');
    const btnM  = document.getElementById('btn-mouse');

    function openTip(){ tip.classList.add('is-open'); tip.setAttribute('aria-hidden','false'); }
    function closeTip(){ tip.classList.remove('is-open'); tip.setAttribute('aria-hidden','true'); }

    // Clicking the hand button: enable hand control + show quick guide the first time
    let shownOnce = false;
    btnH?.addEventListener('click', async () => {
      btnH.classList.add('is-active'); btnM?.classList.remove('is-active');
      window.enableHandKnobControl?.();
      if (!shownOnce){ openTip(); shownOnce = true; }
    });

    // Mouse button: disable hand mode
    btnM?.addEventListener('click', () => {
      btnM.classList.add('is-active'); btnH?.classList.remove('is-active');
      window.disableHandKnobControl?.();
    });

    // Close actions (backdrop + button)
    tip?.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeTip(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTip(); });

    // Optional: pick initial active state (mouse on)
    btnM?.classList.add('is-active');

    // Safety: keep modal above any stacking contexts
    document.addEventListener('DOMContentLoaded', () => {
      tip && (tip.style.zIndex = '99999');
    });
  })();


  function applyNoImageMode() {
    document.querySelectorAll('.index-item').forEach(item => {
      const wrapper = item.querySelector('.index-item-images');
      if (!wrapper) {
        item.classList.add('no-images');
        return;
      }
      const imgs = wrapper.querySelectorAll('.slides img');
      const hasRealImage = Array.from(imgs).some(img => {
        const s = (img.getAttribute('src') || '').trim();
        return s && !s.startsWith('#');
      });
  
      if (!hasRealImage) {
        // Hide arrows and image wrapper, expand text
        item.classList.add('no-images');
        // optional: remove slider arrows entirely
        wrapper.querySelectorAll('.slider-arrow').forEach(b => b.remove());
      } else {
        item.classList.remove('no-images');
      }
    });
  }
  function boot() {
    wirePageToggles();
    initMobileMenu();
    applyNoImageMode();   // <— add this line
  }
  document.addEventListener('swup:contentReplaced', () => {
    boot();               // apply again after Swup swaps content
  });
  





  // Utility: check if a project's data-tags contains the clicked tag
  function projectMatchesTag(projectEl, tag) {
    if (tag === "All") return true;
    const tags = (projectEl.getAttribute("data-tags") || "")
      .split(",")
      .map(t => t.trim().toLowerCase());
    return tags.includes(tag.toLowerCase());
  }


   // Get tags straight from each header row
   function headerTags(h) {
    const raw = h?.dataset?.tag || "";
    return raw.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
  }

  (function initTagFilter() {
    const bar      = document.getElementById("searchFilter");
    if (!bar) return;

    const buttons  = Array.from(bar.querySelectorAll(".filter-item"));
    const headers  = Array.from(document.querySelectorAll(".list-projects1"));

    function clearHighlight() {
      headers.forEach(h => h.classList.remove("is-highlight"));
      buttons.forEach(b => b.classList.remove("active"));
    }

    function applyHighlight(tag) {
      const needle = (tag || "").toLowerCase();

      // If "All", highlight everything; if empty/unknown, clear all.
      if (!needle) { clearHighlight(); return; }

      const highlightAll = needle === "all";

      headers.forEach(h => {
        const match = highlightAll || headerTags(h).includes(needle);
        h.classList.toggle("is-highlight", match);
      });
    }

    // ⛔️ No default selection on load:
    clearHighlight();

    // Click => set active, apply highlight
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        // single-select appearance
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        applyHighlight(btn.dataset.tag);
      });
    });
  })();