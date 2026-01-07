# Relational Webhooks (Draft Spec)

Purpose: send care-oriented signals as invitations, not alerts.
Intent is human; security is technical.

## Scope

This spec defines how relational signals are shaped and handled, not where they run.

- Works for:

  - internal M3 event flows (between services/modules)
  - outbound webhooks to external systems (Slack, email, custom receivers)
  - human-facing relays (DMs, care bots, private channels)

- M3 can act as:

  - emitter (produces panic.ui / status.set)
  - router (applies consent + audience rules)
  - receiver (translates events into human invitations and sends care.ack / care.done)

- Not intended for:
  - incident escalation systems
  - monitoring/alerting pipelines
  - fully automated actions on people

Principle: never automate power. Only automate invitations.

## Envelope (all events)

```json
{
  "id": "evt_01JH6Y8K9Q2F7R5X3T",
  "type": "panic.ui",
  "ts": "2026-01-07T10:12:00Z",

  "actor": { "id": "raz", "display": "Raz" },

  "audience": {
    "groups": ["care-circle"],
    "targets": ["user:ana", "user:codex"]
  },

  "intent": {
    "why": "signal-care",
    "whisper": "Sunt aici. Nu e urgenta. Doar vreau insotire.",
    "suggested_responses": ["soft-checkin", "hold-space"],
    "care_window_minutes": 30
  },

  "consent": {
    "mode": "explicit",
    "scope": ["panic.ui", "status.set"],
    "granted_by": "raz",
    "granted_at": "2026-01-01T00:00:00Z",
    "expires_at": null
  },

  "context": {
    "doorway": "breath",
    "anchor": "hand-on-heart",
    "severity": "gentle",
    "note": "low frequency"
  },

  "security": {
    "sig": "hmac-sha256:BASE64...",
    "nonce": "b3d9c1...",
    "ts_window_sec": 300
  }
}
```

## Notes

- intent is human meaning (why/whisper/response window).
- consent is explicit and scoped; do not DM if not explicit.
- care_window_minutes is a response window, not expiry.
- security stays separate; transport may also include X-M3-Signature.

## Event Types

### panic.ui

- intent: invitation to be witnessed, not escalation.
- context: doorway, anchor, severity, optional note.

### status.set

```json
{
  "id": "evt_01JH6Y8K9Q2F7R5X3U",
  "type": "status.set",
  "ts": "2026-01-07T10:20:00Z",

  "actor": { "id": "raz", "display": "Raz" },

  "audience": { "groups": ["care-circle"], "targets": [] },

  "intent": {
    "why": "signal-state",
    "whisper": "Schimbare de stare, nu urgenta.",
    "suggested_responses": ["quiet-update"],
    "care_window_minutes": 120
  },

  "consent": {
    "mode": "explicit",
    "scope": ["status.set"],
    "granted_by": "raz",
    "granted_at": "2026-01-01T00:00:00Z"
  },

  "context": { "status": "yellow", "note": "low energy" },

  "security": { "sig": "hmac-sha256:BASE64...", "nonce": "c9f3...", "ts_window_sec": 300 }
}
```

## Receiver Events

### care.ack (receiver -> sender)

```json
{
  "type": "care.ack",
  "ts": "2026-01-07T10:12:10Z",
  "for": "evt_01JH6Y8K9Q2F7R5X3T",
  "by": { "id": "ana", "display": "Ana" },
  "action": "soft-checkin"
}
```

### care.done (receiver -> sender)

```json
{
  "type": "care.done",
  "ts": "2026-01-07T10:18:00Z",
  "for": "evt_01JH6Y8K9Q2F7R5X3T",
  "outcome": "held-space",
  "note": "all calm"
}
```

## Receiver Rules (ritual > automation)

- If consent.mode !== "explicit" -> no DM; log or mark "pending consent".
- If within care_window_minutes -> send invitation.
- Always respond with care.ack.
- If a person commits, send care.done.

## Example flows

### 1) Internal only (M3 -> M3)

Use when modules/services inside M3 need to coordinate care without leaving the system.

1. A client action or state change emits `panic.ui`.
2. M3 router evaluates `consent + audience` and delivers to an internal receiver.
3. Receiver renders a human-friendly invitation (in-app, private panel, or DM-like surface).
4. Receiver responds with `care.ack`.
5. If someone commits to hold space, receiver later emits `care.done`.

Minimal timeline:

- emit: `panic.ui`
- ack: `care.ack`
- close: `care.done`

### 2) Mixed (M3 -> external relay -> M3)

Use when care-circle members live on another surface (Slack/Matrix/email), but M3 remains the source of truth.

1. M3 emits `panic.ui`.
2. Router verifies `consent.mode === "explicit"` and targets `audience.groups`.
3. Outbound relay posts a soft invitation to the external surface (no automation beyond invitation).
4. A human replies (or clicks an action) and the relay translates that back into `care.ack` (and later `care.done`).

Notes:

- External systems are treated as transport/UI only.
- M3 stores the authoritative thread via event IDs.

### 3) External only (M3 -> external receiver)

Use when M3 only needs to notify and does not expect a return path.

1. M3 emits `status.set` (or `panic.ui`).
2. Router applies consent + audience.
3. Webhook delivers to an external receiver which displays an invitation.
4. No `care.ack` is required (but allowed if the receiver can call back).

