#!/bin/bash
# Captura los datos en vivo del portal (debe ejecutarse desde Colombia: el CDN
# del portal no entrega el API a IPs de centros de datos extranjeros, como los
# runners de GitHub Actions) y los publica en la rama `datos` del repositorio,
# de donde los lee la página en GitHub Pages.
#
# Uso manual:   scripts/publicar_datos.sh
# Automático:   launchd cada 5 min (ver scripts/com.jumunozdev.procuraduria-datos.plist)
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="$(git -C "$REPO_DIR" remote get-url origin)"
WORK="${TMPDIR:-/tmp}/procuraduria-datos"
LOG="$REPO_DIR/.cache/publicar_datos.log"
mkdir -p "$(dirname "$LOG")"

{
  echo "[$(date '+%F %T')] inicio"
  rm -rf "$WORK" && mkdir -p "$WORK"
  node "$REPO_DIR/scripts/fetch_live.mjs" "$WORK/live.json"
  cd "$WORK"
  git init -q -b datos
  git add live.json
  git -c user.name="procuraduria-datos" -c user.email="datos@localhost" -c commit.gpgsign=false \
    commit -q -m "Datos del portal $(date -u '+%FT%TZ')"
  # Un solo commit huérfano cada vez: la rama no acumula historial.
  git push -q --force "$REMOTE" datos:datos
  echo "[$(date '+%F %T')] publicado"
} >> "$LOG" 2>&1
tail -n 500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
