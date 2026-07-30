## 📋 Choose how you copy, and update without the terminal

The copy button no longer assumes you want a shell command, and the update
button no longer just hands you one to paste.

### What's new

#### 📋 Copy format picker

A new picker in the header decides what the copy button puts on your clipboard.
Three options, and the choice sticks between sessions:

- **Terminal command** puts `claude --resume <id>` on the clipboard, for pasting
  into a shell with Claude Code closed.
- **Command inside Claude** puts `/resume <id>`, for pasting into a Claude Code
  that is already running.
- **Ask every time** opens a chooser on each copy, showing the real command for
  that specific session.

Defaults to the terminal command, so nothing changes until you say otherwise.

#### ⚡ One-click self-update

The update button now applies the update instead of copying a command. Click,
it pulls, it swaps the files, the page reloads on the new version. No terminal,
no `sudo`.

When a release changes `install.sh` itself, the Apache configuration may have
changed too, and that needs root. The update then stops and a modal explains
what happened, with the command ready to copy. The same modal appears if your
clone has uncommitted work, because your edits are never discarded.

#### 🔒 Localhost only

**The dashboard was reachable from your local network with no authentication.**
Anyone on the same Wi-Fi could read every session name, preview, project path
and branch, and could delete session files. It now serves on localhost only.
**Re-running the installer is what applies this.**

### 🐛 Fixes

- **Moving a session between projects could lose it.** Claude Code turns every
  non-alphanumeric character of a path into a dash, not just the separators, and
  the backend only replaced the separators. Sessions moved into a project whose
  path contains `_`, `.`, a space or an accent became unresumable.
- **A corrupt `metadata.json` silently erased every name, note and favorite.**
  The API now refuses the write and says so, leaving the file untouched.
- **A project name containing regex characters blanked the screen.**
- **Cards jumped when copied**, because the session id was hidden in that state.

### ✨ Polish

- **Custom dropdowns** replace the native selects for copy format, sorting and
  language, with full keyboard support and a constant width.
- **`backdrop-filter` is gone.** It repainted the sticky header on every scroll
  frame for a blur nobody asked for.
- **The session id shows in full** instead of a fixed 8 characters.
- **Documentation caught up in all 7 languages.**
