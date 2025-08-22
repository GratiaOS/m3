#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CUR="$ROOT/VALUE_FLOW_CURRENT.md"
ADAPTER="${VALUE_FLOW:-mock}"
NOW="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
TIME="$(date +"%H:%M")"

cmd="${1:-show}"

case "$cmd" in
  start)
    if [ ! -f "$CUR" ]; then
      cat > "$CUR" <<'MD'
# Value Flow — Today

- **Date:** ☐ YYYY‑MM‑DD
- **Adapter:** ☐ mock | money | gift | timebank | barter | grants | buffer
- **Horizon:** ☐ 7d   | other: ______
- **Guard:** If anxiety ≥ 7/10 → force `mock` for 48h.

## One True Next (≤20 min)
- ☐ Action:
- Why it matters (1 line):
- Starts at: ☐ now  ☐ later → __________
- Done? ☐ (stamp when shipped)

## If Money Arrived Tomorrow (1 line)
- Buy exactly this step:

## Non‑Money Route (pick one)
- ☐ gift (who?)
- ☐ barter (with whom / what trade?)
- ☐ timebank (which hour / from whom?)
- ☐ buffer (micro‑bridge of ____ units)

## Mirrors (ship anyway log)
- [ ] HH:MM — shipped ______ (adapter: ____)
MD
    fi
    # Stamp date & adapter (non-destructive sed)
    sed -i '' -e "s/^-\ \*\*Date:\*\*.*/- **Date:** $NOW/" "$CUR" 2>/dev/null || true
    sed -i '' -e "s/^-\ \*\*Adapter:\*\*.*/- **Adapter:** $ADAPTER/" "$CUR" 2>/dev/null || true
    echo "🌬️ Value flow primed → adapter=$ADAPTER"
    ;;

  shipped)
    what="${2:-one-true-next}"
    awk -v t="$TIME" -v a="$ADAPTER" -v w="$what" '
      {print}
      /^## Mirrors/ { mirrors=1 }
      mirrors==1 && /^\s*$/ && added!=1 { print "- [x] " t " — shipped " w " (adapter: " a ")"; added=1 }
    ' "$CUR" > "$CUR.tmp" && mv "$CUR.tmp" "$CUR"
    echo "✅ logged: $TIME — shipped $what (adapter: $ADAPTER)"
    ;;

  show|*)
    echo "Adapter: $ADAPTER"; echo "---"; cat "$CUR" 2>/dev/null || echo "(no VALUE_FLOW_CURRENT.md yet)"
    ;;
esac