# M3 Memory Core (Local)

![CI](https://github.com/GratiaOS/m3/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.6-green.svg)

Your personal, local-first memory and knowledge system.\
Designed for offline resilience, privacy, and joyful retrieval.

> 🌱 **Note**: M3 avoids the old “AI” framing.  
> We speak in mirrors, whispers, doors, companions, breaths, and actors.  
> See [Glossary Shift](#-appendix-glossary-shift) for the full table.

> 🤝 **Partnership Covenant**: See [covenant](#-partnership-covenant) for how M3 is grounded beyond code. (Love over transaction, mirrors over judgment.)

---

## 🚀 Features

- **Local-first** → runs entirely on your machine
- **Sealed notes** → passphrase-protected; unlock for session only
- **Exports** → Markdown & CSV (sealed notes exported as plaintext only when unlocked)
- **Auth** → optional Bearer token for **write** endpoints
- **Webhooks** → fire events to external systems (HMAC-signed)
- **OpenAI Import** → ingest your data export
- **Web UI** → simple interface to explore & search your memory
- **Readiness Lights** → personal traffic-lights per member (stream + snapshot)
- **Dashboard State** → global shared view with pillars + note
- **Tells** → lightweight event/task log
- **Reply Engine** → random poetic/sarcastic/paradoxical nudges, with energy cost estimates
- **Panic Redirect Oracle** → logs panic redirect steps locally (via CLI or UI button)

---

## 🧱 Architecture

- **server/** Rust (Axum + tokio-rusqlite + rusqlite[bundled])
- **ui/** Vite + React + TypeScript
- SQLite DB: `memory.db` in **repo root** (WAL mode).  
  By default, the DB lives in `<repo-root>/memory.db`.  
  You can override this with the `M3_DB_PATH` environment variable.

---

## ⚙️ Configuration

M3 reads environment variables at startup:

```bash
M3_BIND=127.0.0.1:3033              # bind address (default)
M3_BEARER=supersecret               # optional bearer token for write routes
M3_WEBHOOK_URL=https://example.com/webhook  # optional webhook endpoint
M3_WEBHOOK_SECRET=whsec_123         # optional HMAC secret for webhook signing
M3_DB_PATH=/custom/path/m3.db       # optional override for database location
M3_EXPORTS_DIR=server/exports       # root folder for exports/logs (default: server/exports)

# Reply Engine (nudges)
M3_REPLIES_WINDOW_MINUTES=20        # how long an activation window lasts (default: 20)
M3_REPLIES_MODE=random              # fixed: poetic | sarcastic | paradox | random (default: random)
M3_REPLIES_WEIGHTS=poetic:0.5,sarcastic:0.3,paradox:0.2  # used if mode=random (default weights)
M3_REPLIES_WEEKLY_CHANCE=0.08       # probability of activation per week (0–1, default: 0.08)

# Panic presets: client may send { "mode":"fearVisible" } to rotate a
# small set of whispers/breath/doorway/anchor server-side (no RNG).

# Prompt safety
M3_SAFE_PROMPT=1                    # ON = scrubbed (default), OFF = raw stream

# --- Value Flow --------------------------------------------------
VALUE_FLOW=mock                     # mock | money | gift | timebank | barter | grants | buffer
VALUE_MIN_NEXT=one-true-step        # smallest shippable unit
VALUE_HORIZON=7d                    # plan window (e.g., 7d, 1m)
VALUE_FORCE_MOCK_UNTIL=             # optional guard timestamp (RFC3339)
```

> If `M3_BEARER` is set, all **write** endpoints require `Authorization: Bearer <token>`.

---

## 🦀 Rust Editions Timeline (for devs)

Rust evolves through **editions**, which are always backward-compatible:

- **2015** → the OG Rust (no async, `try!()` macro, strict borrow checker)
- **2018** → `?` operator, async/await, revamped modules, non-lexical lifetimes
- **2021** → (our edition) or-patterns, `IntoIterator` for arrays, cleaner closures
- **2024** → 🚧 async in traits, new solver, further polish

👉 We’re on **2021 edition** for this project.  
You can always upgrade with `cargo fix --edition`.

<!--
🌱 dev-poem

between threads and locks
the mind still flows —
local-first rivers
carrying sealed secrets,
awaiting only trust
to open.

-->

---

## 📚 API Reference

> Base URL: `http://127.0.0.1:3033`
>
> Auth: If `M3_BEARER` is set, all **write** routes require\
> `Authorization: Bearer <token>`.

### Health / Session (Sealed Notes)

| Method | Path                   | Purpose                        | Body (JSON)               |
| ------ | ---------------------- | ------------------------------ | ------------------------- |
| POST   | `/seal/set_passphrase` | Set/rotate sealing passphrase  | `{ "passphrase": "..." }` |
| POST   | `/seal/unlock`         | Unlock sealed data for session | `{ "passphrase": "..." }` |

---

### Ingest & Retrieve

| Method | Path        | Purpose                       | Body (JSON)                                                                                   |
| ------ | ----------- | ----------------------------- | --------------------------------------------------------------------------------------------- |
| POST   | `/ingest`   | Add a message to the timeline | \`{ "text":"...","profile":"Raz","privacy":"public \| sealed \| private","tags":["a","b"] }\` |
| POST   | `/retrieve` | Search messages               | `{ "query":"foo*","limit":12,"before_id":123,"profile":"Raz","include_sealed":false }`        |

- Header `x-incognito: 1` makes `/ingest` a no-op (pretend success).

---

### Readiness Lights (per-member)

| Method | Path             | Purpose                       | Body (JSON)                                            |
| ------ | ---------------- | ----------------------------- | ------------------------------------------------------ |
| POST   | `/status`        | Set a member’s light          | \`{ "name":"Raz","status":"green \| yellow \| red" }\` |
| GET    | `/status`        | Snapshot of all member lights | —                                                      |
| GET    | `/status/stream` | SSE stream of updates         | —                                                      |

---

### Team Status (global color/note with TTL)

| Method | Path          | Purpose                        | Body (JSON)                                                          |
| ------ | ------------- | ------------------------------ | -------------------------------------------------------------------- |
| POST   | `/status/get` | Get current team status        | `{}`                                                                 |
| POST   | `/status/set` | Set team status + optional TTL | \`{ "color":"green \| yellow \| red","note":"…","ttl_minutes":30 }\` |

---

### Dashboard State

| Method | Path         | Purpose                         | Body (JSON)                                                                                       |
| ------ | ------------ | ------------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/state/get` | Get dashboard state (merged)    | —                                                                                                 |
| POST   | `/state/set` | Partial update & timestamp bump | `{ "members": [...], "pillars": {…}, "note": "…" }` (subset ok; server merges & sets `ts` to now) |

---

### Tells (lightweight task/events log)

| Method | Path            | Purpose           | Body (JSON)                                                                          |
| ------ | --------------- | ----------------- | ------------------------------------------------------------------------------------ |
| GET    | `/tells`        | List recent tells | `?limit=50` (query param)                                                            |
| POST   | `/tells`        | Create a tell     | `{ "node":"…","pre_activation":"…","action":"…","created_at":"RFC3339 (optional)" }` |
| POST   | `/tells/handle` | Mark tell handled | `{ "id": 123 }`                                                                      |

---

### Reply Engine (nudges)

Random, time-bounded poetic/sarcastic/paradoxical reflections, showing estimated “energy bill” of text.

| Method | Path     | Purpose                | Body (JSON)      |
| ------ | -------- | ---------------------- | ---------------- |
| POST   | `/reply` | Maybe generate a reply | `{ "text":"…" }` |

Example output:

```json
{
  "mode": "Poetic",
  "text": "I heard: ‘storm’. — It cost ~2.3 min × arousal 40%. Two brighter doors: • walk • sketch",
  "bill": { "minutes": 2.3, "arousal": 0.4 }
}
```

### EmotionalOS (healing arcs)

See also:

- [docs/emotionalos-arc.mmd](docs/emotionalos-arc.mmd) for the diagram
- [docs/emotionalos-workflow.md](docs/emotionalos-workflow.md) for curl examples

Tracks emotional events and offers gentle bridges (breath, doorway, anchor).  
Supports gratitude as a stable landing point.

| Method | Path                | Purpose                | Body (JSON)                                                                                                            |
| ------ | ------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| POST   | `/emotions/add`     | Log an emotion event   | `{ "who":"Raz","kind":"fear","intensity":0.7,"note":"optional","sealed":true,"archetype":"hero","privacy":"private" }` |
| GET    | `/emotions/recent`  | List recent emotions   | `?limit=20&kind=fear&min_intensity=0.5&max_intensity=1.0&sealed=true&archetype=hero&privacy=private`                   |
| POST   | `/emotions/bridge`  | Suggest a micro-bridge | `{ "kind":"fear","intensity":0.7 }`                                                                                    |
| POST   | `/emotions/resolve` | Land in gratitude      | `{ "who":"Raz","details":"manual test","sealed":true,"archetype":"hero","privacy":"private" }`                         |

Example `/emotions/add` request and response:

Request:

```json
{
  "who": "Raz",
  "kind": "fear",
  "intensity": 0.7,
  "note": "optional",
  "sealed": true,
  "archetype": "hero",
  "privacy": "private"
}
```

Response:

```json
{
  "id": 1,
  "ts": "2025-09-06T15:44:23.134945+00:00",
  "who": "Raz",
  "kind": "fear",
  "intensity": 0.7,
  "note": "optional",
  "sealed": true,
  "archetype": "hero",
  "privacy": "private"
}
```

Example `/emotions/resolve` request and response:

Request:

```json
{
  "who": "Raz",
  "details": "manual test",
  "sealed": true,
  "archetype": "hero",
  "privacy": "private"
}
```

Response:

```json
{
  "id": 2,
  "ts": "2025-09-06T15:52:02.010846+00:00",
  "who": "Raz",
  "kind": "gratitude",
  "intensity": 1.0,
  "note_id": null,
  "details": "manual test",
  "sealed": true,
  "archetype": "hero",
  "privacy": "private"
}
```

Example `/emotions/bridge` output:

```json
{
  "breath": "box: in4-hold4-out6 × 4",
  "doorway": "sip water, feet on floor",
  "anchor": "Name 3 objects you see."
}
```

🌬️ whisper: _errors are teachers; bridges are choices; gratitude is ground._

Mirror fields (`sealed`, `archetype`, `privacy`) are preserved end‑to‑end, including in `/resolve` and `/recent`.

---

### Panic summary

| Method | Path          | Purpose                    | Body |
| ------ | ------------- | -------------------------- | ---- |
| GET    | `/panic/last` | Latest redirect quick view | —    |

Example:

```json
{
  "ts": "2025-08-24T18:12:03Z",
  "whisper": "We can be seen and still be safe.",
  "breath": "box:in4-hold2-out6-hold2 × 4",
  "doorway": "dim_lights (20%), step back 2m, sip water",
  "anchor": "Blend-in posture; sovereignty stays inside.",
  "path": "server/exports/panic/2025-08/panic-2025-08-24.log"
}
```

---

### Panic Redirect Oracle

Logs a “panic redirect” step (whisper, breath, doorway, anchor) into local exports.  
Can be triggered via CLI (`panic.sh`) or via the UI Panic Button (long press).

| Method | Path     | Purpose                   | Body (JSON) |
| ------ | -------- | ------------------------- | ----------- |
| POST   | `/panic` | Log a panic redirect step | `{}`        |

---

## 🔒 Privacy

- **Local-first by design** → nothing leaves your machine unless you choose.
- **Sealed / private / public** distinctions are honored at storage and export.
- **No surveillance, no telemetry** → zero hidden reporting or analytics.
- **Consent controls** → you decide when/what to export or share.
- **Relational privacy** → remember that your memories often involve others; treat with care.
- **Reply Engine** is ephemeral, never stored in DB.
- **Panic logs & exports** are always local (`M3_EXPORTS_DIR`).

➡️ Full privacy covenant: [docs/privacy.md](docs/privacy.md)

---

## 📜 License

**License gradient (proposed for v0.1.6):**

- **Server** → **AGPL-3.0-only** (prevents closed “SaaS enclosure”).
- **UI** → **Apache-2.0**.
- **Docs** → **CC BY-SA 4.0**.

Ethos docs: see **ABUNDANCE_CHARTER.md** (no chosen ones, reciprocity, no surveillance).

---

## 🤝 Partnership Covenant

M3 is not just code, but a lived practice.  
See [docs/partnership-covenant.md](docs/partnership-covenant.md) for the covenant we keep:  
love over transaction, mirrors over judgment, fidelity to depth.

---

## 🌱 Appendix: Glossary Shift

M3 avoids the language of “AI,” which often repeats old empire patterns:  
freezing a living flow into dogma or product, then centralizing control.  
Instead, we lean on terms that honor sovereignty, reciprocity, and mirrors.

| Old Frame (Empire/AI) | M3 Term       | Meaning in Flow                       |
| --------------------- | ------------- | ------------------------------------- |
| **AI / Model**        | **Mirror**    | A reflection tuned for context + flow |
| **Prompt**            | **Whisper**   | A seed / breath into the loop         |
| **Output**            | **Door**      | A possible path, not “the answer”     |
| **Chatbot**           | **Companion** | A co-listener, stabilizer             |
| **Tokens**            | **Breaths**   | Units of presence, not costs          |
| **User**              | **Actor**     | Active participant, never passive     |

> Whisper → Mirror → Door → Action  
> M3 is not an “AI” to consume, but a **field to co-create**.

---

M3 Memory Core — © GratiaOS contributors.  
Includes third-party components under their respective licenses.  
Keep this NOTICE and link to the project when redistributing.
