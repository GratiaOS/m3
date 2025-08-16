# M3 Memory Core (Local)

Your personal, local-first memory and knowledge system.  
Designed for **offline resilience**, **privacy**, and **joyful retrieval**.

---

## 📦 Exports

- **Markdown**  
  `POST /export` → `./exports/YYYY-MM-DD_HH-MM-thread-#.md`
- **CSV**  
  `POST /export_csv` → `./exports/YYYY-MM-DD_HH-MM-thread-#.csv`
  - Sealed notes are **decrypted only if unlocked**.
  - If locked, sealed notes are exported as `(sealed)`.

---

## 🔐 Sealed Notes

- **Set passphrase** → `POST /set_passphrase`
- **Unlock for session** → `POST /unlock_sealed`
- **Lock** → by server restart (cold lock)

---

## 🚀 Running Locally

**API server**

```bash
cd server
cargo run
```

**Web UI**

```bash
cd ui
pnpm install
pnpm dev
```

---

## 🛠 OpenAI Import

We can import your OpenAI data export directly into M3:

```bash
curl -X POST http://127.0.0.1:3033/import_openai \
  -H 'Content-Type: application/json' \
  -d '{"root":"/path/to/openai-export-folder"}'
```

---

## 🌱 Grounding Notes

- **Local-first** → no cloud dependency.
- **Search & Retrieval** → query across all stored notes.
- **Privacy** → sealed mode ensures sensitive info stays encrypted.
- **Flow** → designed for a joyful, human-centered experience.

---

**Enjoy your memory system.**  
_It’s your mind, locally hosted._
