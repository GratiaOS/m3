import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Configuration
const PORT = process.env.PORT || 4001;
const SECRET = process.env.M3_WEBHOOK_SECRET || '';

/**
 * Verify M3 webhook signature
 * Signature format: m3=t=<timestamp>,v1=<hmac_hex>
 * HMAC is computed over: timestamp + "." + body
 */
function verifySignature(signature, body) {
  if (!SECRET) {
    console.warn('⚠️  No M3_WEBHOOK_SECRET set - signature verification skipped');
    return true;
  }

  if (!signature || !signature.startsWith('m3=')) {
    return false;
  }

  try {
    // Parse: m3=t=1234567890,v1=abc123...
    const parts = signature.slice(3).split(',');
    const timestamp = parts[0]?.split('=')[1];
    const receivedSig = parts[1]?.split('=')[1];

    if (!timestamp || !receivedSig) {
      return false;
    }

    // Validate timestamp to prevent replay attacks
    const tsNum = Number.parseInt(timestamp, 10);
    if (Number.isNaN(tsNum)) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    const maxAge = 300; // 5 minutes
    if (Math.abs(now - tsNum) > maxAge) {
      return false;
    }

    // Compute expected signature
    const payload = `${timestamp}.${body}`;
    const hmac = createHmac('sha256', SECRET);
    hmac.update(payload);
    const expectedSig = hmac.digest('hex');

    // Constant-time comparison
    const receivedBuf = Buffer.from(receivedSig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (receivedBuf.length !== expectedBuf.length) {
      return false;
    }
    return timingSafeEqual(receivedBuf, expectedBuf);
  } catch (err) {
    console.error('Signature verification error:', err.message);
    return false;
  }
}

/**
 * Handle different webhook events
 */
function handleEvent(eventType, data) {
  console.log(`\n📬 Event: ${eventType}`);
  
  switch (eventType) {
    case 'panic.ui':
    case 'panic.run':
      console.log(`  └─ Panic redirect triggered`);
      if (data.payload) {
        console.log(`     Whisper: "${data.payload.whisper}"`);
        console.log(`     Breath: ${data.payload.breath}`);
      }
      break;
      
    case 'status.set':
      console.log(`  └─ Status updated: ${data.status}`);
      if (data.note) {
        console.log(`     Note: "${data.note}"`);
      }
      break;
      
    // Future event types (example handlers ready for when they're implemented)
    case 'ingest':
      console.log(`  └─ Message from ${data.profile || 'unknown'}: "${data.text?.slice(0, 50)}${data.text?.length > 50 ? '...' : ''}"`);
      break;
      
    case 'emotion':
      console.log(`  └─ ${data.who} feeling ${data.kind} (intensity: ${data.intensity})`);
      break;
      
    case 'tell':
      console.log(`  └─ Tell: ${data.node} → ${data.action}`);
      break;
      
    default:
      console.log(`  └─ Data:`, JSON.stringify(data, null, 2));
  }
}

/**
 * Simple HTTP server
 */
const server = createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', receiver: 'm3-webhook-example' }));
    return;
  }

  // Only accept POST to /webhook
  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  // Read body
  let body = '';
  const maxSize = 1048576; // 1MB
  let size = 0;
  let tooLarge = false;
  req.on('data', chunk => {
    size += chunk.length;
    if (size > maxSize) {
      tooLarge = true;
      req.destroy();
      return;
    }
    body += chunk.toString();
  });
  req.on('error', err => {
    console.error('Request stream error:', err.message);
    if (!res.headersSent) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');
    }
  });
  req.on('end', () => {
    if (tooLarge) {
      res.writeHead(413, { 'Content-Type': 'text/plain' });
      res.end('Payload Too Large');
      return;
    }
    try {
      const signature = req.headers['x-m3-signature'];
      const eventType = req.headers['x-m3-event'];

      // Verify signature
      if (!verifySignature(signature, body)) {
        console.error('❌ Invalid signature');
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        res.end('Invalid signature');
        return;
      }

      // Parse and handle
      const data = JSON.parse(body);
      handleEvent(eventType, data);

      // Acknowledge
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true }));
      
    } catch (err) {
      console.error('Error processing webhook:', err.message);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🎧 M3 Webhook Receiver listening on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Endpoint: http://localhost:${PORT}/webhook`);
  console.log(`   Secret: ${SECRET ? '✓ configured' : '⚠️  not set (verification disabled)'}\n`);
});
