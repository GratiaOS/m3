# Patterns API

Lightweight heuristics and maps exposed under `/patterns/`.

These endpoints provide simple text-based detection and suggestion logic that can be integrated into UI, experiments, and EmotionalOS flows.

## 🌿 How to use patterns (tiny guide)

**Goal:** move from raw signal → named pattern → single next action.

1. **Name it.**

   - Skim `/docs/patterns/*.md` and pick the closest map (e.g., _Attachment Testing_, _Sibling Trust_, _Over‑Analysis_).
   - If unsure, start with lanes from `GET /patterns/lanes` to orient (victim / aggressor / sovereign).

2. **Locate the cycle step.**

   - Each pattern describes a **cycle** (1‑5/6). Ask: _which step am I in right now?_
   - The right intervention depends on the step (e.g., before/after “trigger”, pre‑ or post‑“abandon”).

3. **Bridge, don’t diagnose.**

   - Use `GET /patterns/bridge_suggest?kind=<k>&intensity=<0..1>` for a gentle **bridge** (breath‑gate, boundary, pause, mirror) instead of labels.
   - Keep it simple: one breath ritual, one boundary sentence, or one 2‑minute starter.

4. **Act + archive.**

   - Do the one thing. Log a tiny receipt (time, pattern, step, action). This stabilizes learning.

5. **Close the loop.**
   - Avoid over‑analysis. If new insight appears, write it in the pattern’s doc; otherwise rest.

### ⚡ Quick recipe (pseudo)

```ts
const text = input();
const detect = await POST('/patterns/detect', { text });
const lanes = await GET('/patterns/lanes');
const kind = inferKind(detect, lanes); // small heuristic
const bridge = await GET(`/patterns/bridge_suggest?kind=${kind}&intensity=0.6`);
ui.suggest(bridge.hint);
archive.write({ kind, bridge: bridge.pattern });
```

### 🤝 Ethics & scope

- These tools are **maps, not diagnoses**. Use for self‑regulation and UX hints, not medical labeling.
- Respect consent. Patterns are invitations, not weapons in arguments.
- Prefer **sovereignty**: support choices, don’t coerce outcomes.

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
