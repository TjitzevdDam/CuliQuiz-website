/**
 * CuliQuiz Cookie Consent
 * GDPR/AVG-compliant consent banner with category-level opt-in.
 * Loads analytics/marketing scripts only after explicit consent.
 *
 * Public API on window.CuliquizConsent:
 *   .get()             -> {necessary, analytics, marketing, ts} or null
 *   .has(category)     -> boolean
 *   .hasDecided()      -> boolean
 *   .showBanner()      -> show banner
 *   .showPreferences() -> show preferences modal
 *
 * Custom events:
 *   'culiquiz:consent-update' — fires on every save with detail = consent record
 *
 * To wire up GA4 / Meta Pixel later, add a listener:
 *   document.addEventListener('culiquiz:consent-update', (e) => {
 *     if (e.detail.analytics) loadGA4();
 *     if (e.detail.marketing) loadMetaPixel();
 *   });
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'culiquiz-consent';
  var STORAGE_VERSION = 1;

  // Detect language from <html lang="...">
  var docLang = (document.documentElement.lang || 'nl').toLowerCase().split('-')[0];
  var supportedLangs = ['nl', 'en', 'de', 'fr', 'es'];
  var lang = supportedLangs.indexOf(docLang) >= 0 ? docLang : 'nl';

  var I18N = {
    nl: {
      title: 'Cookies & privacy',
      intro: 'We gebruiken cookies en vergelijkbare technologie om de site te laten werken, gebruik anoniem te meten en — als je dat wilt — relevante content via partners te tonen.',
      accept_all: 'Alles accepteren',
      reject_all: 'Alleen noodzakelijk',
      customize: 'Voorkeuren',
      save: 'Voorkeuren opslaan',
      necessary: 'Noodzakelijk',
      necessary_desc: 'Onmisbaar voor de basisfunctionaliteit van de site (zoals taalvoorkeur). Altijd actief.',
      analytics: 'Statistieken',
      analytics_desc: 'Anonieme paginatellingen en laadtijden, om de site te verbeteren.',
      marketing: 'Marketing',
      marketing_desc: 'Voor relevante advertenties en content via partners (zoals Meta of LinkedIn).',
      settings_link: 'Cookie-instellingen',
      close: 'Sluiten'
    },
    en: {
      title: 'Cookies & privacy',
      intro: 'We use cookies and similar technology to make the site work, measure usage anonymously, and — if you allow it — show relevant content via partners.',
      accept_all: 'Accept all',
      reject_all: 'Necessary only',
      customize: 'Preferences',
      save: 'Save preferences',
      necessary: 'Necessary',
      necessary_desc: 'Essential for the site to function (such as language preference). Always on.',
      analytics: 'Analytics',
      analytics_desc: 'Anonymous page views and load times, to improve the site.',
      marketing: 'Marketing',
      marketing_desc: 'For relevant ads and partner content (such as Meta or LinkedIn).',
      settings_link: 'Cookie settings',
      close: 'Close'
    },
    de: {
      title: 'Cookies & Datenschutz',
      intro: 'Wir verwenden Cookies und vergleichbare Technologien, damit die Seite funktioniert, das Nutzungsverhalten anonym zu messen und — wenn du es zulässt — relevante Partnerinhalte zu zeigen.',
      accept_all: 'Alle akzeptieren',
      reject_all: 'Nur notwendige',
      customize: 'Einstellungen',
      save: 'Einstellungen speichern',
      necessary: 'Notwendig',
      necessary_desc: 'Unverzichtbar für die Grundfunktion der Seite (z. B. Sprachpräferenz). Immer aktiv.',
      analytics: 'Statistik',
      analytics_desc: 'Anonyme Seitenaufrufe und Ladezeiten, um die Seite zu verbessern.',
      marketing: 'Marketing',
      marketing_desc: 'Für relevante Anzeigen und Partnerinhalte (z. B. Meta oder LinkedIn).',
      settings_link: 'Cookie-Einstellungen',
      close: 'Schließen'
    },
    fr: {
      title: 'Cookies et confidentialité',
      intro: 'Nous utilisons des cookies et technologies similaires pour faire fonctionner le site, mesurer l’utilisation de manière anonyme et — si vous le souhaitez — montrer du contenu pertinent via des partenaires.',
      accept_all: 'Tout accepter',
      reject_all: 'Strictement nécessaires',
      customize: 'Préférences',
      save: 'Enregistrer les préférences',
      necessary: 'Nécessaires',
      necessary_desc: 'Indispensables au fonctionnement du site (comme la préférence linguistique). Toujours activés.',
      analytics: 'Statistiques',
      analytics_desc: 'Pages vues et temps de chargement anonymes, pour améliorer le site.',
      marketing: 'Marketing',
      marketing_desc: 'Pour des publicités et contenus partenaires pertinents (comme Meta ou LinkedIn).',
      settings_link: 'Paramètres des cookies',
      close: 'Fermer'
    },
    es: {
      title: 'Cookies y privacidad',
      intro: 'Usamos cookies y tecnologías similares para que el sitio funcione, medir el uso de forma anónima y — si lo permites — mostrar contenido relevante a través de socios.',
      accept_all: 'Aceptar todo',
      reject_all: 'Solo necesarias',
      customize: 'Preferencias',
      save: 'Guardar preferencias',
      necessary: 'Necesarias',
      necessary_desc: 'Imprescindibles para el funcionamiento del sitio (como la preferencia de idioma). Siempre activas.',
      analytics: 'Estadísticas',
      analytics_desc: 'Páginas vistas y tiempos de carga anónimos, para mejorar el sitio.',
      marketing: 'Marketing',
      marketing_desc: 'Para publicidad y contenido relevante a través de socios (como Meta o LinkedIn).',
      settings_link: 'Configuración de cookies',
      close: 'Cerrar'
    }
  };
  var t = I18N[lang];

  // ---------- Storage ----------
  function readConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed.v !== STORAGE_VERSION) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeConsent(consent) {
    var record = {
      v: STORAGE_VERSION,
      ts: new Date().toISOString(),
      necessary: true,
      analytics: !!consent.analytics,
      marketing: !!consent.marketing
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch (e) {}
    return record;
  }

  // ---------- Public API ----------
  var api = {
    get: function () { return readConsent(); },
    has: function (cat) { var c = readConsent(); return !!(c && c[cat]); },
    hasDecided: function () { return !!readConsent(); },
    showBanner: function () { renderBanner(); },
    showPreferences: function () { renderPreferences(); }
  };
  window.CuliquizConsent = api;

  // ---------- Loaders ----------
  function loadVercelAnalytics() {
    if (window.__cqVercelLoaded) return;
    window.__cqVercelLoaded = true;
    var a = document.createElement('script');
    a.defer = true;
    a.src = '/_vercel/insights/script.js';
    document.head.appendChild(a);
    var s = document.createElement('script');
    s.defer = true;
    s.src = '/_vercel/speed-insights/script.js';
    document.head.appendChild(s);
  }

  // Google Analytics 4 (gtag.js) — Measurement ID: G-5Y4GQWX2W1
  // Plus Google Ads conversion tag: AW-623191309 (loads alongside GA4)
  function loadGA4() {
    if (window.__cqGA4Loaded) return;
    window.__cqGA4Loaded = true;
    var GA_ID = 'G-5Y4GQWX2W1';
    var AW_ID = 'AW-623191309';
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
    gtag('config', AW_ID); // Google Ads conversion tracking
  }

  // Microsoft Clarity — Project ID: wlryoe0sms
  function loadClarity() {
    if (window.__cqClarityLoaded) return;
    window.__cqClarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', 'wlryoe0sms');
  }

  // Zoho SalesIQ — live chat widget (loads after Statistics consent
  // because SalesIQ uses cookies for visitor tracking + chat context)
  function loadZohoSalesIQ() {
    if (window.__cqSalesIQLoaded) return;
    window.__cqSalesIQLoaded = true;
    window.$zoho = window.$zoho || {};
    window.$zoho.salesiq = window.$zoho.salesiq || { ready: function () {} };
    var s = document.createElement('script');
    s.id = 'zsiqscript';
    s.defer = true;
    s.src = 'https://salesiq.zohopublic.eu/widget?wc=siqcb335552ec2c2159be8cd3c54539b62fdf03ed1a2c326b8ddc571a0209d48afa';
    document.body.appendChild(s);
  }

  // LinkedIn Insight Tag — Partner ID: 8485786
  function loadLinkedInInsight() {
    if (window.__cqLinkedInLoaded) return;
    window.__cqLinkedInLoaded = true;
    var partnerId = '8485786';
    window._linkedin_partner_id = partnerId;
    window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
    window._linkedin_data_partner_ids.push(partnerId);
    if (!window.lintrk) {
      window.lintrk = function (a, b) { window.lintrk.q.push([a, b]); };
      window.lintrk.q = [];
    }
    var s = document.getElementsByTagName('script')[0];
    var b = document.createElement('script');
    b.type = 'text/javascript';
    b.async = true;
    b.src = 'https://snap.licdn.com/li.lms-analytics/insight.min.js';
    s.parentNode.insertBefore(b, s);
  }

  // Meta Pixel — Pixel ID: 986148519536894
  function loadMetaPixel() {
    if (window.__cqMetaPixelLoaded) return;
    window.__cqMetaPixelLoaded = true;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = [];
      t = b.createElement(e); t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', '986148519536894');
    window.fbq('track', 'PageView');
  }

  // TikTok Pixel — Pixel ID: D7S87K3C77U4TTGIGRSG
  function loadTikTokPixel() {
    if (window.__cqTikTokLoaded) return;
    window.__cqTikTokLoaded = true;
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = w[t] = w[t] || [];
      ttq.methods = ['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie','holdConsent','revokeConsent','grantConsent'];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) {
        for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
        return e;
      };
      ttq.load = function (e, n) {
        var r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        var o = n && n.partner;
        ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
        ttq._t = ttq._t || {}; ttq._t[e] = +new Date();
        ttq._o = ttq._o || {}; ttq._o[e] = n || {};
        var s = document.createElement('script');
        s.type = 'text/javascript'; s.async = !0;
        s.src = r + '?sdkid=' + e + '&lib=' + t;
        var x = document.getElementsByTagName('script')[0];
        x.parentNode.insertBefore(s, x);
      };
      ttq.load('D7S87K3C77U4TTGIGRSG');
      ttq.page();
    }(window, document, 'ttq');
  }

  function applyConsent(consent) {
    if (!consent) return;
    if (consent.analytics) {
      loadVercelAnalytics();
      loadGA4();
      loadClarity();
      loadZohoSalesIQ();
    }
    if (consent.marketing) {
      loadLinkedInInsight();
      loadMetaPixel();
      loadTikTokPixel();
    }
    // Extension point: Google Ads conversion tag (currently auto-imports via GA4 link).
    // Listen via document.addEventListener('culiquiz:consent-update', ...)
    document.dispatchEvent(new CustomEvent('culiquiz:consent-update', { detail: consent }));
  }

  // ---------- Rendering ----------
  function escapeHTML(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function renderBanner() {
    closeAll();
    var banner = document.createElement('div');
    banner.id = 'cq-cookie-banner';
    banner.className = 'cq-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', t.title);
    banner.innerHTML =
      '<div class="cq-banner-inner">' +
        '<div class="cq-banner-text">' +
          '<strong>' + escapeHTML(t.title) + '</strong>' +
          '<p>' + escapeHTML(t.intro) + '</p>' +
        '</div>' +
        '<div class="cq-banner-buttons">' +
          '<button type="button" class="cq-btn cq-btn-ghost" data-action="reject">' + escapeHTML(t.reject_all) + '</button>' +
          '<button type="button" class="cq-btn cq-btn-ghost" data-action="customize">' + escapeHTML(t.customize) + '</button>' +
          '<button type="button" class="cq-btn cq-btn-primary" data-action="accept">' + escapeHTML(t.accept_all) + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);

    banner.addEventListener('click', function (e) {
      var node = e.target.closest('[data-action]');
      if (!node) return;
      var action = node.getAttribute('data-action');
      if (action === 'accept') {
        applyConsent(writeConsent({ analytics: true, marketing: true }));
        closeAll();
      } else if (action === 'reject') {
        applyConsent(writeConsent({ analytics: false, marketing: false }));
        closeAll();
      } else if (action === 'customize') {
        renderPreferences();
      }
    });
  }

  function renderPreferences() {
    closeAll();
    var current = readConsent() || { analytics: false, marketing: false };
    var modal = document.createElement('div');
    modal.id = 'cq-cookie-prefs';
    modal.className = 'cq-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', t.title);
    modal.innerHTML =
      '<div class="cq-modal-overlay" data-close="1"></div>' +
      '<div class="cq-modal-card">' +
        '<button type="button" class="cq-modal-close" data-close="1" aria-label="' + escapeHTML(t.close) + '">&times;</button>' +
        '<h3>' + escapeHTML(t.title) + '</h3>' +
        '<p>' + escapeHTML(t.intro) + '</p>' +
        '<label class="cq-pref-row cq-pref-locked">' +
          '<input type="checkbox" checked disabled />' +
          '<div><strong>' + escapeHTML(t.necessary) + '</strong>' +
          '<span>' + escapeHTML(t.necessary_desc) + '</span></div>' +
        '</label>' +
        '<label class="cq-pref-row">' +
          '<input type="checkbox" name="analytics"' + (current.analytics ? ' checked' : '') + ' />' +
          '<div><strong>' + escapeHTML(t.analytics) + '</strong>' +
          '<span>' + escapeHTML(t.analytics_desc) + '</span></div>' +
        '</label>' +
        '<label class="cq-pref-row">' +
          '<input type="checkbox" name="marketing"' + (current.marketing ? ' checked' : '') + ' />' +
          '<div><strong>' + escapeHTML(t.marketing) + '</strong>' +
          '<span>' + escapeHTML(t.marketing_desc) + '</span></div>' +
        '</label>' +
        '<div class="cq-banner-buttons">' +
          '<button type="button" class="cq-btn cq-btn-ghost" data-action="reject">' + escapeHTML(t.reject_all) + '</button>' +
          '<button type="button" class="cq-btn cq-btn-primary" data-action="save">' + escapeHTML(t.save) + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-close') === '1') {
        closeAll();
        if (!readConsent()) renderBanner();
        return;
      }
      var node = e.target.closest && e.target.closest('[data-action]');
      if (!node) return;
      var action = node.getAttribute('data-action');
      if (action === 'save') {
        var aOn = modal.querySelector('input[name="analytics"]').checked;
        var mOn = modal.querySelector('input[name="marketing"]').checked;
        applyConsent(writeConsent({ analytics: aOn, marketing: mOn }));
        closeAll();
      } else if (action === 'reject') {
        applyConsent(writeConsent({ analytics: false, marketing: false }));
        closeAll();
      }
    });
  }

  function closeAll() {
    var b = document.getElementById('cq-cookie-banner');
    if (b) b.remove();
    var m = document.getElementById('cq-cookie-prefs');
    if (m) m.remove();
  }

  // ---------- Init ----------
  function init() {
    // Wire any "Cookie settings" links in the footer
    var links = document.querySelectorAll('[data-cq-cookies]');
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      if (!link.textContent || !link.textContent.trim()) {
        link.textContent = t.settings_link;
      }
      link.addEventListener('click', function (e) {
        e.preventDefault();
        api.showPreferences();
      });
    }

    var stored = readConsent();
    if (stored) {
      applyConsent(stored);
    } else {
      // Slight delay so the page renders first
      setTimeout(renderBanner, 600);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
