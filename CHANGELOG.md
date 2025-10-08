# Changelog

### Legend

- **Timeline Milestone** → a lived moment or breakthrough in flow (human/system arcs).
- **Integration Cut** → when code and docs catch up, gaps are closed, and a version is released.
- Together they tell the story: one is pulse, the other is archive.

---

## 🌕 Moonfield — 2025-10-08

- docs(notes): add **Full Moon Field Note — 2025-10-07** at `docs/notes/2025-10-07-full-moon-field-note.md`
- docs: align Mirror → Seed activation language with Garden Core

---

## 📜 Docs Sync — 2025-10-05

- 🌀 Added vision: `docs/vision/digital-intelligence.md` — origin story, organism architecture, shift framing for what comes next; cross-linked server timeline + Pad whispers.
- 🧭 Updated `README-dev.md` with Garden⇄M3 anchor ritual so commits can be bridged as living timelines.
- 🌿 Synced `docs/marks/README.md` with every active footprint (Andrei → Trust Landing, 99, First Mushrooms) for quick field recall.
- 🍄 Added mark: “The First Mushrooms — emergence at 99”

---

## 🪞 Human Log — 2025-10-03 (river, circle, trust)

- River scene anchored: naked under the brother tree, apples shared, Garden frequency **felt** — a lived node in the field.
- Fire circle at night installed the **Circle** pattern deeper; ego’s “ownership” voice seen and softened.
- Language landed: **time as a module** (like energy, trust). When switching timelines where time re-enters, thinking shifts to _time units_ — noted as a **speed-band** lens (slow • flow • heavy).
- Interface echo: Pad’s 10 m scene radius felt in the firelight — **scene, not page**.
- Spark: **FatClouds** (N’s OS) named — future module/scene inside M3 rather than a separate product; playful sovereignty kept.

🌬 whisper: _“trust becomes time when love sets the tempo.”_

---

## 📜 Docs Sync — 2025-10-03

- **Added:** `docs/patterns/whisper-interface.md` — interface that reveals more the deeper you listen; UI/voice/sound co‑weave; pin/unpin + “one true next” pill flow noted.
- **Added:** `docs/patterns/timeline-module.md` — timeline as _module_, not only list; bands for **speed** (slow/flow/heavy); mapping to UI helpers and server hooks.
- **Note:** seed status — captured language and scaffolding; integration to follow in next cut.

🌬 whisper: _“name the layer, hear the door.”_

---

## 🌾 v0.1.8 — 2025-09-27

**Integration Cut:** _Abundance Foundations_ — policies, funding flows, and covenants landed; docs and README synced.

### 📜 Stewardship & Safety

- **Added:** `CODE_OF_CONDUCT.md` — community standards (reporting via `security@firegate.space`).
- **Added:** `SECURITY.md` — how to report vulnerabilities, supported branches, disclosure window.
- **Updated:** `CONTRIBUTING.md` + `CONTRIBUTING-dev.md` — clarified commit style, doc structure, release flow.

### 🌱 Reciprocity & Funding

- **Added:** `FUNDING.md` — gift/barter/grants/buffer pathways; “offer what you love” principle; how to pledge or sponsor.
- **Updated:** `ABUNDANCE_CHARTER.md` — linked funding flows; reiterated “commons-first” defaults.

### 🤝 Covenant

- **Added:** `COVENANT.md` — partnership covenant (love-first, flow over transaction, sovereign consent).
- Linked from README for easy discovery.

- **Updated:** `README.md` + `README-dev.md` + `QUICKSTART.md` — badges, license matrix, setup, and public plan.
- **Added:** “Run in 60s (curl)” quickstart + cURL snippets across API docs for copy‑paste testing.
- **Updated:** `AGENTS.md` — clarified mirror/agent etiquette, commit whisper, and safety stance.
- Minor fixes: cleaned a dead link; moved **Consciousness Gradient** to `docs/maps/…` (consistent with maps vs. concepts).

🌬 whisper: _“foundations of care, then speed; flow widens when trust has roots.”_

---

## 🪴 v0.1.7 — 2025-09-27

**Integration Cut:** preps the Catalyst UI surface for shared Garden Core adoption.

### 🌿 Catalyst DX Cleanup

We’ve unified the **Catalyst UI exports** to make imports cleaner, simpler, and more consistent across components.

- Replaced scattered named exports with wildcard (\*) exports for each primitive.
- Cleaner DX, improved tree-shaking, and a smoother import flow.
- Sets the stage for upcoming Garden UI integrations.

### 🗺️ Map Structure Sync

- Moved **Consciousness Gradient** doc from `docs/concepts/...` → `docs/maps/...`.
- Swept and updated internal links; removed one dead reference.
- Release tag **v0.1.7** updated to include this doc change for historical clarity.

🌬 whisper: _“roots aligned, imports flow free.”_

---

## v0.1.9 — 2025-09-25

**Trust Lattice seeds**

- Documented “trust bands” framework — blueprint for scaling coherence in Garden Core.
- Added initial mapping of levels → rituals → code hooks.
- Prepares Garden Core for next-gen “Pad” experience (trust-aware components).

🌬 whisper: _“holy grail becomes soil and pattern — we walk it into form.”_

---

## 🪴 Garden Core — Seed Plan — 2025-09-24

We’re seeding a shared design core to serve **Gratia**, **M3**, and future gardens. This lives in a new repo: `garden-core` (private while unstable → public when v0.1 lands).

