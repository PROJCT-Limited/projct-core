(() => {
    const form = document.querySelector('.footer-newsletter.newsletter');
    if (!form) return;
  
    const emailInput = form.querySelector('input[type="email"][name="email"]');
    const btn        = form.querySelector('.newsletter-submit');
    let   msgEl      = form.querySelector('.newsletter-msg');
  

    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzpxdBPByigTvT8xmPHi4bnmOWh8-VgHtHcIbB4XX7Oh6Lz4znqzNc5YQaWhgccmBPm7w/exec';
  
    // Add a live region if missing
    if (!msgEl) {
      msgEl = document.createElement('p');
      msgEl.className = 'newsletter-msg';
      msgEl.setAttribute('aria-live', 'polite');
      msgEl.style.marginTop = '8px';
      msgEl.style.minHeight = '1em';
      form.appendChild(msgEl);
    }
  
    // Hidden honey-pot field to reduce spam
    if (!form.querySelector('input[name="hp"]')) {
      const hp = document.createElement('input');
      hp.type = 'text';
      hp.name = 'hp';
      hp.tabIndex = -1;
      hp.autocomplete = 'off';
      hp.style.position = 'absolute';
      hp.style.left = '-9999px';
      form.appendChild(hp);
    }
  
    const isValidEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v||'').trim());
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const email = (emailInput?.value || '').trim();
      if (!isValidEmail(email)) {
        msgEl.textContent = 'Please enter a valid email address.';
        emailInput?.focus();
        return;
      }
  
      const data = new URLSearchParams({
        email,
        source: location.pathname || 'website',
        hp: form.querySelector('input[name="hp"]')?.value || ''
      });
  
      const prev = btn?.textContent;
      if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }
      msgEl.textContent = '';
  
      try {
        const res = await fetch(WEB_APP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: data.toString(),
          cache: 'no-store'
        });
  
        if (!res.ok) {
          const txt = await res.text().catch(()=>'');
          throw new Error(`HTTP ${res.status} ${res.statusText} – ${txt.slice(0,200)}`);
        }
  
        const json = await res.json().catch(()=> ({}));
        if (!json.ok) throw new Error(json.error || 'Subscription failed');
  
        msgEl.textContent = json.dedup ? 'You’re already subscribed. ✅' : 'Thanks for subscribing! ✅';
        form.reset();
      } catch (err) {
        console.error('Newsletter error:', err);
        msgEl.textContent = 'Could not subscribe right now. Please try again.';
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = prev || '→ Subscribe'; }
      }
    });
  })();