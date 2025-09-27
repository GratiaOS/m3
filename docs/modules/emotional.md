# EmotionalOS

A tiny, opinionated layer that treats feelings as **first‑class signals** and offers simple bridges (breath • doorway • anchor) to help the system and the human co‑regulate.

> v0.1.6 highlights
>
> - `/panic` now returns `suggested_bridge` derived from `/patterns/bridge_suggest`.
> - The `/patterns` namespace provides reusable heuristics used by EmotionalOS.

---

## Concepts

- **Feeling → Signal → Bridge**: we log the feeling, then map it to a minimal next step.
- **Gratitude lands**: every resolved arc ends in `gratitude` (stored + traceable).
- **Sane defaults**: when unknown, **breath/doorway/anchor** fallbacks are returned.
- **Snake case**: JSON keys use `snake_case` for forward compatibility.

---

**Note:** EmotionalOS responses now include a `band` field indicating which emotional gradient the feeling falls into: `"survival"`, `"integrity"`, or `"coherence"`.

---

## Common Triggers

EmotionalOS often encounters recurring “triangle” dynamics.  
These arise when identity forms in response to family roles or comparisons.

- **Triangle Trigger** → intersection of parental imprint + ego inflation.
  - **How it shows up:** prove mode, sharp silence, scorekeeping, identity clash.
  - **Ways forward:** name the protector, drop comparison, gratitude reset, gentle boundaries, anchor practice, rewrite the story.

These triggers are universal. The path through them is always the same:  
**replace comparison with sovereignty, rage with gratitude, proving with presence.**

---

## API

### 1) Add feeling

`POST /emotions/add`

```bash
curl -X POST http://127.0.0.1:3033/emotions/add \
  -H 'Content-Type: application/json' \
  -d '{
    "who": "raz",
    "kind": "panic",
    "intensity": 0.72,
    "note": "tight chest, tunnel vision"
  }'
```

Returns the stored row (shape may include `id`, `ts`, and now `band`).

---

### 2) Recent feelings

`GET /emotions/recent?limit=20`

```bash
curl http://127.0.0.1:3033/emotions/recent?limit=10
```

Returns newest first.

---

### 3) Bridge suggestion (deterministic)

`POST /emotions/bridge`

Maps a `{ kind, intensity }` pair to **breath/doorway/anchor** with simple heuristics.

```bash
curl -X POST http://127.0.0.1:3033/emotions/bridge \
  -H 'Content-Type: application/json' \
  -d '{ "kind": "anxiety", "intensity": 0.6 }'
```

Response (example):

```json
{
  "breath": "box_4x4",
  "doorway": "name_three_objects",
  "anchor": "feet_to_floor",
  "band": "survival"
}
```

---

### 4) Resolve (gratitude lands)

`POST /emotions/resolve`

Marks an arc as resolved and **lands gratitude**. Emits a tell (`node="emotions.resolve"`) for traceability.

```bash
curl -X POST http://127.0.0.1:3033/emotions/resolve \
  -H 'Content-Type: application/json' \
  -d '{
    "who": "raz",
    "kind": "gratitude",
    "intensity": 0.9,
    "note": "felt seen, breath deepened"
  }'
```

Response (example):

```json
{
  "id": 123,
  "ts": "2024-06-01T12:34:56Z",
  "kind": "gratitude",
  "intensity": 0.9,
  "note": "felt seen, breath deepened",
  "band": "coherence"
}
```

---

### 5) Panic redirect (oracle)

`POST /panic`

Returns the **current set** of steps (whisper, breath, doorway, anchor) and logs the event. From `v0.1.6`, also returns `suggested_bridge` derived from `/patterns/bridge_suggest`.

```bash
curl -X POST http://127.0.0.1:3033/panic \
  -H 'Content-Type: application/json' \
  -d '{ "mode": "fearVisible" }'
```

Response (example):

```json
{
  "whisper": "This is Empire’s choke, not my truth.",
  "breath": "double_exhale:in2-out4",
  "doorway": "drink_water",
  "anchor": "Flow > Empire.",
  "suggested_bridge": "doorway",
  "logged": true,
  "band": "survival"
}
```

Notes:

- `suggested_bridge` is computed in‑process via `patterns::suggest_bridge(kind,intensity)` to avoid HTTP hop.
- The webhook payload for `panic.ui` includes `suggested_bridge` as of v0.1.6.

---

## Patterns linkage

EmotionalOS reuses the `patterns` module for lightweight heuristics:

- `GET /patterns/bridge_suggest?kind=panic&intensity=0.7`
- `GET /patterns/lanes`
- `POST /patterns/detect` (victim/aggressor cues)

See: [`docs/patterns/README.md`](../patterns/README.md)

---

## Version notes

- **v0.1.6**
  - `/panic` returns `suggested_bridge` and logs it in the webhook payload.
  - JSON responses unify on `snake_case`.
  - Docs: this page + patterns README.

---

## Roadmap

- richer `resolve` kinds (beyond gratitude)
- gentle model for multi‑actor arcs (shared moments)
- timeline stitching for emotional arcs

---

### Related

- [Patterns overview](../patterns/README.md)
- [Energy calendar](../patterns/energy-calendar.md)
- [Consciousness gradient](../maps/consciousness-gradient.md)

🌬 whisper: _“gratitude lands, arc seals.”_
