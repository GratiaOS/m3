# Changelog

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
