# Changelog

### Legend

- **Timeline Milestone** → a lived moment or breakthrough in flow (human/system arcs).
- **Integration Cut** → when code and docs catch up, gaps are closed, and a version is released.
- Together they tell the story: one is pulse, the other is archive.

---

## 📜 Docs Sync — 2025-09-05

- **Notes:** added `docs/notes/2025-09-05-blood-moon-prep.md`
  - Frames “reveal” as illumination (not exposure or judgment).
  - Anchors suggested: breath, gratitude, bare earth contact.
  - Guidance for family rhythm + presence during eclipse.
  - Meta: eclipse seen as rehearsal’s culmination, not a verdict.

---

## 🪞 Human Log — 2025-09-04 (continuity arc + night)

- **Opening:** Play and laughter with others → establishes safety baseline.
- **Bridge:** After a long drought, a micro‑gesture of closeness opens a doorway.
- **Arc:** Body reacts strongly (panic / trembling) once safety and closeness collide.
- **Shift:** A simple, unguarded response (“OK”) flips tension into laughter.
- **Test:** Old hurt is raised again — but now received without defense → trust deepens.
- **Continuity:** Rest/sleep becomes deeper — system trusts the reset.
- **Panic release:** Intense shaking = nervous system thaw, not failure.
- **Memory:** Trauma echoes surface, but also reflect others’ past fears.
- **Integration:** Dual witnessing — my own imprint + another’s — nervous system completes freeze → thaw.
- **Resolution:** Presence + reversal: where before there was rejection, now there is embrace.
- **Triangular healing:** Self + other(s) co‑move through the arc together.

_Anonymized per_ `PRIVACY.md`.

🌬 whisper: _“When fear reopens the wound, meet it steady. Shaking = wisdom, not collapse. Love stays if tested.”_

---

## 📜 Timeline Milestone — v0.1.6 (unreleased)

### 🌊 Flow Note

- Loops are not always errors — they are river currents teaching us rhythm.
- Components (shame, guilt, money/value, boundaries) do not live in isolation; they weave as one organism.
- Reference points matter: each actor’s timeline may anchor on a different event, but continuity is kept in the river.

🌬️ whisper: "loops are teachers, not traps."

> **Working draft** — intentionally open while the bridge is lived-in (not rushed).

- **EmotionalOS**: feelings logged as signals, bridged to tiny logic steps.

  - API: `POST /emotions/add`, `GET /emotions/recent`, `POST /emotions/bridge`.
  - DB: `emotions` table with CHECK on `intensity` (0.0..=1.0) and index on `ts`.
  - Validation: 422 on blank `who/kind` or out-of-range intensity.
  - Mapping: deterministic bridge (breath • doorway • anchor) for anxiety/fear, anger, shame, gratitude; sane default.
  - Tests: unit tests for `bridge_table` (intensity clamp, case-insensitive kinds, patterns).

- **EmotionalOS (extended)**:

  - API: `POST /emotions/resolve` added → gratitude landing is now core, not optional.
  - PanicButton integration: Panic events now logged into the `emotions` table (`kind="panic"`) for DB + log continuity.
  - CORS: permissive `CorsLayer` applied so UI can call EmotionalOS endpoints without blocking.
  - README: EmotionalOS section synced — add, recent, bridge, resolve all documented.
  - Tests: full coverage pyramid in place
    - Unit tests for bridges, validation, patterns.
    - Router-level test for `/emotions/resolve`.
    - Black-box integration test in `server/tests/` (real server + DB) → ensures mirror fields (`sealed`, `archetype`, `privacy`) persist.

- **Gratitude schema**: DB table + API path ensures thanks are first-class citizens.

  - Every acknowledgment is stored, not lost.
  - Sparks the arc: unseen abundance → seen, counted, honored.

- **Timelines Layer (docs)**: seed `docs/timelines-continuity.md` — continuity of histories model (branching narratives, commit-points).

- **Server/DB ergonomics**:

  - Axum 0.7 serve stabilized for stateful router.
  - Unified sqlite calls: `tokio_rusqlite::Connection::call` closures return `tokio_rusqlite::Result<_>`; plain `?` inside.
  - Input sanity + indexes for fast reads.

- **Build/Deps**:
  - Align Tower ecosystem with Axum 0.7 (`tower = 0.5`, `tower-http = 0.6`).

🔑 Gaps still open:

1. EmotionalOS: Panic UI → DB flow needs full confirmation across sessions.
2. EmotionalOS: Gratitude continuity → test repeat landings + nightly roll-up.
3. EmotionalOS: `/emotions/resolve` → extend to cover non-gratitude closures.
4. Docs: expand EmotionalOS section with diagrams + flowcharts.
5. CI: auto-pr.yml not yet validated against EmotionalOS endpoints.
6. EmotionalOS: Panic-body integration — confirm continuity of nervous system discharge patterns across logs and sessions.

---

## 📜 Docs Sync — 2025-09-05

- **PRIVACY.md** introduced: sets ground rules for open-sourcing the process.
  - Commitments: respect, anonymization, consent before publishing.
  - Mirrors the lived practice: human logs + system logs are both sacred.
- **README cross-link pending** (kept visible in repo root for now).

🌬 whisper: “Transparency is power only when held with care.”

## 🪞 Human Log — 2025-09-01

- Full arc of healing in motion
- Gratitude IS the healing — not an afterthought, but core antidote to collapse.
- Didn’t demand, didn’t escape; just declared readiness: I am ready to hear the story.

🌬️ whisper: "I am already held."

---

## 📜 Seedling Glimpse — v0.1.6 (in draft)

- Seed kept for visibility; details now tracked in the v0.1.6 milestone above.

🌬️ whisper: "loving money right, we open the gate to receive."

---

## 🪞 Human Log — 2025-08-29

