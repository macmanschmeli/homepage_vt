/** Mannschaften: Übersicht aus teams.json, mit Verweisen auf Trainer und Trainingsplan. */
import { loadConfig } from './data-loader.js';
import { el, clear, str, isObject, safeAssetPath, linkHref } from './utils.js';
import { emptyState, errorNotice } from './ui.js';

export function normalizeTeams(raw) {
  if (!Array.isArray(raw)) throw new Error('config/teams.json muss eine Liste (Array) von Teams enthalten.');
  return raw.filter((t) => isObject(t) && str(t.id) && str(t.name)).map((t) => ({
    id: t.id, name: t.name, category: str(t.category), league: str(t.league), description: str(t.description),
    coaches: Array.isArray(t.coaches) ? t.coaches.filter((c) => typeof c === 'string') : [],
    image: safeAssetPath(t.image), imageAlt: str(t.imageAlt) || t.name,
    trainingFilter: str(t.trainingFilter), link: linkHref(t.link),
  }));
}

export async function loadTeams() { return normalizeTeams(await loadConfig('teams')); }

/** Kompakte Teaser-Karten (Startseite). */
export function renderTeamTeasers(container, teams, { limit = 4 } = {}) {
  clear(container);
  const grid = el('div', { class: 'grid grid--4' });
  teams.slice(0, limit).forEach((t) => grid.append(
    el('a', { class: 'card', href: linkHref(`teams.html#${t.id}`), 'data-reveal': '', style: 'text-decoration:none' },
      el('p', { class: 'card__meta', text: t.league || 'Mannschaft' }),
      el('h3', { text: t.name }),
      t.description && el('p', { class: 'lead', style: 'font-size:var(--fs-sm)', text: t.description.length > 120 ? `${t.description.slice(0, 117).trimEnd()}…` : t.description }),
    )));
  container.append(grid);
}

export async function init({ page }) {
  const host = document.getElementById('team-list');
  let teams, trainers;
  try {
    teams = await loadTeams();
    trainers = await loadConfig('trainers', { fallback: [] });
  } catch (err) { host.replaceChildren(errorNotice(err.message)); return; }
  if (!teams.length) { host.replaceChildren(emptyState(page.empty)); return; }

  const trainerById = new Map((Array.isArray(trainers) ? trainers : []).filter((t) => isObject(t)).map((t) => [t.id, t]));
  const list = el('div', { class: 'team-list' });
  teams.forEach((t) => {
    const coaches = t.coaches.map((id) => trainerById.get(id)).filter(Boolean);
    const body = el('div', { class: 'stack' },
      el('p', { class: 'card__meta', text: t.league ? `${page.leagueLabel}: ${t.league}` : page.leagueUnknown }),
      el('h2', { text: t.name }),
      t.description && el('p', { class: 'lead', text: t.description }),
      coaches.length && el('p', { class: 'team__coaches' }, `${page.coachesLabel}: `,
        ...coaches.flatMap((c, i) => [i ? ', ' : '', el('a', { href: linkHref(`trainers.html#${c.id}`), text: c.name })])),
      el('div', { class: 'cluster' },
        t.trainingFilter && el('a', { class: 'btn btn--ghost btn--small', href: linkHref(`trainings.html?team=${encodeURIComponent(t.trainingFilter)}`) }, page.trainingLinkLabel),
      ));
    const media = t.image && el('div', { class: 'card__media', style: 'margin:0;border-radius:var(--radius-md);aspect-ratio:4/3' },
      el('img', { src: t.image, alt: t.imageAlt, loading: 'lazy', decoding: 'async' }));
    list.append(el('article', { class: `card card--flat team${media ? ' team--with-media' : ''}`, id: t.id, 'data-reveal': '' }, media, body));
  });
  host.replaceChildren(list);
}
