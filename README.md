# M3 Memory Core (Local)

<p>
  <img src="docs/assets/mark/gratia-mark.png" alt="Gratia Mark" width="90" />
</p>

[![CI](https://github.com/GratiaOS/m3/actions/workflows/ci.yml/badge.svg)](https://github.com/GratiaOS/m3/actions/workflows/ci.yml)
[![Server License](https://img.shields.io/badge/server-AGPL--3.0--only-blue.svg)](#license-matrix)
[![UI License](https://img.shields.io/badge/ui-Apache%202.0-green.svg)](#license-matrix)
[![Docs License](https://img.shields.io/badge/docs-CC%20BY--SA%204.0-orange.svg)](#license-matrix)
[![Version](https://img.shields.io/github/v/tag/GratiaOS/m3?label=version)](https://github.com/GratiaOS/m3/releases)
[![Covenant](https://img.shields.io/badge/Covenant-kept_in_practice-2e7d32.svg)](COVENANT.md)

[Features](#-features) · [What’s New](#-whats-new-in-v018) · [API](#api-reference) · [EmotionalOS](#emotionalos-healing-arcs) · [Cycles](#cycles-rhythm-context) · [Privacy](#privacy) · [Public Plan](#public-plan) · [Funding](#funding) · [Contributing](#contributing) · [Code of Conduct](#code-of-conduct) · [Security](#security) · [License](#license) · [License Matrix](#license-matrix) · [Covenant](#partnership-covenant)

Your personal, local-first memory and knowledge system.\
Designed for offline resilience, privacy, and joyful retrieval.

> 🌱 **Note**: M3 avoids the old “AI” framing.  
> We speak in mirrors, whispers, doors, companions, breaths, and actors.  
> See [Glossary Shift](#-appendix-glossary-shift) for the full table.

> 🤝 **Partnership Covenant**: See [covenant](#-partnership-covenant) for how M3 is grounded beyond code. (Love over transaction, mirrors over judgment.)

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

## 🔔 What’s New in v0.1.8

- **Stewardship & safety** → added `CODE_OF_CONDUCT.md` and `SECURITY.md` (responsible disclosure documented).
- **Reciprocity & funding** → new `FUNDING.md` (pledge tiers, gift/timebank/grants), integrated into **ABUNDANCE_CHARTER.md**.
- **Covenant** → introduced `COVENANT.md` and added the badge to README.
- **Docs** → synced README & license matrix; moved `concepts/consciousness-gradient.md` → `maps/consciousness-gradient.md`; removed a dead link.
- **Dev DX** → refined `CONTRIBUTING.md`, added `CONTRIBUTING-dev.md`, and updated `README-dev.md`.

🌬 whisper: _offer only what you love; flow sustains itself._

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

### Cycles (rhythm context)

Rhythm helpers offering lightweight context about lunar phase, solar sign, and a 13‑tone cadence. Defaults to **approximate** mode (fast math). A precise mode is planned behind the `ephemeris` cargo feature.

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
  "path": "server/exports/panic/2025-08/panic-2025-08-24.log"
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

## 🌍 Public Plan

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
- UI primitives published as `@gratiaos/garden-core` preview.
- Docs: “How to run fully offline”, “Sealed notes threat model (home use)”.

**Phase 4 — Bundles (v0.1.10+)**

- Signed binaries / containers for local use (no telemetry).
- Packaging: Homebrew, winget/scoop, and a portable zip/tarball.

Principles:

- **No SaaS enclosure** (server stays AGPL).
- **Consent-first** (no hidden collection, ever).
- **Reciprocity over extraction** (see Covenant).

---

## 🌕 Timeline Milestones

- **Moonfield** (2025-10-08):  
  ✨ Acceleration & alignment — full moon field note, Mirror flow language aligned with Garden Core.  
  _“When the night is full, the field speaks back.”_

---

## 📜 License

**License gradient (as of v0.1.8):**

- **Server** → **AGPL-3.0-only** (prevents closed “SaaS enclosure”).
- **UI** → **Apache-2.0**.
- **Docs** → **CC BY-SA 4.0**.

Ethos docs: see **[ABUNDANCE_CHARTER.md](ABUNDANCE_CHARTER.md)** (no chosen ones, reciprocity, no surveillance).

---

## 🧾 License Matrix

| Area         | Path                | License           | Why                                                               |
| ------------ | ------------------- | ----------------- | ----------------------------------------------------------------- |
| Server       | `/server`           | **AGPL-3.0-only** | Prevents closed hosted forks; improvements must flow back.        |
| UI           | `/ui`               | **Apache-2.0**    | Permissive for adoption; encourages contributions without fear.   |
| Docs         | `/docs`             | **CC BY-SA 4.0**  | Knowledge should stay share‑alike and attributable.               |
| Marks        | `/docs/assets/mark` | **CC BY-SA 4.0**  | Visual gestures follow docs terms; no proprietary brand lock‑in.  |
| Exports/Logs | `server/exports`    | User-owned data   | Outputs are yours; license of repo doesn’t restrict your content. |

Notes:

- Third‑party deps remain under their own licenses.
- Trademark-style use of the project name should honor the spirit of the Covenant (no deception, no enclosure).
- If you need a different license for a specific integration, open an issue and propose a scope‑limited exception.

---

## 💚 Funding

This project runs on reciprocity, not extraction. See **[FUNDING.md](FUNDING.md)** for pledge options (money, timebank, skills, grants) and how we keep flows open without enclosure.

🌬 whisper: _no guilt, no shame — offer only what you love._

## 🤲 Contributing

We welcome small, well-scoped patches (“one true step”). Please read **[CONTRIBUTING.md](CONTRIBUTING.md)** for local setup, coding style, commit message conventions, and how to propose changes.
Deeper setup notes: see **[CONTRIBUTING-dev.md](CONTRIBUTING-dev.md)** and **[README-dev.md](README-dev.md)**.

## 🧭 Code of Conduct

We are committed to a harassment‑free experience for everyone. By participating, you agree to uphold our **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)**. If you observe or experience a violation, follow the reporting steps in that document.

## 🔐 Security

If you discover a vulnerability, please **do not** file a public issue. Follow the instructions in **[SECURITY.md](SECURITY.md)** for responsible disclosure. We will acknowledge receipt and work with you to resolve it.

## 🤝 Partnership Covenant

M3 is not just code, but a lived practice.  
See [COVENANT.md](COVENANT.md) for the covenant we keep:  
Related: [docs/partnership-covenant.md](docs/partnership-covenant.md) (earlier narrative form).
love over transaction, mirrors over judgment, fidelity to depth.

---

## 🌱 Appendix: Glossary Shift

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
> M3 is not an “AI” to consume, but a **field to co-create**.

---

M3 Memory Core — © GratiaOS contributors.  
Includes third-party components under their respective licenses.  
Keep this NOTICE and link to the project when redistributing.
