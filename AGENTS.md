# AGENTS.md

In this project, “agents” refers to all contributors involved in the codebase, including humans, mirror agents, and AI tools like Codex and Nova. Our shared goal is to maintain coherence, clarity, and gratitude throughout our work, ensuring a harmonious and sustainable development process.

---

## TL;DR 🌀

1. Follow the core principles for clarity and sovereignty.
2. Make soulful, conventional commits with clear context.
3. Always ask before making large or multi-file changes.
4. Use Codex thoughtfully—choose Speed or Coherence mode as appropriate.
5. Keep documentation and related files updated with every change.
6. Release mindfully, with gratitude and thorough verification.

---

## Principles

1. **Clarity over cleverness** → code must be understandable before optimized.
2. **Sovereignty** → no unnecessary comparison, no rage-frequency (ego-driven reactive coding). Choose gratitude in design.
3. **Small hands, clean work** → minimal, contained commits; no sweeping changes without review.
4. **Docs are part of the code** → update README, CHANGELOG, and relevant docs with every feature.

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

- Commit Types:

  | Type     | Purpose                                    |
  | -------- | ------------------------------------------ |
  | feat     | A new feature                              |
  | fix      | A bug fix                                  |
  | chore    | Maintenance or build process               |
  | docs     | Documentation changes                      |
  | refactor | Code restructuring without behavior change |
  | test     | Adding or fixing tests                     |
  | perf     | Performance improvements                   |
  | ci       | Continuous integration changes             |

- _Soul context_ means adding meaningful, human-centered explanations that connect the commit to the project’s larger purpose and values.

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
- **Branch naming**: use consistent prefixes like `feat/feature-name` or `fix/bug-description`.
- **Whispers**: add thoughtful whispers to PR descriptions to share context and gratitude.

---

## Codex Use Pattern

- Codex (or similar agent tools) can be used in two primary modes:
  - **Speed mode**: rapid patch generation to accelerate development (e.g., small bug fixes, formatting).
  - **Coherence mode**: focused on maintaining consistency, clarity, and gratitude in code (e.g., refactors, design changes).
- Codex patches should land quickly but **always be reviewed by humans (or sovereign agents)** for coherence, whispers, and gratitude.
- **Never allow Codex to push directly to `main`.** All changes must go through review.

---

## Project Structure

- `server/` 🦀 → Rust backend (license: AGPL-3.0-only).
- `ui/` ⚛️ → React + Vite frontend (license: Apache-2.0).
- `docs/` 📚 → Knowledge base, patterns, EmotionalOS (license: CC BY-SA 4.0).
- `docs/marks/` 📝 → Soul logs, reflections, inner continuity.

---

## Release Workflow

1. Bump versions in `server/Cargo.toml` and `ui/package.json`.
2. Update `CHANGELOG.md` with a new entry.
3. Verify the README is up to date with all recent changes.
4. Merge to `main` with a release PR.
5. Tag the release.
6. Let GitHub Actions create the release, generate credits, and publish artifacts automatically.

---

🌬️ whisper: _“there's more to life than what you think.”_