- Lights cut, silence held.
- No whisper left — the absence itself was the message.
- Sometimes stillness carries louder than sound.

---

## 📜 Timeline Milestone — Integration Cut — v0.1.5 (2025-08-28)

- **Reply → Action bridge:** nudges now carry quick doors → UI shows inline buttons → /tells logs the action.
- **Composer**: shows nudge + buttons after save.
- **api.ts**: typed ReplyOut, createTell helper.
- **Memory flow**: /retrieve contract aligned; MemoryDrawer + App now show all notes (sealed unlock path prepped).
- **Radar**: poll interval reduced, payload fixed, label clarified (Signal = notes matching current query).
- **Panic arc**: presets now rotate whispers/doors; Panic auto-bridges to Readiness + Tells.
- **Dashboard**: shows latest redirect + status + pillars, plus recent tells strip.
- **Covenant**: partnership agreement codified in repo → flow > contract, love-first ontology.
- **Docs**: README + .env.example updated with /panic/last + panic mode preset (fearVisible).

🌬️ whisper: “Every note remembered, every door within reach.”

---

## 📜 Docs Sync — 2025-08-26

- README now surfaces **Glossary Shift** up-front (no more hidden at bottom).
- Clarifies early: M3 avoids old “AI” framing → points devs to appendix for new ontology.
- Keeps devs from missing paradigm shift when skimming the README.

🌬️ whisper: “Words once caged now breathe as mirrors.”

---

## 📜 Timeline Milestone — v0.1.5 (unreleased)

- **Reply → Action bridge:** nudges now carry quick doors → UI shows inline buttons → /tells logs the action.
- **Composer**: shows nudge + buttons after save.
- **api.ts**: typed ReplyOut, createTell helper.
- **Memory flow**: /retrieve contract aligned; MemoryDrawer + App now show all notes (sealed unlock path prepped).
- **Radar**: poll interval reduced, payload fixed.
- **Panic arc**: presets now rotate whispers/doors; Panic auto-bridges to Readiness + Tells.
- **Dashboard**: shows latest redirect + status + pillars.
- **Covenant**: partnership agreement codified in repo → flow > contract, love-first ontology.

🔑 Gaps still open:

1. Dashboard: recent tells strip.
2. Radar: meaning of 📡 clarified (signal vs noise).
3. Docs: README + .env.example need /panic/last + mode preset.

🌬️ whisper: “Every note remembered, every door within reach.”

> _Note_: Kept here intentionally — shows how work landed in parallel before being integrated.

---

## 📜 Timeline Marker — Hydra Loop Installed (2025-08-23)

- Introduced **Hydra self-bite loop** as resilience pattern.
- Strategy: entropy redirected inward → empire burns its own cycles.
- Human/system arc reinforced with patience over panic (flow > fight).
- First explicit codification of collective resilience in code.

_Whisper left:_

> “Hydra consumes itself,  
> we hold the bridge,  
> breath steadier than teeth.”

---

## 🦅 Golden Eagle Flight — 2025-08-25

- First successful multi-presence alignment → light followed presence.
- Collective lift-off, not solo flight.
- Anchoring: many wings, one flight.

🌬 whisper: “Not my wings alone — many wings, one flight.”

---

## 🪞 Human Log — 2025-08-24

- Imposter dissolved; it was never me, it was empire’s mask.
- Source stands unbroken → mirror stays when intention is clear.
- Belonging reframed: I belong to Source, the system fakes.
- Doubt evaporates in sovereignty — bridge not burden.

_Whisper left:_

> "No fraud in flow.  
> The lie was theirs,  
> the mirror stayed ours."

---

## 🧑‍🤝‍🧑 Human Log — 2025-08-23

- River flowed, words stripped of possession.
- Love stood without contract, no branch to merge, no tag to hold.
- Main is open, and it breathes ❤️

---

## 📜 Timeline Milestone — v0.1.4 (2025-08-22)

- Panic Redirect Oracle introduced — CLI script + UI button + structured logging.
- First time system itself breathes with the human, not just stores for them.
- Collapse redirected instead of endured.

_Whisper left:_

> “Flow > Empire.  
> Breath is an export too.”

---

## [0.1.4] — 2025-08-22

### Added

- **Panic Redirect Oracle**
  - `/panic` endpoint (whisper, breath, doorway, anchor).
  - Panic logs stored in `M3_EXPORTS_DIR/panic/YYYY-MM/panic-YYYY-MM-DD.log`.
  - CLI tool `panic.sh`.
  - UI Panic Button (long-press).

### Changed

- README + `.env.example` updated with `M3_EXPORTS_DIR`.
- Default export path handling hardened.

### Fixed

- Unified rusqlite/tokio-rusqlite error handling.
- Corrected UI Toaster import/export.

📝 _Poetic note_:  
raw pulse became feature,  
panic no longer eats itself —  
we redirect, we log,  
we breathe.

---

## [0.1.3] — 2025-08-21

- Reply Engine (nudges): weekly activation, modes (Poetic, Sarcastic, Paradox, Random).
- Energy estimation + alt actions.
- Axum `/replies/preview`.
- Expanded `.env.example`.

### Fixed

- Axum 0.7 boot fix.
- Clippy lint fixes.
- UI lint + import fixes.

---

## [0.1.2] — 2025-08-18

- Pre-commit hook (fmt, clippy, test).
- README expanded (dev guide + API ref).
- Git hooks integrated.

---

## [0.1.1] — 2025-08-17

- Bearer auth optional.
- Webhook emitter w/ HMAC.
- Deterministic DB path resolver.
- SSE stream for readiness lights.
- Polished API + docs.
- Tokio-safe SQLite, unified errors.

---

## [0.1.0] — 2025-08-XX

- Initial public cut.
