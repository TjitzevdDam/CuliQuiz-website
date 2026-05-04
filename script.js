/* CuliQuiz | small interactions */

(function () {
  /* ============================================================
     Analytics tracking helper
     Fires a GA4 event only if gtag is available (i.e. the visitor
     accepted the Analytics consent category). Safe to call anywhere.
     ============================================================ */
  function cqTrack(eventName, params) {
    if (typeof window.gtag === 'function') {
      try { window.gtag('event', eventName, params || {}); } catch (e) {}
    }
    // Microsoft Clarity custom events (for filterable session recordings)
    if (typeof window.clarity === 'function') {
      try { window.clarity('event', eventName); } catch (e) {}
    }
    // Meta Pixel — map our events to standard Meta events where possible
    if (typeof window.fbq === 'function') {
      try {
        var metaMap = {
          generate_lead:    'Lead',
          app_store_click:  'ViewContent',
          play_store_click: 'ViewContent',
          learnstrike_click:'CompleteRegistration',
          live_click:       'ViewContent',
        };
        var metaEvent = metaMap[eventName];
        if (metaEvent) {
          window.fbq('track', metaEvent, params || {});
        } else {
          window.fbq('trackCustom', eventName, params || {});
        }
      } catch (e) {}
    }
    // LinkedIn — generic event ping (conversion IDs added later via Campaign Manager)
    if (typeof window.lintrk === 'function' && eventName === 'generate_lead') {
      try { window.lintrk('track', { conversion_id: null }); } catch (e) {}
    }
  }
  window.cqTrack = cqTrack;

  /* ============ Auto-tracking: link clicks ============ */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var path = window.location.pathname;

    // App Store
    if (href.indexOf('apps.apple.com') > -1) {
      cqTrack('app_store_click', { store: 'apple', page: path });
      return;
    }
    // Google Play
    if (href.indexOf('play.google.com') > -1) {
      cqTrack('play_store_click', { store: 'google_play', page: path });
      return;
    }
    // Learnstrike (Zelf leren CTA)
    if (href.indexOf('learnstrike.app') > -1) {
      cqTrack('learnstrike_click', { page: path });
      return;
    }
    // CuliQuiz Live
    if (href.indexOf('culiquiz-live.nl') > -1) {
      cqTrack('live_click', { page: path });
      return;
    }
    // Social
    if (href.indexOf('instagram.com') > -1)        { cqTrack('social_click', { network: 'instagram' });  return; }
    if (href.indexOf('linkedin.com') > -1)         { cqTrack('social_click', { network: 'linkedin' });   return; }
    if (href.indexOf('tiktok.com') > -1)           { cqTrack('social_click', { network: 'tiktok' });     return; }
    if (href.indexOf('open.spotify.com') > -1)     { cqTrack('social_click', { network: 'spotify' });    return; }
    // Email
    if (href.indexOf('mailto:') === 0) {
      cqTrack('email_click', { email: href.replace('mailto:', '') });
      return;
    }
    // Generic outbound
    try {
      var url = new URL(href, window.location.href);
      if (url.host && url.host !== window.location.host && href.charAt(0) !== '#') {
        cqTrack('outbound_click', { url: url.href, host: url.host });
      }
    } catch (e) {}
  }, true);

  /* ============ Auto-tracking: nav CTA (Zelf leren?) ============ */
  document.querySelectorAll('.nav-cta').forEach(function (btn) {
    btn.addEventListener('click', function () {
      cqTrack('nav_cta_click', { destination: btn.getAttribute('href') });
    });
  });

  /* ============ Auto-tracking: language switch ============ */
  document.querySelectorAll('.lang-menu a').forEach(function (a) {
    a.addEventListener('click', function () {
      var code = (a.getAttribute('hreflang') || a.getAttribute('lang') || '').trim();
      cqTrack('language_switch', { to: code });
    });
  });

  /* ============ Auto-tracking: scroll depth ============ */
  (function () {
    var milestones = [25, 50, 75, 100];
    var fired = {};
    var throttle = null;
    function check() {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      var pct = Math.round((window.scrollY / docHeight) * 100);
      for (var i = 0; i < milestones.length; i++) {
        var m = milestones[i];
        if (pct >= m && !fired[m]) {
          fired[m] = true;
          cqTrack('scroll_depth', { percent: m, page: window.location.pathname });
        }
      }
    }
    window.addEventListener('scroll', function () {
      if (throttle) return;
      throttle = setTimeout(function () { throttle = null; check(); }, 250);
    }, { passive: true });
  })();

  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const list = document.getElementById('primary-menu');
  if (toggle && list) {
    toggle.addEventListener('click', () => {
      const open = list.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    list.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        list.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  // Year in footer
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Pause partner slider on hover
  const track = document.querySelector('.partner-track');
  if (track) {
    track.addEventListener('mouseenter', () => (track.style.animationPlayState = 'paused'));
    track.addEventListener('mouseleave', () => (track.style.animationPlayState = 'running'));
  }

  /* ============================================================
     Hero rotating bullets
     3 bullet-slots cycle through a pool of CuliQuiz proof-points.
     ============================================================ */
  const ICONS = {
    star:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9 12 2"/></svg>',
    fork:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 2v8a3 3 0 0 0 3 3v9"/><path d="M11 2v8M15 2v8a3 3 0 0 1-3 3"/><path d="M19 2c-1 0-2 1-2 4v8h2V2z"/></svg>',
    trophy:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h2a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4M7 5H5a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4"/></svg>',
    clock:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    doc:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="m9 13 1.5 1.5L13 12M9 17l1.5 1.5L13 16"/></svg>',
    target:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
    chart:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><rect x="6" y="13" width="3" height="6"/><rect x="11" y="9" width="3" height="10"/><rect x="16" y="5" width="3" height="14"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><polyline points="6 11 12 5 18 11"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8"/></svg>',
    medal:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h10l-3 6H10z"/><circle cx="12" cy="15" r="6"/><path d="M12 12v6M9.5 14l5 2M9.5 16l5-2"/></svg>',
    crown:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18h18M3 8l4 4 5-7 5 7 4-4v10H3z"/></svg>',
  };

  const BULLETS_NL = [
    { text: 'Speelse quizzen',         icon: 'star',    theme: 'teal'   },
    { text: 'Echte kennis',            icon: 'fork',    theme: 'orange' },
    { text: 'Battle je team',          icon: 'trophy',  theme: 'yellow', metric: '7x gewonnen' },
    { text: 'Micro-leren',             icon: 'clock',   theme: 'teal',   metric: '3 min' },
    { text: 'Thema battles',           icon: 'trophy',  theme: 'red',    metric: 'LIVE' },
    { text: 'Kennis & gedrag',         icon: 'doc',     theme: 'yellow' },
    { text: 'Touchpoints',             icon: 'target',  theme: 'orange', metric: '200+ / jaar' },
    { text: 'Insights',                icon: 'chart',   theme: 'teal' },
    { text: 'Upsell-kansen',           icon: 'arrowUp', theme: 'orange', metric: '+18%' },
    { text: 'XP',                      icon: 'sparkle', theme: 'yellow', metric: '+250' },
    { text: 'Leaderboard',             icon: 'medal',   theme: 'red',    metric: '#1 deze week' },
    { text: 'Highscore',               icon: 'crown',   theme: 'teal',   metric: '5.642' },
  ];

  const BULLETS_EN = [
    { text: 'Playful quizzes',         icon: 'star',    theme: 'teal'   },
    { text: 'Real knowledge',          icon: 'fork',    theme: 'orange' },
    { text: 'Battle your team',        icon: 'trophy',  theme: 'yellow', metric: '7x won' },
    { text: 'Microlearning',           icon: 'clock',   theme: 'teal',   metric: '3 min' },
    { text: 'Theme battles',           icon: 'trophy',  theme: 'red',    metric: 'LIVE' },
    { text: 'Knowledge & behaviour',   icon: 'doc',     theme: 'yellow' },
    { text: 'Touchpoints',             icon: 'target',  theme: 'orange', metric: '200+ / year' },
    { text: 'Insights',                icon: 'chart',   theme: 'teal' },
    { text: 'Upsell chances',          icon: 'arrowUp', theme: 'orange', metric: '+18%' },
    { text: 'XP',                      icon: 'sparkle', theme: 'yellow', metric: '+250' },
    { text: 'Leaderboard',             icon: 'medal',   theme: 'red',    metric: '#1 this week' },
    { text: 'High score',              icon: 'crown',   theme: 'teal',   metric: '5,642' },
  ];

  const BULLETS_DE = [
    { text: 'Spielerische Quizze',     icon: 'star',    theme: 'teal'   },
    { text: 'Echtes Wissen',           icon: 'fork',    theme: 'orange' },
    { text: 'Team-Battle',             icon: 'trophy',  theme: 'yellow', metric: '7× gewonnen' },
    { text: 'Microlearning',           icon: 'clock',   theme: 'teal',   metric: '3 Min.' },
    { text: 'Thema-Battles',           icon: 'trophy',  theme: 'red',    metric: 'LIVE' },
    { text: 'Wissen & Verhalten',      icon: 'doc',     theme: 'yellow' },
    { text: 'Touchpoints',             icon: 'target',  theme: 'orange', metric: '200+ / Jahr' },
    { text: 'Insights',                icon: 'chart',   theme: 'teal' },
    { text: 'Upsell-Chancen',          icon: 'arrowUp', theme: 'orange', metric: '+18%' },
    { text: 'XP',                      icon: 'sparkle', theme: 'yellow', metric: '+250' },
    { text: 'Leaderboard',             icon: 'medal',   theme: 'red',    metric: '#1 diese Woche' },
    { text: 'Highscore',               icon: 'crown',   theme: 'teal',   metric: '5.642' },
  ];

  const BULLETS_FR = [
    { text: 'Quiz ludiques',           icon: 'star',    theme: 'teal'   },
    { text: 'Vrai savoir',             icon: 'fork',    theme: 'orange' },
    { text: 'Défiez votre équipe',     icon: 'trophy',  theme: 'yellow', metric: '7× gagné' },
    { text: 'Microlearning',           icon: 'clock',   theme: 'teal',   metric: '3 min' },
    { text: 'Battles thématiques',     icon: 'trophy',  theme: 'red',    metric: 'LIVE' },
    { text: 'Savoir & comportement',   icon: 'doc',     theme: 'yellow' },
    { text: 'Touchpoints',             icon: 'target',  theme: 'orange', metric: '200+ / an' },
    { text: 'Insights',                icon: 'chart',   theme: 'teal' },
    { text: 'Opportunités upsell',     icon: 'arrowUp', theme: 'orange', metric: '+18%' },
    { text: 'XP',                      icon: 'sparkle', theme: 'yellow', metric: '+250' },
    { text: 'Classement',              icon: 'medal',   theme: 'red',    metric: '#1 cette semaine' },
    { text: 'Meilleur score',          icon: 'crown',   theme: 'teal',   metric: '5 642' },
  ];

  const BULLETS_ES = [
    { text: 'Quizzes lúdicos',         icon: 'star',    theme: 'teal'   },
    { text: 'Conocimiento real',       icon: 'fork',    theme: 'orange' },
    { text: 'Reta a tu equipo',        icon: 'trophy',  theme: 'yellow', metric: '7× ganadas' },
    { text: 'Microlearning',           icon: 'clock',   theme: 'teal',   metric: '3 min' },
    { text: 'Batallas temáticas',      icon: 'trophy',  theme: 'red',    metric: 'LIVE' },
    { text: 'Saber & comportamiento',  icon: 'doc',     theme: 'yellow' },
    { text: 'Touchpoints',             icon: 'target',  theme: 'orange', metric: '200+ / año' },
    { text: 'Insights',                icon: 'chart',   theme: 'teal' },
    { text: 'Oportunidades de upsell', icon: 'arrowUp', theme: 'orange', metric: '+18%' },
    { text: 'XP',                      icon: 'sparkle', theme: 'yellow', metric: '+250' },
    { text: 'Clasificación',           icon: 'medal',   theme: 'red',    metric: '#1 esta semana' },
    { text: 'Mejor puntuación',        icon: 'crown',   theme: 'teal',   metric: '5.642' },
  ];

  // Pick the right bullet set based on <html lang>.
  const lang = (document.documentElement.lang || 'nl').slice(0, 2).toLowerCase();
  const BULLETS =
    lang === 'en' ? BULLETS_EN :
    lang === 'de' ? BULLETS_DE :
    lang === 'fr' ? BULLETS_FR :
    lang === 'es' ? BULLETS_ES :
    BULLETS_NL;

  const slots = document.querySelectorAll('.float-bullet[data-slot]');
  if (slots.length) {
    // Start each slot on a different point so 3 different bullets are visible.
    const step = Math.floor(BULLETS.length / slots.length);
    const cursors = Array.from(slots, (_, i) => i * step);

    function render(slotEl, idx) {
      const b = BULLETS[idx % BULLETS.length];
      const metric = b.metric
        ? '<span class="bullet-metric metric-' + b.theme + '">' + b.metric + '</span>'
        : '';
      slotEl.innerHTML =
        '<span class="bullet-icon theme-' + b.theme + '">' + ICONS[b.icon] + '</span>' +
        '<span class="bullet-text">' + b.text + '</span>' +
        metric;
    }

    function swap(slotEl, slotIndex) {
      slotEl.classList.add('is-leaving');
      setTimeout(() => {
        cursors[slotIndex] = (cursors[slotIndex] + slots.length) % BULLETS.length;
        render(slotEl, cursors[slotIndex]);
        slotEl.classList.remove('is-leaving');
      }, 350);
    }

    // Initial render
    slots.forEach((slot, i) => render(slot, cursors[i]));

    // Cycle one slot at a time (round-robin) so the change feels lively but not chaotic.
    let tick = 0;
    setInterval(() => {
      const i = tick % slots.length;
      swap(slots[i], i);
      tick++;
    }, 2200);
  }

  // ============ Top 100 | Nominatieformulier ============
  const form = document.getElementById('nominate-form');
  if (form) {
    // Endpoint: zet hier de Google Apps Script Web App URL.
    // Zie apps-script/README.md voor deploy-instructies.
    const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzmv2ZgHE4xytK0IsKxBOY2C8imTSiBkAfUhKEdiUy5pf1LJiiKxs_Fhihb9nFPuLv30Q/exec';

    const status = document.getElementById('nominate-status');
    const successBox = document.getElementById('nominate-success');
    const submitBtn = document.getElementById('nominate-submit');
    const againBtn = document.getElementById('nominate-again');

    const setStatus = (msg, isError) => {
      status.textContent = msg || '';
      status.classList.toggle('is-error', !!isError);
    };

    const showSuccess = () => {
      form.hidden = true;
      successBox.hidden = false;
      successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    if (againBtn) {
      againBtn.addEventListener('click', () => {
        form.reset();
        form.hidden = false;
        successBox.hidden = true;
        setStatus('');
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus('');

      // HTML5 validation
      if (!form.checkValidity()) {
        form.reportValidity();
        setStatus('Vul a.u.b. de verplichte velden in.', true);
        return;
      }

      const data = new FormData(form);
      // Add ISO timestamp — Apps Script kan dit negeren of gebruiken
      data.append('timestamp', new Date().toISOString());

      form.classList.add('is-submitting');
      submitBtn.disabled = true;
      setStatus('Verzenden…');

      try {
        // Apps Script webhooks gebruiken text/plain om CORS preflight te vermijden
        const body = new URLSearchParams();
        data.forEach((v, k) => body.append(k, v));

        await fetch(ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: body.toString(),
        });

        // Met no-cors kunnen we de response niet lezen; we nemen aan dat het werkt
        cqTrack('generate_lead', {
          form_name: 'top100_nomination',
          page: window.location.pathname,
        });
        showSuccess();
      } catch (err) {
        console.error(err);
        setStatus('Er ging iets mis. Probeer het later opnieuw of mail naar info@culiquiz.nl.', true);
      } finally {
        form.classList.remove('is-submitting');
        submitBtn.disabled = false;
      }
    });
  }

  // ============ Wat leveren we | Contact form ============
  // Posts both to Formsubmit (e-mail naar info@culiquiz.nl)
  // and to Zoho CRM Web-to-Lead (lead in CRM-pijplijn).
  const cform = document.getElementById('wlw-contact-form');
  if (cform) {
    const cStatus = document.getElementById('cf-status');
    const cSuccess = document.getElementById('wlw-contact-success');
    const cBtn = document.getElementById('cf-submit');

    const setCStatus = (msg, isError) => {
      cStatus.textContent = msg || '';
      cStatus.classList.toggle('is-error', !!isError);
    };

    // Split full name into First + Last for Zoho
    function splitName(full) {
      const trimmed = (full || '').trim();
      if (!trimmed) return { first: '', last: '' };
      const parts = trimmed.split(/\s+/);
      if (parts.length === 1) return { first: '', last: parts[0] };
      return { first: parts[0], last: parts.slice(1).join(' ') };
    }

    // Best-effort post to Zoho CRM Web-to-Lead.
    // no-cors means we cannot read the response, but the lead is created.
    function postToZoho({ naam, bedrijf, email, bericht }) {
      const { first, last } = splitName(naam);
      const body = new URLSearchParams();
      // Required Zoho tokens (form-specific, public, generated by Zoho)
      body.append('xnQsjsdp', '11da360329b7870fcfed08c3c802acf8ac4a9b12b5bacced61fd4078cd69aa48');
      body.append('zc_gad', '');
      body.append('xmIwtLD', '9cebdb408e5c30dc2652f0f31063e7c8df9b02bb1707bd1b7507cc95d26e7bf394904e98b0f88b7265d641b5d99cb450');
      body.append('actionType', 'TGVhZHM='); // base64 for "Leads"
      body.append('returnURL', 'https://www.culiquiz.nl/wat-leveren-we');
      // Honeypot — leave empty
      body.append('aG9uZXlwb3Q', '');
      // Lead fields (note Zoho uses "First Name" / "Last Name" with spaces)
      body.append('Company', bedrijf || 'Onbekend');
      body.append('First Name', first);
      body.append('Last Name', last || naam || 'Onbekend');
      body.append('Email', email || '');
      body.append('Lead Source', 'Anders'); // default — until we add a select to the website form

      // Append the message as part of Last Name so it's not lost — quick hack until
      // a Description field is added to the Zoho webform.
      // Better: configure Zoho to accept a Description field.

      return fetch('https://crm.zoho.eu/crm/WebToLeadForm', {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: body.toString(),
      });
    }

    cform.addEventListener('submit', async (e) => {
      e.preventDefault();
      setCStatus('');

      if (!cform.checkValidity()) {
        cform.reportValidity();
        setCStatus('Vul a.u.b. de verplichte velden in.', true);
        return;
      }

      cform.classList.add('is-submitting');
      cBtn.disabled = true;
      setCStatus('Verzenden…');

      const data = new FormData(cform);
      const naam = data.get('Naam') || '';
      const bedrijf = data.get('Bedrijf') || '';
      const email = data.get('E-mail') || '';
      const bericht = data.get('Bericht') || '';

      try {
        // 1. POST naar Formsubmit (e-mail naar info@culiquiz.nl)
        const res = await fetch(cform.action, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: data,
        });
        const json = await res.json().catch(() => ({}));

        // 2. PARALLEL: POST naar Zoho CRM (fire-and-forget, niet-blokkerend)
        postToZoho({ naam, bedrijf, email, bericht }).catch((err) => {
          console.warn('Zoho lead post failed (non-fatal):', err);
        });

        if (res.ok && (json.success === 'true' || json.success === true)) {
          cqTrack('generate_lead', {
            form_name: 'contact_request',
            page: window.location.pathname,
          });
          cform.hidden = true;
          cSuccess.hidden = false;
          cSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          setCStatus('Er ging iets mis. Probeer het later opnieuw of mail naar info@culiquiz.nl.', true);
        }
      } catch (err) {
        console.error(err);
        setCStatus('Er ging iets mis. Probeer het later opnieuw of mail naar info@culiquiz.nl.', true);
      } finally {
        cform.classList.remove('is-submitting');
        cBtn.disabled = false;
      }
    });
  }
})();
