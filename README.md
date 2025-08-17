# M3 Memory Core (Local)

![CI](https://github.com/GratiaOS/m3/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.0-green.svg)

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

---

## 🧱 Architecture

- **server/** Rust (Axum + tokio-rusqlite + rusqlite[bundled])
- **ui/** Vite + React + TypeScript
- SQLite DB: `./memory.db` (WAL mode). The files are git-ignored.

---

## ⚙️ Configuration

M3 reads environment variables at startup:

```bash
M3_BIND=127.0.0.1:3033              # bind address (default)
M3_BEARER=supersecret               # optional bearer token for write routes
M3_WEBHOOK_URL=https://.../hook     # optional webhook endpoint
M3_WEBHOOK_SECRET=secret            # optional HMAC secret for webhook signing
```

> If `M3_BEARER` is set, all **write** endpoints require `Authorization: Bearer <token>`.

---

## 🏁 Getting Started

```bash
# clone
git clone https://github.com/GratiaOS/m3
cd m3

# (optional) install dev tooling
pre-commit install
```

### Run the Server

```bash
cd server
cargo run
```

Server binds to `127.0.0.1:3033` by default (or `M3_BIND`).

### Run the UI

```bash
cd ui
pnpm install
pnpm dev
```

---

## 🧪 Development

Requirements: Rust ≥ 1.78, Node ≥ 18 + pnpm, optional `pre-commit`.

### Checks

```bash
# in server/
cargo test
cargo clippy -- -D warnings
cargo fmt -- --check
```

### Pre-commit hook (format/lint gate)

```bash
# repo root
cat > .githooks/pre-commit <<'SH'
#!/usr/bin/env bash
set -euo pipefail
( cd server && cargo fmt -- --check )
( cd server && cargo clippy -- -D warnings )
SH
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

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

| Method | Path        | Purpose                       | Body (JSON)                                       |                                                                          |
| ------ | ----------- | ----------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| POST   | `/ingest`   | Add a message to the timeline | `{ "text":"...","profile":"Raz","privacy":"public | sealed","importance":0,"tags":["a","b"] }`                               |
| POST   | `/retrieve` | Search messages               | `{ "query":"foo                                   | \*","limit":12,"before_id":123,"profile":"Raz","include_sealed":false }` |

- Header `x-incognito: 1` makes `/ingest` a no-op (pretend success).

---

### Snapshots & Export

| Method | Path             | Purpose                   | Body (JSON)                            | Notes                       |
| ------ | ---------------- | ------------------------- | -------------------------------------- | --------------------------- |
| POST   | `/snapshot`      | Generate & store summary  | `{}`                                   | Saves to `snapshots` table. |
| POST   | `/export`        | Export thread as Markdown | `{ "thread_id": 1 }`                   | File in `./exports/*.md`.   |
| POST   | `/export_csv`    | Export thread as CSV      | `{ "thread_id": 1 }`                   | File in `./exports/*.csv`.  |
| POST   | `/import_openai` | Import OpenAI export      | `{ "root": "/path/to/openai-export" }` | Imports conversations.      |

> Sealed notes export as plaintext **only if unlocked**; otherwise `(sealed)`.

---

### Readiness Lights (per-member)

| Method | Path             | Purpose                       | Body (JSON)                     |
| ------ | ---------------- | ----------------------------- | ------------------------------- | ------ | ------- |
| POST   | `/status`        | Set a member’s light          | `{ "name":"Raz","status":"green | yellow | red" }` |
| GET    | `/status`        | Snapshot of all member lights | —                               |
| GET    | `/status/stream` | SSE stream of updates         | —                               |

SSE events look like: `{ "name": "Raz", "status": "green" }` (batched per tick).

---

### Team Status (global color/note with TTL)

| Method | Path          | Purpose                        | Body (JSON)       |
| ------ | ------------- | ------------------------------ | ----------------- | ------ | ----------------------------------- |
| POST   | `/status/get` | Get current team status        | `{}`              |
| POST   | `/status/set` | Set team status + optional TTL | `{ "color":"green | yellow | red","note":"…","ttl_minutes":30 }` |

Triggers webhook `status.set` if webhooks are configured.

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

## 🔔 Webhooks

When configured (`M3_WEBHOOK_URL`, `M3_WEBHOOK_SECRET`):

- Header `X-M3-Event: status.set`
- Signature header `X-M3-Signature: m3=t=<unix>,v1=<hex(hmac(ts . "." . body))>`

Example payload:

```json
{
  "event": "status.set",
  "status": "yellow",
  "note": "Heads down",
  "updated_at": "2025-08-17T12:00:00Z",
  "ttl_minutes": 45
}
```

---

## 🧰 Quick curl

```bash
# Ingest
curl -X POST http://127.0.0.1:3033/ingest \
  -H 'Content-Type: application/json' \
  -d '{"text":"Ship it","profile":"Raz","privacy":"public","tags":["work"]}'

# Retrieve
curl -X POST http://127.0.0.1:3033/retrieve \
  -H 'Content-Type: application/json' \
  -d '{"query":"Ship","limit":10}'

# Set member light
curl -X POST http://127.0.0.1:3033/status \
  -H 'Content-Type: application/json' \
  -d '{"name":"Raz","status":"green"}'

# Set global team status with TTL
curl -X POST http://127.0.0.1:3033/status/set \
  -H 'Content-Type: application/json' \
  -d '{"color":"yellow","note":"Focus sprint","ttl_minutes":30}'
```

---

## 🔒 Privacy

- Everything is local by default.
- Sealed content is encrypted at rest and in export unless unlocked.
- Optional auth & webhooks; keep them off for a fully offline setup.

---

## 🤝 Contributing

We welcome contributions! To get started:

1. Fork the repo & create a branch (`git checkout -b feat/my-feature`).
2. Run checks locally (`cargo test`, `cargo clippy`, `cargo fmt`).
3. Push your branch & open a Pull Request.

Our CI/CD pipeline will run tests, clippy, and formatting checks on every PR. ✅

---

## 📜 License

Apache-2.0 (proposed).