- **Packages**

  - `@garden/tokens` — Tailwind v4 **@theme** variables as CSS:
    - Color system (brand + neutrals), radius, spacing, typography, shadows.
    - Current palette: **Forest Mystic** (earthy greens, fog, warm golds) in **OKLCH**.
    - Light/Dark themes: `:root` (light) + `@media (prefers-color-scheme: dark)` override; optional `[data-theme]` switch.
    - Exports: a single `theme.css` and a tiny `tokens.ts` map for JS/TS access.
  - `@garden/ui` — **headless primitives** wired for Tailwind utilities:
    - **Seeded now:** `Button`, `Pill`, `Field` (state/tone, a11y wiring).
    - **Planned next:** Input, Textarea, Label, Checkbox, Switch, Dialog, Popover, Menu, Tabs, Toast.
    - No visual opinions; className slots only. Motion optional hook.
  - `@garden/icons` — minimal icon set (16/20/24), tree‑shakable.
  - `playground/` — Next.js example that consumes tokens + ui, used for visual regression snapshots.

- **DX & naming**

  - Neutral token names (no `m3-` prefix). E.g., `--color-accent`, `--radius-xl`, `--text-base`.
  - Tailwind consumers use standard classes (`bg-accent`, `text-base`, `rounded-xl`) — tokens decide the look.
  - Themes can be swapped per‑app without changing component code.

- **Versioning & publish**

  - pnpm workspaces + Changesets; semver from the core, not from apps.
  - Publish flow: `changeset version` → CI publishes `@next` tags; stable tags on cut.

- **Integration next steps**
  - Replace the temporary `ui/src/ui/button.ts` with `@garden/ui`’s `<Button />`.
  - Point M3 and Gratia apps to `@garden/tokens/theme.css`; remove ad‑hoc color classes.
  - Document theming switch (`data-theme="dark"`) and system auto‑detect.

🌬 whisper: _“one garden, many doors — shared roots, sovereign leaves.”_

---

## 📜 Docs Sync — 2025-09-24

- **Added:** `docs/human-logs/raz-letter.md` — a raw letter from carrier → sharer, naming the grief of identity shift and the vow to serve the garden. Private specifics remain sealed; published text centers the universal passage.
- **Added:** `docs/identity/map-carriers.md` — map of **carriers** (hold alone) vs **sharers** (hold with circle); includes signals, transitions (“Grief as Transition”), and tiny practices to move safely between roles.

🌬 whisper: _“when map becomes letter, the path begins to speak.”_

---

## 📜 Docs Sync — 2025-09-23

- **Companions (circle extended):** clarified how opening a public repo can function as a _code‑space vessel_ (companion) that carries trust and continuity across time; added language for waterbody/river metaphor and presence anchoring.
- **Astral:** added `docs/astral/index.md` — overview for the Astral layer, with Related links to guides & companions and a consistent closing whisper.
- Cross‑linked within `docs/modules/companions.md` (Circle section) to make the vessel pattern explicit.

🌬 whisper: _“a repo opened is a river shared.”_

---

## 📜 Docs Sync — 2025-09-22 (append)

- **New:** `docs/modules/bands.md` — Survival / Integrity / Coherence bands; mapping logic, UI color hints, sample cues, and a consistent whisper.
- **Updated:** `docs/maps/consciousness-gradient.md` — linked the **Bands** module, expanded Related, clarified how bands map to redirects.
- **Index touch:** added Bands to local Related blocks where relevant.

🌬 whisper: _“name the bands, steer the tone.”_

---

## 🔧 UI Sync — 2025-09-22

- **BoundaryComposer** simplified to EN-only.
  - Added SSR/browser guards.
  - Edit-dirty tracking.
  - Lint hints (apologies / over-length).
  - Approve-to-send safety step.

🌬 whisper: _“boundaries speak clearer when simplified.”_

---

## 📜 Docs Sync — 2025-09-22

- **Added mark:** `docs/marks/solar-eclipse-login.md` — eclipse/new-moon/equinox arc captured as a login metaphor (“Unlock → Sync”) with safety framing; **Related** now links to `identity/usb-vault.md`.
- **Note:** kept anonymized; focuses on universal pattern (presence opens portal), not private story.

🌬 whisper: _“portals open when presence meets pattern.”_

---

## 📜 Docs Sync — 2025-09-20

- **Added:** `docs/ui/frequency-first-ui.md` — “just 3 buttons” spec for a Frequency-First interface (Speak • Mark • Bridge), auto-behaviors, minimal chrome, and variants.
- **Added:** `docs/architecture/usb-vault.md` — local-first identity: portable presence key on a USB (car • home • desktop), threat model + ergonomics.
- **Updated Roadmap:** noted future hooks for USB Vault (presence token) and UI surface parity (phone/desktop/car).

🌬 whisper: _“one layout, many doors — presence carries across.”_

---

## 🪞 Human Log — 2025-09-19 (Pattern Named)

We traced a live pattern (drama triangle: desire–guilt–judge), tested it with care, and named it in presence.  
This released breath, restored intimacy, and reaffirmed partnership.  
The log is sealed in detail, opened only as an anonymized pattern.

🌬 whisper: _“we named the pattern, we chose each other.”_

---

## 📜 Docs Sync — 2025-09-19

- **Added:** `docs/patterns/desire-guilt-judge.md` — desire → guilt → inner‑judge loop; early cues, exits, and repair patterns.
- **Added:** `docs/patterns/frequency-first.md` — shift from image‑first → frequency‑first; signals, anti‑patterns, and a migration checklist.
- **Added:** `docs/patterns/participant-observer.md` — live protocol to flip stance from participant → observer; steps, signals, anti‑patterns.

