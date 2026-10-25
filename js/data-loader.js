/** Lädt JSON-Konfigurationsdateien robust und mit verständlichen Fehlermeldungen. */
import { resolve, CONFIG_FILES } from './config.js';

export class ConfigError extends Error {
  constructor(file, reason) {
    super(`Die Konfigurationsdatei „${file}“ konnte nicht geladen werden: ${reason}`);
    this.name = 'ConfigError';
    this.file = file;
  }
}

const cache = new Map();

/**
 * @param {keyof CONFIG_FILES} key Schlüssel aus config.js
 * @param {{fallback?: any}} [options] Wenn gesetzt, wird bei Fehlern der Fallback geliefert statt zu werfen.
 */
export function loadConfig(key, options = {}) {
  const file = CONFIG_FILES[key];
  if (!file) return Promise.reject(new Error(`Unbekannte Konfiguration: ${key}`));
  if (!cache.has(key)) cache.set(key, fetchJson(file));
  const promise = cache.get(key);
  if ('fallback' in options) {
    return promise.catch((err) => { console.warn(err.message); return options.fallback; });
  }
  return promise;
}

async function fetchJson(file) {
  let response;
  try {
    response = await fetch(resolve(file), { cache: 'no-cache' });
  } catch {
    throw new ConfigError(file, 'Netzwerkfehler. Läuft die Seite über http(s) und nicht über file://?');
  }
  if (!response.ok) throw new ConfigError(file, `HTTP ${response.status}`);
  try {
    return await response.json();
  } catch (err) {
    throw new ConfigError(file, `Ungültiges JSON (${err.message})`);
  }
}
