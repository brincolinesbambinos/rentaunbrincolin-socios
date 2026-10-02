#!/bin/bash
# Panel Timón — doble clic para abrir el tablero del proyecto.
# Si macOS lo bloquea la primera vez: clic derecho → Abrir.
cd "$(dirname "$0")"

# Finder abre esto con un PATH mínimo: si node viene de nvm/Homebrew, hay que buscarlo.
if ! command -v node >/dev/null 2>&1; then
  for c in /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.nvm/versions/node"/*/bin/node /usr/bin/node; do
    [ -x "$c" ] && { export PATH="$(dirname "$c"):$PATH"; break; }
  done
fi

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  No encontré Node.js en esta Mac."
  echo "  Instálalo desde https://nodejs.org (versión LTS) y vuelve a abrir este archivo."
  echo ""
  read -n 1 -s -r -p "  Presiona cualquier tecla para cerrar…"
  exit 1
fi

node timon-panel.mjs
ST=$?
if [ $ST -ne 0 ]; then
  echo ""
  read -n 1 -s -r -p "  El panel se cerró con error. Presiona cualquier tecla para salir…"
fi
