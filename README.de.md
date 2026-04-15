<h1 align="center">🔖 Claude Sessions Manager</h1>

<p align="center">
  <strong>Dein täglicher Einstiegspunkt für <a href="https://claude.com/claude-code">Claude Code</a>.</strong><br>
  Setze jede Unterhaltung genau dort fort, wo du aufgehört hast — ohne das Projekt erneut zu erklären, ohne Kontextverlust.
</p>

<p align="center">
  <a href="README.md">🇺🇸 English</a> ·
  <a href="README.pt-BR.md">🇧🇷 Português</a> ·
  <a href="README.es.md">🇪🇸 Español</a> ·
  <a href="README.ja.md">🇯🇵 日本語</a> ·
  <a href="README.zh-CN.md">🇨🇳 简体中文</a> ·
  <a href="README.ko.md">🇰🇷 한국어</a> ·
  <strong>🇩🇪 Deutsch</strong>
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white">
  <img alt="Apache" src="https://img.shields.io/badge/Apache-2.4%2B-D22128?logo=apache&logoColor=white">
  <img alt="mod_wsgi" src="https://img.shields.io/badge/mod__wsgi-required-0066cc">
  <img alt="Vanilla JS" src="https://img.shields.io/badge/Vanilla-JS%20%7C%20CSS%20%7C%20HTML-F7DF1E?logo=javascript&logoColor=black">
  <img alt="Zero deps" src="https://img.shields.io/badge/deps-zero-success">
</p>

---

## 💡 Warum verwenden

Jedes Projekt hat versteckte Kosten: **den Kontext wieder aufzuwärmen**. Jedes Mal, wenn du Claude öffnest, verlierst du Zeit:

- 🔁 Architektur erneut erklären
- 📍 Zeigen, wo du aufgehört hast
- 📂 Die wichtigen Dateien auflisten
- 🧠 Neu ausrichten, was gerade lief

Das sind **15–30 Minuten, nur um produktiv zu werden**. Und wenn das Terminal schließt, ist der Kontext, den Claude gerade aufgebaut hat, weg.

✨ **Die gute Nachricht:** Claude Code speichert bereits jede Unterhaltung, damit du sie fortsetzen kannst.

😩 **Das Problem:** die richtige Unterhaltung unter Dutzenden automatisch generierter Codes zu finden.

Genau das löst dieses Projekt. In 4 Schritten:

1. 🏁 Dashboard öffnen
2. 🎯 Die richtige Unterhaltung finden
3. 📋 Klicken — der Befehl liegt schon in der Zwischenablage
4. 💻 Im Terminal einfügen und dort weitermachen, wo du aufgehört hast

> **Fortsetzen kostet Sekunden. Von vorn anfangen kostet Stunden.**

---

## ✨ Funktionen

| | |
|---|---|
| 🔁 **Mit 1 Klick fortsetzen** | Unterhaltung anklicken → der Fortsetzen-Befehl liegt sofort in der Zwischenablage |
| 🏷️ **Namen und Notizen** | Vergib einen menschenlesbaren Namen pro Unterhaltung und notiere, wo du aufgehört hast |
| ⭐ **Favoriten** | Hebe die Unterhaltungen hervor, die du täglich nutzt |
| 🗑️ **Sicherer Papierkorb** | Archiviere alte ohne Sorge — endgültiges Löschen erfordert doppelte Bestätigung |
| 🔍 **Sofortige Suche** | Filtere nach Name, Notizen, Projekt, Branch oder Inhalt der Unterhaltung |
| 📁 **Nach Projekt gruppiert** | Unterhaltungen nach zugehörigem Projekt organisiert, mit Zähler in der Seitenleiste |
| 📊 **Nützliche Infos** | Verbrauchter Kontext, Größe, Branch, letzte Aktivität — alles auf der Karte sichtbar |
| 🌡️ **Sättigungswarnung** | Unterhaltungen nahe am Kontextfenster-Limit werden gelb und rot hervorgehoben |
| ⌨️ **Tastaturkürzel** | `/` Suche, `Esc` schließen, `Enter` fortsetzen — ohne die Hände von der Tastatur zu nehmen |
| 🌗 **Sanftes Dark Theme** | Design für stundenlange Bildschirmarbeit, mit von Claude inspiriertem Terrakotta-Akzent |
| ♿ **Barrierefrei** | Tastaturnavigation, ausreichender Kontrast, respektiert die Systemeinstellung „Bewegung reduzieren" |

---

## 📦 Installation

### 1️⃣ Repository klonen

```bash
git clone https://github.com/krugerrgabriel/claude-sessions-manager.git
cd claude-sessions-manager
```

### 2️⃣ Installer ausführen

```bash
sudo ./install.sh
```

Der Installer kümmert sich um alles — installiert, was fehlt, kopiert die Dateien, passt die Berechtigungen an und konfiguriert den Webserver. Fertig in Sekunden.

### 3️⃣ Im Browser öffnen

Zwei Wege, nimm den, den du bevorzugst:

🖥️ **Direkt per URL:** http://localhost/claude-sessions/

⌨️ **Oder im Terminal:**

```bash
claude-sessions
```

oder

```bash
claude-sessions-manager
```

Der Installer erstellt diesen Befehl automatisch — er öffnet das Dashboard in deinem Standardbrowser.

Fertig. 🎉

> 💡 **Einzige Voraussetzung:** ein beliebiges Linux mit `apt` (Ubuntu, Debian, Mint, Pop!_OS usw.) und `sudo`.

---

## ⚙️ Erweiterte Konfiguration

Nur verwenden, wenn nötig — alles funktioniert sofort.

<details>
<summary><strong>In anderen Pfad oder URL installieren</strong></summary>