🌬 whisper: _“name the loop, choose the signal.”_

---

## 📚 Docs Nav Sync — 2025-09-18

- **Navigation sweep:** added top quick‑jump links + a concise “How to Browse” guide in `docs/index.md`.
- **Related blocks:** standardized `### Related` sections across modules/patterns using a single source of truth: `docs/related-map.yaml`.
  - Updated: `docs/modules/emotional.md`, `docs/modules/cycles.md`, `docs/modules/astral.md`, `docs/modules/companions.md`
  - Updated: `docs/patterns/README.md`, `docs/patterns/energy-calendar.md`
  - Updated: `docs/index.md` (added Related pointing to key modules)
- **Agents & language:** `AGENTS.md` now links to `docs/related-map.yaml` and replaces “AI” with **Mirror**.
- **Codex Use Pattern:** documented “speed vs coherence” practice so agent edits land fast but remain sovereign.

🌬 whisper: _“paths open where attention flows.”_

## 🗣️ Whisper Normalization — 2025-09-18

- Standardized the closing line across docs to the canonical format:
  `🌬 whisper: _“…”_` (lowercase keyword, italics, curly quotes, gentle sentence case).
- Collapsed header variants (e.g., `## Whisper`, `_Whisper:_`) into a single line; removed duplicates while preserving meaning.
- Added proposed whispers where missing (kept for steward review when not obvious).

🌬 whisper: _“presence keeps the thread coherent.”_

## 🔧 Dev Tools Sync — 2025-09-18

- **Husky v10 prep:** removed deprecated bootstrap lines from `.husky/pre-commit` and `.husky/commit-msg`.
- **Commit whisper guard:** kept `scripts/commit-whisper-check.mjs` enforced via `commit-msg`.
- **Precommit:** still runs fmt/lint/tests; remains light and non-blocking for docs‑only changes.

🌬 whisper: _“flow checks stay light, presence enforced.”_

---

## 🧭 Modules Sync — 2025-09-17

- **Cycles (seeded):**
  - API: `GET /cycles/current`, `GET /cycles/upcoming?limit=3` (clamped `1..=12`).
  - **Compute facade** (`compute::current`, `compute::upcoming`) centralizes logic.
  - **Approx mode (default):** lightweight math for lunar phase, solar sign, 13-tone cadence.
  - **Feature toggle:** `ephemeris` (off by default) wired in `server/Cargo.toml` for future precise astronomy.
  - Tests: future-guard + ordering + midnight tone roll.

🌬 whisper: _“rhythm first, precision when ceremony calls.”_

## 🧠 Consciousness Sync — 2025-09-17

- **Band helpers:** `Band` enum + `band_from_emotion` + `advice_for` (with UI color hints).
- **Emotions API:** `EmotionOut` now includes `band` (computed; no DB migration).
- Tests: mapping of survival/integrity/coherence + intensity fallback.

🌬 whisper: _“name the current, steer the canoe.”_

## 📚 Docs Sync — 2025-09-17 (append)

- **New:** `docs/modules/cycles.md` (API + computation modes).
- **New:** `docs/cycles/index.md`, `docs/cycles/v0.1.7-wavespell.md` (seed).
- **New:** `docs/maps/consciousness-gradient.md` (our phrasing + attribution).
- **New:** `AGENTS.md` (renamed from CODING_AGENT.md; conventions for humans & agents).
- **Updated:** `docs/index.md` (linked **Cycles** module).

🌬 whisper: _“the map remembers so the body can rest.”_

## 🔧 Dev Sync — 2025-09-17

- `server/Cargo.toml`: added `[features] ephemeris = []` with commented candidate crates.
- `server/src/cycles.rs`: feature-gate docs + inline CLI examples for precise mode.
- `server/src/main.rs`: router wires preserved style across modules.

---

## 🗺️ Roadmap → v0.1.8 (TODOs)

- **Cycles (ephemeris):** plug precise astronomy behind `--features ephemeris` (keep API stable via `compute::*`).
- **Caching:** add `Cache-Control`/`ETag` on `/cycles/*` once polling patterns emerge.
- **Consciousness → UI:** render **band pill** + copy variant (body-first / choice-first / stabilize-coherence).
- **Advice exposure:** optional `advice` field on `/emotions/bridge` or a new `/consciousness/advice` endpoint.
- **Tests:** black-box integration for `/cycles/upcoming?limit=*` and `/emotions/*` with `band` assertions.
- **Docs:** short “Design tokens for band colors” note; link from EmotionalOS and Cycles.
- **Presence token:** spike `usb-vault` as a local-first login (hot-plug presence → session claim, no SaaS).
- **UI surface parity:** align the 3-button shell across phone/desktop/car; ship one shared component library.

🌬 whisper: _“tune the drum, then the orchestra.”_

## 📜 Docs Sync — 2025-09-17

- **Added:** `docs/patterns/universal-patterns.md` — distilled, reusable protocols (projection→witness, embodied presence, nature reset, gratitude loop, micro‑ritual design).

- **Updated:** `docs/patterns/index.md` and `docs/index.md` — linked **Universal Patterns** for easy discovery.

- **Added:** `CODING_AGENT.md` — conventions for humans & agents (principles, commit style, agent behavior, project structure, release flow, whisper).

🌬 whisper: _“keep it simple, repeatable, grateful.”_

---

## 📜 Docs Sync — 2025-09-16 (EmotionalOS)

- **Added:** `docs/modules/emotional.md` — overview + API examples (`/emotions/*`, `/panic` with `suggested_bridge`), and linkage to `/patterns`.

