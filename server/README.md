## API v1 quickstart

Base: `http://127.0.0.1:3033/v1`

Write routes require bearer if `M3_BEARER` env is set:
`Authorization: Bearer <token>`

- POST /status/set → { color, note?, ttl_minutes? }
- GET /status
- GET /status/stream (SSE)
- POST /ingest → { text, tags?, profile?, privacy?, importance? }
- GET /state/get
- POST /state/set → partial merge of { members?, pillars?, note? }
- POST /export
- POST /export_csv
- GET/POST /tells, POST /tells/handle

Webhooks: set `M3_WEBHOOK_URL` (+ `M3_WEBHOOK_SECRET`) to receive signed events.
