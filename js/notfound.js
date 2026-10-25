/** 404-Seite: Texte aus pages.json (notFound). */
import { linkHref } from './utils.js';

export async function init({ page }) {
  const a = document.getElementById('nf-cta');
  const href = linkHref(page.cta?.href);
  if (a && href) { a.href = href; a.textContent = page.cta.label; }
}
