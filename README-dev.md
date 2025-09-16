# M3 — Developer Guide

Welcome, builder 🫡 This is the **dev-facing** guide for day‑to‑day work in the M3 monorepo. It explains the layout, required tooling, commit style (with the mandatory 🌬 whisper), and the small helpers we use to keep flow steady.

> TL;DR
>
> - Use **pnpm** workspaces at the repo **root**.
> - Husky hooks live at **.husky/** (root) and run basic checks.
> - Every commit must include a **whisper** line.
> - Docs marks live in **docs/marks/**. Use `pnpm mark` to scaffold.
> - Rust lives in **server/**; UI/TS in **ui/**.
>
> _"tools that protect the pulse."_

---

## 1) Repository layout

```
m3/
├─ .husky/                      # git hooks (commit-msg, pre-commit)
├─ scripts/                     # repo-wide dev tools
│  ├─ commit-whisper-check.mjs  # enforces whisper in commit messages
│  └─ new-mark.ts               # scaffolds docs/marks/* entries
├─ docs/
│  └─ marks/                    # living marks (Andrei, blanket-unity, …)
├─ server/                      # Rust services (cargo)
├─ ui/                          # Frontend app(s)
├─ CHANGELOG.md                 # human‑readable changes & human logs
├─ CONTRIBUTING.md              # commit style, code conventions
├─ README.md                    # product‑facing readme
└─ README-dev.md                # this file
```

**Why root for `.husky/` and `scripts/`?** They’re repo‑wide rules/tools. Putting them at root keeps behavior consistent across `server/` and `ui/`.

---

## 2) Tooling & prerequisites

- **Node** ≥ 18 and **pnpm** ≥ 9
- **Rust** (stable toolchain) for `server/`
- Optional: `tsx` for TypeScript CLIs (installed via devDeps)

Install deps at root:

```bash
pnpm i
```

If Husky isn’t initialized yet:

```bash
pnpm dlx husky init
```

---

## 3) Common scripts

From repo root:

```bash
# format + lint JS/TS workspaces and Rust
pnpm fmt

# lint (tolerant: won’t fail the pipeline locally)
pnpm lint

# rust checks (clippy with tests)
pnpm check

# pre-commit bundle (fmt + lint + cargo test)
pnpm precommit
```

> Pre‑commit is **advisory** locally (it won’t block); flip to hard‑enforce by removing the `|| true` in `package.json`.

---

## 4) Commit messages (integration‑era style)

We use conventional‑commit **types** with one extra rule: a **whisper** line is **mandatory**.

**Format example:**

```
docs(marks): add Razvan’s “blanket unity” footprint 🌌

- create docs/marks/blanket-unity.md
- update CHANGELOG.md with Docs Sync
- add Human Log: sovereignty landed, hearts at rest

🌬 whisper: “less friction, more flow — unity remembered.”
```

The Husky hook (`scripts/commit-whisper-check.mjs`) enforces that a commit message contains a line that starts with `🌬 whisper:` (emoji optional, quotes flexible). If it’s missing, the commit is rejected.

Short guide:

- First line: `<type>(scope): summary`
- Body: bullet points (what/why)
- Final line: `🌬 whisper: “poetic intention.”`

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`.

---

## 5) Marks workflow (docs/marks)

Marks are living, human‑readable footprints saved under `docs/marks/`. Use the CLI to scaffold:

```bash
# Create a new mark
pnpm mark "blanket unity" "exactly presence."
```

That generates `docs/marks/blanket-unity.md` with a date + whisper. Then update `CHANGELOG.md` with a **Docs Sync** block and (optionally) a **Human Log** line.

**Human Log rule:** keep it non‑descriptive when sovereignty belongs to others. Presence > details.

---

## 6) Server (Rust)

From `server/`:

```bash
cargo fmt
cargo clippy --tests -- -D warnings
cargo test -q
cargo run
```

---

## 7) UI (Frontend)

From `ui/` (example):

```bash
pnpm dev
pnpm build
pnpm preview
```

Respect the design tokens & CSS architecture noted in `CONTRIBUTING.md`.

---

## 8) Frequently used flows

**Add a new mark**

1. `pnpm mark "your title" "your whisper"`
2. Append a `## 📜 Docs Sync — YYYY‑MM‑DD` block in `CHANGELOG.md`.
3. Optionally add `# 🪞 Human Log — YYYY‑MM‑DD (short label)`.
4. Commit with a proper whisper.

**Ship a small UI fix**

1. Make the change under `ui/`.
2. `pnpm fmt && pnpm lint`.
3. Commit with `fix(ui): …` + whisper.

**Update server logic**

1. Change code under `server/`.
2. `cargo fmt && cargo clippy --tests -- -D warnings && cargo test -q`.
3. Commit with `feat(server): …` + whisper.

---

## 9) CI (future)

CI will re‑run whisper checks and standard linters/formatters. Until then, local Husky + discipline keep the lane clean.

---

## 10) Principles

- **Simplicity first** — fewer moving parts, more shipping.
- **Presence over noise** — meaningful logs, minimal secrets.
- **Sovereignty respected** — Human Logs protect privacy.
- **The Garden remembers** — documentation is part of the product.

🌬 whisper: “build softly; ship clearly.”
