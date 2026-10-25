/** Trainerprofile aus trainers.json. */
import { loadConfig } from './data-loader.js';
import { el, str, isObject, safeAssetPath, safeHttpUrl, initials } from './utils.js';
import { emptyState, errorNotice, externalLink } from './ui.js';

export async function init({ page }) {
  const host = document.getElementById('trainer-list');
  let trainers, teams;
  try {
    trainers = await loadConfig('trainers');
    teams = await loadConfig('teams', { fallback: [] });
  } catch (err) { host.replaceChildren(errorNotice(err.message)); return; }
  if (!Array.isArray(trainers)) { host.replaceChildren(errorNotice('config/trainers.json muss eine Liste (Array) enthalten.')); return; }
  const teamById = new Map((Array.isArray(teams) ? teams : []).filter(isObject).map((t) => [t.id, t.name]));
  const valid = trainers.filter((t) => isObject(t) && str(t.id) && str(t.name));
  if (!valid.length) { host.replaceChildren(emptyState(page.empty)); return; }

  const grid = el('div', { class: 'grid grid--3' });
  valid.forEach((t) => {
    const imgSrc = safeAssetPath(t.image);
    const teamNames = (Array.isArray(t.teams) ? t.teams : []).map((id) => teamById.get(id)).filter(Boolean);
    const links = (Array.isArray(t.links) ? t.links : []).map((l) => externalLink(l?.url, l?.label || l?.url)).filter(Boolean);
    const email = str(t.email);
    const bio = str(t.bio);
    grid.append(el('article', { class: 'card trainer-card', id: t.id, 'data-reveal': '' },
      el('div', { class: 'card__media', 'aria-hidden': imgSrc ? null : 'true' },
        imgSrc ? el('img', { src: imgSrc, alt: `Porträt von ${t.name}`, loading: 'lazy', decoding: 'async' })
          : el('div', { class: 'avatar', title: page.photoMissing }, initials(t.name))),
      el('h2', { style: 'font-size:var(--fs-lg);text-transform:uppercase', text: t.name }),
      str(t.role) && el('p', { class: 'trainer-card__role', text: t.role }),
      teamNames.length && el('p', { class: 'team__coaches', text: `${page.teamsLabel}: ${teamNames.join(', ')}` }),
      bio && el('details', {}, el('summary', { text: page.readMore }), el('p', { text: bio })),
      str(t.quote) && el('blockquote', { class: 'trainer-card__quote', text: t.quote }),
      (links.length || email) && el('p', { class: 'trainer-card__links' },
        ...links.flatMap((l, i) => [i ? ' · ' : '', l]),
        email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && el('a', { href: `mailto:${email}`, text: email })),
    ));
  });
  host.replaceChildren(grid);
  // Sprungmarke aus Teams-Seite (#trainer-id) nach dem Rendern anspringen
  if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
}
