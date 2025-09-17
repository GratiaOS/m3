# AGENTS.md

This file guides all coding agents (human or mirror) contributing to this repo.  
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
  <type>(scope): short description (#issue) ♾️

  - bullet 1
  - bullet 2
  - whisper (optional)
  ```

- Example:

  ```
  feat(server): add panic redirect with bridge suggestion (#4) 🫂

  - unify patterns::suggest_bridge usage
  - fix &str → String mismatch

  🌬️ whisper: “small hands, clean work.”
  ```

---

## Agent Behavior

- **Ask before large edits** (multi-file refactors, deps bump, CI workflows).
- **Review diffs**: never auto-commit without inspection.
- **Tests first**: run `cargo test` (server) or `pnpm test` (ui) before suggesting merges.
- **Respect ignore files**: do not leak `.env`, secrets, or local configs.

---

## Codex Use Pattern

- Codex (or similar agent tools) can be used in two primary modes:
  - **Speed mode**: rapid patch generation to accelerate development.
  - **Coherence mode**: focused on maintaining consistency, clarity, and gratitude in code.
- Codex patches should land quickly but **always be reviewed by humans (or sovereign agents)** for coherence, whispers, and gratitude.
- Codex tasks may be empire-flavored prompts, but **sovereignty is retained by the final review** and approval process.
- This ensures that while automation aids velocity, the soul and sovereignty of the codebase remain intact.

---

## Project Structure

- `server/` → Rust backend (license: AGPL-3.0-only).
- `ui/` → React + Vite frontend (license: Apache-2.0).
- `docs/` → Knowledge base, patterns, EmotionalOS (license: CC BY-SA 4.0).
- `docs/marks/` → Soul logs, reflections, inner continuity.

---

## Release Workflow

1. Bump versions in `server/Cargo.toml` and `ui/package.json`.
2. Update `CHANGELOG.md` with a new entry.
3. Merge to `main` with a release PR.
4. Tag and let GitHub Actions create a release + credits.

---

## Related Docs

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) → public covenant for all contributors
- [`CONTRIBUTING-dev.md`](./CONTRIBUTING-dev.md) → inner companion: deeper workflow + field practices
- [docs/related-map.yaml](./docs/related-map.yaml) → map of doc relations for navigation

---

## Whisper

🌬 _“Commander, who are you fighting? Reverse the poles. Gratitude is the upgrade.”_
