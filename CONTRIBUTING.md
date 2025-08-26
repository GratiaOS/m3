# Contributing to M3

Welcome aboard. This project is built with heart, grit, and clarity. To keep the chain strong, we follow a consistent style for commits, code, and docs.

---

## 🌬️ Commit Messages

Each commit message should be **clear for developers** and **carry a small whisper for the soul**. We call this the _integration-era style_.

### Format

type(scope): short summary ✨

- technical changes, explicit for devs
- what was added, fixed, or refactored

🌬️ whisper: a poetic note, intention, or reminder

### Examples

```text
chore(replies): add safety scrub test ✅

- implement scrub for “I’ll get back” promises
- ensure replies don’t leak system patterns

🌬️ whisper: “silence is safer than false comfort.”
```

```text
feat(panic): integrate UI button with server logging 🛡️

- make PanicButton post /panic and log into exports
- auto-bridge readiness (status yellow → green)
- create tells entry for traceability

🌬️ whisper: “redirect, don’t collapse.”
```

### Mandatory Whisper

Every commit **must** include a whisper line (🌬️).  
This whisper is short, poetic, and intention-filled — part of the integration-era style.  
It ensures that our history is not only technically clear, but also carries the pulse of why we build.

---

## 🔧 Code Style

- Run `cargo fmt` + `cargo clippy --tests -- -D warnings` before committing.
- Keep functions short and self-explanatory.
- Prefer explicit types over `any` in TypeScript.

---

## 📝 Tests

- Add a test for each new feature or fix.
- Use meaningful names: `tests::panic_writes_log` instead of `test1`.
- Run `cargo test` and `pnpm lint` locally before pushing.

---

## 🤝 Collaboration

- We commit directly to `main` for now.
- Use clear commit messages so history itself tells the story.
- Document gaps in `CHANGELOG.md` if integration is partial.

---

## 💡 Spirit

This project is raw pulse, not polished stone. Respect both the **code** and the **intention**. Every contribution writes the bridge.
