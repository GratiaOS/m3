# Offline Mode — Garden Stack v1.0

Offline Mode lets a Garden Node run when the external network is unavailable, unstable, or intentionally disconnected.  
This guide describes **what works**, **what degrades**, and **how to operate safely** when running fully or partially offline.

---

## 1. Why Offline Mode Exists

Garden Stack is built for humans first.  
Connectivity shouldn’t define safety, clarity, or presence.  
Offline Mode ensures:

- Field Reading continues to work
- Local memory pads remain accessible
- Value + Emotional modules stay available
- Private notes stay sealed
- Your Garden Node does not “break” when the internet disappears

---

## 2. What Works Fully Offline

### ✅ Core Layer (Local)

- Scene engine
- Pads (Memory Pad, Energy Pad, Numbers Pad, Town Presence, Gratitude Tokens, etc.)
- Hotkeys + rhythm navigation
- Local UI components
- Offline sealed notes
- USB Vault (if mounted)
- Field Reading (local classifier + patterns)

These depend only on local compute and are stable regardless of connection.

---

## 3. What Degrades Gracefully

### ⚠️ Pattern Engine (AI)

The Pattern Engine switches to “low-intelligence mode” when offline:

- No external LLM calls
- Garden Interpreter falls back to:
  - internal rule-based classifier
  - emotional heuristics
  - cached interpretations (when available)

Outputs become:

- shorter
- more symbolic
- less conversational
- still _meaning-valid_ inside the Garden paradigm

### ⚠️ Presence Trace

Presence Trace will continue to capture:

- local gestures
- movements
- timing
- numbers
- transitions

…but will not sync to cloud backup.

---

## 4. What Does Not Work Offline

### ❌ Cloud-backed memory sync

(No remote vault replication yet.)

### ❌ Remote collaboration

Live pads, shared scenes, and co‑presence require a connection.

### ❌ Shopify Presence Node

All Shopify API calls require connectivity.

---

## 5. Offline Safety Model

Garden Stack protects user data even when the network is hostile.

### 🔒 5.1 Local‑Only Notes

All sealed notes (encrypted local blobs) remain sealed.  
Offline mode never attempts cloud push.

### 🔒 5.2 No Startup Freeze

If the network is down, the app:

- bypasses remote login
- bypasses telemetry
- boots directly into the local node

### 🔒 5.3 Cached Keys

If the user authenticated before, the key cache allows offline use without re‑auth.

---

## 6. Offline Protocol (User Behavior)

When the device goes offline:

1. **Accept**: the Garden switches to offline banner mode
2. **Continue**: all pads remain usable
3. **Interpret**: symbolics may increase; this is normal
4. **Avoid**: expecting long-form AI conversations
5. **Return**: reconnect when ready; sync resumes

---

## 7. Developer Notes

### 7.1 Detecting Offline State

Offline state is emitted via:

```
uiSignals.networkStatus
```

Values:

- `online`
- `offline`
- `unstable`

### 7.2 Fallback Strategy

If `offline → true`:

- patternEngine = localInterpreter
- presenceTraceStore → localOnly
- gardenBroadcaster → no‑op

### 7.3 Testing Offline Mode

```
pnpm dev --offline
```

or OS‑level disconnect (recommended).

---

## 8. Roadmap

### v1.1

- Delta sync engine
- Encrypted offline bundles
- Local AI micro‑models for edge interpretation

### v1.2

- Multi‑device offline mesh
- USB‑first Garden Keys
- Presence Trace replay engine

---

## 9. Philosophy (Why Offline Matters)

Garden Stack is built for:

- valleys with no signal
- mountain roads
- forest nodes
- airports
- nights of introspection
- days when the world goes quiet

The Garden should always open.  
Regardless of network.  
Regardless of noise.

---

**Offline Mode is not a fallback.  
It is part of the design.**
