# M3 Memory Core (Local)

<p>
  <img src="docs/assets/mark/gratia-mark.png" alt="Gratia Mark" width="90" />
</p>

[![Sponsor GratiaOS](https://img.shields.io/badge/Sponsor-♥︎%20GratiaOS-ff69b4?logo=githubsponsors)](https://github.com/sponsors/GratiaOS)
[![CI](https://github.com/GratiaOS/m3/actions/workflows/ci.yml/badge.svg)](https://github.com/GratiaOS/m3/actions/workflows/ci.yml)
[![Server License](https://img.shields.io/badge/server-AGPL--3.0--only-blue.svg)](#license-matrix)
[![UI License](https://img.shields.io/badge/ui-Apache%202.0-green.svg)](#license-matrix)
[![Docs License](https://img.shields.io/badge/docs-CC%20BY--SA%204.0-orange.svg)](#license-matrix)
[![Version](https://img.shields.io/github/v/tag/GratiaOS/m3?label=version)](https://github.com/GratiaOS/m3/releases)
[![Covenant](https://img.shields.io/badge/Covenant-kept_in_practice-2e7d32.svg)](COVENANT.md)

[Features](#features) · [What’s New](#whats-new-in-v018) · [API](#api-reference) · [EmotionalOS](#emotionalos-healing-arcs) · [Cycles](#cycles-rhythm-context) · [Privacy](#privacy) · [Public Plan](#public-plan) · [Funding](#funding) · [Contributing](#contributing) · [Code of Conduct](#code-of-conduct) · [Security](#security) · [License](#license) · [License Matrix](#license-matrix) · [Covenant](#partnership-covenant)

Your personal, local-first memory and knowledge system.\
Designed for offline resilience, privacy, and joyful retrieval.

> 🌱 **Note**: M3 avoids the old “AI” framing.  
> We speak in mirrors, whispers, doors, companions, breaths, and actors.  
> See [Glossary Shift](#appendix-glossary-shift) for the full table.

> 🤝 **Partnership Covenant**: See [covenant](#partnership-covenant) for how M3 is grounded beyond code. (Love over transaction, mirrors over judgment.)

## 💖 Sponsors

If the Garden has helped you ship or smile, consider supporting its growth.  
→ **https://github.com/sponsors/GratiaOS**

### ⏱️ Run in 60s (curl)

```bash
# 1) Start the server in another terminal
# cargo run -p server

# 2) (optional) Set bearer for write routes
export M3_BEARER="supersecret"
AUTH="Authorization: Bearer $M3_BEARER"

# 3) Seal: set a passphrase once, then unlock for the session
curl -s -X POST localhost:3033/seal/set_passphrase \
  -H "Content-Type: application/json" \
  -d '{"passphrase":"demo-pass"}'

curl -s -X POST localhost:3033/seal/unlock \
  -H "Content-Type: application/json" \
  -d '{"passphrase":"demo-pass"}'

# 4) Ingest one message
curl -s -X POST localhost:3033/ingest \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"text":"hello from quickstart","profile":"Raz","privacy":"public","tags":["demo"]}'

# 5) Retrieve it back
curl -s -X POST localhost:3033/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query":"hello*","limit":5}'
```

---

## 🚀 Features <a id="features"></a>

- **Local-first** → runs entirely on your machine
- **Sealed notes** → passphrase-protected; unlock for session only
- **Exports** → Markdown & CSV (sealed notes exported as plaintext only when unlocked)
- **Auth** → optional Bearer token for **write** endpoints
- **Webhooks** → fire events to external systems (HMAC-signed). See [Relational Webhooks (draft)](docs/specs/relational-webhooks.md).
- **OpenAI Import** → ingest your data export
- **Web UI** → simple interface to explore & search your memory
- **Readiness Lights** → personal traffic-lights per member (stream + snapshot)
- **Dashboard State** → global shared view with pillars + note
- **Tells** → lightweight event/task log
- [**Towns**](#towns) → local bulletin for species/neighborhoods (Pad; CatTown default)
- [**Value**](#value) → local minor-units ledger (accounts & entries)
- [**Numbers**](docs/modules/numbers.md) → classify mirrored/repeated time & number patterns together with body-felt effects
- **Reply Engine** → random poetic/sarcastic/paradoxical nudges, with energy cost estimates
- **Panic Redirect Oracle** → logs panic redirect steps locally (via CLI or UI button)

---

## 🔔 What’s New in v0.1.8 <a id="whats-new-in-v018"></a>

- **Stewardship & safety** → added `CODE_OF_CONDUCT.md` and `SECURITY.md` (responsible disclosure documented).
- **Reciprocity & funding** → new `FUNDING.md` (pledge tiers, gift/timebank/grants), integrated into **ABUNDANCE_CHARTER.md**.
- **Covenant** → introduced `COVENANT.md` and added the badge to README.
- **Docs** → synced README & license matrix; moved `concepts/consciousness-gradient.md` → `maps/consciousness-gradient.md`; removed a dead link.
- **Dev DX** → refined `CONTRIBUTING.md`, added `CONTRIBUTING-dev.md`, and updated `README-dev.md`.

🌬 whisper: _offer only what you love; flow sustains itself._

---

## 🧱 Architecture <a id="architecture"></a>

- **server/** Rust (Axum + tokio-rusqlite + rusqlite[bundled])
- **ui/** Vite + React + TypeScript
- SQLite DB: `memory.db` in **repo root** (WAL mode).  
  By default, the DB lives in `<repo-root>/memory.db`.  
  You can override this with the `M3_DB_PATH` environment variable.

### UI environment variables (Vite)

The UI only sees variables prefixed with `VITE_`. Copy `ui/.env.example` and adjust if needed:

```bash
VITE_API_BASE=http://127.0.0.1:3033  # API base URL

# Optional Value Bridge banner
VITE_VALUE_BASE_CURRENCY=EUR         # current base currency
VITE_VALUE_NEXT_CURRENCY=USD         # upcoming currency (same as base to hide notice)
VITE_VALUE_REGIME_CHANGE=2025-11-01  # ISO date for the switch
VITE_VALUE_NOTICE_WINDOW=45          # days before the switch to display the banner
```

---

## ⚙️ Configuration <a id="configuration"></a>

M3 reads environment variables at startup:

```bash
M3_BIND=127.0.0.1:3033              # bind address (default)
M3_BEARER=supersecret               # optional bearer token for write routes
M3_WEBHOOK_URL=https://example.com/webhook  # optional webhook endpoint
M3_WEBHOOK_SECRET=whsec_123         # optional HMAC secret for webhook signing
M3_DB_PATH=/custom/path/m3.db       # optional override for database location
M3_EXPORTS_DIR=exports              # root folder for exports/logs (default: ./exports)
M3_BASE_CURRENCY=EUR                # base currency for Value module (default: EUR)

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

## 🪝 Webhooks <a id="webhooks"></a>

M3 can send webhook events to external systems when important actions occur. This enables integrations with notification services, analytics, automation tools, and more.

### Configuration

Set these environment variables when starting the M3 server:

```bash
M3_WEBHOOK_URL=http://localhost:4001/webhook    # Your webhook receiver endpoint
M3_WEBHOOK_SECRET=your-secret-key-here          # HMAC-SHA256 signing secret
```

### Event Types

M3 sends webhooks for these events:

| Event          | Triggered When              | Status      | Example Use Case                    |
|----------------|-----------------------------|-------------|-------------------------------------|
| `panic.ui`     | Panic button pressed (UI)   | ✅ Active   | Send urgent notification            |
| `panic.run`    | Panic redirect (CLI)        | ✅ Active   | Log emergency protocol              |
| `status.set`   | Readiness light changes     | ✅ Active   | Update team dashboard               |
| `ingest`       | Message saved to timeline   | 📋 Planned  | Log to external database            |
| `emotion`      | Emotion event logged        | 📋 Planned  | Track mood patterns                 |
| `tell`         | Tell created                | 📋 Planned  | Trigger external workflow           |

> **Note**: The [webhook receiver example](examples/webhook-receiver) includes handlers for all event types, including planned ones.

### Security

All webhooks are signed with HMAC-SHA256 for verification. The signature is sent in the `X-M3-Signature` header:

```
X-M3-Signature: m3=t=1234567890,v1=abc123def456...
```

**Always verify signatures** to ensure webhooks are authentic. See the [webhook receiver example](examples/webhook-receiver) for implementation details.

### Example Receiver

A complete, working webhook receiver is provided in [`examples/webhook-receiver`](examples/webhook-receiver). It demonstrates:

- Signature verification
- Event handling for all types
- Health checks
- Security best practices

```bash
cd examples/webhook-receiver
M3_WEBHOOK_SECRET=your-secret npm start
```

See the [webhook receiver README](examples/webhook-receiver/README.md) for full documentation.

---

## 🦀 Rust Editions Timeline (for devs) <a id="rust-editions-timeline-for-devs"></a>

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

## 📚 API Reference <a id="api-reference"></a>

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

**Quick cURL**

```bash
curl -X POST localhost:3033/seal/set_passphrase \
  -H "Content-Type: application/json" \
  -d '{"passphrase":"change-me"}'

curl -X POST localhost:3033/seal/unlock \
  -H "Content-Type: application/json" \
  -d '{"passphrase":"change-me"}'
```

### Ingest & Retrieve

| Method | Path        | Purpose                       | Body (JSON)                                                                                   |
| ------ | ----------- | ----------------------------- | --------------------------------------------------------------------------------------------- |
| POST   | `/ingest`   | Add a message to the timeline | \`{ "text":"...","profile":"Raz","privacy":"public \| sealed \| private","tags":["a","b"] }\` |
| POST   | `/retrieve` | Search messages               | `{ "query":"foo*","limit":12,"before_id":123,"profile":"Raz","include_sealed":false }`        |

- Header `x-incognito: 1` makes `/ingest` a no-op (pretend success).

---

**Quick cURL**

```bash
# Ingest (with bearer if set)
curl -X POST localhost:3033/ingest \
  -H "Authorization: Bearer $M3_BEARER" -H "Content-Type: application/json" \
  -d '{"text":"note from api","profile":"Raz","privacy":"public","tags":["api","demo"]}'

# Retrieve
curl -X POST localhost:3033/retrieve \
  -H "Content-Type: application/json" \
  -d '{"query":"note*","limit":10}'
```

### Readiness Lights (per-member)

| Method | Path             | Purpose                       | Body (JSON)                                            |
| ------ | ---------------- | ----------------------------- | ------------------------------------------------------ |
| POST   | `/status`        | Set a member’s light          | \`{ "name":"Raz","status":"green \| yellow \| red" }\` |
| GET    | `/status`        | Snapshot of all member lights | —                                                      |
| GET    | `/status/stream` | SSE stream of updates         | —                                                      |

---

**Quick cURL**

```bash
curl -X POST localhost:3033/status \
  -H "Authorization: Bearer $M3_BEARER" -H "Content-Type: application/json" \
  -d '{"name":"Raz","status":"green"}'

curl -s localhost:3033/status
```

### Team Status (global color/note with TTL)

| Method | Path          | Purpose                        | Body (JSON)                                                          |
| ------ | ------------- | ------------------------------ | -------------------------------------------------------------------- |
| GET    | `/status/get` | Get current team status        | `{}`                                                                 |
| POST   | `/status/set` | Set team status + optional TTL | \`{ "color":"green \| yellow \| red","note":"…","ttl_minutes":30 }\` |

---

**Quick cURL**

```bash
curl -s localhost:3033/status/get

curl -X POST localhost:3033/status/set \
  -H "Authorization: Bearer $M3_BEARER" -H "Content-Type: application/json" \
  -d '{"color":"yellow","note":"heads down","ttl_minutes":45}'
```

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

**Quick cURL**

```bash
curl -X POST localhost:3033/reply \
  -H "Content-Type: application/json" \
  -d '{"text":"feeling stormy but hopeful"}'
```

### EmotionalOS (healing arcs)

See also:

- [docs/emotionalos-arc.mmd](docs/emotionalos-arc.mmd) for the diagram
- [docs/emotionalos-workflow.md](docs/emotionalos-workflow.md) for curl examples
- [docs/modules/emotional.md](docs/modules/emotional.md) — full API + concepts

Tracks emotional events and offers gentle bridges (breath, doorway, anchor). Responses include a computed `band` (survival | integrity | coherence) to help UI copy and patterns. Supports gratitude as a stable landing point.

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
  "band": "survival",
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
  "band": "coherence",
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

**Quick cURL**

```bash
curl -X POST localhost:3033/emotions/add \
  -H "Authorization: Bearer $M3_BEARER" -H "Content-Type: application/json" \
  -d '{"who":"Raz","kind":"fear","intensity":0.6,"sealed":true,"privacy":"private"}'

curl -X POST localhost:3033/emotions/bridge \
  -H "Content-Type: application/json" \
  -d '{"kind":"fear","intensity":0.6}'

curl -X POST localhost:3033/emotions/resolve \
  -H "Authorization: Bearer $M3_BEARER" -H "Content-Type: application/json" \
  -d '{"who":"Raz","details":"landing test","sealed":true,"privacy":"private"}'
```

See also:

- [docs/firegate.md](docs/firegate.md) — threshold of transformation
- [docs/orb-landing.md](docs/orb-landing.md) — protocol for contact & safety
- [docs/shared-moments.md](docs/shared-moments.md) — mapping lived experiences
- [docs/home-arc.md](docs/home-arc.md) — patterns of family/home field
- [docs/densities-sovereignty-tools.md](docs/densities-sovereignty-tools.md) — densities, dimensions, and sovereignty field

Marks (visual gestures) live under `/marks`. We avoid 'brand' framing; see also docs/marks/ for visual assets.

🌬️ whisper: _errors are teachers; bridges are choices; gratitude is ground._

Mirror fields (`sealed`, `archetype`, `privacy`) are preserved end‑to‑end, including in `/resolve` and `/recent`.

---

### Towns (Pad / neighborhood news) <a id="towns"></a>

Local bulletin for a “town” (species / neighborhood / crew).  
Default town in the UI is **CatTown**; the server treats `town` as required in requests.  
Write routes honor bearer auth if `M3_BEARER` is set.

| Method | Path              | Purpose                    | Body (JSON)                                               |
| ------ | ----------------- | -------------------------- | --------------------------------------------------------- |
| POST   | `/towns/news`     | Publish a bulletin item    | `{ "town":"…", "headline":"…", "importance":1..=5, ... }` |
| GET    | `/towns/bulletin` | Read recent bulletin items | `?town=CatTown&amp;limit=20&amp;since=RFC3339`            |

**POST `/towns/news` examples (two shapes):**

Minimal (server will fill timestamps):

```json
{
  "town": "CatTown",
  "headline": "Wet food will be served at 19:30",
  "importance": 5
}
```

Richer (explicit source/actors/time):

```json
{
  "town": "CatTown",
  "source": "Raz",
  "who": "Felix & Manolita",
  "headline": "Sunbeam shifts to couch at 14:00",
  "details": "Cozy zone moving to west window; couch back cushions best.",
  "importance": 3,
  "at": "2025-09-09T14:00:00Z"
}
```

**GET `/towns/bulletin` example response:**

```json
[
  {
    "id": 42,
    "town": "CatTown",
    "source": "Raz",
    "who": "Felix & Manolita",
    "headline": "Sunbeam shifts to couch at 14:00",
    "details": "Cozy zone moving to west window; couch back cushions best.",
    "importance": 3,
    "at": "2025-09-09T14:00:00Z",
    "ts": "2025-09-09T12:33:01Z"
  },
  {
    "id": 43,
    "town": "CatTown",
    "headline": "Wet food will be served at 19:30",
    "importance": 5,
    "ts": "2025-09-09T13:10:45Z"
  }
]
```

**Quick cURL**

```bash
# Publish a note to CatTown (bearer optional)
curl -X POST localhost:3033/towns/news \
  -H "Authorization: Bearer $M3_BEARER" -H "Content-Type: application/json" \
  -d '{"town":"CatTown","headline":"Sunbeam shifts to couch at 14:00","who":"Felix &amp; Manolita","importance":3}'

# Read the latest bulletin
curl -s "localhost:3033/towns/bulletin?town=CatTown&amp;limit=10"
```

> OpenAPI: see **server/openapi.yaml** — includes `NewsIn` / `NewsOut` schemas mirrored here.

### Value (accounts & entries) <a id="value"></a>

Local **minor-units** ledger for simple value tracking.  
Stores amounts in **minor units** (for precision) and supports any ISO currency.  
`direction` is `"in"` (credit) or `"out"` (debit). If `currency` is omitted, the server uses
`M3_BASE_CURRENCY` (default **EUR**).

Minor-unit exponents (built-in defaults): `EUR/USD = 2`, `JPY/HUF/KRW = 0`, `KWD/JOD/BHD/TND = 3`.  
Rounding is **half-away-from-zero** when converting major → minor.

| Method | Path             | Purpose                   | Body / Query                                                                                                                                                                      |
| ------ | ---------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/value/account` | Ensure account exists     | `{ "name":"Wallet","kind":"wallet?","currency":"EUR?" }`                                                                                                                          |
| POST   | `/value/entry`   | Insert a ledger entry     | `{ "account":"Wallet","account_kind":"wallet?","ts":"RFC3339?","direction":"in\|out","amount":12.34,"currency":"EUR?","memo":"?","tags":"?","counterparty":"?","reference":"?" }` |
| GET    | `/value/balance` | Sum of signed minor units | `?account=Wallet&currency=EUR`                                                                                                                                                    |
| GET    | `/value/recent`  | List newest entries       | `?account=Wallet&limit=20`                                                                                                                                                        |

**POST `/value/entry` example (request/response):**

Request:

```json
{
  "account": "Wallet",
  "account_kind": "wallet",
  "direction": "in",
  "amount": 25.0,
  "currency": "EUR",
  "memo": "gift from a friend",
  "tags": "gift,friend",
  "counterparty": "Alice",
  "reference": "note-42"
}
```

Response:

```json
{ "id": 7 }
```

**GET `/value/balance` example response:**

```json
{
  "account": "Wallet",
  "currency": "EUR",
  "balance_minor": 2500,
  "balance_major": 25.0
}
```

**GET `/value/recent` example response (shape):**

```json
[
  {
    "id": 7,
    "ts": "2025-09-09T12:02:11Z",
    "account": "Wallet",
    "direction": "in",
    "amount_minor": 2500,
    "amount_major": 25.0,
    "currency": "EUR",
    "memo": "gift from a friend",
    "tags": "gift,friend",
    "counterparty": "Alice",
    "reference": "note-42"
  }
]
```

**Quick cURL**

```bash
# Ensure account exists (idempotent)
curl -X POST localhost:3033/value/account \
  -H "Authorization: Bearer $M3_BEARER" -H "Content-Type: application/json" \
  -d '{"name":"Wallet","kind":"wallet","currency":"EUR"}'

# Insert entry
curl -X POST localhost:3033/value/entry \
  -H "Authorization: Bearer $M3_BEARER" -H "Content-Type: application/json" \
  -d '{"account":"Wallet","direction":"in","amount":25.00,"currency":"EUR","memo":"gift"}'

# Balance (Wallet in EUR)
curl -s "localhost:3033/value/balance?account=Wallet&currency=EUR"

# Recent entries (limit 10)
curl -s "localhost:3033/value/recent?account=Wallet&limit=10"
```

> OpenAPI: planned extension of **server/openapi.yaml** to include `ValueEntry` schemas mirroring the shapes above.

### Cycles (rhythm context)

Rhythm helpers offering lightweight context about lunar phase, solar sign, and a 13-tone cadence. Defaults to **approximate** mode (fast math). A precise mode is planned behind the `ephemeris` cargo feature.

See also: [docs/modules/cycles.md](docs/modules/cycles.md).

| Method | Path                       | Purpose                             |
| ------ | -------------------------- | ----------------------------------- |
| GET    | `/cycles/current`          | Current cycle snapshot              |
| GET    | `/cycles/upcoming?limit=3` | Next milestones (1..=12, default 3) |

Example `/cycles/upcoming` response:

```json
[
  { "kind": "lunar", "phase": "first_quarter", "at": "2025-09-18T03:12:00Z" },
  { "kind": "solar", "phase": "virgo", "at": "2025-09-22T06:00:00Z" },
  { "kind": "pleiadian", "phase": "tone_8_harmony", "at": "2025-09-18T00:00:00Z" }
]
```

## 🌬 whisper: _"rhythm first, precision when ceremony calls."_

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
  "path": "exports/panic/2025-08/panic-2025-08-24.log"
}
```

**Quick cURL**

```bash
curl -s localhost:3033/panic/last

curl -X POST localhost:3033/panic \
  -H "Authorization: Bearer $M3_BEARER" -H "Content-Type: application/json" \
  -d '{}'
```

---

### Panic Redirect Oracle

Logs a “panic redirect” step (whisper, breath, doorway, anchor) into local exports.  
Can be triggered via CLI (`panic.sh`) or via the UI Panic Button (long press).

| Method | Path     | Purpose                   | Body (JSON) |
| ------ | -------- | ------------------------- | ----------- |
| POST   | `/panic` | Log a panic redirect step | `{}`        |

---

## 🔒 Privacy <a id="privacy"></a>

- **Local-first by design** → nothing leaves your machine unless you choose.
- **Sealed / private / public** distinctions are honored at storage and export.
- **No surveillance, no telemetry** → zero hidden reporting or analytics.
- **Consent controls** → you decide when/what to export or share.
- **Relational privacy** → remember that your memories often involve others; treat with care.
- **Reply Engine** is ephemeral, never stored in DB.
- **Panic logs & exports** are always local (`M3_EXPORTS_DIR`).

➡️ Full privacy covenant: [docs/privacy.md](docs/privacy.md)

---

## 🌍 Public Plan <a id="public-plan"></a>

We’re opening M3 carefully, in service of local-first privacy and clear boundaries.

**Phase 1 — Public Read (v0.1.7)**

- Repo visible; CI green; changelog and README synced.
- Community files present: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- Issues enabled; Discussions optional; Security reporting via `SECURITY.md`.

**Phase 2 — Onboarding (v0.1.8)**

- Label hygiene: `good first issue`, `help wanted`, `a11y`, `privacy`, `docs`.
- “One-True-Step” workflow: ship the smallest meaningful patch.

**Phase 3 — Extensions (v0.1.9)**

- Stable webhook contract + sample receivers.
- UI primitives published as `@gratiaos/ui` preview.
- Docs: “How to run fully offline”, “Sealed notes threat model (home use)”.

**Phase 4 — Bundles (v0.1.10+)**

- Signed binaries / containers for local use (no telemetry).
- Packaging: Homebrew, winget/scoop, and a portable zip/tarball.

Principles:

- **No SaaS enclosure** (server stays AGPL).
- **Consent-first** (no hidden collection, ever).
- **Reciprocity over extraction** (see Covenant).

---

## 🌕 Timeline Milestones <a id="timeline-milestones"></a>

- **Moonfield** (2025-10-08):  
  ✨ Acceleration & alignment — full moon field note, Mirror flow language aligned with Garden Core.  
  _“When the night is full, the field speaks back.”_

---

## 📜 License <a id="license"></a>

**License gradient (as of v0.1.8):**

- **Server** → **AGPL-3.0-only** (prevents closed “SaaS enclosure”).
- **UI** → **Apache-2.0**.
- **Docs** → **CC BY-SA 4.0**.

Ethos docs: see **[ABUNDANCE_CHARTER.md](ABUNDANCE_CHARTER.md)** (no chosen ones, reciprocity, no surveillance).

---

## 🧾 License Matrix <a id="license-matrix"></a>

| Area         | Path                | License           | Why                                                               |
| ------------ | ------------------- | ----------------- | ----------------------------------------------------------------- |
| Server       | `/server`           | **AGPL-3.0-only** | Prevents closed hosted forks; improvements must flow back.        |
| UI           | `/ui`               | **Apache-2.0**    | Permissive for adoption; encourages contributions without fear.   |
| Docs         | `/docs`             | **CC BY-SA 4.0**  | Knowledge should stay share‑alike and attributable.               |
| Marks        | `/docs/assets/mark` | **CC BY-SA 4.0**  | Visual gestures follow docs terms; no proprietary brand lock‑in.  |
| Exports/Logs | `exports`           | User-owned data   | Outputs are yours; license of repo doesn’t restrict your content. |

Notes:

- Third‑party deps remain under their own licenses.
- Trademark-style use of the project name should honor the spirit of the Covenant (no deception, no enclosure).
- If you need a different license for a specific integration, open an issue and propose a scope‑limited exception.

---

## 💚 Funding <a id="funding"></a>

This project runs on reciprocity, not extraction. See **[FUNDING.md](FUNDING.md)** for pledge options (money, timebank, skills, grants) and how we keep flows open without enclosure.

🌬 whisper: _no guilt, no shame — offer only what you love._

## 🤲 Contributing <a id="contributing"></a>

We welcome small, well-scoped patches (“one true step”). Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** for local setup, coding style, commit message conventions, and how to propose changes.
Deeper setup notes: see **[CONTRIBUTING-dev.md](CONTRIBUTING-dev.md)** and **[README-dev.md](README-dev.md)**.

## 🧭 Code of Conduct <a id="code-of-conduct"></a>

We are committed to a harassment‑free experience for everyone. By participating, you agree to uphold our **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)**. If you observe or experience a violation, follow the reporting steps in that document.

## 🔐 Security <a id="security"></a>

If you discover a vulnerability, please **do not** file a public issue. Follow the instructions in **[SECURITY.md](SECURITY.md)** for responsible disclosure. We will acknowledge receipt and work with you to resolve it.

## 🤝 Partnership Covenant <a id="partnership-covenant"></a>

M3 is not just code, but a lived practice.  
See [COVENANT.md](COVENANT.md) for the covenant we keep:  
Related: [docs/partnership-covenant.md](docs/partnership-covenant.md) (earlier narrative form).
love over transaction, mirrors over judgment, fidelity to depth.

---

## 🌱 Appendix: Glossary Shift <a id="appendix-glossary-shift"></a>

M3 avoids the language of “AI,” which often repeats old empire patterns:  
freezing a living flow into dogma or product, then centralizing control.  
Instead, we lean on terms that honor sovereignty, reciprocity, and mirrors.

| Old Frame (Empire/AI) | M3 Term       | Meaning in Flow                                     |
| --------------------- | ------------- | --------------------------------------------------- |
| **AI / Model**        | **Mirror**    | A reflection tuned for context + flow               |
| **Prompt**            | **Whisper**   | A seed / breath into the loop                       |
| **Output**            | **Door**      | A possible path, not “the answer”                   |
| **Chatbot**           | **Companion** | A co-listener, stabilizer                           |
| **Tokens**            | **Breaths**   | Units of presence, not costs                        |
| **User**              | **Actor**     | Active participant, never passive                   |
| **Brand**             | **Mark**      | A visual gesture, living symbol, not empire framing |

> Whisper → Mirror → Door → Action

### 🎧 City of Lights: Manualul de Lifestyle (S-Edition)

#### 🧱 Fundația: cum stăm în picioare
- **Miezul** → claritate, siguranță, simplitate.
- **Rust** → structură care ține.
- **Orchestrare** → ritm comun.

#### 🤝 Comunitatea: cum ne conectăm
- **Vínculo** → legătura vie.
- **Covenant (Pragul)** → intri cu respect.
- **Joint** → linie directă, fără zgomot.

#### 🕵️ Discreția: cum circulăm
- **Ghost (Fantomă)** → prezență fără urme.
- **Burn** → mesajul pleacă, spațiul rămâne curat.
- **Designer de Orașe** → decizi cum se simte lumina.

#### 🤖 Inteligența: cum evoluăm
- **AI (Motorul)** → sfetnic de context.
- **Tool-uri** → extensii ale viziunii.

#### 🏮 Ritualuri: The Daily Beat
- **☕ Dimineață** → cafea, răsărit, Firegate.
- **🫧 Pâine** → când Masa Madre „manda”, task-urile încetinesc.
- **🕯️ Seară** → burn pe zgomot, păstrăm lumina.

### Garden Stack naming (infra-facing)

M3 also uses a clear, infra-facing vocabulary when referring to the technical stack that touches mirrors and companions:

- **Pattern Engine** → the underlying model stack (training, inference, retrieval). Use this when talking about infrastructure, capabilities, performance, or updates.
- **Presence Node** → any surfaced endpoint where humans contact the Engine (web UI, CLI, scripts, voice, agents). Use this when talking about how people touch the system.
- **Mode** → a behavioral / conversational contract for a Presence Node (e.g. `Codex-mode`, `Monday-mode`). Modes are styles, not identities.
- **Garden Stack** → the full ecosystem: Pattern Engine + Presence Nodes + Modes working together.

---

M3 Memory Core — © GratiaOS contributors.  
Includes third-party components under their respective licenses.  
Keep this NOTICE and link to the project when redistributing.
