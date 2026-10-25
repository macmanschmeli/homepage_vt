/** Wiederverwendbare UI-Bausteine (Filter, Hinweise, sichere externe Links). */
import { el, safeHttpUrl } from './utils.js';

export function notice(text, kind = '', { role } = {}) {
  const cls = ['notice', kind && `notice--${kind}`].filter(Boolean).join(' ');
  const p = el('div', { class: cls, role });
  p.append(el('p', { text }));
  return p;
}

export function emptyState(text) { return el('div', { class: 'empty-state' }, el('p', { text })); }

export function errorNotice(text) { return notice(text, 'error', { role: 'alert' }); }

/** Externer Link mit sicheren rel-Attributen. Liefert null, wenn die URL ungültig ist. */
export function externalLink(url, children, props = {}) {
  const href = safeHttpUrl(url);
  if (!href) return null;
  return el('a', { ...props, href, target: '_blank', rel: 'noopener noreferrer' }, children);
}

/**
 * Filtergruppe aus Chips (Einzelauswahl, "Alle" als Standard).
 * Verwendet aria-pressed-Buttons: tastaturbedienbar und für Screenreader verständlich.
 */
export function filterGroup({ legend, allLabel, items, onChange }) {
  const fieldset = el('fieldset', { class: 'filter-group' }, el('legend', { text: legend }));
  const chips = el('div', { class: 'chips' });
  const entries = [{ id: '', label: allLabel }, ...items];
  let value = '';
  const buttons = entries.map((entry) => {
    const btn = el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(entry.id === value), dataset: { value: entry.id },
      on: { click: () => set(entry.id) },
    }, entry.label);
    chips.append(btn);
    return btn;
  });
  function set(next, silent = false) {
    value = next;
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
    if (!silent) onChange(value);
  }
  fieldset.append(chips);
  return { element: fieldset, get value() { return value; }, set };
}
