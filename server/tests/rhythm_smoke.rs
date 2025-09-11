use serde_json::Value;

// Reuse shared helpers so the test gracefully skips if server isn't running.
mod common;
use common::{base, client_500ms, server_up};

/// Smoke check for the live `/rhythm` endpoints.
///
/// This test is ignored by default because it requires the server
/// to be running. Set `M3_BASE` (default `http://127.0.0.1:3033`)
/// and run with `--ignored` to execute.
///
/// Example:
/// M3_BASE=http://127.0.0.1:3033 cargo test --test rhythm_smoke -- --ignored
#[tokio::test]
#[ignore = "requires running server on M3_BASE (default http://127.0.0.1:3033)"]
async fn rhythm_endpoints_smoke() {
    let base = base();
    // If the live server isn't up, skip gracefully (keeps CI green).
    if !server_up(&base).await {
        eprintln!("SKIP: server not running at {base}");
        return;
    }
    let client = client_500ms().expect("reqwest client");

    // GET /rhythm/next
    let v: Value = client
        .get(format!("{base}/rhythm/next"))
        .send()
        .await
        .expect("request /rhythm/next")
        .error_for_status()
        .expect("2xx from /rhythm/next")
        .json()
        .await
        .expect("json body");
    assert!(v.get("phase").is_some());
    assert!(v.get("ends_at").is_some());
    assert!(v.get("remaining_secs").is_some());

    // POST /rhythm/mark
    let res = client
        .post(format!("{base}/rhythm/mark"))
        .send()
        .await
        .expect("request /rhythm/mark");
    assert!(res.status().is_success());

    // POST /rhythm/config
    let res = client
        .post(format!("{base}/rhythm/config"))
        .header("content-type", "application/json")
        .body(r#"{"work_minutes":25,"rest_minutes":5}"#)
        .send()
        .await
        .expect("request /rhythm/config");
    assert!(res.status().is_success());
}
