# Changelog

## [0.1.4] — 2025-08-22

### Added

- **Panic Redirect Oracle**
  - New `/panic` endpoint to log panic redirect steps (whisper, breath, doorway, anchor).
  - Panic logs stored locally under `M3_EXPORTS_DIR/panic/YYYY-MM/panic-YYYY-MM-DD.log`.
  - CLI tool: `panic.sh` to trigger oracle from terminal.
  - UI Panic Button (long-press) with toast feedback.

### Changed

- README and `.env.example` updated with `M3_EXPORTS_DIR` and Panic Oracle docs.
- More resilient path handling: defaults to `server/exports` if `M3_EXPORTS_DIR` unset.

### Fixed

- Unified error handling between `rusqlite` and `tokio-rusqlite`.
- Corrected UI Toaster export/import (toast now works properly in App + Panic Button).

---

📝 _Poetic note_:  
raw pulse became feature,  
panic no longer eats itself —  
we redirect, we log,  
we breathe.

## [0.1.3] — 2025-08-21

### Added

- **Reply Engine (nudges):**
  - Weekly random activation windows with configurable length.
  - Modes: Poetic, Sarcastic, Paradox, Random (weighted).
  - Energy estimation heuristic + alternative actions (“bill” display).
  - Axum preview endpoint (`/replies/preview`).
- Expanded **.env.example** with reply engine configuration variables.

### Fixed

- Main server boot fixed for Axum 0.7 (removed `into_make_service`).
- Clippy lint fixes (e.g. replaced manual `min/max` with `clamp`).
- ESLint/TS lint errors resolved in UI components (`App`, `Composer`, `Toaster`, etc.).

### Changed

- Unified formatting (`cargo fmt` + ESLint/prettier rules for TS/React).
- README updated with Reply Engine documentation and `.env` examples.

## [0.1.2] — 2025-08-18

### Added

- Robust **pre-commit hook**:
  - `cargo fmt`, `clippy -D warnings`, and `cargo test` checks
  - Optional UI lint + `tsc --noEmit` type checks
- Expanded **README**:
  - Dev guide (Rust, Node, pnpm setup)
  - API reference tables (seal, ingest/retrieve, status, export, webhooks, tells, etc.)
  - Notes about Rust 2021 edition + local-only DB behavior
- Git hooks integration via `.githooks/pre-commit`

### Fixed

- Removed redundant imports in `db.rs`
- Enforced consistent formatting (`cargo fmt`)

### Changed

- Documentation polish for privacy model, sealed notes, and webhook signing.

## [0.1.1] - 2025-08-17

### Added

- Optional Bearer auth for write routes (`M3_BEARER`).
- Webhook emitter with HMAC signature (`M3_WEBHOOK_URL`, `M3_WEBHOOK_SECRET`).
- Deterministic DB path resolver (`M3_DB_PATH` or repo root fallback).
- SSE stream for readiness lights (`/status/stream`).

### Changed

- Polished API and docs; refreshed README with full route table.
- CI: clippy/fmt gates; pre-commit hooks example; branch/label automations.

### Fixed

- Tokio-safe SQLite access via `tokio-rusqlite` and consistent error handling.
- Multiple clippy nits; formatting; import order.
- Avoid duplicate `memory.db` when running from different working dirs.

## [0.1.0] - 2025-08-XX

- Initial public cut.
