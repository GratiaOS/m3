#!/usr/bin/env bash
# PANIC REDIRECT ORACLE
# usage:
#   ./panic.sh                    # random steps, send to server, fallback log
#   ./panic.sh fearVisible        # use server preset
#   ./panic.sh fear-visible       # alias → fearVisible

set -euo pipefail

echo "🌬️  $$-PANIC REDIRECT ORACLE"
echo

# Load vars from .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | xargs)
fi

# Config
M3_URL="${M3_URL:-http://127.0.0.1:3033}"
EXPORTS_DIR="${M3_EXPORTS_DIR:-server/exports}"

# Optional mode from CLI
mode="${1:-default}"
# normalize alias
[ "$mode" = "fear-visible" ] && mode="fearVisible"

# Pools
WHISPERS=(
  "This is Empire’s choke, not my truth."
  "I am more than $$, I am breath and pulse."
  "Empire feeds on fear, I step outside."
  "I don’t reduce — I expand."
)
BREATHS=(
  "exhale_slow:3"
  "box:4-4-4-4"
  "double_exhale:in2-out4"
)
DOORWAYS=(
  "rename_one_file"
  "drink_water"
  "walk_to_window"
  "write_3_words_here"
)
ANCHORS=(
  "Options exist. I choose the field."
  "Flow > Empire."
  "I move one small step, not all at once."
)

# Dice-roll
pick () { local arr=("$@"); echo "${arr[$RANDOM % ${#arr[@]}]}"; }

WHISPER=$(pick "${WHISPERS[@]}")
BREATH=$(pick "${BREATHS[@]}")
DOORWAY=$(pick "${DOORWAYS[@]}")
ANCHOR=$(pick "${ANCHORS[@]}")

# Display
echo "whisper : $WHISPER"
echo "breath  : $BREATH"
echo "doorway : $DOORWAY"
echo "anchor  : $ANCHOR"
echo
echo "✅ one redirect step chosen — act now."

# --- Try server first ---------------------------------------------------------
resp=""
post_ok=0

if command -v jq >/dev/null 2>&1; then
  if [ "$mode" != "default" ]; then
    payload=$(jq -n --arg mode "$mode" '{ mode: $mode }')
  else
    payload=$(jq -n \
      --arg w "$WHISPER" \
      --arg b "$BREATH" \
      --arg d "$DOORWAY" \
      --arg a "$ANCHOR" \
      '{ whisper:$w, breath:$b, doorway:$d, anchor:$a }')
  fi

  # send; tolerant of server being down
  set +e
  resp=$(curl -sS -X POST "$M3_URL/panic" \
    -H 'Content-Type: application/json' \
    -d "$payload")
  curl_rc=$?
  set -e

  if [ $curl_rc -eq 0 ] && echo "$resp" | jq -e '.whisper,.breath,.doorway,.anchor' >/dev/null 2>&1; then
    post_ok=1
  fi

  # quiet-parse a message if present (no output change from your diff)
  echo "$resp" | jq -r '.message // "ok"' >/dev/null 2>&1 || true
fi

# --- Fallback local log if server post failed --------------------------------
if [ $post_ok -ne 1 ]; then
  TODAY=$(date +"%Y-%m-%d")
  BUCKET=$(date +"%Y-%m")               # monthly bucket
  OUTDIR="$EXPORTS_DIR/panic/$BUCKET"
  mkdir -p "$OUTDIR"
  LOGFILE="$OUTDIR/panic-$TODAY.log"
  TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
  echo "[$TIMESTAMP] whisper=\"$WHISPER\" breath=\"$BREATH\" doorway=\"$DOORWAY\" anchor=\"$ANCHOR\"" >> "$LOGFILE"
  echo "📝  logged locally to $LOGFILE"
else
  echo "🛰  sent to $M3_URL/panic (server will compact-log)."
fi