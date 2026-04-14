#!/usr/bin/env bash
# Claude Sessions — uninstaller
#
# Usage:
#   sudo ./uninstall.sh              # removes Apache config, asks before deleting files
#   sudo ./uninstall.sh --purge      # also removes $INSTALL_DIR (including metadata)
#
# Environment overrides:
#   INSTALL_DIR (default: /var/www/html/claude-sessions)

set -euo pipefail

INSTALL_DIR="${INSTALL_DIR:-/var/www/html/claude-sessions}"
PURGE="no"
[ "${1:-}" = "--purge" ] && PURGE="yes"

if [ "$EUID" -ne 0 ]; then
  echo "✗ Run with sudo: sudo ./uninstall.sh" >&2
  exit 1
fi

log() { printf "\033[1;36m→\033[0m %s\n" "$*"; }
ok()  { printf "\033[1;32m✓\033[0m %s\n" "$*"; }

log "Desabilitando config do Apache"
a2disconf claude-sessions >/dev/null 2>&1 || true
rm -f /etc/apache2/conf-available/claude-sessions.conf

log "Recarregando Apache"
systemctl reload apache2 || true
ok "Apache config removido"

log "Removendo comando 'claude-sessions' do terminal"
BIN_DIR="${BIN_DIR:-/usr/local/bin}"
rm -f "$BIN_DIR/claude-sessions" "$BIN_DIR/claude-sessions-manager"
ok "Comando removido"

if [ "$PURGE" = "yes" ]; then
  if [ -d "$INSTALL_DIR" ]; then
    log "Removendo $INSTALL_DIR (inclui metadata.json)"
    rm -rf "$INSTALL_DIR"
    ok "Arquivos removidos"
  fi
else
  if [ -d "$INSTALL_DIR" ]; then
    echo
    echo "Os arquivos ainda estão em $INSTALL_DIR (incluindo data/metadata.json)."
    echo "Rode:  sudo ./uninstall.sh --purge   para remover tudo."
  fi
fi

ok "Desinstalação concluída"
