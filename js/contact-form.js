/**
 * Kontaktformular mit EmailJS (REST-API, ohne zusätzliche Bibliothek).
 *
 * Ablauf: validieren → Vereinsbenachrichtigung senden → (optional) Bestätigung an Besucher senden.
 * Beide Sendungen sind getrennte Vorgänge; bei Teilausfall wird ehrlich berichtet und die
 * Vereinsbenachrichtigung nie automatisch erneut gesendet.
 *
 * SICHERHEIT: Public Key, Service- und Template-IDs sind öffentlich (so vorgesehen).
 * Empfänger der Vereinsmail wird NUR im EmailJS-Dashboard festgelegt und wird hier nie übergeben.
 * Clientseitige Prüfungen sind nur Komfort und kein Schutz vor Missbrauch – siehe README.
 */
import { isPlaceholder } from './config.js';
import { el, clear, str, linkHref, safeHttpUrl, announce } from './utils.js';
import { notice, errorNotice } from './ui.js';

const API_URL = 'https://api.emailjs.com/api/v1.0/email/send';
const TIMEOUT_MS = 15000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LAST_SEND_KEY = 'volleyteam.contact.lastSend';

/** Entfernt Steuerzeichen, normalisiert Zeilenumbrüche und kürzt auf die Maximallänge. */
function normalize(value, field) {
  let v = String(value ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (field.type !== 'textarea') v = v.replace(/\s*\n\s*/g, ' ');
  v = v.trim();
  return field.maxLength ? v.slice(0, field.maxLength) : v;
}

function validateField(field, value, checked) {
  if (field.type === 'checkbox') return field.required && !checked ? (field.errorText || 'Pflichtfeld.') : null;
  if (!value) return field.required ? (field.errorText || 'Bitte fülle dieses Feld aus.') : null;
  if (field.minLength && value.length < field.minLength) return field.errorText || `Mindestens ${field.minLength} Zeichen.`;
  if (field.type === 'email' && !EMAIL_RE.test(value)) return field.errorText || 'Bitte gib eine gültige E-Mail-Adresse an.';
  return null;
}

function buildFields(fields) {
  return fields.filter((f) => str(f?.name) && /^[a-zA-Z][\w-]*$/.test(f.name) && str(f.label)
    && ['text', 'email', 'textarea', 'checkbox', 'tel'].includes(f.type));
}

async function sendEmailJs(cfg, templateId, params, signal) {
  const res = await fetch(API_URL, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ service_id: cfg.serviceId, template_id: templateId, user_id: cfg.publicKey, template_params: params }),
  });
  if (!res.ok) { const err = new Error(`EmailJS HTTP ${res.status}`); err.status = res.status; throw err; }
}

async function send(cfg, templateId, params) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try { await sendEmailJs(cfg, templateId, params, ctrl.signal); } finally { clearTimeout(timer); }
}

function loadRecaptcha(siteKey) {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha?.render) return resolve(window.grecaptcha);
    window.__onRecaptchaLoad = () => resolve(window.grecaptcha);
    const s = el('script', { src: 'https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit', async: true, defer: true });
    s.addEventListener('error', () => reject(new Error('reCAPTCHA konnte nicht geladen werden')));
    document.head.append(s);
  });
}

function renderAside(page, site) {
  const host = document.getElementById('contact-aside');
  if (!host) return;
  const d = site.contactDetails || {};
  const dl = el('dl');
  const row = (label, content) => dl.append(el('div', {}, el('dt', { text: label }), el('dd', {}, content)));
  const L = page.labels || {};
  row(L.email, d.email && EMAIL_RE.test(d.email) ? el('a', { href: `mailto:${d.email}`, text: d.email }) : el('span', { class: 'todo', text: page.missing }));
  row(L.phone, str(d.phone) ? el('a', { href: `tel:${d.phone.replace(/[^\d+]/g, '')}`, text: d.phone }) : el('span', { class: 'todo', text: page.missing }));
  row(L.address, str(d.address) ? el('span', { text: d.address }) : el('span', { class: 'todo', text: page.missing }));
  const social = (site.social || []).map((s) => safeHttpUrl(s.url) && str(s.label)
    ? el('a', { href: safeHttpUrl(s.url), target: '_blank', rel: 'noopener noreferrer', text: s.label }) : null).filter(Boolean);
  if (social.length) row(L.social, social.flatMap((a, i) => [i ? ' · ' : '', a]));
  host.append(el('h2', { style: 'font-size:var(--fs-lg)', text: page.asideTitle }), dl,
    el('p', { class: 'field__help', style: 'margin-top:var(--space-5)' }, `${page.privacyHint} `, el('a', { href: linkHref('privacy.html'), text: 'Zur Datenschutzerklärung' })));
}

