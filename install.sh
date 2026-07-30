#!/usr/bin/env bash
# Claude Sessions: installer
# Installs the dashboard to /var/www/html/claude-sessions and configures Apache.
#
# Usage:
#   sudo ./install.sh
#
# Environment overrides:
#   INSTALL_DIR     (default: /var/www/html/claude-sessions)
#   URL_PATH        (default: /claude-sessions)
#   TARGET_USER     (default: $SUDO_USER, the user whose ~/.claude/projects to read)
#   PROJECTS_DIR    (default: ~TARGET_USER/.claude/projects)

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/html/claude-sessions}"
URL_PATH="${URL_PATH:-/claude-sessions}"
TARGET_USER="${TARGET_USER:-${SUDO_USER:-$USER}}"

if [ "$EUID" -ne 0 ]; then
  echo "✗ This installer needs sudo. Run: sudo ./install.sh" >&2
  exit 1
fi

if [ -z "$TARGET_USER" ] || [ "$TARGET_USER" = "root" ]; then
  echo "✗ Could not detect a non-root target user. Set TARGET_USER=yourname sudo ./install.sh" >&2
  exit 1
fi

TARGET_HOME="$(getent passwd "$TARGET_USER" | cut -d: -f6)"
PROJECTS_DIR="${PROJECTS_DIR:-$TARGET_HOME/.claude/projects}"

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

log() { printf "\033[1;36m→\033[0m %s\n" "$*"; }
ok()  { printf "\033[1;32m✓\033[0m %s\n" "$*"; }
warn(){ printf "\033[1;33m!\033[0m %s\n" "$*"; }

echo
echo "Claude Sessions installer"
echo "  User         : $TARGET_USER ($TARGET_HOME)"
echo "  Projects dir : $PROJECTS_DIR"
echo "  Install dir  : $INSTALL_DIR"
echo "  URL path     : $URL_PATH"
echo

if [ ! -d "$PROJECTS_DIR" ]; then
  warn "$PROJECTS_DIR does not exist yet. Sessions will only appear after you run Claude Code."
fi

# ---------------------------------------------------------------------------
# 1. Dependencies
# ---------------------------------------------------------------------------
log "Checking dependencies"
MISSING=()
dpkg -s apache2 >/dev/null 2>&1 || MISSING+=(apache2)
dpkg -s libapache2-mod-wsgi-py3 >/dev/null 2>&1 || MISSING+=(libapache2-mod-wsgi-py3)
command -v python3 >/dev/null 2>&1 || MISSING+=(python3)

