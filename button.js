(() => {
    const fab = document.getElementById('fabBtn');
    const modal = document.getElementById('suggestionModal');
    const form = document.getElementById('suggestionForm');
    const sendBtn = document.getElementById('sendBtn');
    const titleInput = document.getElementById('title');
    const descInput = document.getElementById('description');
    const closeEls = Array.from(modal.querySelectorAll('[data-close]'));
  
    // 🔗 Put YOUR Google Apps Script Web App URL (must end with /exec) right here:
    const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxNnv8za_AdYcF7bNpfpDQJKUHE2wK27DzvyhT-7IVcBxGkBM_d3TH8aeEW2I4DKX-CvA/exec";
  
    let expanded = false;
    let lastFocused = null;
  
    function setExpanded(next) {
      expanded = next;
      fab.classList.toggle('expanded', expanded);
      fab.setAttribute('aria-label', expanded ? 'Open suggestion form' : 'Have a suggestion?');
    }
  
    function openModal() {
      lastFocused = document.activeElement;
      modal.classList.add('open');
      const first = modal.querySelector('input, textarea, button');
      (first || modal).focus();
      document.addEventListener('keydown', onKeydown);
    }
  
    function closeModal() {
      modal.classList.remove('open');
      document.removeEventListener('keydown', onKeydown);
      if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    }
  
    function onKeydown(e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeModal(); }
    }
  
    function updateSendState() {
      const canSend = titleInput.value.trim().length > 0 && descInput.value.trim().length > 0;
      sendBtn.disabled = !canSend;
    }
  
    // --- Events ---
    fab.addEventListener('click', () => {
      if (!expanded) setExpanded(true);
      else openModal();
    });
  
    modal.querySelector('.backdrop').addEventListener('click', closeModal);
    closeEls.forEach(el => el.addEventListener('click', closeModal));
  
    titleInput.addEventListener('input', updateSendState);
    descInput.addEventListener('input', updateSendState);
  
    // Submit handler (x-www-form-urlencoded is simplest with Apps Script)
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
        closeModal();
      }
    });
  
    // init
    setExpanded(false);
    updateSendState();
  })();
  