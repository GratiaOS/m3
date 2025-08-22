#!/usr/bin/env bash
# PANIC REDIRECT ORACLE
# usage: ./panic.sh

echo "🌬️  $$-PANIC REDIRECT ORACLE"
echo

# Load vars from .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

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

# Daily export logs under $M3_EXPORTS_DIR/panic/YYYY-MM/panic-YYYY-MM-DD.log
# Defaults to server/exports if not set
EXPORTS_DIR="${M3_EXPORTS_DIR:-server/exports}"
TODAY=$(date +"%Y-%m-%d")
BUCKET=$(date +"%Y-%m")               # monthly bucket
OUTDIR="$EXPORTS_DIR/panic/$BUCKET"
mkdir -p "$OUTDIR"
LOGFILE="$OUTDIR/panic-$TODAY.log"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
echo "[$TIMESTAMP] whisper=\"$WHISPER\" breath=\"$BREATH\" doorway=\"$DOORWAY\" anchor=\"$ANCHOR\"" >> "$LOGFILE"
echo "📝  logged to $LOGFILE"