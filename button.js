(() => {
  const fab = document.getElementById('fabBtn');
  const modal = document.getElementById('suggestionModal');
  const form = document.getElementById('suggestionForm');
  const sendBtn = document.getElementById('sendBtn');
  const titleInput = document.getElementById('title');
  const descInput = document.getElementById('description');
  const closeEls = Array.from(modal.querySelectorAll('[data-close]'));

  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxNnv8za_AdYcF7bNpfpDQJKUHE2wK27DzvyhT-7IVcBxGkBM_d3TH8aeEW2I4DKX-CvA/exec";

  let expanded = false;
  let lastFocused = null;

  const isModalOpen = () => modal.classList.contains('open');

  function setExpanded(next) {
    expanded = next;
    fab.classList.toggle('expanded', expanded);
    fab.setAttribute('aria-label', expanded ? 'Open suggestion form' : 'Have a suggestion?');
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeModal(); }
  }

  function openModal() {
    lastFocused = document.activeElement;
    modal.classList.add('open');
    document.body.classList.add('modal-open');    // lock background
    const first = modal.querySelector('input, textarea, button');
    (first || modal).focus();
    document.addEventListener('keydown', onKeydown);
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.classList.remove('modal-open'); // unlock background
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    setExpanded(false); // 👈 collapse FAB back to a circle
  }

  function updateSendState() {
    const canSend = titleInput.value.trim().length > 0 && descInput.value.trim().length > 0;
    sendBtn.disabled = !canSend;
  }


  // --- Events ---
fab.addEventListener('click', (e) => {
  // prevent bubbling to any global "click outside" handlers (mobile menu)
  e.stopPropagation();

  if (!expanded) {
    // 1st tap: expand the pill
    setExpanded(true);
  } else {
    // 2nd tap: open the modal (keep the FAB expanded until modal closes)
    openModal();
  }
});

// Also stop propagation when interacting with the modal,
// so backdrop clicks don't get treated as "outside menu" clicks
// --- Events ---
fab.addEventListener('click', (e) => {
  e.stopPropagation();
  e.stopImmediatePropagation();
  // On iOS, prevent ghost click from touchend
  e.preventDefault();

  if (!expanded) {
    setExpanded(true);      // 1st tap expands
  } else {
    openModal();            // 2nd tap opens form
  }
});

// Make all modal interactions local; don't let them bubble to "outside click" logic
['click','touchstart','touchend'].forEach(type => {
  modal.addEventListener(type, (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, { passive: false });
});

modal.querySelector('.backdrop').addEventListener('click', closeModal);
closeEls.forEach(el => el.addEventListener('click', (e) => {
  e.stopPropagation();
  closeModal();
}));


  titleInput.addEventListener('input', updateSendState);
  descInput.addEventListener('input', updateSendState);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sendBtn.disabled) return;

    const data = Object.fromEntries(new FormData(form).entries());

    try {
      sendBtn.disabled = true;
      sendBtn.textContent = "Sending…";

      const res = await fetch(WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams(data).toString(),
        cache: "no-store"
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} – ${text.slice(0, 200)}`);
      }

      alert("✅ Thank you! Your suggestion was sent.");
    } catch (err) {
      console.error("Error:", err);
      alert("❌ Could not send your suggestion.\n\n" + err.message);
    } finally {
      sendBtn.textContent = "Send";
      sendBtn.disabled = false;
      form.reset();
      updateSendState();
      closeModal(); // also collapses the FAB
    }
  });

  // init
  setExpanded(false);
  updateSendState();
})();

function openModal() {
  lastFocused = document.activeElement;
  modal.classList.add('open');
  document.body.classList.add('modal-open');

  // delay focus until after paint
  setTimeout(() => {
    const first = modal.querySelector('input, textarea, button');
    if (first) first.focus({ preventScroll: true });
  }, 0);

  document.addEventListener('keydown', onKeydown);
}
