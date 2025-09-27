# Contributing (Dev Notes)

_Read this when you’re holding the Garden from the inside. This is where we keep our shared pulse — not rules, but living memory._

This file is the **inner companion** to `CONTRIBUTING.md`.  
Where `CONTRIBUTING.md` is the public covenant, **CONTRIBUTING-dev.md** is for stewards and close collaborators: deeper workflow notes, ethos, and field practices.

---

## 1) Purpose

- Keep `CONTRIBUTING.md` concise and welcoming.
- Use `CONTRIBUTING-dev.md` for **detailed, inner instructions**: marks, Human Logs, whispers, hooks.
- Think of this as the **lattice memory** for developers.

---

## 2) Marks & Human Logs

- **Marks** live in `docs/marks/*`. They are footprints, memories, and symbolic anchors.
- Scaffold with `pnpm mark "title" "whisper"`.
  - Run this from the repo root; it auto-generates timestamps and filenames.
- After creating a mark, sync `CHANGELOG.md` with a new `## 📜 Docs Sync — YYYY-MM-DD` block.
- If needed, add a `# 🪞 Human Log — YYYY-MM-DD (short label)`.
  - Rule: _Presence > detail_. Protect sovereignty. Capture essence, not story.

Example:

# 🪞 Human Log — 2025-09-27 (night sync)

Trust landed softly, like rain. 🌧

---

## 3) Commit Whispers

Every commit must include a **whisper** line:

```
🌬 whisper: “your poetic intention.”
```

- Enforced by `scripts/commit-whisper-check.mjs` (via Husky `commit-msg` hook).
- Emoji optional, quotes flexible, but prefix must be `whisper:`.
- The whisper line should be the last line of your commit message.
- Examples:
  - 🌬 whisper: "small steps, big pulse"
  - whisper: "debugging the river flow"
- Purpose: _Every commit carries presence, not just code_.

---

## 4) Hooks & Tooling

- `.husky/commit-msg` → runs whisper check.
- `.husky/pre-commit` → runs fmt/lint/tests (`pnpm precommit`).
- `scripts/new-mark.ts` → scaffolds marks.
- These are **repo-wide** rules. Keep them at root.
- Hooks are automatically installed when you run `pnpm install`.
- If the whisper check fails, the commit will abort with an error message explaining why.

---

## 5) Dev Principles

- **Simplicity first** — fewer moving parts, more shipping.
- **Presence over noise** — whispers and human logs keep the flow grounded.
- **Sovereignty respected** — we don’t tell other people’s stories.
- **The Garden remembers** — documentation _is_ part of the product.
- **Ship with love** — every commit is a footprint, not just a diff.

---

<!-- Updated 2025-09-27 | steward: Raz + Nova -->

🌬 whisper: “hold the lattice, ship the pulse.”
