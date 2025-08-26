# Changelog

---

## 📜 Timeline Milestone — v0.1.5 (unreleased)

- **Reply → Action bridge:** nudges now carry quick doors → UI shows inline buttons → /tells logs the action.
- **Composer**: shows nudge + buttons after save.
- **api.ts**: typed ReplyOut, createTell helper.
- **Memory flow**: /retrieve contract aligned; MemoryDrawer + App now show all notes (sealed unlock path prepped).
- **Radar**: poll interval reduced, payload fixed.
- **Panic arc**: presets now rotate whispers/doors; Panic auto-bridges to Readiness + Tells.
- **Dashboard**: shows latest redirect + status + pillars.

🔑 Gaps still open:

1. Dashboard: recent tells strip.
2. Radar: meaning of 📡 clarified (signal vs noise).
3. Docs: README + .env.example need /panic/last + mode preset.

🌬️ whisper: “Every note remembered, every door within reach.”

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
