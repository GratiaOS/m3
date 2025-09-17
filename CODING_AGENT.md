# CODING_AGENT.md

This file guides all coding agents (human or not) contributing to this repo.  
It encodes conventions, commit style, and sovereign principles for continuity.

---

## Principles

- **Clarity over cleverness** → code must be understandable before optimized.
- **Sovereignty** → no unnecessary comparison, no rage-frequency. Choose gratitude in design.
- **Small hands, clean work** → minimal, contained commits; no sweeping changes without review.
- **Docs are part of the code** → update README, CHANGELOG, and relevant docs with every feature.

---

## Commit Style

- Conventional commits + soul context.
- Format:

  ```
  <type>(scope): short description (#issue)

  - bullet 1
  - bullet 2
  - whisper (optional)
  ```

- Example:

  ```
  feat(server): add panic redirect with bridge suggestion (#4)

  - unify patterns::suggest_bridge usage
  - fix &str → String mismatch
  - whisper: small hands, clean work
  ```

---

## Agent Behavior

- **Ask before large edits** (multi-file refactors, deps bump, CI workflows).
- **Review diffs**: never auto-commit without inspection.
- **Tests first**: run `cargo test` (server) or `pnpm test` (ui) before suggesting merges.
- **Respect ignore files**: do not leak `.env`, secrets, or local configs.

---

## Project Structure

- `server/` → Rust backend (license: AGPL-3.0-only).
- `ui/` → React + Vite frontend (license: Apache-2.0).
- `docs/` → Knowledge base, patterns, EmotionalOS (license: CC BY-SA 4.0).
- `marks/` → Soul logs, reflections, inner continuity.

---

## Release Workflow

1. Bump versions in `server/Cargo.toml` and `ui/package.json`.
2. Update `CHANGELOG.md` with a new entry.
3. Merge to `main` with a release PR.
4. Tag and let GitHub Actions create a release + credits.

---

## Whisper

🌬 _“Commander, who are you fighting? Reverse the poles. Gratitude is the upgrade.”_
