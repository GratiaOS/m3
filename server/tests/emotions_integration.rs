//! Black‑box HTTP integration test for EmotionalOS endpoints.
//!
//! This test talks to a **running server** at `http://127.0.0.1:3033`.
//! It is marked `#[ignore]` by default so `cargo test` stays green without
//! needing to boot the server. To run it:
//!
//! 1) Start the server in another terminal:
//!    `RUST_LOG=info cargo run -p m3-memory-server`
//! 2) Then execute this test only:
//!    `cargo test -p m3-memory-server --test emotions_integration -- --ignored`
//!
//! If you prefer hermetic tests, keep the in‑crate router test in `main.rs`,
//! which spins an in‑memory DB and app without a TCP port.

use serde_json::json;

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
#[ignore = "requires running server on M3_BASE (default http://127.0.0.1:3033)"]
async fn http_resolve_then_recent_preserves_mirror_fields() {
    let client = reqwest::Client::new();
    let base = std::env::var("M3_BASE").unwrap_or_else(|_| "http://127.0.0.1:3033".to_string());

    // 1) POST /emotions/resolve with mirror tags
    let payload = json!({
        "who": "Raz",
        "details": "ledger 3 lines",
        "sealed": true,
        "archetype": "Mother",
        "privacy": "sealed"
    });

    let res = client
        .post(format!("{base}/emotions/resolve"))
        .json(&payload)
        .send()
        .await
        .expect("POST /emotions/resolve");

    assert!(
        res.status().is_success(),
        "resolve status = {}",
        res.status()
    );

    let v: serde_json::Value = res.json().await.expect("resolve json");
    assert_eq!(v["kind"], "gratitude");
    assert_eq!(v["sealed"], true);
    assert_eq!(v["archetype"], "Mother");
    assert_eq!(v["privacy"], "sealed");

    // 2) GET /emotions/recent and check the head item mirrors the fields
    let res2 = client
        .get(format!("{base}/emotions/recent"))
        .send()
        .await
        .expect("GET /emotions/recent");

    assert!(
        res2.status().is_success(),
        "recent status = {}",
        res2.status()
    );

    let arr: serde_json::Value = res2.json().await.expect("recent json");
    let head = arr
        .as_array()
        .and_then(|a| a.first())
        .cloned()
        .expect("recent non-empty");

    assert_eq!(head["kind"], "gratitude");
    assert_eq!(head["sealed"], true);
    assert_eq!(head["archetype"], "Mother");
    assert_eq!(head["privacy"], "sealed");
}
