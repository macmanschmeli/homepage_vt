/** Header, mobiles Menü und Footer – vollständig aus navigation.json und site.json gerendert. */
import { el, linkHref, safeHttpUrl, safeAssetPath, str } from './utils.js';

function navLink(item, pageId, extra = {}) {
  const href = linkHref(item.href);
  if (!href) return null;
  const a = el('a', { class: 'nav-link', href, ...extra }, item.label);
  if (item.id === pageId) a.setAttribute('aria-current', 'page');
  return a;
}

export function renderChrome({ site, nav, pageId }) {
  const labels = nav.labels || {};

  // Skip-Link
  document.body.prepend(el('a', { class: 'skip-link', href: '#main' }, labels.skip || 'Zum Inhalt springen'));

  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  if (header) renderHeader(header, { site, nav, pageId, labels });
  if (footer) renderFooter(footer, { site, nav, pageId, labels });
}

function renderHeader(header, { site, nav, pageId, labels }) {
  const logoSrc = safeAssetPath(site.logo?.src);
  const brand = el('a', { class: 'brand', href: linkHref('index.html'), 'aria-label': labels.homeLink || site.name },
    logoSrc && el('img', { class: 'brand__logo', src: logoSrc, alt: '', width: 40, height: 40 }),
    el('span', { class: 'brand__text' }, site.brand?.line1 || site.name, site.brand?.line2 && el('small', {}, site.brand.line2)),
  );

  const list = el('ul', { class: 'nav-list' });
  const mobileList = el('ul');
  (nav.main || []).forEach((item) => {
    const a = navLink(item, pageId); const b = navLink(item, pageId);
    if (a) list.append(el('li', {}, a));
    if (b) mobileList.append(el('li', {}, b));
  });

  const cta = nav.cta && linkHref(nav.cta.href)
    ? el('a', { class: 'btn btn--small site-header__cta', href: linkHref(nav.cta.href) }, nav.cta.label) : null;

  const toggle = el('button', {
    class: 'nav-toggle', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'mobile-menu',
    'aria-label': labels.menuOpen || 'Menü öffnen',
  }, el('span', { class: 'nav-toggle__bar' }), el('span', { class: 'nav-toggle__bar' }), el('span', { class: 'nav-toggle__bar' }));

  const mainNav = el('nav', { 'aria-label': labels.mainNav || 'Hauptnavigation' }, list);
  header.className = 'site-header';
  header.append(el('div', { class: 'container site-header__inner' }, brand, mainNav, cta, toggle));

  // Mobiles Menü
  const menu = el('div', { class: 'mobile-menu', id: 'mobile-menu' },
    el('nav', { 'aria-label': labels.mainNav || 'Hauptnavigation' }, mobileList));
  if (nav.cta && linkHref(nav.cta.href)) menu.append(el('a', { class: 'btn', href: linkHref(nav.cta.href) }, nav.cta.label));
  header.after(menu);

  const setOpen = (open, { restoreFocus = true } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? (labels.menuClose || 'Menü schließen') : (labels.menuOpen || 'Menü öffnen'));
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) menu.querySelector('a')?.focus({ preventScroll: true });
    else if (restoreFocus) toggle.focus({ preventScroll: true });
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false, { restoreFocus: false }); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false);
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setOpen(false, { restoreFocus: false }); });

  // Header-Rand beim Scrollen
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

function renderFooter(footer, { site, nav, pageId, labels }) {
  footer.className = 'site-footer';
  const col = (title, children) => el('div', {}, el('h2', { class: 'footer-title' }, title), children);

  const mainList = el('ul', { class: 'footer-list' });
  (nav.main || []).forEach((item) => { const href = linkHref(item.href); if (href) mainList.append(el('li', {}, el('a', { href }, item.label))); });

  const clubList = el('ul', { class: 'footer-list' });
  (nav.footer || []).forEach((item) => { const href = linkHref(item.href); if (href) clubList.append(el('li', {}, el('a', { href }, item.label))); });
  (nav.external || []).forEach((item) => {
    const url = safeHttpUrl(site.links?.[item.linkKey]?.url);
    if (url) clubList.append(el('li', {}, el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, `${item.label} ↗`)));
  });
  (site.social || []).forEach((s) => {
    const url = safeHttpUrl(s.url);
    if (url && str(s.label)) clubList.append(el('li', {}, el('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, `${s.label} ↗`)));
  });

  const partners = el('ul', { class: 'footer-list' });
  (site.partners || []).forEach((p) => partners.append(el('li', { text: p })));

  const about = el('div', {},
    el('p', { class: 'brand' }, site.name),
    el('p', { class: 'footer-about', text: site.footer?.about || '' }),
  );

  footer.append(el('div', { class: 'container' },
    el('div', { class: 'footer-grid' },
      about,
      col('Seiten', mainList),
      col('Verein', clubList),
      col('Spielgemeinschaft', partners),
    ),
    el('div', { class: 'footer-bottom' },
      el('span', {}, `© ${new Date().getFullYear()} ${site.footer?.copyright || site.name}`),
      site.footer?.legalNote ? el('span', { text: site.footer.legalNote }) : null,
    ),
  ));
}