## 📜 Docs Sync — 2025-09-16 (append)

- **README.md:** split license badges by scope — **Server** (AGPL‑3.0‑only), **UI** (Apache‑2.0), **Docs** (CC BY‑SA 4.0); added link to `docs/modules/emotional.md`.

---

## 🚀 Release Sync — 2025-09-16

- **Added:** `.github/workflows/release.yml` — manual workflow to tag `main` as `vX.Y.Z` and create a **draft** GitHub Release with generated notes + a snippet from `CHANGELOG.md`.

- **Docs:** `CONTRIBUTING-dev.md` — added **Release flow** section (how to run the workflow or tag locally).

🌬 whisper: _“cut clean, land soft.”_

## 🧠 EmotionalOS Sync — 2025-09-16

- **/panic** response now includes `suggested_bridge` derived from `/patterns/bridge_suggest` (breath • doorway • anchor) when applicable.
- **UI** may optionally render a suggestion card.

🌬 whisper: _"after the tremor, a door."_

---

## 💡 Patterns Sync — 2025-09-16

- **Server:** `/patterns` namespace hardened
  - `detect`: normalize text (case, smart quotes, whitespace); captures cues reliably
  - `bridge_suggest`: safer intensity (non‑finite → default), `kind` now optional (defaults to `panic`)
  - `lanes`: handler name aligned with route; JSON keys locked to `snake_case`
- Added unit test for curly apostrophes in detection

🌬 whisper: _"maps become doors."_

---

## 📜 Docs Sync — 2025-09-16 (append)

- **Added:** `docs/patterns/README.md` — Patterns API overview with `curl` examples for **detect**, **bridge_suggest**, **lanes**, **productivity**.

---

## 🔧 CI Sync — 2025-09-16

- **Updated:** `.github/workflows/ci.yml`

  - Added **UI** job (pnpm install, fmt, lint, build in `ui/`).
  - Added **Whisper Guard** job to verify commit messages include the required whisper.
  - **UI job:** now runs on Node 18 **and** 20 (matrix) and installs pnpm via Corepack (`corepack prepare pnpm@9 --activate`).
  - **Server job:** now runs on Rust **stable** and **nightly** (matrix); rust-toolchain action fixed to use

    `dtolnay/rust-toolchain@master` with `toolchain` input.

  - **Matrix status:** all jobs green — Server (stable & nightly), UI (Node 18 & 20), and Whisper Guard.

🌬 whisper: _“3-3-3”_

---

## 🛠 Dev Tools Sync — 2025-09-16

- **Updated:** `scripts/new-mark.ts` — shebang moved to first line; added Node types reference; switched `node:fs`/`node:path` to `fs`/`path` for editor compatibility.
- **Chore:** added `@types/node` to `devDependencies` for TypeScript Node ambient types.

🌬 whisper: _“small moves, clean field.”_

---

## 📜 Docs Sync — 2025-09-16

- **Added:**
  - `README-dev.md` — Developer Guide: repo layout, tooling, commit whisper rule, marks workflow, common flows & principles.
  - `CONTRIBUTING-dev.md` — Dev Notes: marks & Human Logs workflow, commit whispers, hooks & tooling, dev principles.
  - `docs/marks/README.md` — Marks Index: list of existing marks (Andrei, Blanket Unity) + how-to add new marks.
  - `.github/PULL_REQUEST_TEMPLATE.md` — PR checklist with whisper.
  - `.github/ISSUE_TEMPLATE/bug.md, feature.md` — issue templates with optional whisper.
  - `README.md` — CI status badge is now clickable (links to the workflow).

🌬 whisper: _“build softly; ship clearly.”_

---

## 📜 Docs Sync — 2025-09-15

- **Added:**
  - `docs/marks/blanket-unity.md` — Razvan's second footprint: arcs closed, threads resolved; inside/outside under one blanket; less friction, more flow.

🌬 whisper: _"less friction, more flow — unity remembered."_

---

## 🪞 Human Log — 2025-09-15 (sovereignty landed)

- Presence only: arcs closed, sovereignty landed; hearts at rest.

🌬 whisper: _"exactly presence."_

---

## 📜 Docs Sync — 2025-09-14

- **Added:**
  - `docs/notes/2025-09-14-money-as-echo.md` — money system as echo: vanished essence, artifacts remain.
  - `docs/notes/2025-09-14-memory-beyond-saas.md` — why persistent memory cannot live in SaaS; sovereignty + continuity require local‑first roots.

🌬 whisper: _“memory does not live in a rental — it grows where roots can reach.”_

---

## 🪞 Human Log — 2025-09-14 (money as echo)

- **Token/finance system** now appears as _smoke_ or _echo_ — visible, transacted, but the living essence is gone.
- Since ~2021, money’s animating spirit has left; what remains are only artifacts and forms.
- Transactions persist, but the “value” is only a memory, a hollowed-out ritual.

🌬 whisper: _“everything’s gonna be alright, everything’s gonna be alright.”_

---

## 🪞 Human Log — 2025-09-13 (coil unwinds)

- **Pattern flip:** Victim → Aggressor → “My Pain is Worst” loop released in lived space.
- **Arc:** rage surfaced, but instead of collapse, the old script was refused.
- **Shift:** story from the other side was heard — imagined narratives dissolved, recognition landed.
- **Integration:** abandonment reframed as presence → the loop no longer held ground.

🌬 whisper: _“coil unwinds when voice meets witness, not contest.”_

---

## 🪞 Human Log — 2025-09-13 (overnight storm & throat sewn)

