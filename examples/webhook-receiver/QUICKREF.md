# Webhook Receiver Quick Reference

## Start

```bash
cd examples/webhook-receiver
M3_WEBHOOK_SECRET=your-secret npm start
```

## Configure M3

```bash
M3_WEBHOOK_URL=http://localhost:4001/webhook \
M3_WEBHOOK_SECRET=your-secret \
cargo run
```

## Verify

```bash
# Health check
curl http://localhost:4001/health

# Should return: {"status":"ok","receiver":"m3-webhook-example"}
```

## Events Currently Sent

- `panic.ui` - Panic button pressed in UI
- `panic.run` - Panic redirect via CLI (`panic.sh`)
- `status.set` - Team status/readiness light changed

## Events Planned (Handlers Ready)

- `ingest` - Message saved to timeline
- `emotion` - Emotion event logged
- `tell` - Tell created

## Signature Format

```
X-M3-Signature: m3=t=<timestamp>,v1=<hmac_hex>
```

HMAC computed over: `timestamp + "." + body` using SHA-256

## Integration Ideas

- 🔔 **Slack/Discord** - Notify team when panic triggered
- 📊 **Analytics** - Track emotional patterns over time
- 💾 **Database** - Log all events for analysis
- 🤖 **Automation** - Trigger workflows based on status changes
- 📱 **Push notifications** - Alert on critical events
- 🔍 **Monitoring** - Dashboard of M3 activity

## Security

⚠️ **Always verify signatures in production!**

Set `M3_WEBHOOK_SECRET` on both M3 server and receiver. The receiver will:
- Parse the signature header
- Compute expected HMAC
- Compare with constant-time equality
- Reject if invalid

## Need Help?

- Full docs: `examples/webhook-receiver/README.md`
- Integration test: `./test-integration.sh`
- Main README: Webhooks section

🌬 whisper: _"one wire, one signal — trust the flow."_
