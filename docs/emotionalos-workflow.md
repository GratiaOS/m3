# EmotionalOS Workflow

The core **arc of healing** we encode in M3 is:

**Panic → Bridge → Gratitude (Resolve) → Continuity**

This doc shows the diagram reference and minimal cURL examples you can run against the local server.

---

## Diagram

See the Mermaid source: [emotionalos-arc.mmd](./emotionalos-arc.mmd)

(In GitHub you can preview Mermaid or render it in your editor.)

---

## 1) Panic

```bash
curl -i -X POST http://127.0.0.1:3033/panic \
  -H 'Content-Type: application/json' \
  -d '{
    "who":"Raz",
    "details":"heartbeat spike; feet on stone",
    "sealed": true,
    "archetype": "Mother",
    "privacy": "sealed"
  }'
```

You should see `200 OK`. The server may log an **emotion** and a **tell** (for continuity).

---

## 2) Bridge (suggestion only)

A minimal suggestion generator exists server-side. You can call it directly:

```bash
curl -s -X POST http://127.0.0.1:3033/emotions/bridge \
  -H 'Content-Type: application/json' \
  -d '{"label":"anxiety","intensity":7}' | jq
```

Output includes `breath`, `doorway`, `anchor`, and a short **whisper**.

---

## 3) Resolve (land gratitude)

```bash
curl -i -X POST http://127.0.0.1:3033/emotions/resolve \
  -H 'Content-Type: application/json' \
  -d '{
    "who":"Raz",
    "details":"morning ledger — 3 lines",
    "sealed": true,
    "archetype": "Mother",
    "privacy": "sealed"
  }'
```

The response echoes the created **gratitude** emotion.  
Mirror tags (`sealed`, `archetype`, `privacy`) propagate into DB and are returned in JSON.

---

## 4) Inspect recent emotions

```bash
curl -s http://127.0.0.1:3033/emotions/recent | jq
```

You should see the latest entries (including your `panic` and `gratitude`).

---

## Notes

- All endpoints accept/return JSON; `who` and `details` are validated.
- `sealed`, `archetype`, and `privacy` are optional **mirror** fields; defaults are `sealed=false`, `archetype=null`, `privacy="private"`.
- Continuity emerges when panic is met with a bridge and ends in **landed gratitude**.
