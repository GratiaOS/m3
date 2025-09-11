//! Smoke test for live `/energy` endpoints.
//!
//! This talks to a running server at `M3_BASE` (default
//! `http://127.0.0.1:3033`) and is ignored by default so CI stays green.
//! Run with:
//!
//! M3_BASE=http://127.0.0.1:3033 cargo test -p m3-memory-server --test energy_integration -- --ignored

use serde_json::Value;

// Reuse shared helpers so the test gracefully skips if server isn't running.
mod common;
use common::{base, client_500ms, server_up};

#[tokio::test]
#[ignore = "requires running server on M3_BASE (default http://127.0.0.1:3033)"]
async fn energy_endpoints_smoke() {
    let base = base();

    // If the live server isn't up, skip gracefully (keeps CI green).
    if !server_up(&base).await {
        eprintln!("SKIP: server not running at {base}");
        return;
    }

    let client = client_500ms().expect("reqwest client");

    // POST /energy/mark — record a level for a user
    let who = format!("itest-{}", uuid::Uuid::new_v4());
    let payload = serde_json::json!({
        "who": who,
        "kind": "dragon",
        "level": 0.72
    });

    let res = client
        .post(format!("{base}/energy/mark"))
        .header("content-type", "application/json")
        .body(payload.to_string())
        .send()
        .await
        .expect("POST /energy/mark");
    assert!(res.status().is_success(), "mark status = {}", res.status());

    // GET /energy/state/:who — read back current levels
    let v: Value = client
        .get(format!("{base}/energy/state"))
        .send()
        .await
        .expect("GET /energy/state")
        .error_for_status()
        .expect("2xx from /energy/state")
        .json()
        .await
        .expect("json body");

    // The current `/energy/state` endpoint is **global** and returns a flat map
    // of { kind: level } (no `who` field). We just assert that our recent mark
    // influenced the latest value for "dragon" into the expected ballpark.
    let dragon = v.get("dragon").and_then(|x| x.as_f64()).unwrap_or(-1.0);
    assert!(dragon >= 0.7 && dragon <= 0.75, "dragon was {dragon}");
}