export async function init({ site, page }) {
  renderAside(page, site);
  const host = document.getElementById('contact-form-host');
  const cfg = site.contact;
  if (!cfg || cfg.enabled === false) { host.replaceChildren(notice('Das Kontaktformular ist deaktiviert.')); return; }

  const msg = cfg.messages || {};
  const fields = buildFields(Array.isArray(cfg.fields) ? cfg.fields : []);
  const ejs = cfg.emailjs || {};
  const confirmation = cfg.confirmation?.enabled === true && !isPlaceholder(ejs.confirmationTemplateId);
  const configured = !['publicKey', 'serviceId', 'contactTemplateId'].some((k) => isPlaceholder(ejs[k]));
  const emailField = fields.find((f) => f.name === (cfg.confirmation?.recipientField || 'email') && f.type === 'email');

  if (!fields.length) { host.replaceChildren(errorNotice('Für das Kontaktformular sind keine gültigen Felder konfiguriert (site.json → contact.fields).')); return; }

  const form = el('form', { class: 'form', novalidate: true, 'aria-describedby': 'form-status', autocomplete: 'on' });
  const controls = new Map();
  fields.forEach((f) => {
    const id = `f-${f.name}`; const errId = `${id}-error`; const helpId = `${id}-help`;
    const describedBy = [f.help ? helpId : null, errId].filter(Boolean).join(' ');
    const common = { id, name: f.name, 'aria-describedby': describedBy, autocomplete: f.autocomplete, 'aria-required': f.required ? 'true' : null, maxlength: f.type === 'checkbox' ? null : f.maxLength };
    let control;
    if (f.type === 'textarea') control = el('textarea', { ...common, rows: 6, placeholder: f.placeholder });
    else if (f.type === 'checkbox') control = el('input', { ...common, type: 'checkbox' });
    else control = el('input', { ...common, type: f.type, placeholder: f.placeholder, inputmode: f.type === 'email' ? 'email' : null });
    const error = el('p', { class: 'field__error', id: errId, hidden: true });
    const label = el('label', { for: id }, f.label, f.required && el('span', { class: 'req', 'aria-hidden': 'true', text: ' *' }), f.required && el('span', { class: 'visually-hidden', text: ' (Pflichtfeld)' }));
    const wrap = el('div', { class: `field${f.type === 'checkbox' ? ' field--checkbox' : ''}` });
    if (f.type === 'checkbox') wrap.append(control, label); else wrap.append(label, control);
    if (f.help) wrap.append(el('p', { class: 'field__help', id: helpId, text: f.help }));
    wrap.append(error);
    form.append(wrap);
    controls.set(f.name, { f, control, error });
    control.addEventListener('blur', () => { if (control.dataset.touched) checkField(f.name); });
    control.addEventListener('input', () => { control.dataset.touched = '1'; if (control.getAttribute('aria-invalid') === 'true') checkField(f.name); });
  });

  // Honeypot gegen einfache Bots (für Menschen unsichtbar)
  const honeypot = el('input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
  form.append(el('div', { class: 'hp-field', 'aria-hidden': 'true' }, honeypot));

  let captchaWidget = null; let grecaptcha = null;
  const captchaHost = el('div');
  if (cfg.captcha?.enabled && !isPlaceholder(cfg.captcha.siteKey)) form.append(captchaHost);

  const status = el('div', { id: 'form-status', class: 'form-status', role: 'status', 'aria-live': 'polite', tabindex: '-1' });
  const submit = el('button', { class: 'btn', type: 'submit' }, msg.submitLabel || 'Senden');
  form.append(status, el('div', {}, submit), el('p', { class: 'field__help', text: msg.disclaimer || '' }));

  function checkField(name) {
    const { f, control, error } = controls.get(name);
    const value = f.type === 'checkbox' ? '' : normalize(control.value, f);
    const problem = validateField(f, value, control.checked);
    control.setAttribute('aria-invalid', problem ? 'true' : 'false');
    error.hidden = !problem; error.textContent = problem || '';
    return problem;
  }
  function showStatus(kind, text) {
    clear(status);
    status.append(notice(text, kind, { role: kind === 'error' ? 'alert' : undefined }));
    status.focus({ preventScroll: false });
    announce(text);
  }

  if (!configured) {
    // Ehrlich bleiben: kein Versand ohne konfigurierten Dienst.
    submit.disabled = true;
    status.append(notice(`${msg.notConfigured || 'Das Kontaktformular ist noch nicht konfiguriert.'} (Technischer Hinweis: EmailJS-Platzhalter in config/site.json noch nicht ersetzt.)`, 'placeholder'));
  } else if (cfg.captcha?.enabled && !isPlaceholder(cfg.captcha.siteKey)) {
    loadRecaptcha(cfg.captcha.siteKey).then((g) => { grecaptcha = g; captchaWidget = g.render(captchaHost, { sitekey: cfg.captcha.siteKey, theme: 'dark' }); })
      .catch(() => showStatus('error', msg.error));
  }

  let busy = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy || !configured) return;

    // Validieren
    let firstInvalid = null;
    for (const name of controls.keys()) { if (checkField(name) && !firstInvalid) firstInvalid = controls.get(name).control; }
    if (firstInvalid) { showStatus('error', msg.validation); firstInvalid.focus(); return; }
    if (honeypot.value) { form.reset(); showStatus('success', msg.success); return; } // Bot: stillschweigend verwerfen

    // Einfache Wiederholungssperre pro Browser (Komfort, kein Sicherheitsmerkmal)
    try {
      const last = Number(sessionStorage.getItem(LAST_SEND_KEY) || 0);
      const wait = (cfg.cooldownSeconds || 0) * 1000 - (Date.now() - last);
      if (wait > 0) { showStatus('error', msg.rateLimited); return; }
    } catch { /* sessionStorage nicht verfügbar – ignorieren */ }

    let captchaToken = null;
    if (captchaWidget !== null) {
      captchaToken = grecaptcha.getResponse(captchaWidget);
      if (!captchaToken) { showStatus('error', msg.captcha); return; }
    }

    // Werte aufbereiten
    const values = {};
    controls.forEach(({ f, control }, name) => { if (!f.excludeFromEmail) values[name] = f.type === 'checkbox' ? (control.checked ? 'ja' : 'nein') : normalize(control.value, f); });

    busy = true; submit.disabled = true; form.setAttribute('aria-busy', 'true');
    const original = submit.textContent;
    submit.replaceChildren(el('span', { class: 'spinner', 'aria-hidden': 'true' }), ` ${msg.sending || 'Wird gesendet …'}`);
    showStatus('info', msg.sending || 'Wird gesendet …');

    const siteName = site.name;
    const fullSubject = `${cfg.subjectPrefix ? `${cfg.subjectPrefix}: ` : ''}${values.subject ?? ''}`.trim();
    const base = { ...values, site_name: siteName, subject_full: fullSubject, reply_to: values.email || '', submitted_at: new Date().toISOString() };
    if (captchaToken) base['g-recaptcha-response'] = captchaToken;

    let notificationSent = false;
    try {
      // KEIN Empfängerfeld: Der Empfänger ist im EmailJS-Template fest hinterlegt.
      await send(ejs, ejs.contactTemplateId, base);
      notificationSent = true;
      try { sessionStorage.setItem(LAST_SEND_KEY, String(Date.now())); } catch { /* ignorieren */ }

      if (confirmation && emailField && values[emailField.name]) {
        try {
          await send(ejs, ejs.confirmationTemplateId, {
            to_email: values[emailField.name], to_name: values.name || '', site_name: siteName,
            confirmation_subject: cfg.confirmation.subject, confirmation_message: cfg.confirmation.message,
            your_subject: values.subject || '', ...(captchaToken ? { 'g-recaptcha-response': captchaToken } : {}),
          });
          showStatus('success', msg.successWithConfirmation || msg.success);
        } catch (err) {
          console.warn('Bestätigungsmail fehlgeschlagen:', err.message);
          showStatus('info', msg.partialFailure || msg.success); // ehrlich: Teilerfolg
        }
      } else {
        showStatus('success', msg.success);
      }
      form.reset();
      controls.forEach(({ control, error }) => { control.removeAttribute('aria-invalid'); delete control.dataset.touched; error.hidden = true; });
      if (captchaWidget !== null) grecaptcha.reset(captchaWidget);
    } catch (err) {
      console.error('Kontaktformular:', err);
      const text = err.name === 'AbortError' || err instanceof TypeError ? msg.network : err.status === 429 ? msg.rateLimited : msg.error;
      showStatus('error', text || 'Fehler beim Senden.');
      if (captchaWidget !== null) grecaptcha.reset(captchaWidget);
      if (notificationSent) showStatus('info', msg.partialFailure);
    } finally {
      busy = false; submit.disabled = false; form.removeAttribute('aria-busy'); submit.textContent = original;
    }
  });

  host.replaceChildren(form);
}
