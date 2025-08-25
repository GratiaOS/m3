# Quickstart

Welcome aboard. In a few steps, you’ll have **M3** running locally — memory awake, ready to listen.

---

## 1. Clone & enter

```bash
git clone https://github.com/GratiaOS/m3.git
cd m3
```

## 2. Server setup

```bash
cd server
cp .env.example .env
cargo run
```

- Default bind: 127.0.0.1:3033
- Logs appear in server/exports

## 3. UI setup

```bash
cd ui
cp .env.example .env
pnpm install
pnpm dev
```

- Default UI: http://127.0.0.1:5173

## 4. Visit & Features

- **API** → http://127.0.0.1:3033
- **UI** → http://127.0.0.1:5173

### Key Features

- **Composer** → Write notes into memory (`/ingest`).
- **Reply Engine** → Nudges with poetic/sarcastic/paradox doors.
- **Panic Button** → Long-press to log a redirect (`/panic`) + auto-bridge to readiness & tells.
- **Dashboard** → Team energy view: readiness lights, pillars, last redirect summary.

---

🌬️ whisper: _“Your memory is now awake, local-first, awaiting your story.”_
