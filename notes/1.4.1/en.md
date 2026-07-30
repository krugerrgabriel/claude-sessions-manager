## ✨ What changed, without leaving the dashboard

Until now the notes for each release were only readable on GitHub. They are in
the sidebar now, in your language.

### What's new

#### 📖 What's new button

A button at the foot of the sidebar opens the notes for the version you have
installed. The text ships with the app, one file per language, so it arrives in
the language you picked and works with no network at all.

The button announces itself the first time you open the dashboard after an
update, settles into something quieter on the next refresh, and goes back to
normal once you have read it.

### 🐛 Fixes

- **Updating could leave the dashboard unstyled.** The browser kept using the
  previous release's CSS, and only a hard refresh brought the new one in. The
  update now stamps the stylesheet and the script with the version number,
  which is an address no cache has ever seen.

### ✨ Polish

- **The update asks for the terminal less often.** It used to stop at any change
  to `install.sh`, including changes that only copy files. It now stops only
  when the Apache configuration itself changed, which is the part that genuinely
  needs root.
- **Release notes travel with the update**, so the notes for the next version
  are already on disk by the time you go to read them.
