/** Termine und Matches: Validierung, Sortierung, Filterung und Darstellung. */
import { loadConfig } from './data-loader.js';
import { COLOR_ALLOWLIST } from './config.js';
import { el, clear, str, parseDate, endOfDay, isValidTime, padTime, formatter, announce } from './utils.js';
import { notice, emptyState, errorNotice, filterGroup } from './ui.js';

const LOCALE = 'de-AT';
const DEFAULT_COLOR = { home: 'red', away: 'grey', event: 'sky' };

/** Wandelt einen JSON-Eintrag in ein geprüftes Objekt; ungültige Einträge → null (mit Warnung). */
export function normalizeMatch(raw, index) {
  if (!raw || typeof raw !== 'object') { console.warn(`matches.json[${index}]: kein Objekt – übersprungen`); return null; }
  let title = str(raw.title);
  const start = parseDate(raw.start);
  if (!title || !start) { console.warn(`matches.json[${index}]: Titel oder Startdatum ungültig – übersprungen`); return null; }

  // Uhrzeit: bevorzugt "time"; Fallback auf eine Uhrzeit am Titelende (z. B. "… 19:00")
  let time = isValidTime(raw.time) ? padTime(raw.time) : null;
  if (!time) {
    const m = /\s(\d{1,2}:\d{2})\s*$/.exec(title);
    if (m && isValidTime(m[1])) { time = padTime(m[1]); title = title.slice(0, m.index).trim(); }
  }
  let type = ['home', 'away', 'event'].includes(raw.type) ? raw.type : null;
  if (!type) type = /\bheim\b/i.test(title) ? 'home' : /\bausw(ä|ae|a)rts\b/i.test(title) ? 'away' : 'event';
  const end = parseDate(raw.end);
  const color = COLOR_ALLOWLIST.includes(raw.color) ? raw.color : DEFAULT_COLOR[type];
  return {
    id: str(raw.id) || `m${index}`, title, start, end, time, type, color,
    place: str(raw.place), team: str(raw.team), example: raw.example === true,
  };
}

export async function loadMatches() {
  const raw = await loadConfig('matches');
  if (!Array.isArray(raw)) throw new Error('config/matches.json muss eine Liste (Array) von Terminen enthalten.');
  const now = new Date();
  return raw.map(normalizeMatch).filter(Boolean)
    .filter((m) => endOfDay(m.end || m.start) >= now) // abgelaufene Termine ausblenden
    .sort((a, b) => a.start - b.start || (a.time || '').localeCompare(b.time || ''));
}

function matchItem(m, labels) {
  const dateAttr = `${m.start.getFullYear()}-${String(m.start.getMonth() + 1).padStart(2, '0')}-${String(m.start.getDate()).padStart(2, '0')}`;
  const weekday = formatter(LOCALE, { weekday: 'long' }).format(m.start);
  const longDate = formatter(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' }).format(m.start);
  const month = formatter(LOCALE, { month: 'short' }).format(m.start).replace('.', '');
  const typeLabel = { home: labels.homeLabel, away: labels.awayLabel, event: labels.eventLabel }[m.type];

  return el('li', { class: 'event', 'data-reveal': '' },
    el('time', { class: 'event__date', datetime: dateAttr, 'aria-label': `${weekday}, ${longDate}` },
      el('span', { class: 'event__day', text: String(m.start.getDate()) }), el('span', { class: 'event__month', text: month })),
    el('div', {},
      el('h3', { class: 'event__title', text: m.title }),
      el('p', { class: 'event__meta' },
        el('span', { text: `${weekday}, ${longDate}` }),
        m.time && el('span', { text: `${m.time} Uhr` }),
        m.place && el('span', { text: m.place }),
        m.team && el('span', { text: m.team }),
        m.example && el('span', { class: 'tag tag--amber', text: 'Beispiel' }),
      )),
    el('div', { class: 'event__tags' }, el('span', { class: `tag tag--${m.color}`, text: typeLabel })),
  );
}

export function renderMatchList(container, matches, labels, { limit } = {}) {
  clear(container);
  const shown = limit ? matches.slice(0, limit) : matches;
  if (!shown.length) { container.append(emptyState(labels.empty)); return; }
  const list = el('ul', { class: 'event-list' });
  shown.forEach((m) => list.append(matchItem(m, labels)));
  container.append(list);
}

export async function init({ page }) {
  const container = document.getElementById('match-list');
  const filterHost = document.getElementById('match-filters');
  const noticeHost = document.getElementById('match-notice');
  let matches;
  try { matches = await loadMatches(); } catch (err) { container.replaceChildren(errorNotice(err.message)); return; }

  if (matches.some((m) => m.example) && page.exampleNotice) noticeHost.replaceChildren(notice(page.exampleNotice, 'placeholder'));

  const teams = [...new Set(matches.map((m) => m.team).filter(Boolean))];
  const draw = (team) => {
    renderMatchList(container, team ? matches.filter((m) => m.team === team) : matches, page);
    window.__volleyReveal?.();
  };
  if (teams.length > 1) {
    const group = filterGroup({
      legend: page.filterLabel || 'Mannschaft', allLabel: page.allFilter || 'Alle',
      items: teams.map((t) => ({ id: t, label: t })),
      onChange: (v) => { draw(v); announce(`${container.querySelectorAll('.event').length} Termine`); },
    });
    filterHost.append(group.element);
  }
  draw('');
}
