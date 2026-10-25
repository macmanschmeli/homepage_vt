/** Startseite: Hero, Pillars, nächste Matches, Team- und Sponsorenhighlights. */
import { loadMatches, renderMatchList } from './matches.js';
import { loadTeams, renderTeamTeasers } from './teams.js';
import { loadSponsors, renderSponsorGrid } from './sponsors.js';
import { el, linkHref, safeAssetPath } from './utils.js';
import { errorNotice } from './ui.js';

function setLink(id, cta) {
  const a = document.getElementById(id);
  const href = cta && linkHref(cta.href);
  if (a && href) { a.href = href; a.textContent = cta.label; }
}

export async function init({ site, pages, page }) {
  // Hero-Bild
  const heroSrc = safeAssetPath(site.heroImage?.src);
  const heroMedia = document.getElementById('hero-media');
  if (heroMedia && heroSrc) heroMedia.append(el('img', { src: heroSrc, alt: site.heroImage.alt || '', fetchpriority: 'high', decoding: 'async' }));

  setLink('hero-cta-1', page.hero?.primaryCta); setLink('hero-cta-2', page.hero?.secondaryCta);
  setLink('youth-cta', page.youth?.cta); setLink('join-cta', page.join?.cta);
  setLink('matches-link', { href: 'matches.html', label: page.matchesSection?.linkLabel });
  setLink('teams-link', { href: 'teams.html', label: page.teamsSection?.linkLabel });
  setLink('sponsors-link', { href: 'sponsors.html', label: page.sponsorsSection?.linkLabel });

  const about = document.getElementById('about-text');
  (page.about?.paragraphs || []).forEach((p) => about.append(el('p', { text: p })));

  const pillars = document.getElementById('pillars');
  (page.pillars || []).forEach((p, i) => pillars.append(el('div', { class: 'pillar', 'data-reveal': '' },
    el('span', { class: 'pillar__num', text: String(i + 1).padStart(2, '0') }), el('h3', { text: p.title }), el('p', { text: p.text }))));

  // Dynamische Bereiche unabhängig voneinander laden: ein Fehler betrifft nur seinen Bereich.
  const sections = [
    ['home-matches', async (host) => renderMatchList(host, await loadMatches(), pages.matches, { limit: 4 })],
    ['home-teams', async (host) => renderTeamTeasers(host, await loadTeams(), { limit: 4 })],
    ['home-sponsors', async (host) => {
      const all = await loadSponsors();
      const main = all.filter((s) => s.tier === 'sponsor');
      renderSponsorGrid(host, main.length ? main : all.slice(0, 6), { large: true, hint: pages.sponsors?.newTabHint || '' });
    }],
  ];
  await Promise.all(sections.map(async ([id, render]) => {
    const host = document.getElementById(id);
    try { await render(host); } catch (err) { console.error(err); host.replaceChildren(errorNotice(err.message)); }
  }));
}
