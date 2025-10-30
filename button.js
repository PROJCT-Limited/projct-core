
  (() => {
    const fab        = document.getElementById('fabBtn');                  // keep your FAB id
    const modal      = document.getElementById('suggestionModal');         // matches your HTML
    const form       = document.querySelector('.suggestion-form');         // CHANGED (was #suggestionForm)
    const sendBtn    = form?.querySelector('.btn-primary');                // CHANGED (was #sendBtn)
    const titleInput = form?.querySelector('#node');                       // CHANGED (was #title)
    const descInput  = form?.querySelector('#description');                // same
    const closeEls   = modal ? Array.from(modal.querySelectorAll('[data-close]')) : [];
  
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzuWT2WvhiqNPMtlcvobGt34dHmhE7CQhDAmffdFY6KOMzBykS5mvZbp3OD3N3rYSf4PA/exec';
  
    if (!fab || !modal || !form || !sendBtn || !titleInput || !descInput) {
      console.warn('[suggestions] UI not found on this page; skipping init');
      return;
    }
  
    let expanded = false, lastFocused = null;
    const setExpanded = (next) => {
      expanded = next;
      fab.classList.toggle('expanded', expanded);
      fab.setAttribute('aria-label', expanded ? 'Open suggestion form' : 'Have a suggestion?');
    };
    const onKeydown = (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeModal(); } };
    function openModal() {
      lastFocused = document.activeElement;
      modal.classList.add('open');
      document.body.classList.add('modal-open');
      setTimeout(() => {
        const first = modal.querySelector('input, textarea, button');
        (first || modal).focus({ preventScroll: true });
      }, 0);
      document.addEventListener('keydown', onKeydown);
    }
    function closeModal() {
      modal.classList.remove('open');
      document.body.classList.remove('modal-open');
      document.removeEventListener('keydown', onKeydown);
      if (lastFocused?.focus) lastFocused.focus();
      setExpanded(false);
    }
    function updateSendState() {
      const canSend = titleInput.value.trim().length > 0 && descInput.value.trim().length > 0;
      sendBtn.disabled = !canSend;
    }
  
    fab.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      if (!expanded) setExpanded(true); else openModal();
    });
    modal.querySelector('.backdrop')?.addEventListener('click', closeModal);
    closeEls.forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); closeModal(); }));
    ;['input','change'].forEach(ev => {
      titleInput.addEventListener(ev, updateSendState);
      descInput.addEventListener(ev, updateSendState);
    });
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sendBtn.disabled) return;
  
      // Map your field names to what the server expects
      const payload = new URLSearchParams({
        title: titleInput.value.trim(),              // your #node → title
        description: descInput.value.trim()
      }).toString();
  
      try {
        sendBtn.disabled = true; sendBtn.textContent = 'Sending…';
        const res = await fetch(WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: payload,
          cache: 'no-store'
        });
        if (!res.ok) {
          const text = await res.text().catch(()=>'');
          throw new Error(`HTTP ${res.status} ${res.statusText} – ${text.slice(0,200)}`);
        }
        alert('✅ Thank you! Your suggestion was sent.');
        form.reset(); updateSendState(); closeModal();
      } catch (err) {
        console.error('Error:', err);
        alert('❌ Could not send your suggestion.\n\n' + err.message);
      } finally {
        sendBtn.disabled = false; sendBtn.textContent = 'Submit';
      }
    });
  
    // init
    setExpanded(false);
    updateSendState();
  })();