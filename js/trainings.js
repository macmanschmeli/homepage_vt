/** Trainingsplan mit dynamischen Team- und Hallenfiltern. */
import { loadConfig } from './data-loader.js';
import { el, clear, str, isObject, isValidTime, padTime, announce, appendRichText, linkHref } from './utils.js';
import { notice, errorNotice, filterGroup, externalLink } from './ui.js';

function normalize(raw, index, cfg, hallsById) {
  if (!isObject(raw)) return null;
  const dayIds = cfg.days.map((d) => d.id);
  if (!dayIds.includes(raw.day) || !isValidTime(raw.start) || !isValidTime(raw.end) || !str(raw.title)) {
    console.warn(`trainings.json[${index}]: Tag, Zeiten oder Titel ungültig – übersprungen`);
    return null;
  }
  const teams = (Array.isArray(raw.teams) ? raw.teams : []).filter((t) => cfg.teamFilters.some((f) => f.id === t));
  const hall = hallsById.has(raw.hall) ? raw.hall : null;
  if (!hall) console.warn(`trainings.json[${index}]: unbekannte Halle "${raw.hall}"`);
  return {
    id: str(raw.id) || `t${index}`, day: raw.day, title: raw.title.trim(), teams, hall,
    start: padTime(raw.start), end: padTime(raw.end), note: str(raw.note), example: raw.example === true,
  };
}

export async function init({ page, site }) {
  renderJoin(page, site);
  const host = document.getElementById('training-plan');
  const filterHost = document.getElementById('training-filters');
  const noticeHost = document.getElementById('training-notice');
  let cfg, rawSessions, halls;
  try {
    [cfg, rawSessions, halls] = await Promise.all([loadConfig('trainingConfig'), loadConfig('trainings'), loadConfig('halls')]);
  } catch (err) { host.replaceChildren(errorNotice(err.message)); return; }

  cfg.days = Array.isArray(cfg.days) ? cfg.days : [];
  cfg.teamFilters = Array.isArray(cfg.teamFilters) ? cfg.teamFilters : [];
  cfg.hallFilters = Array.isArray(cfg.hallFilters) ? cfg.hallFilters : null;
  const hallList = (Array.isArray(halls) ? halls : []).filter((h) => str(h?.id) && str(h?.label));
  const hallsById = new Map(hallList.map((h) => [h.id, h]));
  const sessions = (Array.isArray(rawSessions) ? rawSessions : []).map((s, i) => normalize(s, i, cfg, hallsById)).filter(Boolean)
    .sort((a, b) => a.start.localeCompare(b.start));

  const heading = document.getElementById('week-heading');
  if (heading && cfg.weekHeading) heading.textContent = cfg.weekHeading;
  const weekNote = document.getElementById('week-note');
  if (weekNote && cfg.weekNote) weekNote.textContent = cfg.weekNote;
  if (cfg.scheduleStatus !== 'confirmed' && cfg.exampleNotice) noticeHost.replaceChildren(notice(cfg.exampleNotice, 'placeholder'));

  const state = { team: '', hall: '' };
  const status = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
  const result = el('div', { class: 'plan' });

  const teamGroup = filterGroup({ legend: cfg.teamFilterLabel || 'Mannschaft', allLabel: cfg.allLabel || 'Alle', items: cfg.teamFilters, onChange: (v) => { state.team = v; draw(true); } });
  // Hallenfilter: aus training-config.hallFilters (Reihenfolge/Auswahl) oder – falls nicht gesetzt – aus halls.json
  const hallItems = (cfg.hallFilters ? cfg.hallFilters.map((f) => hallsById.get(f.id) || f).filter((h) => str(h?.id)) : hallList);
  const hallGroup = filterGroup({ legend: cfg.hallFilterLabel || 'Halle', allLabel: cfg.allLabel || 'Alle', items: hallItems, onChange: (v) => { state.hall = v; draw(true); } });
  const reset = el('button', { type: 'button', class: 'btn btn--ghost btn--small', on: { click: () => { teamGroup.set('', true); hallGroup.set('', true); state.team = state.hall = ''; draw(true); } } }, cfg.resetLabel || 'Filter zurücksetzen');
  filterHost.append(el('div', { class: 'filter-bar' }, teamGroup.element, hallGroup.element, el('div', {}, reset)), status);
  host.replaceWith(result);

  function draw(announceResult) {
    clear(result);
    const visible = sessions.filter((s) => (!state.team || s.teams.includes(state.team)) && (!state.hall || s.hall === state.hall));
    let i = 0;
    for (const day of cfg.days) {
      const daySessions = visible.filter((s) => s.day === day.id);
      if (!daySessions.length && !cfg.showEmptyDays) continue;
      const list = el('ul', { class: 'session-list' });
      daySessions.forEach((s) => {
        const hall = s.hall ? hallsById.get(s.hall)?.label : null;
        const teamTags = s.teams.map((t) => cfg.teamFilters.find((f) => f.id === t)?.label).filter(Boolean);
        list.append(el('li', { class: 'session', style: `--i:${i++}` },
          el('span', { class: 'session__time' }, el('time', { datetime: s.start }, s.start), ' – ', el('time', { datetime: s.end }, s.end), ' Uhr'),
          el('h4', { class: 'session__title', text: s.title }),
          el('p', { class: 'session__hall', text: hall ? `Halle: ${hall}` : 'Halle: noch nicht angegeben' }),
          (teamTags.length || s.example || s.note) && el('div', { class: 'session__tags' },
            ...teamTags.map((t) => el('span', { class: 'tag tag--grey', text: t })),
            s.example && el('span', { class: 'tag tag--amber', text: 'Beispiel' }),
            s.note && el('span', { class: 'tag tag--sky', text: s.note })),
        ));
      });
      result.append(el('section', { class: 'day', 'aria-labelledby': `day-${day.id}` },
        el('h3', { class: 'day__title', id: `day-${day.id}`, text: day.label }),
        daySessions.length ? list : el('p', { text: cfg.emptyDay || 'Kein Training' })));
    }
    if (!visible.length) result.replaceChildren(el('div', { class: 'empty-state' }, el('p', { text: cfg.noResults || 'Keine Einheiten gefunden.' })));
    if (announceResult) status.textContent = (cfg.resultsLabel || '{count}').replace('{count}', String(visible.length));
  }
  draw(false);

  // Preselect über URL-Parameter, z. B. trainings.html?team=damen
  const params = new URLSearchParams(location.search);
  if (cfg.teamFilters.some((f) => f.id === params.get('team'))) { state.team = params.get('team'); teamGroup.set(state.team, true); draw(false); }

  // Beitrittstexte (aus pages.json)
  const fee = document.getElementById('fee-text');
  if (fee && page.feeText) appendRichText(fee, page.feeText);
}

/** Texte rund um Mittrainieren, Anmeldung und Vereinsplaner-Apps (aus pages.json bzw. site.json). */
function renderJoin(page, site) {
  const steps = document.getElementById('join-steps');
  (page.joinSteps || []).forEach((t) => steps.append(el('li', { text: t })));
  const cta = document.getElementById('join-cta');
  const href = linkHref(page.joinCta?.href);
  if (cta && href) { cta.href = href; cta.textContent = page.joinCta.label; }
  const apps = document.getElementById('app-links');
  ['vereinsplaner', 'vereinsplanerIos'].forEach((key) => {
    const link = site.links?.[key];
    const a = link && externalLink(link.url, link.label, { class: 'btn btn--ghost btn--small' });
    if (a) apps.append(a);
  });
}
