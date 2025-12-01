#!/usr/bin/env bash
# Integration test: M3 server → webhook receiver
# Demonstrates end-to-end webhook flow with signature verification

set -e

echo "🧪 M3 Webhook Integration Test"
echo "================================"
echo ""

# Configuration
M3_PORT=3033
WEBHOOK_PORT=4001
SECRET="test-secret-$(date +%s)"

# Cleanup function
cleanup() {
  echo ""
  echo "🧹 Cleaning up..."
  pkill -f "m3-memory-server" 2>/dev/null || true
  pkill -f "webhook-receiver" 2>/dev/null || true
  rm -f /tmp/m3-test-*.log
}

trap cleanup EXIT

# Check if server binary exists
if ! [ -f "../../target/debug/m3-memory-server" ] && ! command -v cargo &> /dev/null; then
  echo "❌ Server not built and cargo not available"
  echo "   Run: cd ../.. && cargo build"
  exit 1
fi

echo "1️⃣  Starting webhook receiver..."
M3_WEBHOOK_SECRET="$SECRET" PORT=$WEBHOOK_PORT node server.js > /tmp/m3-test-receiver.log 2>&1 &
RECEIVER_PID=$!
sleep 2

if ! curl -s http://localhost:$WEBHOOK_PORT/health > /dev/null; then
  echo "❌ Webhook receiver failed to start"
  exit 1
fi
echo "   ✓ Receiver listening on port $WEBHOOK_PORT"
echo ""

echo "2️⃣  Starting M3 server..."
cd ../..
M3_WEBHOOK_URL="http://localhost:$WEBHOOK_PORT/webhook" \
M3_WEBHOOK_SECRET="$SECRET" \
M3_BIND="127.0.0.1:$M3_PORT" \
cargo run -q 2>&1 | tee /tmp/m3-test-server.log &
SERVER_PID=$!

# Wait for server to be ready
for i in {1..30}; do
  if curl -s http://localhost:$M3_PORT/status/get > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -s http://localhost:$M3_PORT/status/get > /dev/null; then
  echo "❌ M3 server failed to start"
  exit 1
fi
echo "   ✓ M3 server listening on port $M3_PORT"
echo ""

echo "3️⃣  Triggering webhook events..."
echo ""

# Test 1: Status change
echo "   📡 Sending status change..."
curl -s -X POST http://localhost:$M3_PORT/status/set \
  -H "Content-Type: application/json" \
  -d '{"color":"yellow","note":"Running integration test"}' > /dev/null
sleep 1

# Test 2: Panic redirect
echo "   📡 Triggering panic redirect..."
curl -s -X POST http://localhost:$M3_PORT/panic \
  -H "Content-Type: application/json" \
  -d '{}' > /dev/null
sleep 1

echo ""
echo "4️⃣  Webhook receiver log:"
echo "   ─────────────────────────────"
tail -20 /tmp/m3-test-receiver.log | grep -A10 "Event:"
echo ""

echo "✅ Integration test complete!"
echo ""
echo "💡 Tip: Check logs for details:"
echo "   - Receiver: /tmp/m3-test-receiver.log"
echo "   - Server:   /tmp/m3-test-server.log"
