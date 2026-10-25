# Südstadt volleyteam – Website

Statische, JSON-gesteuerte Vereinswebsite (HTML5, CSS3, Vanilla-JavaScript mit ES-Modulen). Kein Build-Schritt, kein Framework, kein Backend. Geeignet für **GitHub Pages**, auch als Projektseite in einem Unterpfad (`https://<user>.github.io/<repo>/`).

> **Status:** Die Website ist vollständig implementiert. Einige Inhalte sind bewusst als Platzhalter markiert, weil sie auf der bisherigen Vereinswebsite nicht verifizierbar waren (siehe [Offene Punkte](#offene-punkte-vor-dem-livegang)). Das Kontaktformular sendet erst, wenn EmailJS eingerichtet ist – bis dahin ist es deaktiviert und behauptet keinen Versand.

## Inhalt

1. [Projektstruktur](#projektstruktur)
2. [Lokal testen](#lokal-testen)
3. [Auf GitHub Pages veröffentlichen](#auf-github-pages-veröffentlichen)
4. [Inhalte pflegen (JSON)](#inhalte-pflegen-json)
5. [EmailJS einrichten](#emailjs-einrichten)
6. [Sicherheit und Restrisiken](#sicherheit-und-restrisiken)
7. [Offene Punkte vor dem Livegang](#offene-punkte-vor-dem-livegang)
8. [Testcheckliste](#testcheckliste)

## Projektstruktur

```text
index.html  matches.html  trainings.html  teams.html  trainers.html
sponsors.html  contact.html  privacy.html  imprint.html  404.html
config/   site, navigation, pages, matches, training-config, trainings,
          halls, teams, trainers, sponsors  (alle Inhalte, *.json)
css/      variables (Design-Tokens) · base · layout · components · pages
js/       app (Einstieg) · config (Pfade) · data-loader · utils · ui
          navigation · home · matches · trainings · teams · trainers
          sponsors · contact-form · legal · notfound
assets/   images/ · logos/ · icons/
```

* Die HTML-Seiten enthalten nur Struktur. Alle Texte kommen aus `config/*.json`.
* Header, mobiles Menü und Footer werden einmalig in `js/navigation.js` aus `navigation.json`/`site.json` erzeugt.
* Alle JSON-Werte werden als reiner Text (`textContent`) ausgegeben, nie als HTML. Externe URLs müssen `http(s)` sein, Farben stammen aus einer festen Allowlist, Bildpfade dürfen nur relative Projektpfade sein.
* Pfade werden über `import.meta.url` aufgelöst (`js/config.js`). Dadurch funktionieren JSON-Abfragen, Bilder und Links unabhängig vom Hosting-Pfad.

## Lokal testen

Die Seite lädt JSON per `fetch()` und nutzt ES-Module – `file://` funktioniert **nicht**. Starte einen statischen Server im Projektordner:

```bash
python3 -m http.server 8000
# oder: npx serve .
```

Dann `http://localhost:8000/` öffnen. Um den Unterpfad-Betrieb zu simulieren:

```bash
mkdir -p /tmp/sim && ln -sfn "$(pwd)" /tmp/sim/volleyteam
cd /tmp/sim && python3 -m http.server 8001   # → http://localhost:8001/volleyteam/
```

## Auf GitHub Pages veröffentlichen

1. Neues GitHub-Repository anlegen und den Inhalt dieses Ordners ins Wurzelverzeichnis pushen.
2. *Settings → Pages → Build and deployment*: Source **Deploy from a branch**, Branch `main`, Ordner `/ (root)`.
3. Nach ca. 1–2 Minuten ist die Seite unter `https://<user>.github.io/<repo>/` erreichbar.
4. Eigene Domain (optional): unter *Settings → Pages → Custom domain* eintragen und DNS-Einträge laut GitHub-Anleitung setzen.
5. **EmailJS-Origin eintragen** (siehe unten), sonst werden Anfragen von der Live-Domain abgelehnt.

**404-Seite:** GitHub Pages liefert `404.html` unter beliebigen Pfaden aus. `404.html` setzt deshalb per Mini-Skript ein `<base>`-Element: bei `*.github.io` der erste Pfadabschnitt (`/<repo>/`), sonst `/`. Bei einer Benutzer-Seite (`<user>.github.io` als Repository-Name) oder ungewöhnlichem Setup `BASE_OVERRIDE` im Skript am Anfang von `404.html` setzen (z. B. `"/"`).

## Inhalte pflegen (JSON)

Felder mit dem Präfix `_` (z. B. `_hinweis`) sind Kommentare und werden ignoriert. Datumsformat überall `JJJJ-MM-TT`, Zeiten `HH:MM`. Ungültige Einträge werden übersprungen und in der Browser-Konsole gemeldet; fehlende/defekte Dateien erzeugen eine verständliche Fehlermeldung auf der Seite.

| Datei | Zweck |
|---|---|
| `site.json` | Name, Logo, Kontaktdaten, Social-Links, Footer, **Kontaktformular + EmailJS-IDs** |
| `navigation.json` | Menüpunkte, Reihenfolge, Ziele, Footer-Links |
| `pages.json` | Überschriften, Einleitungen, Rechtstexte (`[[TODO: …]]` markiert offene Stellen) |
| `matches.json` | Matches und Termine |
| `training-config.json` | Filter (Teams), Wochentage, Texte der Trainingsplan-Seite |
| `halls.json` | Hallen (auch als Filter) |
| `trainings.json` | Trainingseinheiten |
| `teams.json`, `trainers.json` | Teams und Trainerprofile |
| `sponsors.json` | Sponsoren/Unterstützer, Logos, Links |

### Match hinzufügen (`matches.json`)

```json
{ "title": "H1 vs Musterverein", "start": "2026-12-05", "time": "19:00",
  "type": "home", "team": "H1", "place": "Musterhalle", "color": "red" }
```

Pflicht: `title`, `start`. Optional: `time`, `end` (mehrtägig), `type` (`home` | `away` | `event`; fehlt er, wird „Heim“/„Auswärts“ im Titel erkannt), `place`, `team` (erzeugt Filter), `color` (`sky`, `red`, `green`, `amber`, `grey`). Beim Format `"… 19:00"` am Titelende wird die Uhrzeit automatisch herausgelöst. Termine verschwinden nach Ablauf ihres Tages automatisch. Einträge mit `"example": true` lösen einen Hinweis „Beispieldaten“ aus – **entferne dieses Feld bei echten Terminen**.

### Trainingseinheit hinzufügen (`trainings.json`)

```json
{ "id": "damen-mo", "day": "mo", "title": "Damen 1", "teams": ["damen"],
  "hall": "modeschule", "start": "19:00", "end": "21:00" }
```

`day` = Tag-ID aus `training-config.json`, `teams` = Filter-IDs (`teamFilters`), `hall` = ID aus `halls.json`. Neue Filter oder Tage ergänzt man in `training-config.json`, neue Hallen in `halls.json` – ohne Code-Änderung. Sobald der echte Plan eingetragen ist, in `training-config.json` `"scheduleStatus": "confirmed"` setzen und `example`-Felder entfernen; dann verschwindet der Hinweis.

### Team, Trainer, Sponsor

* **Team** (`teams.json`): `id`, `name` Pflicht; `league`, `description`, `coaches` (Trainer-IDs), `image`, `trainingFilter` optional.
* **Trainer** (`trainers.json`): `id`, `name` Pflicht; `role`, `teams`, `bio`, `quote`, `image`, `links`, `email` optional. Ohne Foto erscheinen Initialen.
* **Sponsor** (`sponsors.json`): `id`, `name`, `url`, `logo` (z. B. `assets/logos/billa.svg`), `tier` (`sponsor` oder `supporter`, definiert in `pages.json → sponsors.tiers`), `order`, `active`. Logos erscheinen klickbar und öffnen in neuem Tab (`rel="noopener noreferrer"`). Ohne `logo` – oder wenn das Bild nicht lädt – erscheint der Name als Text.

### Bilder

Bilder in `assets/images/`, `assets/logos/` ablegen und den relativen Pfad in die JSON-Datei eintragen. Empfehlung: WebP/AVIF oder optimierte JPEG, Breite max. ~1600 px (Hero) bzw. ~800 px (Porträts). Alle Bilder unterhalb des sichtbaren Bereichs werden per `loading="lazy"` geladen. **Es dürfen nur Bilder verwendet werden, für die der Verein die Rechte besitzt** (Fotos und Sponsoren-Logos benötigen eine Freigabe).

## EmailJS einrichten

Das Kontaktformular nutzt die [EmailJS-REST-API](https://www.emailjs.com/docs/rest-api/send/) direkt per `fetch` (keine zusätzliche Bibliothek). Es werden zwei getrennte Mails ausgelöst: **Benachrichtigung an den Verein** und **Eingangsbestätigung an die Besucherin / den Besucher**.

### Einmalige Einrichtung

1. EmailJS-Konto des Vereins erstellen bzw. öffnen (https://www.emailjs.com).
2. *Email Services* → Dienst verbinden (z. B. Gmail/Outlook/SMTP des Vereins). Service-ID notieren.
3. Ggf. Absenderadresse bzw. Domain beim Anbieter verifizieren (SPF/DKIM), sonst landen Mails im Spam.
4. **Template „Kontaktanfrage“** (an den Verein) anlegen:
   * *To email*: **feste Vereinsadresse** direkt im Template eintragen (nicht als `{{variable}}`!). So kann kein Besucher den Empfänger beeinflussen.
   * *Reply-To*: `{{reply_to}}`
   * *Subject*: `{{subject_full}}`
   * Inhalt z. B.: Name `{{name}}`, E-Mail `{{email}}`, Betreff `{{subject}}`, Nachricht `{{message}}`, Zeitpunkt `{{submitted_at}}`.
   * *From name/email*: die verifizierte Absenderidentität des Dienstes – **nicht** die Adresse des Besuchers.
5. **Template „Bestätigung“** (an Besucher) anlegen:
   * *To email*: `{{to_email}}`
   * *Subject*: fester Text oder `{{confirmation_subject}}`
   * Inhalt: `{{confirmation_message}}` (optional `{{to_name}}`, `{{your_subject}}`).
6. In `config/site.json → contact.emailjs` eintragen: `publicKey` (*Account → API keys → Public Key*), `serviceId`, `contactTemplateId`, `confirmationTemplateId`.
7. **Sicherheit im EmailJS-Dashboard** (siehe unten): erlaubte Domains, Rate-Limits, CAPTCHA, Quota-Alarme.
8. Testen (siehe [Testcheckliste](#testcheckliste)).

### Wer ist wofür zuständig?

| Einstellung | Maßgebliche Quelle |
|---|---|
| Public Key, Service-ID, Template-IDs | `site.json` (öffentlich; müssen mit dem Dashboard übereinstimmen) |
| Formularfelder, Labels, Pflichtfelder, Längen, Meldungen im Browser | `site.json → contact.fields / messages` |
| **Empfänger der Vereinsmail** | **nur EmailJS-Template** (`recipientEmail` in `site.json` dient lediglich der Dokumentation und wird nie gesendet) |
| Absenderidentität, Betreff und Text der realen E-Mails | **EmailJS-Template** – Änderungen in `confirmation.subject/message` in der JSON wirken nur, wenn das Template diese Variablen verwendet |
| Erlaubte Domains, Rate-Limits, reCAPTCHA-Secret, Quota-Alarme | EmailJS-Dashboard |

### Optional: CAPTCHA

EmailJS unterstützt reCAPTCHA. Aktivieren: im Dashboard (*Service/Account → Security*) reCAPTCHA konfigurieren, dann in `site.json → contact.captcha` `"enabled": true` setzen und den **Site Key** (öffentlich) eintragen. Der Secret Key gehört ausschließlich ins Dashboard. Das Skript von Google wird erst bei Aktivierung geladen – dann bitte Datenschutzerklärung anpassen und Einwilligung klären.

## Sicherheit und Restrisiken

Die EmailJS-Kennungen sind im Browser sichtbar. Das ist so vorgesehen; der Public Key ist **kein Passwort**.

**Umgesetzt im Code:** feste Templates, kein frei wählbarer Empfänger der Vereinsmail, Eingabevalidierung (Typ, E-Mail-Format, Längen, Pflichtfelder) und Normalisierung (Steuerzeichen entfernt, Längen gekürzt), kein HTML-Rendering von Nutzereingaben, Honeypot-Feld, Sperre gegen Doppelabsendung während des Sendens und kurze Wiederholungssperre pro Browser, getrennte Behandlung von Vereinsmail und Bestätigung (bei Teilausfall wird die Vereinsmail nie automatisch erneut gesendet), Zeitlimit von 15 s.

**Vom Verein im EmailJS-Dashboard zu erledigen:** erlaubte Origins/Domains auf die echte Website beschränken, Rate-Limits aktivieren, CAPTCHA aktivieren (falls im Tarif verfügbar), Quota-/Nutzungs-Benachrichtigungen einschalten, keine Zugangsdaten in das Repository committen.

**Restrisiken (offen benannt):**

* Clientseitige Prüfungen lassen sich umgehen; sie verhindern keinen automatisierten Missbrauch.
* Wer die öffentlichen IDs kennt, kann Anfragen direkt an EmailJS senden (Spam, Verbrauch des Monatskontingents). Origin-Beschränkung, Rate-Limits und CAPTCHA mindern das, schließen es aber nicht aus (Origin-Header lassen sich außerhalb von Browsern fälschen).
* Ein Server-Backend wäre die robustere Variante – für diese Umsetzung bewusst nicht vorgesehen.
* „Erfolgreich“ bedeutet nur, dass EmailJS die Anfrage angenommen hat – nicht, dass die Mail im Posteingang liegt. Die Seite verspricht daher keine garantierte Zustellung.

## Offene Punkte vor dem Livegang

**Vom Verein zu liefern:**

* [ ] Offizielles Logo (`assets/logos/`, Pfad in `site.json → logo`) – derzeit Platzhalter „VT“.
* [ ] Echte Fotos (Hero, Teams, Trainerporträts) mit Bildrechten; derzeit Hero-Illustration und Initialen als Platzhalter.
* [ ] Sponsoren-Logos mit Freigabe der Sponsoren (alle `logo`-Felder in `sponsors.json` sind `null`; Namen/Links stammen von der bisherigen Website). Sponsor „Danke Opa“ hat dort keinen Link.
* [ ] Aktueller **Trainingsplan** (`trainings.json`/`training-config.json`) – nur klar gekennzeichnete Beispieldaten; die bisherige Website lieferte keinen auslesbaren Plan.
* [ ] Aktuelle **Matches** (`matches.json`) – derzeit Beispieldaten laut Vorgabe; die Terminliste der bisherigen Website ist dynamisch eingebunden und war nicht auslesbar.
* [ ] Spielklassen der Herren 1, Herren 2 und der Jugendteams (`teams.json → league`), ggf. einzelne Jugendteams (U16, U18, U20, Beginners, Kinder) als eigene Einträge; Trainer-Zuordnung der Damen 1.
* [ ] Kontaktdaten: E-Mail, Telefon, Anschrift (`site.json → contactDetails`); auf der bisherigen Website nicht veröffentlicht.
* [ ] **Vereinsname:** Die bisherige Website nennt den Verein „Volleyteam Mödling“, die Vorgabe „Südstadt volleyteam“. Bitte offiziellen Namen klären und in `site.json` (`name`, `brand`) und `pages.json` vereinheitlichen.
* [ ] Impressum und Datenschutzerklärung (`pages.json`): alle gelb markierten `[[TODO]]`-Stellen ergänzen und rechtlich prüfen lassen.
* [ ] Bestätigung, dass Mitgliedsbeitrag (€ 450,– laut bisheriger Website), Aussagen zu „über 40 Jahren“, Auszeichnung zum nachhaltigsten Verein usw. aktuell sind. Diese Aussagen wurden von der bisherigen Website übernommen, nicht neu geprüft.
* [ ] Trainerbiografien wurden von der bisherigen Website gekürzt/umformuliert übernommen – bitte inhaltlich freigeben lassen (Einwilligung der Personen, DSGVO).

**Externe Konten/Einstellungen:** EmailJS-Konto samt Service, zwei Templates, Origin-Beschränkung, Rate-Limits, ggf. CAPTCHA; GitHub-Repository und Pages-Aktivierung; ggf. eigene Domain.

## Testcheckliste

Bereits in der Entwicklung geprüft (siehe Abschlussbericht): JSON-Syntax aller Dateien, JavaScript-Syntax, Existenz aller verlinkten Seiten und Assets, Laden der Seiten über einen lokalen HTTP-Server.

**Noch manuell zu testen (nicht in dieser Umgebung möglich bzw. abhängig von Vereinsdaten):**

* [ ] Alle Seiten auf Smartphone, Tablet, Desktop (Navigation, Mobilmenü, Filter).
* [ ] Nur Tastatur: Skip-Link, Menü (Escape schließt), Filter-Chips, Formular, sichtbarer Fokus.
* [ ] Screenreader-Stichprobe (Formularfehler, Filter-Ergebnisansage).
* [ ] `prefers-reduced-motion` aktivieren → keine Animationen, alles bedienbar.
* [ ] Livetest auf der GitHub-Pages-URL inkl. Unterpfad und 404-Seite.
* [ ] **EmailJS echt testen:** (a) Erfolg → Vereinsmail + Bestätigung kommen an; (b) falsche ID → verständliche Fehlermeldung; (c) Template ohne Bestätigung → Teilerfolg-Meldung; (d) Spam-Schutz (Origin, Rate-Limit, CAPTCHA) prüfen; (e) Versand von einer nicht erlaubten Domain muss scheitern.
* [ ] Kontrast-/Lighthouse-Prüfung mit echten Bildern.

## Bekannte Einschränkungen

* Seitenübergänge nutzen die View-Transitions-API für mehrere Seiten (aktuelle Chromium-/Safari-Browser); andere Browser blenden ohne Übergang um.
* Ohne JavaScript werden keine Inhalte angezeigt (Hinweis erscheint), da alle Inhalte aus JSON geladen werden.
* Schriftarten sind Systemschriften (bewusst, aus Datenschutz- und Performancegründen). Eine eigene Schrift kann lokal in `assets/` eingebunden werden.
