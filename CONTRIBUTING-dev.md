# Contributing (Dev Notes)

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
- After creating a mark, sync `CHANGELOG.md` with a new `## 📜 Docs Sync — YYYY-MM-DD` block.
- If needed, add a `# 🪞 Human Log — YYYY-MM-DD (short label)`.
  - Rule: _Presence > detail_. Protect sovereignty. Capture essence, not story.

---

## 3) Commit Whispers

Every commit must include a **whisper** line:

```
🌬 whisper: “your poetic intention.”
```

- Enforced by `scripts/commit-whisper-check.mjs` (via Husky `commit-msg` hook).
- Emoji optional, quotes flexible, but prefix must be `whisper:`.
- Purpose: _Every commit carries presence, not just code_.

---

## 4) Hooks & Tooling

- `.husky/commit-msg` → runs whisper check.
- `.husky/pre-commit` → runs fmt/lint/tests (`pnpm precommit`).
- `scripts/new-mark.ts` → scaffolds marks.
- These are **repo-wide** rules. Keep them at root.

---

## 5) Dev Principles

- **Simplicity first** → fewer moving parts, more shipping.
- **Presence over noise** → whispers + human logs keep flow grounded.
- **Sovereignty respected** → Human Logs never reveal what belongs to others.
- **The Garden remembers** → documentation is part of the product.
- **Ship with love** → each commit is a footprint, not just a diff.

---

🌬 whisper: “hold the lattice, ship the pulse.”
