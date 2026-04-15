<h1 align="center">🔖 Claude Sessions Manager</h1>

<p align="center">
  <strong>Your daily starting point for <a href="https://claude.com/claude-code">Claude Code</a>.</strong><br>
  Pick up any conversation right where you left off — no re-explaining the project, no lost context.
</p>

<p align="center">
  <strong>🇺🇸 English</strong> ·
  <a href="README.pt-BR.md">🇧🇷 Português</a> ·
  <a href="README.es.md">🇪🇸 Español</a> ·
  <a href="README.ja.md">🇯🇵 日本語</a> ·
  <a href="README.zh-CN.md">🇨🇳 简体中文</a> ·
  <a href="README.ko.md">🇰🇷 한국어</a> ·
  <a href="README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white">
  <img alt="Apache" src="https://img.shields.io/badge/Apache-2.4%2B-D22128?logo=apache&logoColor=white">
  <img alt="mod_wsgi" src="https://img.shields.io/badge/mod__wsgi-required-0066cc">
  <img alt="Vanilla JS" src="https://img.shields.io/badge/Vanilla-JS%20%7C%20CSS%20%7C%20HTML-F7DF1E?logo=javascript&logoColor=black">
  <img alt="Zero deps" src="https://img.shields.io/badge/deps-zero-success">
</p>

---

## 💡 Why use it

Every project has a hidden cost: **reheating context**. Every time you open Claude, you lose time:

- 🔁 Re-explaining the architecture
- 📍 Pointing out where you stopped
- 📂 Listing the important files
- 🧠 Realigning what was in progress

That's **15–30 minutes just to start being productive**. And when the terminal closes, the context Claude just built is gone.

✨ **Good news:** Claude Code already saves every conversation for you to resume.

😩 **The problem:** finding the right conversation among dozens of auto-generated codes.

That's what this project solves. In 4 steps:

1. 🏁 Open the dashboard
2. 🎯 Find the right conversation
3. 📋 Click — the command is already in your clipboard
4. 💻 Paste in the terminal and pick up where you left off

> **Resuming costs seconds. Starting over costs hours.**

---

## ✨ Features

| | |
|---|---|
| 🔁 **One-click resume** | Click a conversation → the resume command is copied to your clipboard instantly |
| 🏷️ **Names and notes** | Give each conversation a human-readable name and jot down where you stopped |
| ⭐ **Favorites** | Highlight the conversations you use every day |
| 🗑️ **Safe trash bin** | Archive old ones without fear — permanent deletion requires double confirmation |
| 🔍 **Instant search** | Filter by name, notes, project, branch, or by what was said in the conversation |
| 📁 **Grouped by project** | Conversations organized by the project they belong to, with a sidebar counter |
| 📊 **Useful info** | Context consumed, size, branch, last activity — all visible on the card |
| 🌡️ **Saturation warning** | Conversations close to filling the context window are highlighted in yellow and red |
| ⌨️ **Keyboard shortcuts** | `/` search, `Esc` close, `Enter` resume — without lifting your hands off the keyboard |
| 🌗 **Soft dark theme** | Visual designed for hours on screen, with a terracotta accent inspired by Claude |
| ♿ **Accessible** | Keyboard navigation, proper contrast, honors the system's "reduce motion" setting |

---

## 📦 Installation

### 1️⃣ Clone the repository

```bash
git clone https://github.com/krugerrgabriel/claude-sessions-manager.git
cd claude-sessions-manager
```

### 2️⃣ Run the installer

```bash
sudo ./install.sh
```

The installer takes care of everything — it installs what's missing, copies the files, adjusts permissions, and configures the web server. Finishes in seconds.

### 3️⃣ Open it in your browser

Two ways, pick whichever you prefer:

🖥️ **Directly via URL:** http://localhost/claude-sessions/

⌨️ **Or from the terminal:**

```bash
claude-sessions
```

or

```bash
claude-sessions-manager
```

The installer creates that command automatically — it opens the dashboard in your default browser.

Done. 🎉

> 💡 **Single prerequisite:** any Linux with `apt` (Ubuntu, Debian, Mint, Pop!_OS, etc.) and `sudo`.

---

## ⚙️ Advanced configuration

Only use these if you need to — everything works out of the box.

<details>
<summary><strong>Install in a different path or URL</strong></summary>

```bash
sudo INSTALL_DIR=/opt/claude-sessions-manager URL_PATH=/dashboard ./install.sh
```
Then open **http://localhost/dashboard/**.
</details>

<details>
<summary><strong>Use a different sessions folder</strong></summary>

