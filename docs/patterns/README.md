# Patterns API

Lightweight heuristics and maps exposed under `/patterns/`.

These endpoints provide simple text-based detection and suggestion logic that can be integrated into UI, experiments, and EmotionalOS flows.

---

## Endpoints

### Detect

`POST /patterns/detect`

Naive victim/aggressor detection from text cues.

```bash
curl -X POST http://127.0.0.1:3033/patterns/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "I feel attacked"}'
```

Response:

```json
{
  "role": "victim",
  "confidence": 0.72
}
```

---

### Bridge Suggest

`GET /patterns/bridge_suggest`

Suggests a bridge pattern based on kind/intensity.

```bash
curl "http://127.0.0.1:3033/patterns/bridge_suggest?kind=panic&intensity=0.7"
```

Response:

```json
{
  "pattern": "breath",
  "hint": "Focus on slow, deep breathing to ground panic."
}
```

---

### Lanes

`GET /patterns/lanes`

Returns a three-lane map of victim, aggressor, and sovereign roles.

```bash
curl http://127.0.0.1:3033/patterns/lanes
```

Response:

```json
{
  "victim": { "description": "..." },
  "aggressor": { "description": "..." },
  "sovereign": { "description": "..." }
}
```

---

### Productivity

`GET /patterns/productivity`

Returns productivity-related patterns (burnout, rage-collapse, etc).

```bash
curl http://127.0.0.1:3033/patterns/productivity
```

---

## Notes

- JSON responses are locked to `snake_case` keys for forward compatibility.
- Query parameters (like `kind` in `/bridge_suggest`) will later be migrated to enums with friendly lowercase parsing.
- See sibling markdown files in this folder for specific pattern writeups (e.g. `burnout`, `rage-collapse`, `victim-aggressor-sovereign`).

---

### Related

- [EmotionalOS module](../modules/emotional.md)
- [Cycles module](../modules/cycles.md)
- [Energy calendar](./energy-calendar.md)
