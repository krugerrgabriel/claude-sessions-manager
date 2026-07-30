## 🔄 An update that actually looks updated

The previous release stopped the dashboard from coming back with old files
after you click update. This one closes the other way in, and gives a fresh
install its own notes.

### 🐛 Fixes

- **The dashboard could still come up with the previous release's stylesheet.**
  Clicking update reloads the page, and that was enough. Updating from a
  terminal and then simply returning to the tab was not: nothing revalidated,
  and the browser served whatever it already had, which is how a new version
  can render with no styling at all. Apache now marks `index.html` and the
  language dictionaries as needing revalidation, and the stylesheet and the
  script carry the version in their address, so an update is never half old
  and half new.

### ✨ Polish

- **A fresh install ships the release notes.** The what's new button reads them
  from disk, in the language you picked, instead of falling back to English
  from GitHub.
- **The installer enables `mod_headers`**, and the configuration still works
  without it, just with no revalidation.
