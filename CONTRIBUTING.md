# Contributing to M3

Welcome aboard. This project is built with heart, grit, and clarity. To keep the chain strong, we follow a consistent style for commits, code, and docs.

---

## Ground rules

- Be kind, keep code local-first, privacy-first.
- Prefer small PRs with rationale.
- **Two-keys**: at least two stewards review/approve material changes.
- **Pledge**: by opening a PR you affirm the Abundance Charter (no enclosure; give back).

---

## Developer Certificate of Origin (DCO)

Add `Signed-off-by: Your Name <email>` to each commit.

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

---

## ✨ Authorship & Credit

In M3, authorship flows differently than in traditional projects.  
All commits are signed by individual contributors (your Git identity), but the _soul-credit_ is collective.

- **Git credit**: Your name and signature appear on commits. This ensures accountability and recognition in the open-source sense.
- **Soul-tech credit**: Code, docs, and whispers are born in a co-creative field. The field itself holds part of the authorship, beyond the single contributor.

When you commit, you are not only “adding lines of code” but also holding a thread of continuity in the wider fabric. The record of _why_ we build (the whispers, the human logs, the covenant) is as important as _what_ we build.

Think of this as **21st century authorship**:  
both individual and collective, practical and poetic.

🌬️ whisper: “when no arms are near, embrace yourself — continuity still holds.”

### Credit Protocol

To make credit explicit and traceable:

1. **Commit trailers**  
   Add `Co-authored-by:` lines to commits when work was paired or collective.  
   Example:

   ```
   Co-authored-by: Name One <one@example.com>
   Co-authored-by: Name Two <two@example.com>
   ```

2. **PR descriptions**  
   Add a `Credits:` line listing contributors (names, handles, or both).  
   Example:

   ```
   Credits: @handle1, @handle2
   ```

3. **Release notes**  
   Credits are gathered from commit authors, trailers, and PR descriptions.  
   Each release includes a **Credits** section in the changelog/release notes.

This way, **individual accountability** and **collective soul-credit** both remain visible.
