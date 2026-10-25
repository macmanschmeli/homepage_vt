/** Kleine DOM- und Datenhilfen. Alle Texte werden als textContent gesetzt – nie als HTML. */
import { resolve } from './config.js';

/**
 * Erzeugt ein Element. props: class, text, attrs-Objekt, on-Objekt, hidden usw.
 * Kinder: Strings (→ Textknoten), Nodes oder null/false (werden ignoriert).
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'on') for (const [evt, fn] of Object.entries(value)) node.addEventListener(evt, fn);
    else if (key === 'dataset') for (const [k, v] of Object.entries(value)) node.dataset[k] = v;
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) { node.replaceChildren(); return node; }

/** Gibt s zurück, wenn es ein nicht-leerer String ist, sonst null. */
export function str(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Liefert eine geprüfte http(s)-URL oder null. Verhindert javascript:-/data:-Links aus JSON.
 */
export function safeHttpUrl(value) {
  const s = str(value);
  if (!s) return null;
  try {
    const url = new URL(s);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}

/** Erlaubt nur relative Projektpfade ohne Protokoll oder ".."; sonst null. */
export function safeAssetPath(value) {
  const s = str(value);
  if (!s || /^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('//') || s.split('/').includes('..')) return null;
  return resolve(s);
}

/** Setzt Text und markiert [[TODO: …]]-Stellen sicher als <span class="todo">. */
export function appendRichText(parent, text) {
  const parts = String(text).split(/(\[\[.*?\]\])/g);
  for (const part of parts) {
    const m = part.match(/^\[\[(.*?)\]\]$/);
    if (m) parent.append(el('span', { class: 'todo', text: m[1] }));
    else if (part) parent.append(document.createTextNode(part));
  }
  return parent;
}

/** Interne oder externe Link-Auflösung: externe URLs unverändert (nur http/https), interne relativ zur Basis. */
export function linkHref(href) {
  const s = str(href);
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return safeHttpUrl(s);
  if (s.startsWith('mailto:')) return s.replace(/[\r\n\s]/g, '');
  if (s.startsWith('#')) return s;
  return safeAssetPath(s);
}

/** Zeitfunktionen */
export function parseDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}
export function endOfDay(date) { const d = new Date(date); d.setHours(23, 59, 59, 999); return d; }
export function isValidTime(v) { return typeof v === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(v.trim()); }
export function padTime(v) { const [h, m] = v.trim().split(':'); return `${h.padStart(2, '0')}:${m}`; }

const fmtCache = {};
export function formatter(locale, opts) {
  const key = locale + JSON.stringify(opts);
  return (fmtCache[key] ??= new Intl.DateTimeFormat(locale, opts));
}

/** Rückt Fokus und Live-Region-Text: sprechende Ansage für Screenreader. */
export function announce(message) {
  let region = document.getElementById('live-region');
  if (!region) {
    region = el('div', { id: 'live-region', class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
    document.body.append(region);
  }
  region.textContent = '';
  // kurzer Timeout, damit identische Meldungen erneut vorgelesen werden
  setTimeout(() => { region.textContent = message; }, 50);
}

export function initials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