```bash
sudo INSTALL_DIR=/opt/claude-sessions-manager URL_PATH=/dashboard ./install.sh
```
Dann öffne **http://localhost/dashboard/**.
</details>

<details>
<summary><strong>Anderen Sitzungsordner verwenden</strong></summary>

```bash
sudo PROJECTS_DIR=/alternative/path/.claude/projects ./install.sh
```
</details>

<details>
<summary><strong>Deinstallieren</strong></summary>

```bash
sudo ./uninstall.sh           # behält deine Notizen (Namen, Favoriten, Beschreibungen)
sudo ./uninstall.sh --purge   # entfernt alles, einschließlich deiner Notizen
```
</details>

---

## ⌨️ Tastenkürzel

| Taste | Aktion |
|---|---|
| `/` | Suche fokussieren |
| `Esc` | Modal schließen, Suche leeren oder Mobilmenü schließen |
| `Enter` / `Space` | Die fokussierte Unterhaltung fortsetzen |
| `Ctrl+Enter` | Änderungen speichern (im Modal) |

---

## 🏗️ Wie es intern funktioniert

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (du)                              │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ HTML/CSS/JS                      │ fetch /api/*
                ▼                                  ▼
┌────────────────────────┐          ┌────────────────────────────┐
│   Apache2 (statisch)   │          │  mod_wsgi → app.wsgi (py)  │
└────────────────────────┘          └──────────────┬─────────────┘
                                                   │ liest/schreibt
                                                   ▼
            ┌─────────────────────────────────────────────────────┐
            │  ~/.claude/projects/*/*.jsonl    (deine Sitzungen)  │
            │  data/metadata.json              (deine Notizen)    │
            │  cache/sessions.json             (interner Cache)   │
            └─────────────────────────────────────────────────────┘
```

### Stack

| Ebene | Technik | Warum |
|---|---|---|
| **Frontend** | HTML + CSS + Vanilla JS | Kein Build-Step, lädt in <100 ms |
| **Backend** | Python 3 (stdlib) | Kein `pip install`, kein `venv` |
| **Integration** | mod_wsgi | Liegt modernem Apache bei; läuft als dein Benutzer |
| **Persistenz** | Lokales JSON | Deine Notizen in einer von Hand editierbaren Datei |
| **Schriftarten** | Inter + JetBrains Mono | Sehr gute Lesbarkeit auf dichten Bildschirmen |

### Repository-Struktur

```
claude-sessions-manager/
├── index.html       ← UI und SVG-Symbole
├── style.css        ← Design-System (Dark Theme)
├── app.js           ← Render- und API-Logik
├── app.wsgi         ← Python-Backend
├── install.sh       ← Installer
├── uninstall.sh     ← Deinstaller
├── README.md        ← du bist hier
├── .gitignore       ← ignoriert generierte Daten
├── data/            ← (generiert) deine Notizen
└── cache/           ← (generiert) interner Cache
```

---

## 🔒 Sicherheit

- Das Backend läuft **als du**, nicht als `www-data` — es liest deine Sitzungen ohne globales `chmod`.
- Die API akzeptiert nur IDs im UUID-Format (kein Path Traversal).
- Endgültiges Löschen erfordert im Frontend doppelte Bestätigung.
- Bedient standardmäßig nur **http://localhost** — **nicht ohne Authentifizierung ins Internet stellen**.

---

## 🛠️ Entwicklung

Kein Build-Step. Bearbeiten und die Seite neu laden.

```bash
# mod_wsgi nach Backend-Änderung zum Neuladen zwingen
sudo touch /var/www/html/claude-sessions/app.wsgi

# Logs beobachten
sudo tail -f /var/log/apache2/error.log

# Internen Cache leeren (nach Änderungen am Parsing)
rm -f /var/www/html/claude-sessions/cache/sessions.json
```

---

## 🐛 Fehlerbehebung

<details>
<summary><strong>„Sitzungen konnten nicht geladen werden"</strong></summary>

```bash
sudo tail -20 /var/log/apache2/error.log
```

Häufige Ursachen:
- `~/.claude/projects/` existiert noch nicht — nutze Claude Code mindestens einmal
- `mod_wsgi` ist nicht aktiviert: `sudo a2enmod wsgi && sudo systemctl reload apache2`
</details>

<details>
<summary><strong>„Permission denied" beim endgültigen Löschen</strong></summary>

Das Backend muss als Eigentümer der Dateien laufen. Prüfe:
```bash
grep WSGIDaemonProcess /etc/apache2/conf-available/claude-sessions.conf
```
Die Zeile muss `user=DEIN_BENUTZER` enthalten.
</details>

<details>
<summary><strong>Einige Sitzungen erscheinen nicht</strong></summary>

Es werden nur Hauptsitzungen (fortsetzbar) aufgelistet. Interne Sub-Agent-Unterhaltungen werden bewusst ignoriert.
</details>

<details>
<summary><strong>Backend geändert, aber die UI aktualisiert sich nicht</strong></summary>

```bash
sudo touch /var/www/html/claude-sessions/app.wsgi
sudo systemctl reload apache2
```
Im Browser: **Strg+Shift+R**, um den Browser-Cache zu leeren.
</details>

---

## 🤝 Beitragen

PRs willkommen. Vor dem Absenden:

- **Null Abhängigkeiten** beibehalten (kein `pip`, kein `npm`)
- Design-System in `style.css` befolgen (semantische CSS-Variablen)
- Neue Symbole: ein `<symbol>` in das SVG-Sprite in `index.html` einfügen (Lucide-Stil, Stroke 2, 24×24)

---

## 📜 Lizenz

MIT — mach, was du willst.

---

<p align="center">
  Gemacht mit <code>vim</code> und Kaffee.
</p>
