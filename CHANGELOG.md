# Changelog

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
