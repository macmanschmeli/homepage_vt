/**
 * Einstiegspunkt für alle Seiten.
 * 1. Globale Konfiguration laden (site, navigation, pages)
 * 2. Header/Footer rendern, Meta-Daten und data-bind-Texte setzen
 * 3. Seitenmodul anhand von <body data-page="…"> nachladen
 * Fehler in einem Seitenmodul betreffen nie andere Bereiche der Seite.
 */
import { loadConfig } from './data-loader.js';
import { renderChrome } from './navigation.js';
import { el, str, linkHref, safeAssetPath, safeHttpUrl } from './utils.js';
import { errorNotice } from './ui.js';

const PAGE_MODULES = {
  home: () => import('./home.js'),
  matches: () => import('./matches.js'),
  trainings: () => import('./trainings.js'),
  teams: () => import('./teams.js'),
  trainers: () => import('./trainers.js'),
  sponsors: () => import('./sponsors.js'),
  contact: () => import('./contact-form.js'),
  privacy: () => import('./legal.js'),
  imprint: () => import('./legal.js'),
  notfound: () => import('./notfound.js'),
};

const lookup = (obj, path) => path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

function bindTexts(pageData) {
  document.querySelectorAll('[data-bind]').forEach((node) => {
    const value = lookup(pageData, node.dataset.bind);
    if (typeof value === 'string') node.textContent = value;
  });
  document.querySelectorAll('[data-bind-href]').forEach((node) => {
    const value = lookup(pageData, node.dataset.bindHref);
    const href = value && typeof value === 'object' ? linkHref(value.href) : null;
    if (href) { node.setAttribute('href', href); if (str(value.label)) node.textContent = value.label; }
  });
}

function applyMeta(site, pageData) {
  if (str(pageData?.title)) document.title = pageData.title;
  const desc = str(pageData?.description) || str(site.description);
  if (desc) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) { meta = el('meta', { name: 'description' }); document.head.append(meta); }
    meta.setAttribute('content', desc);
  }
  const favicon = safeAssetPath(site.favicon);
  if (favicon) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = el('link', { rel: 'icon' }); document.head.append(link); }
    link.setAttribute('href', favicon);
  }
}

function initReveal() {
  const items = document.querySelectorAll('[data-reveal]:not(.is-visible)');
  if (!items.length) return;
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach((n) => n.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach((n, i) => { n.style.setProperty('--reveal-delay', `${(i % 4) * 70}ms`); io.observe(n); });
}
/** Von Seitenmodulen nach dem Rendern dynamischer Inhalte aufrufbar. */
window.__volleyReveal = initReveal;

async function boot() {
  const pageId = document.body.dataset.page;
  const main = document.getElementById('main');
  let site, nav, pages;
  try {
    [site, nav, pages] = await Promise.all([loadConfig('site'), loadConfig('navigation'), loadConfig('pages')]);
  } catch (err) {
    console.error(err);
    main?.prepend(errorNotice(err.message));
    return;
  }

  renderChrome({ site, nav, pageId });
  const pageData = pages[pageId] || (pageId === 'notfound' ? pages.notFound : {});
  applyMeta(site, pageData);
  bindTexts({ ...pages, site, page: pageData });

  const loader = PAGE_MODULES[pageId];
  if (loader) {
    try {
      const mod = await loader();
      await mod.init({ site, nav, pages, page: pageData, pageId, main });
    } catch (err) {
      console.error(err);
      main?.append(el('div', { class: 'container' }, errorNotice(err.message || 'Auf dieser Seite ist ein Fehler aufgetreten.')));
    }
  }
  initReveal();
  document.documentElement.classList.add('is-ready');
}

boot();
