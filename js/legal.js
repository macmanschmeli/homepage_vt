/** Datenschutz und Impressum: Abschnitte aus pages.json, [[TODO]]-Markierungen hervorgehoben. */
import { el, appendRichText } from './utils.js';
import { notice } from './ui.js';

export async function init({ page }) {
  const host = document.getElementById('legal-content');
  host.append(notice(page.notice, 'placeholder'));
  (page.sections || []).forEach((s) => {
    const section = el('section', {}, el('h2', { text: s.heading }));
    (s.paragraphs || []).forEach((p) => section.append(appendRichText(el('p'), p)));
    host.append(section);
  });
}
