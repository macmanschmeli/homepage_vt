/** Sponsoren und Unterstützer: klickbare Logos aus sponsors.json. */
import { loadConfig } from './data-loader.js';
import { el, clear, str, isObject, safeAssetPath, safeHttpUrl, linkHref } from './utils.js';
import { emptyState, errorNotice, externalLink } from './ui.js';

export function normalizeSponsors(raw) {
  if (!Array.isArray(raw)) throw new Error('config/sponsors.json muss eine Liste (Array) enthalten.');
  return raw.filter((s) => isObject(s) && str(s.id) && str(s.name) && s.active !== false).map((s, i) => ({
    id: s.id, name: s.name.trim(), logo: safeAssetPath(s.logo), url: safeHttpUrl(s.url),
    tier: str(s.tier), description: str(s.description), order: Number.isFinite(s.order) ? s.order : 1000 + i,
  })).sort((a, b) => a.order - b.order);
}

export async function loadSponsors() { return normalizeSponsors(await loadConfig('sponsors')); }

function sponsorTile(s, { large, hint }) {
  const label = el('span', { class: 'sponsor__name', text: s.name });
  const content = [];
  if (s.logo) {
    const img = el('img', { src: s.logo, alt: `Logo ${s.name}`, loading: 'lazy', decoding: 'async' });
    // Fällt ein Logo aus, bleibt der Name als Text sichtbar (keine kaputten Bilder).
    img.addEventListener('error', () => img.replaceWith(label.cloneNode(true)), { once: true });
    content.push(img);
  } else content.push(label);
  if (s.description) content.push(el('p', { class: 'sponsor__desc', text: s.description }));
  const cls = `sponsor${large ? ' sponsor--large' : ''}`;
  if (!s.url) return el('div', { class: cls }, ...content);
  return externalLink(s.url, [...content, el('span', { class: 'visually-hidden', text: ` – ${s.name} ${hint}` })],
    { class: cls, 'aria-label': `${s.name} ${hint}`.trim() });
}

/** Rendert eine Sponsorenliste in container. */
export function renderSponsorGrid(container, sponsors, { large = false, hint = '' } = {}) {
  clear(container);
  const list = el('ul', { class: `sponsor-grid${large ? ' sponsor-grid--large' : ''}` });
  sponsors.forEach((s) => list.append(el('li', { 'data-reveal': '' }, sponsorTile(s, { large, hint }))));
  container.append(list);
}

export async function init({ page, site }) {
  const host = document.getElementById('sponsor-tiers');
  let sponsors;
  try { sponsors = await loadSponsors(); } catch (err) { host.replaceChildren(errorNotice(err.message)); return; }
  if (!sponsors.length) { host.replaceChildren(emptyState(page.empty)); return; }

  const seen = new Set();
  const tierDefs = Object.entries(page.tiers || {});
  const groups = [...tierDefs.map(([id, def]) => ({ id, ...def })), { id: '__other', title: null, large: false }];
  host.replaceChildren();
  for (const g of groups) {
    const items = sponsors.filter((s) => !seen.has(s.id) && (g.id === '__other' ? true : s.tier === g.id));
    if (!items.length) continue;
    items.forEach((s) => seen.add(s.id));
    const holder = el('div');
    host.append(el('section', { class: 'section-block', style: 'margin-bottom:var(--space-8)' },
      g.title && el('h2', { style: 'font-size:var(--fs-lg)', text: g.title }), holder));
    renderSponsorGrid(holder, items, { large: g.large, hint: page.newTabHint || '' });
  }

  // Call-to-Action-Buttons
  const cta = document.getElementById('sponsor-cta');
  if (cta) {
    const primaryUrl = safeHttpUrl(site.links?.[page.ctaPrimary?.linkKey]?.url);
    if (primaryUrl) cta.append(externalLink(primaryUrl, [page.ctaPrimary.label, ' ', el('span', { class: 'btn__arrow', 'aria-hidden': 'true', text: '→' })], { class: 'btn' }));
    const secondary = linkHref(page.ctaSecondary?.href);
    if (secondary) cta.append(el('a', { class: 'btn btn--ghost', href: secondary, text: page.ctaSecondary.label }));
  }
}
