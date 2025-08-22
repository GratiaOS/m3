# M3 Memory Core (Local)

![CI](https://github.com/GratiaOS/m3/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.4-green.svg)

Your personal, local-first memory and knowledge system.\
Designed for offline resilience, privacy, and joyful retrieval.

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
M3_EXPORTS_DIR=server/exports       # optional override for exports/logs root

# Reply Engine (nudges)
M3_REPLIES_MODE=random              # fixed: poetic | sarcastic | paradox | random (default: random)
M3_REPLIES_WEIGHTS=poetic:0.5,sarcastic:0.3,paradox:0.2  # used if mode=random (default weights)
M3_REPLIES_WEEKLY_CHANCE=0.08       # probability of activation per week (0–1, default: 0.08)
M3_REPLIES_WINDOW_MINUTES=20        # how long an activation window lasts (default: 20)
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

---

### Panic Redirect Oracle

Logs a “panic redirect” step (whisper, breath, doorway, anchor) into local exports.  
Can be triggered via CLI (`panic.sh`) or via the UI Panic Button (long press).

| Method | Path     | Purpose                   | Body (JSON) |
| ------ | -------- | ------------------------- | ----------- |
| POST   | `/panic` | Log a panic redirect step | `{}`        |

---

## 🔒 Privacy

- Everything is local by default.
- Sealed content is encrypted at rest and in export unless unlocked.
- Optional auth & webhooks; keep them off for a fully offline setup.
- Reply Engine is stateless and ephemeral (no DB storage).
- Panic logs are written only to local disk (`M3_EXPORTS_DIR/panic/…`).

---

## 📜 License

Apache-2.0
