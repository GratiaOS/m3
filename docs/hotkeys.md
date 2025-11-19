# Keyboard Shortcuts (Hotkeys)

Garden keeps shortcuts gentle: platform-aware labels, screen-reader friendly, and quiet while you’re typing.

- **Platform-aware.** Chords render per OS (e.g., `⌥M` on macOS, `Alt+M` on Windows/Linux).
- **SR-friendly.** Buttons use `aria-keyshortcuts`, and announces are calm, debounced, and **tab-visibility aware**.
- **Input-safe.** Hotkeys **do not fire while typing** in inputs, textareas, or content-editable regions.
- **Hints (optional).** Inline `[data-chord]` pills may show near controls; they inherit theme colors and work in dark mode.

## Quick reference

| Action                                  | macOS            | Windows / Linux         | Where it works | Notes                                                        |
| --------------------------------------- | ---------------- | ----------------------- | -------------- | ------------------------------------------------------------ |
| Toggle **Memory** (consent)             | ⌥M or ⌃⌥M        | Alt+M                   | Global         | Ledgers only persist when ON.                                |
| Cycle **Depth** (Soft ↔ Deep)           | ⌥D or ⌃⌥D        | Alt+D                   | Global         | Gate for scenes like **Decode**.                             |
| Jump to **Decode**                      | ⌃⌥⇧D             | Alt+Shift+D             | Global         | Respects depth guard; no redirect.                           |
| **Export Gratitude** ledger             | ⌥E or ⌃⌥E        | Alt+E                   | Footer         | Uses current export mode. **Hold ⇧** to force hash/redacted. |
| **Export Boundary** ledger              | ⌥B or ⌃⌥B        | Alt+B                   | Footer         | Same Shift-for-hash behavior.                                |
| **Clear ledgers**                       | ⌃⌥⌫              | Alt+Backspace           | Footer         | Guarded; disabled when empty.                                |
| **Send to Weave** (Echo Sketch → Weave) | ⌥W               | Alt+W                   | Echo Sketch    | Sends last 200 points as `source:"sketch"` beads.            |
| **Auto-send** toggle (Sketch)           | ⌥⇧W              | Alt+Shift+W             | Echo Sketch    | Streams points gently; SR/Toast confirm.                     |
| **Seal Motherline**                     | ⌥Enter or ⌘Enter | Alt+Enter or Ctrl+Enter | Motherline     | Seals the three lines (with chips) + `#motherline`.          |

> Tip: On Safari/Chrome macOS, some `⌥` chords are reserved; we provide a **Ctrl+Option** fallback (shown above).

## Accessibility & behavior

- **`aria-keyshortcuts`** is applied automatically via `chordAttr(...)`, normalized to readable names (e.g., `Control+Alt+Shift+D`).
- **Announcements** (e.g., “Memory on…”, “Depth set to Soft”) are debounced and suppressed in background tabs.
- **Focus safety.** Hotkeys are ignored while an editable control has focus.

## Developer notes

Hotkeys are centralized—add once, they show up everywhere.

- **Keymap:** `ui/src/lib/keyChords.ts` — declare actions & per-platform labels.
- **Matcher:** `ui/src/lib/hotkeys.ts` — routes key events; already skips typing contexts.
- **UI helpers:** `ui/src/lib/chordUi.ts` — use `chordAttr('action')` on buttons/links to set:
  - `data-chord` (for inline pill hints)
  - `title` (optional)
  - `aria-keyshortcuts` (normalized)
- **A11y announces:** `ui/src/lib/srAnnouncer.ts` — calm, debounced, visibility-aware.

### Adding a new shortcut (example)

1. Add labels in `keyChords.ts`:
   ```ts
   export const keyChords = {
     myAction: { mac: ['⌥Y'], win: ['Alt+Y'], linux: ['Alt+Y'] },
     // …
   };
   ```
2. Handle it in `hotkeys.ts` and gate with your app state.
3. On your button:
   ```tsx
   <button {...chordAttr('myAction')}>Do thing</button>
   ```

## Inline hint pills (optional)

If `[data-chord]` pills are enabled, they inherit current theme tokens and adapt for contrast. You can also use a keyboard-mode reveal (only show hints after first keypress).

---

## Changelog stub

```
### [0.4.x]
**Docs**
- Hotkeys: platform-aware chords, `aria-keyshortcuts`, SR calm behavior, input-safe routing, and quick-reference table.
```

## Link it in the app (optional)

- Add “Hotkeys” to your Help/About menu or footer:
  ```tsx
  <a href="/docs/hotkeys" className="link">
    Hotkeys
  </a>
  ```
- Or surface a tiny “?” near controls with a link to this page.
