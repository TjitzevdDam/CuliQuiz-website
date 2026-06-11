/* CuliQuiz | small interactions */

(function () {
  /* ============================================================
     Click-ID capture (GCLID, FBCLID, LI_FAT_ID, MSCLKID, TTCLID)
     Reads the click-tracking parameters Google/Meta/LinkedIn add
     to landing URLs and stores them for 90 days, so we can attach
     them to the contact-form submission later (offline conversion
     tracking — needed for Google Ads → Zoho Deals integration).
     ============================================================ */
  (function captureClickIds() {
    try {
      var params = new URLSearchParams(window.location.search);
      var keys = {
        gclid:    'cq_gclid',     // Google Ads
        gbraid:   'cq_gbraid',    // Google Ads (iOS)
        wbraid:   'cq_wbraid',    // Google Ads (web → app)
        fbclid:   'cq_fbclid',    // Meta
        msclkid:  'cq_msclkid',   // Microsoft Ads
        li_fat_id:'cq_li_fat_id', // LinkedIn
        ttclid:   'cq_ttclid',    // TikTok
      };
      var ttl = 90 * 24 * 60 * 60 * 1000; // 90 days
      Object.keys(keys).forEach(function (k) {
        var v = params.get(k);
        if (v) {
          try {
            localStorage.setItem(keys[k], JSON.stringify({ v: v, t: Date.now() + ttl }));
          } catch (e) {}
        }
      });
    } catch (e) {}
  })();

  // Read a stored click-ID, expires after TTL
  function readClickId(key) {
    try {
      var raw = localStorage.getItem('cq_' + key);
      if (!raw) return '';
      var obj = JSON.parse(raw);
      if (obj && obj.t && obj.t > Date.now()) return obj.v || '';
      // expired — clear
      localStorage.removeItem('cq_' + key);
    } catch (e) {}
    return '';
  }
  window.cqReadClickId = readClickId;

  /* ============================================================
     Anti-bot defense voor alle Formsubmit-forms.
     Bots posten doorgaans direct na page-load en negeren of vullen
     juist de honeypot. Drie checks:
       1. Honeypot _honey ingevuld -> bot
       2. Tijd tussen form-load en submit te kort -> bot
       3. Geen enkele user-interaction (keyboard/pointer) op de form -> bot
     Bij detect: silent block. Geen errorstate tonen — anders leren
     bots dat ze gespot zijn en passen ze hun script aan.
     ============================================================ */
  const CQ_MIN_FILL_TIME_MS = 2500;

  function cqInstrumentForm(form) {
    if (!form || form.dataset.cqInstrumented === '1') return;
    form.dataset.cqInstrumented = '1';
    form.dataset.cqLoadedAt = String(Date.now());
    form.dataset.cqInteracted = '0';
    const markInteracted = () => { form.dataset.cqInteracted = '1'; };
    form.addEventListener('keydown', markInteracted, { once: true, passive: true });
    form.addEventListener('pointerdown', markInteracted, { once: true, passive: true });
    form.addEventListener('focusin', markInteracted, { once: true, passive: true });
  }

  function cqIsLikelyBot(form) {
    if (!form) return { blocked: false };
    const honey = form.querySelector('input[name="_honey"]');
    if (honey && honey.value && honey.value.trim().length > 0) {
      return { blocked: true, reason: 'honeypot' };
    }
    const loadedAt = parseInt(form.dataset.cqLoadedAt || '0', 10);
    if (loadedAt) {
      const elapsed = Date.now() - loadedAt;
      if (elapsed < CQ_MIN_FILL_TIME_MS) {
        return { blocked: true, reason: 'too-fast', elapsed };
      }
    }
    if (form.dataset.cqInteracted !== '1') {
      return { blocked: true, reason: 'no-interaction' };
    }
    return { blocked: false };
  }
  window.cqInstrumentForm = cqInstrumentForm;
  window.cqIsLikelyBot = cqIsLikelyBot;

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
    // TikTok — map our events to standard TikTok Pixel events
    if (typeof window.ttq !== 'undefined' && window.ttq && typeof window.ttq.track === 'function') {
      try {
        var ttMap = {
          generate_lead:    'SubmitForm',
          app_store_click:  'Download',
          play_store_click: 'Download',
          learnstrike_click:'CompleteRegistration',
          live_click:       'ClickButton',
          email_click:      'Contact',
        };
        var ttEvent = ttMap[eventName];
        if (ttEvent) {
          window.ttq.track(ttEvent, params || {});
        }
      } catch (e) {}
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
    cqInstrumentForm(form);
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

      const botCheck = cqIsLikelyBot(form);
      if (botCheck.blocked) {
        // Silent block — toon success-state alsof het is gelukt, dan leert de bot niets
        successBox.hidden = false;
        form.hidden = true;
        return;
      }

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
    cqInstrumentForm(cform);
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
    // newsletterOptIn=true prefixes Description with [NB-OPTIN] zodat een Zoho
    // workflow rule de tag "Nieuwsbrief" kan zetten op deze lead.
    function postToZoho({ naam, bedrijf, email, bericht, rol, newsletterOptIn }) {
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
      // Lead Source ("Ik ben") — value matches Zoho-dropdown options exactly.
      // Falls back to "Anders" if user somehow didn't select.
      body.append('Lead Source', rol || 'Anders');

      // Description: het bericht zoals de gebruiker dat invulde.
      // Newsletter opt-in wordt apart geregeld via postNewsletterToZoho.
      if (bericht && bericht.trim()) body.append('Description', bericht);

      // Click-IDs for offline conversion tracking (Google Ads, Meta, LinkedIn, TikTok)
      // Zoho expects them in their LEADCF-numbered custom fields (mapped via webform layout):
      //   LEADCF10 = Google Click ID
      //   LEADCF11 = LinkedIn Click ID
      //   LEADCF12 = FBCLID
      //   LEADCF13 = TikTok Click ID
      // Default '-' is set on each hidden field, so we always send a value (not empty).
      body.append('LEADCF10', readClickId('gclid')     || '-'); // Google
      body.append('LEADCF11', readClickId('li_fat_id') || '-'); // LinkedIn
      body.append('LEADCF12', readClickId('fbclid')    || '-'); // Meta
      body.append('LEADCF13', readClickId('ttclid')    || '-'); // TikTok

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

      const botCheck = cqIsLikelyBot(cform);
      if (botCheck.blocked) {
        // Silent block — toon success-state, geen email naar info@, geen Zoho lead
        cform.hidden = true;
        if (cSuccess) cSuccess.hidden = false;
        return;
      }

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
      const rol = data.get('Rol') || '';
      const newsletterOptIn = data.get('Nieuwsbrief') === 'ja';

      try {
        // 1. POST naar Formsubmit (e-mail naar info@culiquiz.nl)
        const res = await fetch(cform.action, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: data,
        });
        const json = await res.json().catch(() => ({}));

        // 2. PARALLEL: POST naar Zoho CRM (fire-and-forget, niet-blokkerend).
        postToZoho({ naam, bedrijf, email, bericht, rol, newsletterOptIn }).catch((err) => {
          console.warn('Zoho lead post failed (non-fatal):', err);
        });

        // 3. Opt-in voor nieuwsbrief? Tweede lead met Company = "Nieuwsbrief-abonnee".
        //    De Zoho workflow rule "Newsletter opt-in tag" triggert daarop en plakt
        //    de tag "Nieuwsbrief" op deze lead. Sales kan beide leads mergen.
        if (newsletterOptIn) {
          postNewsletterToZoho({ email, rol, naam }).catch((err) => {
            console.warn('Zoho CRM newsletter post failed (non-fatal):', err);
          });
          postNewsletterToCampaigns({ email }).catch((err) => {
            console.warn('Zoho Campaigns subscribe failed (non-fatal):', err);
          });
          cqTrack('newsletter_signup', {
            source: 'contact_form',
            page: window.location.pathname,
            rol,
          });
        }

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

  // ============ Newsletter shared helper ============
  // Posts a newsletter-only lead naar Zoho CRM. Company = "Nieuwsbrief-abonnee"
  // → een workflow rule in Zoho ("Newsletter opt-in tag") plakt daarop de tag
  // "Nieuwsbrief" waar Campaigns op filtert. Lead Source = rol (persona).
  function postNewsletterToZoho({ email, rol, naam }) {
    const body = new URLSearchParams();
    body.append('xnQsjsdp', '11da360329b7870fcfed08c3c802acf8ac4a9b12b5bacced61fd4078cd69aa48');
    body.append('zc_gad', '');
    body.append('xmIwtLD', '9cebdb408e5c30dc2652f0f31063e7c8df9b02bb1707bd1b7507cc95d26e7bf394904e98b0f88b7265d641b5d99cb450');
    body.append('actionType', 'TGVhZHM=');
    body.append('returnURL', 'https://www.culiquiz.nl/nieuwsbrief-bedankt');
    body.append('aG9uZXlwb3Q', '');
    body.append('Company', 'Nieuwsbrief-abonnee');
    body.append('Last Name', (naam && naam.trim()) || 'Nieuwsbrief-abonnee');
    body.append('Email', email || '');
    body.append('Lead Source', rol || 'Anders');
    body.append('Description', 'Nieuwsbrief-aanmelding via website');
    body.append('LEADCF10', readClickId('gclid')     || '-');
    body.append('LEADCF11', readClickId('li_fat_id') || '-');
    body.append('LEADCF12', readClickId('fbclid')    || '-');
    body.append('LEADCF13', readClickId('ttclid')    || '-');

    return fetch('https://crm.zoho.eu/crm/WebToLeadForm', {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString(),
    });
  }

  // Directe inschrijving in Zoho Campaigns mailing-lijst "CuliQuiz Nieuwsbrief".
  //
  // Eerdere pogingen (kale fetch, hidden-iframe form-POST) werden silent geweigerd
  // door Zoho's anti-bot bescherming. setupSF() bouwt namelijk runtime fingerprint
  // tokens op en die zitten niet in de statische form HTML. We hebben dus echt
  // hun JS nodig.
  //
  // Strategie: embed exact Zoho's gehoste form-HTML in een off-screen container,
  // laad hun optin.min.js, en roep setupSF() aan. Bij onze nieuwsbrief-submit
  // vullen we het officiele Zoho-emailveld en clicken we hun submit-knop — hun
  // JS regelt token/validation/POST en de response landt in hun eigen
  // success/error handlers (die we via off-screen positioning niet hoeven te zien).
  let _zohoCampaignsReady = null;
  function ensureZohoCampaignsForm() {
    if (_zohoCampaignsReady) return _zohoCampaignsReady;
    _zohoCampaignsReady = new Promise((resolve) => {
      if (document.getElementById('cq-zoho-host')) { resolve(); return; }

      // Zoho's zcScptlessSubmit helper — embedden direct ipv vertrouwen op de
      // inline script tag uit hun HTML (die slecht parsed wanneer dynamisch
      // ingeprikt via innerHTML).
      if (typeof window.zcScptlessSubmit !== 'function') {
        window.zcScptlessSubmit = function (parentNode) {
          try {
            const spm = parentNode.querySelector('#zc_spmSubmit');
            if (spm) spm.remove();
            parentNode.submit();
          } catch (e) { /* no-op */ }
        };
      }

      const host = document.createElement('div');
      host.id = 'cq-zoho-host';
      host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden;pointer-events:none;';
      // 1-op-1 kopie van Zoho's gehoste form-HTML (signupform 222109000002622295,
      // lijst CuliQuiz Nieuwsbrief). NIET inkorten — setupSF() leest meerdere
      // van deze hidden fields uit om de POST-context te bouwen.
      host.innerHTML = ''
        + '<div id="customForm">'
        +   '<div name="SIGNUP_BODY">'
        +     '<div id="errorMsgDiv" style="display:none;">Please correct the marked field(s) below.</div>'
        +     '<div style="position:relative;">'
        +       '<div id="Zc_SignupSuccess" style="display:none;"><span id="signupSuccessMsg"></span></div>'
        +     '</div>'
        +     '<form method="POST" id="zcampaignOptinForm" action="https://rtlj-zcmp.maillist-manage.eu/weboptin.zc" target="_zcSignup" onsubmit="zcScptlessSubmit(this)">'
        +       '<input placeholder="Email" name="CONTACT_EMAIL" id="EMBED_FORM_EMAIL_LABEL" type="text">'
        +       '<input type="submit" name="SIGNUP_SUBMIT_BUTTON" id="zcWebOptin" value="Sign Up">'
        +       '<input type="hidden" id="fieldBorder" value="">'
        +       '<input type="hidden" id="submitType" name="submitType" value="optinCustomView">'
        +       '<input type="hidden" id="emailReportId" name="emailReportId" value="">'
        +       '<input type="hidden" id="formType" name="formType" value="QuickForm">'
        +       '<input type="hidden" name="zx" id="cmpZuid" value="14ae401ddc">'
        +       '<input type="hidden" name="zcvers" value="2.0">'
        +       '<input type="hidden" name="oldListIds" id="allCheckedListIds" value="">'
        +       '<input type="hidden" id="mode" name="mode" value="OptinCreateView">'
        +       '<input type="hidden" id="zcld" name="zcld" value="131516f56e9294c6">'
        +       '<input type="hidden" id="zctd" name="zctd" value="131516f56e6b4159">'
        +       '<input type="hidden" id="document_domain" value="">'
        +       '<input type="hidden" id="zc_Url" value="rtlj-zcmp.maillist-manage.eu">'
        +       '<input type="hidden" id="new_optin_response_in" value="0">'
        +       '<input type="hidden" id="duplicate_optin_response_in" value="0">'
        +       '<input type="hidden" name="zc_trackCode" id="zc_trackCode" value="ZCFORMVIEW">'
        +       '<input type="hidden" id="zc_formIx" name="zc_formIx" value="3z06a7cae3fd68733aa0943a711f62ab953b0ef3c9add406954fa6205a7f78ab18">'
        +       '<input type="hidden" id="viewFrom" value="URL_ACTION">'
        +       '<input type="hidden" id="scriptless" name="scriptless" value="yes">'
        +       '<input type="hidden" id="zc_spmSubmit" name="zc_spmSubmit" value="ZCSPMSUBMIT">'
        +     '</form>'
        +   '</div>'
        + '</div>'
        + '<div id="zcOptinOverLay" style="display:none;"></div>'
        + '<div id="zcOptinSuccessPopup" style="display:none;"><span id="closeSuccess"></span><div id="zcOptinSuccessPanel"></div></div>'
        // Named iframe target — zo landt de POST-response niet in onze main page.
        + '<iframe name="_zcSignup" style="position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;border:0;" aria-hidden="true" tabindex="-1"></iframe>';
      document.body.appendChild(host);

      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = 'https://rtlj-zcmp.maillist-manage.eu/js/optin.min.js';
      s.onload = function () {
        try {
          if (typeof window.setupSF === 'function') {
            window.setupSF(
              'sf3z06a7cae3fd68733aa0943a711f62ab953b0ef3c9add406954fa6205a7f78ab18',
              'ZCFORMVIEW',
              false,
              'light',
              false,
              '0'
            );
          }
        } catch (e) {
          console.warn('Zoho setupSF init failed (non-fatal):', e);
        }
        // Geef Zoho's init code nog 300ms om het form helemaal te wiren.
        setTimeout(resolve, 300);
      };
      s.onerror = function () {
        console.warn('Zoho optin.min.js failed to load — Campaigns POST disabled');
        resolve();
      };
      document.body.appendChild(s);
    });
    return _zohoCampaignsReady;
  }

  function postNewsletterToCampaigns({ email }) {
    if (!email) return Promise.resolve();
    return ensureZohoCampaignsForm().then(() => {
      const emailField = document.getElementById('EMBED_FORM_EMAIL_LABEL');
      const zohoForm = document.getElementById('zcampaignOptinForm');
      const submitBtn = document.getElementById('zcWebOptin');
      if (!emailField || !zohoForm) return;

      emailField.value = email;
      // Belangrijk: dispatch een echte input event zodat Zoho's listeners
      // (validation, token-binding) triggeren — niet alleen .value setten.
      emailField.dispatchEvent(new Event('input', { bubbles: true }));
      emailField.dispatchEvent(new Event('change', { bubbles: true }));

      // Trigger Zoho's eigen submit. Hun click-handler op #zcWebOptin doet
      // validatie en roept dan zcScptlessSubmit aan (verwijdert zc_spmSubmit
      // veld pas op het laatste moment — dat is hun anti-bot trick).
      try {
        if (submitBtn && typeof submitBtn.click === 'function') {
          submitBtn.click();
        } else if (typeof zohoForm.requestSubmit === 'function') {
          zohoForm.requestSubmit(submitBtn || undefined);
        } else {
          zohoForm.submit();
        }
      } catch (e) {
        console.warn('Zoho Campaigns submit threw (non-fatal):', e);
      }

      // Resolve nadat de POST de kans heeft gehad af te vuren. We kunnen de
      // response niet lezen (zit in de _zcSignup iframe), maar dat is OK.
      return new Promise((resolve) => setTimeout(resolve, 1500));
    });
  }

  // ============ Losse nieuwsbrief-form ============
  const nlForm = document.getElementById('nl-form');
  if (nlForm) {
    cqInstrumentForm(nlForm);
    const nlStatus = document.getElementById('nl-status');
    const nlSuccess = document.getElementById('nl-success');
    const nlBtn = document.getElementById('nl-submit');

    nlForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (nlStatus) { nlStatus.textContent = ''; nlStatus.classList.remove('is-error'); }

      const botCheck = cqIsLikelyBot(nlForm);
      if (botCheck.blocked) {
        // Silent block — toon "succes" maar verstuur niets
        nlForm.hidden = true;
        if (nlSuccess) nlSuccess.hidden = false;
        return;
      }

      if (!nlForm.checkValidity()) {
        nlForm.reportValidity();
        if (nlStatus) { nlStatus.textContent = 'Vul je e-mailadres in en kies een rol.'; nlStatus.classList.add('is-error'); }
        return;
      }

      nlBtn.disabled = true;
      if (nlStatus) nlStatus.textContent = 'Verzenden…';

      const data = new FormData(nlForm);
      const email = data.get('E-mail') || '';
      const rol = data.get('Rol') || '';

      // Twee Zoho-calls parallel: CRM (lead + tag voor segmentatie) en Campaigns
      // (direct in de mailing-lijst, triggert welkomstmail). Beide no-cors,
      // dus we kunnen response niet lezen — fire-and-forget.
      const zohoPromise = postNewsletterToZoho({ email, rol }).catch((err) => {
        console.warn('Zoho CRM newsletter post failed (non-fatal):', err);
      });
      postNewsletterToCampaigns({ email }).catch((err) => {
        console.warn('Zoho Campaigns subscribe failed (non-fatal):', err);
      });

      try {
        // Formsubmit notificatie — best effort, kort timeout.
        fetch(nlForm.action, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: data,
        }).catch((err) => {
          console.warn('Formsubmit failed (non-fatal):', err);
        });

        // Wacht even tot Zoho is afgevuurd (no-cors, dus we kunnen response niet lezen),
        // dan toon success. De inschrijving is hoe dan ook geregistreerd.
        await zohoPromise;

        cqTrack('newsletter_signup', {
          source: 'newsletter_form',
          page: window.location.pathname,
          rol,
        });
        nlForm.hidden = true;
        if (nlSuccess) nlSuccess.hidden = false;
      } catch (err) {
        console.error(err);
        if (nlStatus) { nlStatus.textContent = 'Er ging iets mis. Probeer het opnieuw of mail info@culiquiz.nl.'; nlStatus.classList.add('is-error'); }
      } finally {
        nlBtn.disabled = false;
      }
    });
  }

  // ============ Nieuwsbrief popup ============
  // Verschijnt na 30s rechtsonder. Wegklikken = 7 dagen stilte.
  // Inschrijven = permanent uit. Gebruikt dezelfde Campaigns/CRM-endpoints
  // als het reguliere nieuwsbrief-form (Lead Source = "Anders" als rol).
  (function initNewsletterPopup() {
    const STORAGE_KEY = 'cq_nl_popup_state';
    const DISMISS_DAYS = 7;
    const SHOW_DELAY_MS = 30 * 1000;

    function getState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
      } catch (e) { return {}; }
    }
    function setState(patch) {
      try {
        const next = Object.assign({}, getState(), patch);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) { /* no-op */ }
    }
    function shouldShow() {
      const st = getState();
      if (st.subscribedAt) return false;
      if (st.dismissedAt) {
        const ageMs = Date.now() - st.dismissedAt;
        if (ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000) return false;
      }
      // Niet tonen op de bedankt-pagina of in de admin/preview
      const p = window.location.pathname;
      if (p.indexOf('nieuwsbrief-bedankt') !== -1) return false;
      return true;
    }

    function buildPopup() {
      const el = document.createElement('aside');
      el.className = 'nl-popup';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Schrijf je in voor de CuliQuiz-nieuwsbrief');
      el.innerHTML = ''
        + '<button type="button" class="nl-popup-close" aria-label="Sluiten">&times;</button>'
        + '<p class="nl-popup-eyebrow">Nieuwsbrief</p>'
        + '<h3>Eén mail per maand. Geen ruis.</h3>'
        + '<p class="nl-popup-sub">Wat we leren uit de data van horeca-teams die elke dag CuliQuiz spelen.</p>'
        + '<form id="nl-popup-form" novalidate>'
        +   '<div class="nl-popup-row">'
        +     '<input type="email" name="email" placeholder="je@adres.nl" required autocomplete="email">'
        +     '<button type="submit" class="nl-popup-btn">Inschrijven</button>'
        +   '</div>'
        +   '<p class="nl-popup-status" id="nl-popup-status" aria-live="polite"></p>'
        +   '<p class="nl-popup-fineprint">Geen spam. Uitschrijven met een klik.</p>'
        + '</form>'
        + '<div class="nl-popup-success" id="nl-popup-success" hidden>'
        +   '<p><strong>Top, je staat erop.</strong><br>Check je inbox voor de welkomstmail.</p>'
        + '</div>';
      return el;
    }

    function showPopup() {
      if (!shouldShow()) return;
      if (document.querySelector('.nl-popup')) return;

      const el = buildPopup();
      document.body.appendChild(el);

      // Volgende frame: triggert CSS-transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add('is-visible'));
      });

      const closeBtn = el.querySelector('.nl-popup-close');
      const form = el.querySelector('#nl-popup-form');
      const statusEl = el.querySelector('#nl-popup-status');
      const successEl = el.querySelector('#nl-popup-success');
      const submitBtn = form.querySelector('button[type="submit"]');

      function dismiss() {
        setState({ dismissedAt: Date.now() });
        el.classList.remove('is-visible');
        setTimeout(() => el.remove(), 400);
        cqTrack('newsletter_popup_dismissed', { page: window.location.pathname });
      }
      closeBtn.addEventListener('click', dismiss);

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (statusEl) { statusEl.textContent = ''; statusEl.classList.remove('is-error'); }

        if (!form.checkValidity()) {
          form.reportValidity();
          if (statusEl) { statusEl.textContent = 'Vul een geldig e-mailadres in.'; statusEl.classList.add('is-error'); }
          return;
        }

        const email = (new FormData(form).get('email') || '').toString().trim();
        if (!email) return;

        submitBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Bezig…';

        // Beide endpoints parallel, no-cors. Lead Source = "Anders" want geen
        // rol-veld in popup — bewust minimale friction.
        postNewsletterToZoho({ email, rol: 'Anders' }).catch((err) => {
          console.warn('Zoho CRM popup post failed (non-fatal):', err);
        });
        postNewsletterToCampaigns({ email }).catch((err) => {
          console.warn('Zoho Campaigns popup subscribe failed (non-fatal):', err);
        });

        cqTrack('newsletter_signup', {
          source: 'popup',
          page: window.location.pathname,
          rol: 'Anders',
        });

        // Permanent suppress en success state tonen
        setState({ subscribedAt: Date.now() });
        form.hidden = true;
        if (successEl) successEl.hidden = false;

        // Sluit automatisch na 5s
        setTimeout(() => {
          el.classList.remove('is-visible');
          setTimeout(() => el.remove(), 400);
        }, 5000);
      });

      cqTrack('newsletter_popup_shown', { page: window.location.pathname });
    }

    // Wacht tot DOM ready (script staat in <body> dus meestal al ready)
    function schedule() {
      if (!shouldShow()) return;
      setTimeout(showPopup, SHOW_DELAY_MS);
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', schedule, { once: true });
    } else {
      schedule();
    }
  })();
})();
