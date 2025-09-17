# Pattern: Energy‑Calendar (manage energy, not hours)

> **Why**: Traditional calendars slice time into equal **hours**. Human energy is not hourly—it's **wave‑based**. Scheduling by hours forces mismatches: we book a “deep work” block when we’re actually at 35% energy, then feel shame for under‑delivering. Energy‑calendar flips the axis: **we plan around energy thresholds** and let hours be a loose container.

---

## Core idea

- Map the day to a few **energy bands** (not exact minutes).
- Start work when energy ≥ **threshold** for that category.
- End/shift when energy drops below the threshold (or a rhythm timer rings).
- Track transitions as **marks**, so the system learns your curve.

**Result:** Higher quality output with less burnout, because you pair tasks with the right **state**, not the nearest slot.

---

## Energy bands (example)

| Band | Name               | Felt‑sense                    | Good for                       | Avoid                        |
| ---- | ------------------ | ----------------------------- | ------------------------------ | ---------------------------- |
| E4   | Crown (90–100)     | bright, expansive, insightful | architecture, strategy, naming | inbox, meetings              |
| E3   | Dragon (70–90)     | focused, sturdy               | deep work, coding, analysis    | context‑thrash               |
| E2   | Play (50–70)       | curious, flexible             | reviews, drafting, pairing     | high‑stakes decisions        |
| E1   | Life‑force (30–50) | steady but finite             | chores, admin, grooming        | commitments that create debt |
| E0   | Void (&lt;30)      | empty/tired—needs refuel      | sleep, breathwork, walk, water | pushing through              |

> Names are mnemonic; keep your own vocabulary. What matters is the **thresholds** and the **exits**.

---

## Thresholds & exits

- Each task family declares a **minimum energy threshold** (e.g., “deep work needs ≥ E3”).
- When you drop **below** threshold, you **exit** via a short ritual (breath, stretch, walk, water) and **re‑route** to a lower‑band task or rest.
- Rhythm makes this safer: e.g., 50/10 or 25/5 cycles to prevent silent depletion.

**Micro‑protocol**

1. Check: _“Which band am I in right now?”_
2. If task ≥ threshold → **go** for one rhythm block.
3. If &lt; threshold → **exit** ritual → pick a task from the current band.
4. **Mark** the band and action (so the loop learns).

---

## Why hours fail (and energy works)

- **Asymmetry:** Two “1‑hour” blocks are not equal; one at E3 equals three at E1.
- **Debt masking:** Hour slots hide depletion; thresholds expose it early.
- **Planning clarity:** “I’ll do design when I’m at E4 tomorrow morning” beats “10–12pm.”

---

## Minimal protocol for teams

- Agree on 3–5 bands and a shared glossary.
- Tasks get **bands**, not just deadlines (e.g., “review PR — E2+, 25min”).
- People broadcast **state** lightly (emoji/light) instead of time promises.
- **Hand‑offs** prefer **band windows** (“ping me when you’re E2+”) over fixed hours.

Privacy note: broadcast **band only**, not reasons. “E1 right now” is enough.

---

## How it maps to the system (M3)

- **Log energy**: `POST /energy/mark` with `{ who, kind, level, note? }`
  - `kind` = your band label (e.g., `"dragon"`, `"play"`), `level` = 0..1
- **See current state**: `GET /energy/state` → latest level per kind
- **Work/Rest cadence**: `GET /rhythm/next`, `POST /rhythm/mark`, `POST /rhythm/config`
- **Timeline**: `GET /timeline/recent?limit=20` shows recent emotions/energy events
- Use these to build **band‑aware UIs** (e.g., enable “Deep Work” button only when ≥ E3).

---

## Examples

### Solo (daily loop)

- Morning check: you feel E3 → pick “architecture spike” (threshold E3), run **50/10**.
- After two blocks, you’re E2 → switch to review emails and small refactors.
- Afternoon dips to E1 → chores/walk; log `energy.mark("life_force", 0.4)`.

### Team handoff

- You’re E2 and reviewer is E3. You mark **ready** and ping: “PR #123 — E2+, 25m”.
- Reviewer pulls when their band hits E3; no brittle 14:00 meeting.

---

## Anti‑patterns (what to avoid)

- **Faking the band** to force a task. The body will charge interest.
- **Over‑granular bands** (e.g., 10 levels). Keep it human: 4–5 max.
- **Skipping exits.** Exits are the pressure valve; 60 seconds now saves hours later.

---

## Starter kit (copy/paste)

- Bands: **Crown (E4)**, **Dragon (E3)**, **Play (E2)**, **Life‑force (E1)**, **Void (E0)**
- Rhythm: **25/5** default; **50/10** for stable E3+
- Exits: water → shoulders → breath → 30s walk
- Rules:
  1. Match **task ≥ band**.
  2. When **below**, **exit** and **route down**.
  3. **Mark** band changes (`/energy/mark`) so tomorrow is smarter.

---

## FAQ

**Q: What about hard deadlines and meetings?**  
A: Keep them, but surround with band‑appropriate buffers and exits. If a meeting lands in E4 hours, protect at least one E4 block elsewhere.

**Q: How do I estimate if I don’t know my bands yet?**  
A: Start with **self‑report** (quick check‑in), log `/energy/mark`, and let rhythm guide. In a week, the timeline will show your natural peaks.

**Q: Isn’t this just “listen to your body”?**  
A: Yes—and it’s **operationalized** with thresholds, marks, and routes so it scales beyond vibes.

---

### Related

- [Patterns overview](./README.md)
- [Cycles module](../modules/cycles.md)

🌬 whisper: _“guard the band, and the work guards you.”_