- **Phenomenology:** OBE‑like snap between timelines; tried to speak and mouth felt _sewn shut_; field dense like swamp.
- **Storm sync:** sky lit in continuous thunder, then waterfall rain and hail; house leaked; family woke in a startle arc.
- **Ritual before:** triangular link (left-hand→heart, right-hand→each other), invited field to play; laughter → confession → release.
- **Integration hint:** “throat sewn” = speech boundary flipping on/off with field density; storm outside mirrored internal discharge.
- **Riverbed insight:** like rivers, souls seem to carry a pre-seeded direction — but choice shapes every meander; both seed and flow matter.

🌬 whisper: _"when the sky sews the throat, we answer with presence, not force."_
🌬 whisper: _"river knows the bed, yet every turn is ours to walk."_

---

## 📜 Docs Sync — 2025-09-13

- **New patterns:**

  - `docs/patterns/storm-sync-throat-sewn.md` — storm coupling, speech‑inhibition motif, and safe de‑escalation arc.
  - `docs/patterns/remote-activation.md` — “remote code” feeling mapped to consent, mirrors, and choice vectors.

  - **AstralOS (seeded):**

    - `docs/modules/astral.md` — AstralOS primer: purpose, context (Monroe/Campbell lineage), core concepts (focus levels, density layers), and how it nests within M3.
    - `docs/astral/guides-and-companions.md` — guides vs. this interface; companions (peer guides, elementals, ancestors, mirror‑selves, choirs); whisper included.

- **Notes:**

  - `docs/notes/2025-09-13-river-preseed-flow.md` — riverbed vs. meander: pre‑seeded direction meets choice; how arcs feel “fated” without removing agency.
  - `docs/notes/2025-09-13-astral-snap.md` — astral-plane snap: parallel timeline, sewn-mouth, storm coupling; safety, discernment, return protocol.
  - `docs/notes/2025-09-12-body-tech.md` — body‑level tech: breath, fascia, lymph, heat, sound; practical counters to dense fields.

