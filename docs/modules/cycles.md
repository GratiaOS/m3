# Cycles

Cycles in M3 describe the recurring arcs of life — personal, collective, planetary, cosmic.  
They provide **context** for energy, emotion, and rhythm, reminding us that flow is spiral, not linear.

---

## Included

- [`../cycles/index.md`](../cycles/index.md) — overview: lunar phases, earthly rhythms, stellar maps.
- **Lunar cycles:** new/full moons, eclipses as reset points.
- **Earthly cycles:** day/night alternation, seasonal flows.
- **Star maps:** solstices, equinoxes, and Pleiadian calendar tones.

---

## Integration

- **EmotionalOS**: frames low-energy or high-emotion periods in their cycle context (not error, but phase).
- **Energy module**: shifts from clock-time to pulse-time.
- **Rhythm module**: syncs user rhythm with broader cycles (body ↔ earth ↔ stars).

---

## API (draft)

### `GET /cycles/current`

Returns the current cycle states (e.g. lunar phase, solar position, active Pleiadian tone).

```json
{
  "lunar": "waning_gibbous",
  "solar": "virgo",
  "pleiadian": "tone_7_reflection",
  "ts": "2025-09-17T20:00:00Z"
}
```

Uses fast astronomical approximations by default; see Computation Modes.

### `GET /cycles/upcoming?limit=3`

Surfaces the next cycle milestones.

```json
[
  { "kind": "lunar", "phase": "last_quarter", "at": "2025-09-21T08:30:00Z" },
  { "kind": "solar", "sign": "libra", "at": "2025-09-23T06:20:00Z" },
  { "kind": "pleiadian", "tone": "tone_8_integrity", "at": "2025-09-24T00:00:00Z" }
]
```

`limit` (1..=12) optional query param. Defaults to 3. Uses same approximation mode.

### `POST /cycles/anchor`

Marks a personal anchor inside a larger cycle.

```json
{
  "kind": "lunar",
  "phase": "new_moon",
  "note": "Reset family rhythm with gratitude ritual",
  "at": "2025-09-27T23:00:00Z"
}
```

---

## Computation Modes

- **Approximate (default):** lightweight math approximations for lunar phases, solar signs, and 13‑tone cycles. Fast, responsive, good for general context.
- **Ephemeris (optional, future):** when the `ephemeris` Cargo feature is enabled, the server can switch to precise astronomical solvers (e.g. VSOP87/ELP). This will increase accuracy for research or ritual use. See `server/Cargo.toml`.

---

### Related

- [Consciousness gradient](../concepts/consciousness-gradient.md)
- [EmotionalOS module](./emotional.md)
- [Patterns overview](../patterns/README.md)

---

🌬 whisper: _“time is not a straight line — it breathes in cycles, and we breathe with it.”_