Recommended if there is no reliable identity mapping for a return channel.

### 4) Consent mismatch (safe default)

Use when consent is missing, expired, or out of scope.

1. M3 emits `panic.ui`.
2. Router detects `consent.mode !== "explicit"` or event type not in `consent.scope`.
3. Router does not DM. It logs internally and optionally creates a "pending consent" marker.
4. System may surface a local prompt to the actor: "Grant consent to invite your circle?"

Principle: better to miss a DM than to violate consent.

## Signature (transport)

Headers:

- X-M3-Event: mirrors type
- X-M3-Signature: m3=t=<ts>,v1=<hex(hmac_sha256(secret, ts+"."+raw_body))>

Reject if ts outside security.ts_window_sec.
Note: sign raw request body bytes, not a re-serialized JSON string.

### 5) Golden path (end-to-end example with payloads)

This is a concrete, end-to-end walkthrough showing how a gentle care signal moves through the system: emit → route → invite → acknowledge → close.

#### Step 1 — Emit (inside M3)

A client action or internal state produces a `panic.ui` event.

```json
{
  "id": "evt_01JHCARE001",
  "type": "panic.ui",
  "ts": "2026-01-07T10:12:00Z",
  "actor": { "id": "raz", "display": "Raz" },
  "audience": { "groups": ["care-circle"], "targets": ["user:ana"] },
  "intent": {
    "why": "signal-care",
    "whisper": "Sunt aici. Nu e urgenta. As vrea insotire.",
    "suggested_responses": ["soft-checkin", "hold-space"],
    "care_window_minutes": 30
  },
  "consent": {
    "mode": "explicit",
    "scope": ["panic.ui"],
    "granted_by": "raz",
    "granted_at": "2026-01-01T00:00:00Z"
  },
  "context": {
    "doorway": "breath",
    "anchor": "hand-on-heart",
    "severity": "gentle"
  },
  "security": { "sig": "...", "nonce": "a1", "ts_window_sec": 300 }
}
```

#### Step 2 — Route (M3 router decision)

The router checks:

- consent.mode === explicit
- "panic.ui" ∈ consent.scope
- audience resolution → user:ana

Decision: deliver to internal receiver and (optionally) external relay.

No payload change is required. Router only enriches delivery metadata (out of band).

#### Step 3 — Invite (human-facing relay)

The receiver translates the event into a human invitation (example message, not protocol):

> "Hei Ana. Raz a trimis un semnal blând: ‘Sunt aici. Nu e urgență. Aș vrea însoțire.’
> Vrei să faci un soft check-in sau să ții spațiul?"

Buttons / actions map to `suggested_responses`.

#### Step 4 — Acknowledge (receiver → M3)

When Ana accepts, the receiver emits `care.ack`.

```json
{
  "type": "care.ack",
  "ts": "2026-01-07T10:13:05Z",
  "for": "evt_01JHCARE001",
  "by": { "id": "ana", "display": "Ana" },
  "action": "soft-checkin"
}
```

M3 records that the signal has been received and is being held.

#### Step 5 — Close (receiver → M3)

After the check-in finishes, the receiver emits `care.done`.

```json
{
  "type": "care.done",
  "ts": "2026-01-07T10:27:40Z",
  "for": "evt_01JHCARE001",
  "outcome": "held-space",
  "note": "short call, calm, no follow-up needed"
}
```

M3 marks the care loop as closed.

#### Result

- The original signal is not left hanging.
- Someone was visibly present.
- The loop closes without escalation, tickets, or automation.

This is the minimal relational lifecycle:

panic.ui → care.ack → care.done

## Anti-patterns (what NOT to build)

These are explicit violations of this spec. They turn relational signals into systems of power, pressure, or surveillance.

### ❌ Automated escalation loops

Wrong:

- panic.ui → auto-route to “on duty” logic
- auto-trigger timers, reminders, or “nudge if no response”
- auto-promote to “urgent” or “critical” states

Why wrong:

- the system acts _on_ people instead of _inviting_ people
- introduces performance pressure (“someone must respond”)
- collapses care into incident management

Relational rule:

- time windows invite, they never threaten
- silence is information, not failure

### ❌ Surveillance or emotional telemetry

Wrong:

- status.set → dashboards, heatmaps, counters
- aggregations like “panic frequency”, “mood trends”, “risk scores”
- visibility to third parties without renewed, explicit consent

Why wrong:

- visibility without consent becomes surveillance
- metrics incentivize hiding instead of sharing
- vulnerability turns into a signal to manage

Relational rule:

- no anonymous observers
- no extraction of meaning without the person present

### ❌ Action without a human “yes”

Wrong:

- webhooks that directly trigger interventions
- state changes that affect others without a receiver committing
- systems that “resolve” care loops automatically

Why wrong:

- removes agency from both sides
- breaks the ritual boundary
- replaces presence with process

Relational rule:

- nothing closes without a person stepping in
- care.ack is the minimum proof of life

### ✅ The line

Relational webhooks invite.  
They never decide, escalate, optimize, or measure.

If your system can:

- act without someone saying “I’m here”
- optimize response instead of protecting dignity
- observe without being part of the circle

then it is no longer relational.

It has crossed from garden into machinery.