if [ ${#MISSING[@]} -gt 0 ]; then
  log "Installing: ${MISSING[*]}"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${MISSING[@]}"
else
  ok "apache2 + mod_wsgi + python3 already installed"
fi

a2enmod wsgi >/dev/null 2>&1 || true
# mod_headers carries the Cache-Control below. The config guards on it with
# <IfModule>, so a build without it still starts, just without revalidation.
a2enmod headers >/dev/null 2>&1 || true

# ---------------------------------------------------------------------------
# 2. Directory structure
# ---------------------------------------------------------------------------
log "Creating directories"
mkdir -p "$INSTALL_DIR/data" "$INSTALL_DIR/cache"

# ---------------------------------------------------------------------------
# 3. Copy application files (avoid copying onto itself)
# ---------------------------------------------------------------------------
if [ "$(realpath "$SRC_DIR")" != "$(realpath "$INSTALL_DIR")" ]; then
  log "Copying files from $SRC_DIR"
  for f in index.html style.css app.js app.wsgi VERSION; do
    if [ ! -f "$SRC_DIR/$f" ]; then
      echo "✗ missing file: $SRC_DIR/$f" >&2
      exit 1
    fi
    install -m 0644 "$SRC_DIR/$f" "$INSTALL_DIR/$f"
  done

  if [ -d "$SRC_DIR/i18n" ]; then
    log "Copying i18n/ dictionaries"
    install -d -m 0755 "$INSTALL_DIR/i18n"
    install -m 0644 "$SRC_DIR/i18n/"*.json "$INSTALL_DIR/i18n/"

    # Release notes, one file per language per version. Optional: installing
    # from a tree without them just falls back to the GitHub release body.
    if [ -d "$SRC_DIR/notes" ]; then
      log "Copying notes/ release notes"
      find "$SRC_DIR/notes" -type f -name '*.md' -printf '%P\n' | while IFS= read -r rel; do
        install -D -m 0644 "$SRC_DIR/notes/$rel" "$INSTALL_DIR/notes/$rel"
      done
    fi

    # Stamp the asset URLs with the version so an update is never rendered
    # with the previous release's CSS. Apache sends no Cache-Control here, so
    # browsers cache these heuristically for days; a stamped URL is one such a
    # cache has never seen. Idempotent, an existing stamp is replaced.
    VER="$(cat "$SRC_DIR/VERSION" 2>/dev/null | tr -d '[:space:]')"
    if [ -n "$VER" ]; then
      sed -i -E "s|(href=\"style\.css)(\?v=[^\"]*)?\"|\1?v=$VER\"|; s|(src=\"app\.js)(\?v=[^\"]*)?\"|\1?v=$VER\"|" \
        "$INSTALL_DIR/index.html"
    fi
  else
    echo "✗ missing directory: $SRC_DIR/i18n" >&2
    exit 1
  fi
else
  ok "Files already in $INSTALL_DIR (skipping copy)"
fi

# ---------------------------------------------------------------------------
# 4. Permissions
#    Everything owned by the target user; data/ and cache/ writable by www-data.
# ---------------------------------------------------------------------------
log "Adjusting permissions"
chown -R "$TARGET_USER:$TARGET_USER" "$INSTALL_DIR"
chgrp www-data "$INSTALL_DIR/data" "$INSTALL_DIR/cache"
chmod 775 "$INSTALL_DIR/data" "$INSTALL_DIR/cache"

# ---------------------------------------------------------------------------
# 5. Apache configuration
# ---------------------------------------------------------------------------
log "Generating Apache config"
CONF_FILE="/etc/apache2/conf-available/claude-sessions.conf"
cat > "$CONF_FILE" <<EOF
# Claude Sessions: dashboard for managing Claude Code sessions
# (generated by install.sh on $(date -Iseconds))

WSGIScriptAlias $URL_PATH/api $INSTALL_DIR/app.wsgi
WSGIDaemonProcess claude-sessions threads=5 user=$TARGET_USER group=$TARGET_USER home=$TARGET_HOME
WSGIProcessGroup claude-sessions

SetEnv CLAUDE_SESSIONS_PROJECTS_DIR "$PROJECTS_DIR"
# Where this was installed from, so the dashboard can update itself in place.
SetEnv CLAUDE_SESSIONS_SRC_DIR "$SRC_DIR"

<Directory $INSTALL_DIR>
    Options -Indexes +FollowSymLinks
    AllowOverride None
    # No authentication exists and every session's contents are readable here,
    # so this must never answer anything but this machine.
    Require local
    DirectoryIndex index.html

    # Without an explicit Cache-Control, Apache sends only Last-Modified and
    # ETag, and browsers fall back to heuristic caching: roughly 10% of the
    # file's age, which for a months-old file is days.
    #
    # Only two things need to revalidate. index.html cannot cache-bust itself,
    # and it is what points at the version-stamped asset URLs, so a stale copy
    # keeps requesting the old unstamped ones. The i18n dictionaries are
    # fetched by a fixed name and gain keys between releases. Everything else
    # is either stamped (style.css, app.js) or lives at a per-version path
    # (notes/), so it can be cached freely.
    <IfModule mod_headers.c>
        <FilesMatch "\.(html|json)\$">
            Header set Cache-Control "no-cache, must-revalidate"
        </FilesMatch>
    </IfModule>
</Directory>

# The WSGI alias is not governed by the <Directory> block on every Apache
# build, so the API is pinned to localhost on its own.
<Location $URL_PATH>
    Require local
</Location>

<Files "app.wsgi">
    WSGIApplicationGroup %{GLOBAL}
</Files>
EOF

a2enconf claude-sessions >/dev/null
log "Validating Apache config"
if ! apache2ctl configtest 2>&1 | grep -q "Syntax OK"; then
  echo "✗ Apache configtest failed:" >&2
  apache2ctl configtest
  exit 1
fi
ok "Apache config OK"

log "Reloading Apache"
systemctl reload apache2

# ---------------------------------------------------------------------------
# 6. Smoke test
# ---------------------------------------------------------------------------
sleep 1
if curl -fsS -o /dev/null "http://localhost$URL_PATH/"; then
  ok "Front-end responding at http://localhost$URL_PATH/"
else
  warn "Front-end did not respond to smoke test (check /var/log/apache2/error.log)"
fi
if curl -fsS -o /dev/null "http://localhost$URL_PATH/api/sessions"; then
  ok "API responding at http://localhost$URL_PATH/api/sessions"
else
  warn "API did not respond to smoke test (check /var/log/apache2/error.log)"
fi

# ---------------------------------------------------------------------------
# 7. CLI shortcut (opens the dashboard in the default browser)
# ---------------------------------------------------------------------------
log "Creating terminal command: claude-sessions"
BIN_DIR="${BIN_DIR:-/usr/local/bin}"
BIN_FILE="$BIN_DIR/claude-sessions"
cat > "$BIN_FILE" <<EOF
#!/usr/bin/env bash
# Opens Claude Sessions Manager in the default browser.
# Auto-generated by install.sh on $(date -Iseconds).
URL="http://localhost$URL_PATH/"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "\$URL" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "\$URL" &
else
  echo "Open manually: \$URL"
fi
EOF
chmod 0755 "$BIN_FILE"
# Convenience alias with the full name
ln -sf "$BIN_FILE" "$BIN_DIR/claude-sessions-manager"
ok "Command installed at $BIN_FILE (alias: claude-sessions-manager)"

echo
echo "────────────────────────────────────────────────────────────"
ok  "Installation complete"
echo
echo "  🌐  Open:     http://localhost$URL_PATH/"
echo "  💻  Terminal: \$ claude-sessions    (opens in browser)"
echo "  🗑  Remove:  sudo ./uninstall.sh"
echo "────────────────────────────────────────────────────────────"
