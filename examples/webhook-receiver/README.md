# M3 Webhook Receiver Example

A minimal Node.js webhook receiver that demonstrates how to integrate with M3 Memory Core's webhook system.

## 🎯 Purpose

This example shows how to:
- Receive webhook events from M3
- Verify HMAC-SHA256 signatures for security
- Handle different event types (ingest, emotions, panic, status, tells)
- Build external integrations (notifications, logging, third-party services)

## 🚀 Quick Start

### 1. Start the M3 server

```bash
cd server
M3_WEBHOOK_URL=http://localhost:4001/webhook \
M3_WEBHOOK_SECRET=your-secret-key \
cargo run
```

### 2. Start this webhook receiver (in another terminal)

```bash
cd examples/webhook-receiver
M3_WEBHOOK_SECRET=your-secret-key npm start
```

### 3. Trigger some events

```bash
# Ingest a message
curl -X POST localhost:3033/ingest \
  -H "Content-Type: application/json" \
  -d '{"text":"hello webhook world","profile":"Raz","privacy":"public"}'

# Log an emotion
curl -X POST localhost:3033/emotions/add \
  -H "Content-Type: application/json" \
  -d '{"who":"Raz","kind":"joy","intensity":0.8}'

# Trigger panic redirect
curl -X POST localhost:3033/panic \
  -H "Content-Type: application/json" \
  -d '{}'
```

You should see the events logged in the webhook receiver terminal! 🎉

## 🔒 Security

### Signature Verification

M3 signs every webhook with HMAC-SHA256. The signature is sent in the `X-M3-Signature` header:

```
X-M3-Signature: m3=t=1234567890,v1=abc123def456...
```

Where:
- `t` = Unix timestamp when the webhook was sent
- `v1` = HMAC-SHA256 hex digest of `timestamp + "." + body`

**Always verify signatures in production!** Set `M3_WEBHOOK_SECRET` on both the M3 server and your receiver.

### Example Verification (Node.js)

```javascript
import { createHmac } from 'node:crypto';

function verifySignature(signature, body, secret) {
  // Parse: m3=t=1234567890,v1=abc123...
  const parts = signature.slice(3).split(',');
  const timestamp = parts[0]?.split('=')[1];
  const receivedSig = parts[1]?.split('=')[1];

  // Compute expected signature
  const payload = `${timestamp}.${body}`;
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSig = hmac.digest('hex');

  return receivedSig === expectedSig;
}
```

## 📋 Event Types

The webhook receiver handles these event types (via `X-M3-Event` header):

| Event          | Trigger                      | Status      | Example Data                                          |
|----------------|------------------------------|-------------|-------------------------------------------------------|
| `panic.ui`     | Panic button pressed (UI)    | ✅ Active   | `{ event, payload: { whisper, breath, doorway }, ts }`|
| `panic.run`    | Panic redirect (CLI)         | ✅ Active   | `{ event, payload: { whisper, breath, doorway }, ts }`|
| `status.set`   | Readiness light change       | ✅ Active   | `{ status, note, updated_at, ttl_minutes }`           |
| `ingest`       | Message saved                | 📋 Planned  | `{ text, profile, privacy, tags }`                    |
| `emotion`      | Emotion logged               | 📋 Planned  | `{ who, kind, intensity, note }`                      |
| `tell`         | Tell created                 | 📋 Planned  | `{ node, pre_activation, action }`                    |

> **Note**: This receiver includes handlers for all event types, including planned ones. It will work seamlessly when additional events are implemented.

## 🧪 Testing Without M3

You can test the receiver independently:

```bash
# Health check
curl http://localhost:4001/health

# Send a test webhook (valid signature required if SECRET is set)
curl -X POST http://localhost:4001/webhook \
  -H "X-M3-Event: ingest" \
  -H "X-M3-Signature: m3=t=0,v1=nosig" \
  -H "Content-Type: application/json" \
  -d '{"text":"test message","profile":"Tester"}'
```

## 🔧 Configuration

| Environment Variable   | Default | Purpose                    |
|------------------------|---------|----------------------------|
| `PORT`                 | `4001`  | Server listen port         |
| `M3_WEBHOOK_SECRET`    | `""`    | HMAC secret (shared with M3) |

## 📚 Next Steps

Use this example as a starting point for:
- **Slack/Discord notifications** when panic is triggered
- **Database logging** of all events
- **Analytics** tracking emotional patterns
- **External triggers** (turn on lights when status changes)
- **AI processing** of ingested messages

## 🌬 Whisper

_"one wire, one signal — clarity over complexity."_

---

**License:** Apache-2.0 (same as M3 UI)  
**Part of:** [M3 Memory Core](https://github.com/GratiaOS/m3)
