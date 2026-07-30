# Working on this repo

Zero dependencies, on purpose. No `npm`, no `pip`, no build step, no framework.
Backend is Python 3 stdlib under mod_wsgi; frontend is plain HTML, CSS and JS.
Anything that would add a package manager, a transpiler or a build artifact is
out of scope, tooling included.

Anything user-facing exists in **7 languages**: `pt-br`, `en`, `es`, `ja`,
`zh-CN`, `ko`, `de`. Key parity across `i18n/*.json` is not optional.

## Releases happen only when asked

**Never publish a release, push a tag, or bump `VERSION` unless the user
explicitly asks for it.** Finishing a feature is not a request to release it,
and committing is a separate request from releasing.

When the user does ask, the flow is:

1. Write the notes for the new version (below), in all 7 languages.
2. Set `VERSION` to the new number, no `v` prefix. Feature work is a minor bump,
   fixes only are a patch bump.
3. Commit, push, tag, then `gh release create`. The `sync-version` workflow
   fires on publish and finds `VERSION` already correct, so it produces no extra
   commit.

Tag naming is inconsistent in this repo's history: `1.3.1` and earlier have no
prefix, `v1.4.0` onwards do. The dashboard tries both spellings, so either
works, but prefer `v` on new tags.

## Release notes

Notes live in the repo, one file per language per version:

```
notes/<version>/<lang>.md      e.g. notes/1.4.0/pt-br.md
```

They are **not** only for GitHub. The dashboard's "What's New" button loads
`notes/<version>/<active language>.md` and renders it in a modal, which is why
they must be translated: someone reading the dashboard in Japanese should not be
handed an English changelog. Load order is active language, then `en`, then the
GitHub release body as a last resort.

Write all 7 for every release. Missing files degrade to English rather than
breaking, but that defeats the point.

`install.sh` and the self-update in `app.wsgi` both copy `notes/` into the
install directory, so new files ship automatically.

### Structure

Follow the shape the existing releases use:

```markdown
## 📋 One-line headline of what this release is about

A sentence or two of framing, in plain language.

### What's new

#### 📋 Feature name

Prose explaining what it does and why, not a diff summary.

### 🐛 Fixes

- **What was broken, in bold.** Then what actually went wrong and what the user
  would have experienced.

### ✨ Polish

- **Short lead-in in bold** followed by the detail.
```

- Emoji on the headline and on each subsection heading.
- Bold lead-ins on bullets, so the list scans.
- Explain the user-visible consequence, not the code. "Moving a session between
  projects could lose it" beats "fixed `cwd_to_folder`".

### What not to put in them

- **No upgrade instructions.** These notes are read *inside* the dashboard, by
  someone who has already updated. A "run this to upgrade" block there is noise.
- No "Full changelog" link. That belongs on the GitHub release page, which
  generates one anyway.
- No em dashes, anywhere in this project. Use a comma, a colon or a full stop.

## Before shipping anything

```bash
node --check app.js
python3 -c "import ast; ast.parse(open('app.wsgi').read())"
bash -n install.sh && bash -n uninstall.sh
```

Plus: every `i18n/*.json` parses, all 7 have identical key sets, and every key
used in `app.js` or `index.html` exists in them.

Verify in a browser, not just by syntax check. The safe way is a throwaway dev
server that serves the repo with the real API but redirects `META_FILE` and
`CACHE_FILE` to a temp directory, so clicking through changes never touches the
installed instance or the user's real names and notes.