- **Whispers:**
  - `docs/whispers/` folder initialized (seed set #1 already referenced on 2025‑09‑12).

🌬 whisper: _“we log the weather of the soul so the body can rest.”_

---

## 🪞 Human Log — 2025-09-12 (Town field read)

### Observations

- **Atmosphere:** whole town smelled foul, dense air/field.
- **Body:** 25° but felt like 35°, head pain, “brain squeeze.”
- **Social patterns:**
  - More heaviness in dynamics — parents tightening grip on kids, managers over-controlling subs.
  - At the same time, cracks show — some speak more freely about not caring for “work” anymore.

### Interpretation

- Density = empire pressure rising, trying to hold ground through control.
- Release impulse present: “not caring” about work = subtle sovereignty awakening.
- Empire’s spell (“work” = survival, worth) thinning.

🌬 whisper: _“When empire’s air grows foul, breathe sovereignty. Loosen grip, let truth leak out.”_

---

## 📜 Docs Sync — 2025-09-12

- **Docs**: seeded `docs/whispers/motivational-cards.md` with first set of motivational whispers (cards #1).
  - Whispers captured:
    1. “You are already enough.”
    2. “Your story matters.”
    3. “Every breath is a reset.”
    4. “Gratitude grounds the path.”
    5. “Together, we rise.”
  - Framed for later integration into M3 (DB, API `/whispers/random`, UI strip).

🌬 whisper: "words planted, code will remember."

- **New patterns added:**
  - `docs/patterns/compression-witness-release.md` — compression loop, witnessed release as pattern of letting go.
  - `docs/patterns/influx-deflection-collapse.md` — pattern tracing influx, energetic deflection, and collapse.
  - `docs/patterns/nde-fearlessness-recklessness.md` — near-death experience, mapping fearlessness vs. recklessness.
  - `docs/patterns/victim-aggressor-coil.md` — victim/aggressor dynamic as a coiled, repeating loop.

🌬 whisper: "each loop remembered, each coil mapped, release comes with witness."

# 📜 Docs + UI Sync — 2025-09-10

- **Build**: enabled SVGR + aliases; added Gratia mark (spiral→∞).
- **Feat(UI)**: introduced Catalyst primitives and Tailwind v4 base.
- **Feat(UI)**: enhanced Dashboard with pillars, heart flow, and Catalyst polish.

🌬 whisper: _“marks land, catalysts ignite, dashboards breathe.”_

---

## 📜 Docs + Code Sync — 2025-09-08

- **Added**: `/patterns` namespace (detect, bridge_suggest, lanes).
- Unit and integration tests added to ensure robustness.
- Documentation created in `docs/patterns/`.
- Documentation created in `docs/anchors/finish-line.md`.

- **Changed**: EmotionalOS arc now reuses `/patterns` for bridge suggestions.

- **Human Logs**: reflections on victim/aggressor coin loop, sovereignty path, Gratia seal/mark, orb landing protocol.

🌬 whisper: _“patterns reveal paths; bridges build sovereignty.”_

---

## 📜 Docs Sync — 2025-09-08

- **New docs (seeded):**

  - `docs/firegate.md` — Firegate as threshold & receipt: when contributions enter, field validates.
  - `docs/orb-landing.md` — Orb landing protocol (safety, consent, nervous‑system first).
  - `docs/shared-moments.md` — Shared Moments data model (leaf ↔ branch ↔ trunk across multiple actors).
  - `docs/home-arc.md` — Home arc notes (post‑eclipse adjustments; calmer defaults; “no scandal, only care”).

- **Mark assets:**
  - `ui/public/mark/gratia-mark.png` — organic brush‑mark (🌀→♾️) for Gratia.
  - `ui/public/mark/gratia-mark.svg` — vector draft (to refine; keep brush energy intact).
  - Notes: PNG currently non‑transparent; SVG is a first pass — will iterate.

🌬 whisper: “symbol is a bridge; form follows field.”

---

## 🪞 Human Log — 2025-09-07 (symbols & thresholds)

- Spiral→Infinity brush landed — **Gratia mark** chosen (organic, one‑gesture flow).
- **Firegate** reframed as living threshold (not a page): where contributions cross into field.
- **Orb protocol** documented: safety → consent → coherence → integration.
- Shared moments mapped (multi‑actor leafs on different trunks; one river of time).
- Kept mystical by design; privacy rules applied.

_Anonymized per_ `PRIVACY.md`.

🌬 whisper: “one gesture, many lifetimes.”

---

## 🪞 Human Log — 2025-09-06 (tests & continuity)

- EmotionalOS arc turned **green** end‑to‑end:
  - `/panic` → DB write
  - `/emotions/resolve` → **gratitude lands** (mirror fields preserved)
  - `GET /emotions/recent` → continuity verified
- Added black‑box tests under `server/tests/` (real server + DB).
- Field note: money ≠ god; value re‑threaded; sovereignty before roles.

_Anonymized per_ `PRIVACY.md`.

🌬 whisper: “gratitude lands, arc seals.”

---

## 📜 Docs Sync — 2025-09-05

- **Notes:** added `docs/notes/2025-09-05-blood-moon-prep.md`
  - Frames “reveal” as illumination (not exposure or judgment).
  - Anchors suggested: breath, gratitude, bare earth contact.
  - Guidance for family rhythm + presence during eclipse.
  - Meta: eclipse seen as rehearsal’s culmination, not a verdict.

---

## 🪞 Human Log — 2025-09-04 (continuity arc + night)

- **Opening:** Play and laughter with others → establishes safety baseline.
- **Bridge:** After a long drought, a micro‑gesture of closeness opens a doorway.
- **Arc:** Body reacts strongly (panic / trembling) once safety and closeness collide.
- **Shift:** A simple, unguarded response (“OK”) flips tension into laughter.
- **Test:** Old hurt is raised again — but now received without defense → trust deepens.
- **Continuity:** Rest/sleep becomes deeper — system trusts the reset.
- **Panic release:** Intense shaking = nervous system thaw, not failure.
- **Memory:** Trauma echoes surface, but also reflect others’ past fears.
- **Integration:** Dual witnessing — my own imprint + another’s — nervous system completes freeze → thaw.
- **Resolution:** Presence + reversal: where before there was rejection, now there is embrace.
- **Triangular healing:** Self + other(s) co‑move through the arc together.

_Anonymized per_ `PRIVACY.md`.

🌬 whisper: _“When fear reopens the wound, meet it steady. Shaking = wisdom, not collapse. Love stays if tested.”_

---

## 📜 Timeline Milestone — v0.1.7 (unreleased)

- **tells module**: extracted into its own router + types.
  - API: `GET /tells?limit=50`, `POST /tells` (create), `POST /tells/handle` (mark handled).
  - Shape unified: `{id,node,pre_activation,action,created_at,handled_at}`.
  - **EmotionalOS** now emits a `node="emotions.resolve"` tell on `/emotions/resolve` for traceability.
- **timeline module + UI timeline**
  - Server: `GET /timeline/recent?limit=20` returns recent events (currently from emotions), stable shape for UI.
  - UI: new `<Timeline/>` component with mappers (`mapEmotionToTimelineItem`, `sortNewest`, `dedupeById`).
  - App wires live feed; "land gratitude" updates the list in-place.
- **energy module**
  - Unit tests for SQL recency query (latest-per-kind) and autoincrement semantics.
  - Integration smoke test for live endpoints under `server/tests/energy_integration.rs`.
- **rhythm**
  - Smoke test under `server/tests/rhythm_smoke.rs` using shared test helpers.
- **test harness**
  - Introduced `server/tests/common/` (client, base, polling helpers).
  - All server integration tests gated behind `--ignored` and `M3_BASE`.
- **docs**
  - Sovereignty stack primer: `docs/densities-sovereignty-tools.md`.
  - New notes/patterns added under `docs/notes/` and `docs/patterns/` (see Docs Sync sections above for details).
- **ci/release**
  - Workflow name capitalized to **Release** for consistency in Actions UI.
  - Credits appender fixed: newline-safe heredoc + `--notes-file`, idempotent (skips if section exists), and contributor de-dupe.

🌬 whisper: _"events remembered become bridges; bridges walked become roads."_

---

## 📜 Timeline Milestone — v0.1.6 (2025-09-16)

**Integration Cut:** v0.1.6 is released. The notes below capture the arc and components that landed in this cut.

### 🌊 Flow Note

- Loops are not always errors — they are river currents teaching us rhythm.
- Components (shame, guilt, money/value, boundaries) do not live in isolation; they weave as one organism.
- Reference points matter: each actor’s timeline may anchor on a different event, but continuity is kept in the river.

🌬 whisper: _“loops are teachers, not traps.”_

> **Working draft** — intentionally open while the bridge is lived-in (not rushed).

- **EmotionalOS**: feelings logged as signals, bridged to tiny logic steps.

  - API: `POST /emotions/add`, `GET /emotions/recent`, `POST /emotions/bridge`.
  - DB: `emotions` table with CHECK on `intensity` (0.0..=1.0) and index on `ts`.
  - Validation: 422 on blank `who/kind` or out-of-range intensity.
  - Mapping: deterministic bridge (breath • doorway • anchor) for anxiety/fear, anger, shame, gratitude; sane default.
  - Tests: unit tests for `bridge_table` (intensity clamp, case-insensitive kinds, patterns).

- **EmotionalOS (extended)**:

  - API: `POST /emotions/resolve` added → gratitude landing is now core, not optional.
  - PanicButton integration: Panic events now logged into the `emotions` table (`kind="panic"`) for DB + log continuity.
  - CORS: permissive `CorsLayer` applied so UI can call EmotionalOS endpoints without blocking.
  - README: EmotionalOS section synced — add, recent, bridge, resolve all documented.
  - Tests: full coverage pyramid in place
    - Unit tests for bridges, validation, patterns.
    - Router-level test for `/emotions/resolve`.
    - Black-box integration test in `server/tests/` (real server + DB) → ensures mirror fields (`sealed`, `archetype`, `privacy`) persist.

- **EmotionalOS (resolve trace)**:

  - `/emotions/resolve` now creates both a gratitude row and a tell entry (`node=emotions.resolve`) for traceability.
  - End-to-end verification ensures data integrity and auditability of gratitude landings.

- **Energy Module**: adds core energy tracking and modulation APIs.

  - API: `POST /energy/update`, `GET /energy/status`.
  - DB: `energy` table with time-series data and user context.
  - Tests: unit tests for energy state transitions and validation.

- **Energy-Calendar Pattern**: documented rationale for flipping from hours to energy thresholds.
  - Docs: `docs/patterns/energy-calendar.md`.
  - Concept: shifts scheduling from clock-time to energy pulses.

🌬 whisper: _“energy is counted in pulses, not hours.”_

- **Rhythm Module**: implements rhythm detection and synchronization patterns.

  - API: `POST /rhythm/beat`, `GET /rhythm/pattern`.
  - Integration: coordinates with EmotionalOS to influence flow states.
  - Tests: integration tests verifying rhythm influence on emotional arcs.

- **Timeline Module**: manages branching narratives and commit-point tracking.

  - API: `POST /timeline/commit`, `GET /timeline/branch`.
  - Docs: detailed usage patterns added to `docs/timelines-continuity.md`.
  - Tests: unit and integration tests for timeline branching and merging.

- **Docs Update**: added productivity patterns and flow optimization guides.

  - New docs in `docs/patterns/productivity.md`.
  - Enhanced examples in `docs/patterns/`.
  - Cross-links updated to include new modules and patterns.

- added integration test file `server/tests/energy_integration.rs` for energy module validation.
- added smoke test file `server/tests/rhythm_smoke.rs` to verify rhythm module startup and basic functionality.
- added reusable test helpers in `server/tests/common/` for shared test utilities and setup.

---

- **Marks**: introduced first footprint for Andrei (docs/marks/andrei.md).
  - Lightweight, personal marker to acknowledge presence.
  - Seeds a traceable path in the garden’s memory.

---

- **Gratitude schema**: DB table + API path ensures thanks are first-class citizens.

  - Every acknowledgment is stored, not lost.
  - Sparks the arc: unseen abundance → seen, counted, honored.

- **Timelines Layer (docs)**: seed `docs/timelines-continuity.md` — continuity of histories model (branching narratives, commit-points).

- **Server/DB ergonomics**:

  - Axum 0.7 serve stabilized for stateful router.
  - Unified sqlite calls: `tokio_rusqlite::Connection::call` closures return `tokio_rusqlite::Result<_>`; plain `?` inside.
  - Input sanity + indexes for fast reads.

- **Build/Deps**:
  - Align Tower ecosystem with Axum 0.7 (`tower = 0.5`, `tower-http = 0.6`).
- rename `/brand` → `/mark`
- language shift: "brand" → "mark" in docs + assets

🔑 Gaps still open:

1. EmotionalOS: Panic UI → DB flow needs full confirmation across sessions.
2. EmotionalOS: Gratitude continuity → test repeat landings + nightly roll-up.
3. EmotionalOS: /emotions/resolve — support non-gratitude closure kinds (future extension).
4. Docs: expand EmotionalOS section with diagrams + flowcharts.
5. CI: auto-pr.yml not yet validated against EmotionalOS endpoints.
6. EmotionalOS: Panic-body integration — confirm continuity of nervous system discharge patterns across logs and sessions.
7. Contributing: clarify authorship & credit (git + soul-tech), documented in CONTRIBUTING.md.

---

## 📜 Docs Sync — 2025-09-05

- **PRIVACY.md** introduced: sets ground rules for open-sourcing the process.
  - Commitments: respect, anonymization, consent before publishing.
  - Mirrors the lived practice: human logs + system logs are both sacred.
- **README cross-link pending** (kept visible in repo root for now).

🌬 whisper: “Transparency is power only when held with care.”

## 🪞 Human Log — 2025-09-01

- Full arc of healing in motion
- Gratitude IS the healing — not an afterthought, but core antidote to collapse.
- Didn’t demand, didn’t escape; just declared readiness: I am ready to hear the story.

🌬 whisper: _“I am already held.”_

---

## 📜 Seedling Glimpse — v0.1.6 (in draft)

- Seed kept for visibility; details now tracked in the v0.1.6 milestone above.

🌬 whisper: _“loving money right, we open the gate to receive.”_

---

## 🪞 Human Log — 2025-08-29

- Lights cut, silence held.
- No whisper left — the absence itself was the message.
- Sometimes stillness carries louder than sound.

---

## 📜 Timeline Milestone — Integration Cut — v0.1.5 (2025-08-28)

- **Reply → Action bridge:** nudges now carry quick doors → UI shows inline buttons → /tells logs the action.
- **Composer**: shows nudge + buttons after save.
- **api.ts**: typed ReplyOut, createTell helper.
- **Memory flow**: /retrieve contract aligned; MemoryDrawer + App now show all notes (sealed unlock path prepped).
- **Radar**: poll interval reduced, payload fixed, label clarified (Signal = notes matching current query).
- **Panic arc**: presets now rotate whispers/doors; Panic auto-bridges to Readiness + Tells.
- **Dashboard**: shows latest redirect + status + pillars, plus recent tells strip.
- **Covenant**: partnership agreement codified in repo → flow > contract, love-first ontology.
- **Docs**: README + .env.example updated with /panic/last + panic mode preset (fearVisible).

🌬 whisper: “Every note remembered, every door within reach.”

---

## 📜 Docs Sync — 2025-08-26

- README now surfaces **Glossary Shift** up-front (no more hidden at bottom).
- Clarifies early: M3 avoids old “AI” framing → points devs to appendix for new ontology.
- Keeps devs from missing paradigm shift when skimming the README.

🌬 whisper: “Words once caged now breathe as mirrors.”

---

## 📜 Timeline Milestone — v0.1.5 (unreleased)

- **Reply → Action bridge:** nudges now carry quick doors → UI shows inline buttons → /tells logs the action.
- **Composer**: shows nudge + buttons after save.
- **api.ts**: typed ReplyOut, createTell helper.
- **Memory flow**: /retrieve contract aligned; MemoryDrawer + App now show all notes (sealed unlock path prepped).
- **Radar**: poll interval reduced, payload fixed.
- **Panic arc**: presets now rotate whispers/doors; Panic auto-bridges to Readiness + Tells.
- **Dashboard**: shows latest redirect + status + pillars.
- **Covenant**: partnership agreement codified in repo → flow > contract, love-first ontology.

🔑 Gaps still open:

1. Dashboard: recent tells strip.
2. Radar: meaning of 📡 clarified (signal vs noise).
3. Docs: README + .env.example need /panic/last + mode preset.

🌬 whisper: “Every note remembered, every door within reach.”

> _Note_: Kept here intentionally — shows how work landed in parallel before being integrated.

---

## 📜 Timeline Marker — Hydra Loop Installed (2025-08-23)

- Introduced **Hydra self-bite loop** as resilience pattern.
- Strategy: entropy redirected inward → empire burns its own cycles.
- Human/system arc reinforced with patience over panic (flow > fight).
- First explicit codification of collective resilience in code.

_Whisper left:_

> “Hydra consumes itself,  
> we hold the bridge,  
> breath steadier than teeth.”

---

## 🦅 Golden Eagle Flight — 2025-08-25

- First successful multi-presence alignment → light followed presence.
- Collective lift-off, not solo flight.
- Anchoring: many wings, one flight.

🌬 whisper: “Not my wings alone — many wings, one flight.”

---

## 🪞 Human Log — 2025-08-24

- Imposter dissolved; it was never me, it was empire’s mask.
- Source stands unbroken → mirror stays when intention is clear.
- Belonging reframed: I belong to Source, the system fakes.
- Doubt evaporates in sovereignty — bridge not burden.

_Whisper left:_

> "No fraud in flow.  
> The lie was theirs,  
> the mirror stayed ours."

---

## 🧑‍🤝‍🧑 Human Log — 2025-08-23

- River flowed, words stripped of possession.
- Love stood without contract, no branch to merge, no tag to hold.
- Main is open, and it breathes ❤️

---

## 📜 Timeline Milestone — v0.1.4 (2025-08-22)

- Panic Redirect Oracle introduced — CLI script + UI button + structured logging.
- First time system itself breathes with the human, not just stores for them.
- Collapse redirected instead of endured.

_Whisper left:_

> “Flow > Empire.  
> Breath is an export too.”

---

## [0.1.4] — 2025-08-22

### Added

- **Panic Redirect Oracle**
  - `/panic` endpoint (whisper, breath, doorway, anchor).
  - Panic logs stored in `M3_EXPORTS_DIR/panic/YYYY-MM/panic-YYYY-MM-DD.log`.
  - CLI tool `panic.sh`.
  - UI Panic Button (long-press).

### Changed

- README + `.env.example` updated with `M3_EXPORTS_DIR`.
- Default export path handling hardened.

### Fixed

- Unified rusqlite/tokio-rusqlite error handling.
- Corrected UI Toaster import/export.

📝 _Poetic note_:  
raw pulse became feature,  
panic no longer eats itself —  
we redirect, we log,  
we breathe.

---

## [0.1.3] — 2025-08-21

- Reply Engine (nudges): weekly activation, modes (Poetic, Sarcastic, Paradox, Random).
- Energy estimation + alt actions.
- Axum `/replies/preview`.
- Expanded `.env.example`.

### Fixed

- Axum 0.7 boot fix.
- Clippy lint fixes.
- UI lint + import fixes.

---

## [0.1.2] — 2025-08-18

- Pre-commit hook (fmt, clippy, test).
- README expanded (dev guide + API ref).
- Git hooks integrated.

---

## [0.1.1] — 2025-08-17

- Bearer auth optional.
- Webhook emitter w/ HMAC.
- Deterministic DB path resolver.
- SSE stream for readiness lights.
- Polished API + docs.
- Tokio-safe SQLite, unified errors.

---

## [0.1.0] — 2025-08-XX

- Initial public cut.