```bash
sudo PROJECTS_DIR=/alternative/path/.claude/projects ./install.sh
```
</details>

<details>
<summary><strong>Uninstall</strong></summary>

```bash
sudo ./uninstall.sh           # keeps your notes (names, favorites, descriptions)
sudo ./uninstall.sh --purge   # removes everything, including your notes
```
</details>

---

## ⌨️ Shortcuts

| Key | Action |
|---|---|
| `/` | Focus the search input |
| `Esc` | Close modal, clear search, or close mobile menu |
| `Enter` / `Space` | Resume the focused conversation |
| `Ctrl+Enter` | Save edits (inside the modal) |

---

## 🏗️ How it works under the hood

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (you)                            │
└───────────────┬─────────────────────────────────┬───────────────┘
                │ HTML/CSS/JS                      │ fetch /api/*
                ▼                                  ▼
┌────────────────────────┐          ┌────────────────────────────┐
│   Apache2 (static)     │          │  mod_wsgi → app.wsgi (py)  │
└────────────────────────┘          └──────────────┬─────────────┘
                                                   │ read/write
                                                   ▼
            ┌─────────────────────────────────────────────────────┐
            │  ~/.claude/projects/*/*.jsonl    (your sessions)    │
            │  data/metadata.json              (your notes)        │
            │  cache/sessions.json             (internal cache)    │
            └─────────────────────────────────────────────────────┘
```

### Stack

| Layer | Tech | Why |
|---|---|---|
| **Frontend** | HTML + CSS + vanilla JS | Zero build step, loads in <100ms |
| **Backend** | Python 3 (stdlib) | No `pip install`, no `venv` |
| **Integration** | mod_wsgi | Ships with modern Apache; runs as your user |
| **Persistence** | Local JSON | Your notes in a file you can hand-edit |
| **Fonts** | Inter + JetBrains Mono | Great readability on dense screens |

### Repository layout

```
claude-sessions-manager/
├── index.html       ← UI and SVG icons
├── style.css        ← design system (dark theme)
├── app.js           ← rendering and API logic
├── app.wsgi         ← Python backend
├── install.sh       ← installer
├── uninstall.sh     ← uninstaller
├── README.md        ← you are here
├── .gitignore       ← ignores generated data
├── data/            ← (generated) your notes
└── cache/           ← (generated) internal cache
```

---

## 🔒 Security

- The backend runs **as you**, not as `www-data` — it reads your sessions without a global `chmod`.
- The API only accepts IDs in UUID format (no path traversal).
- Permanent deletion requires double confirmation in the frontend.
- Serves only on **http://localhost** by default — **do not expose it to the internet** without authentication.

---

## 🛠️ Developing

No build step. Edit and refresh the page.

```bash
# Force mod_wsgi to reload after changing the backend
sudo touch /var/www/html/claude-sessions/app.wsgi

# Tail the logs
sudo tail -f /var/log/apache2/error.log

# Clear the internal cache (after changing parsing logic)
rm -f /var/www/html/claude-sessions/cache/sessions.json
```

---

## 🐛 Troubleshooting

<details>
<summary><strong>"Failed to load sessions"</strong></summary>

```bash
sudo tail -20 /var/log/apache2/error.log
```

Common causes:
- `~/.claude/projects/` doesn't exist yet — run Claude Code at least once
- `mod_wsgi` isn't enabled: `sudo a2enmod wsgi && sudo systemctl reload apache2`
</details>

<details>
<summary><strong>"Permission denied" on permanent delete</strong></summary>

The backend needs to run as the file owner. Check:
```bash
grep WSGIDaemonProcess /etc/apache2/conf-available/claude-sessions.conf
```
The line must include `user=YOUR_USERNAME`.
</details>

<details>
<summary><strong>Some sessions don't show up</strong></summary>

Only main (resumable) sessions are listed. Internal sub-agent conversations are intentionally ignored.
</details>

<details>
<summary><strong>Changed the backend but the UI doesn't update</strong></summary>

```bash
sudo touch /var/www/html/claude-sessions/app.wsgi
sudo systemctl reload apache2
```
In the browser: **Ctrl+Shift+R** to bust the browser cache.
</details>

---

## 🤝 Contributing

PRs welcome. Before submitting:

- Keep **zero dependencies** (no `pip`, no `npm`)
- Follow the design system in `style.css` (semantic CSS variables)
- New icons: add a `<symbol>` to the SVG sprite in `index.html` (Lucide-style, stroke 2, 24×24)

---

## 📜 License

MIT — do whatever you want.

---

<p align="center">
  Made with <code>vim</code> and coffee.
</p>
