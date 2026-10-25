/**
 * Zentrale Pfad- und Konfigurationshilfen.
 * BASE_URL wird aus dem Speicherort dieses Moduls abgeleitet (…/js/config.js → …/).
 * Dadurch funktionieren alle Pfade auch dann, wenn die Seite in einem Unterpfad
 * (z. B. https://user.github.io/repo/) ausgeliefert wird.
 */
export const BASE_URL = new URL('../', import.meta.url);

/** Löst einen projektrelativen Pfad (z. B. "assets/logos/x.svg") zu einer absoluten URL auf. */
export function resolve(path) {
  return new URL(String(path).replace(/^\/+/, ''), BASE_URL).href;
}

/** Erlaubte Farbnamen für Termine (verhindert, dass JSON-Werte in CSS landen). */
export const COLOR_ALLOWLIST = ['sky', 'red', 'green', 'amber', 'grey'];

/** Muss mit den Datei-IDs der Navigation übereinstimmen. */
export const CONFIG_FILES = {
  site: 'config/site.json',
  navigation: 'config/navigation.json',
  pages: 'config/pages.json',
  matches: 'config/matches.json',
  trainingConfig: 'config/training-config.json',
  trainings: 'config/trainings.json',
  halls: 'config/halls.json',
  teams: 'config/teams.json',
  trainers: 'config/trainers.json',
  sponsors: 'config/sponsors.json',
};

/** Prüft, ob ein EmailJS-Wert noch ein Platzhalter ist. */
export function isPlaceholder(value) {
  return typeof value !== 'string' || value.trim() === '' || /^YOUR_/i.test(value.trim());
}
