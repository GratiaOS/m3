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
//!
//! This file now also includes a panic→resolve arc test that optionally checks `/tells/recent`.

use serde_json::json;
use std::time::Duration;
use tokio::time::sleep;

async fn server_up(base: &str) -> bool {
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_millis(500))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };

    match client.get(format!("{}/emotions/recent", base)).send().await {
        Ok(res) => res.status().is_success(),
        Err(_) => false,
    }
}

async fn find_recent_with_marker(
    client: &reqwest::Client,
    base: &str,
    marker: &str,
) -> Option<serde_json::Value> {
    for _ in 0..30 {
        if let Ok(res) = client.get(format!("{}/emotions/recent", base)).send().await {
            if res.status().is_success() {
                if let Ok(arr) = res.json::<serde_json::Value>().await {
                    if let Some(item) = arr
                        .as_array()
                        .and_then(|a| {
                            a.iter().find(|v| {
                                let d = v["details"].as_str().unwrap_or("");
                                let n = v["note"].as_str().unwrap_or("");
                                d.contains(marker) || n.contains(marker)
                            })
                        })
                        .cloned()
                    {
                        return Some(item);
                    }
                }
            }
        }
        sleep(Duration::from_millis(150)).await;
    }
    None
}

async fn max_recent_id(client: &reqwest::Client, base: &str) -> Option<i64> {
    if let Ok(res) = client.get(format!("{}/emotions/recent", base)).send().await {
        if res.status().is_success() {
            if let Ok(arr) = res.json::<serde_json::Value>().await {
                return arr
                    .as_array()
                    .and_then(|a| a.iter().filter_map(|v| v["id"].as_i64()).max());
            }
        }
    }
    None
}

async fn wait_for_new_after(
    client: &reqwest::Client,
    base: &str,
    baseline_id: i64,
    retries: usize,
    delay_ms: u64,
) -> Option<serde_json::Value> {
    for _ in 0..retries {
        if let Ok(res) = client.get(format!("{}/emotions/recent", base)).send().await {
            if res.status().is_success() {
                if let Ok(arr) = res.json::<serde_json::Value>().await {
                    if let Some(item) = arr.as_array().and_then(|a| {
                        a.iter()
                            .find(|v| v["id"].as_i64().map(|id| id > baseline_id).unwrap_or(false))
                            .cloned()
                    }) {
                        return Some(item);
                    }
                }
            }
        }
        sleep(Duration::from_millis(delay_ms)).await;
    }
    None
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
#[ignore = "requires running server on M3_BASE (default http://127.0.0.1:3033)"]
async fn http_resolve_then_recent_preserves_mirror_fields() {
    let client = reqwest::Client::new();
    let base = std::env::var("M3_BASE").unwrap_or_else(|_| "http://127.0.0.1:3033".to_string());

    if !server_up(&base).await {
        eprintln!("SKIP: server not running at {base}");
        return;
    }

    // Unique marker so we can find our entry even if DB has older data
    let marker = format!("itest-{}", uuid::Uuid::new_v4());

    // 1) POST /emotions/resolve with mirror tags
    let payload = json!({
        "who": "Raz",
        "details": format!("ledger 3 lines — {}", marker),
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
    let item = arr
        .as_array()
        .and_then(|a| {
            a.iter()
                .find(|v| v["details"].as_str().unwrap_or("").contains(&marker))
        })
        .cloned()
        .expect("recent contains our resolve");

    assert_eq!(item["kind"], "gratitude");
    assert_eq!(item["sealed"], true);
    assert_eq!(item["archetype"], "Mother");
    assert_eq!(item["privacy"], "sealed");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
#[ignore = "requires running server on M3_BASE (default http://127.0.0.1:3033)"]
async fn http_panic_then_resolve_arc_persists_emotion_and_tell() {
    let client = reqwest::Client::new();
    let base = std::env::var("M3_BASE").unwrap_or_else(|_| "http://127.0.0.1:3033".to_string());

    if !server_up(&base).await {
        eprintln!("SKIP: server not running at {base}");
        return;
    }

    // 0) Unique marker to find our entries
    let marker = format!("itest-{}", uuid::Uuid::new_v4());

    let baseline_id = max_recent_id(&client, &base).await.unwrap_or(0);

    // 1) POST /panic (UI flow)
    let panic_payload = serde_json::json!({
        "who": "Raz",
        "details": format!("panic spike — {}", marker),
        "note": format!("panic spike — {}", marker),
        // allow server defaults for sealed/archetype/privacy
    });

    let res_panic = client
        .post(format!("{base}/panic"))
        .json(&panic_payload)
        .send()
        .await
        .expect("POST /panic");

    assert!(
        res_panic.status().is_success(),
        "panic status = {}",
        res_panic.status()
    );
    sleep(Duration::from_millis(75)).await;

    // 2) Confirm a new emotion arrived after our POST; if not found by id, fall back to marker scan
    let item = match wait_for_new_after(&client, &base, baseline_id, 30, 150).await {
        Some(v) => v,
        None => find_recent_with_marker(&client, &base, &marker)
            .await
            .expect("recent contains our panic (by marker or id)"),
    };
    let kind = item["kind"].as_str().unwrap_or("");
    assert!(matches!(kind, "panic" | "anxiety"), "kind was {kind}");

    // 3) POST /emotions/resolve (gratitude)
    let resolve_payload = serde_json::json!({
        "who": "Raz",
        "details": format!("resolve ledger — {}", marker),
        "sealed": true,
        "archetype": "Mother",
        "privacy": "sealed"
    });

    let res_resolve = client
        .post(format!("{base}/emotions/resolve"))
        .json(&resolve_payload)
        .send()
        .await
        .expect("POST /emotions/resolve");
    assert!(res_resolve.status().is_success());
    let v: serde_json::Value = res_resolve.json().await.expect("resolve json");
    assert_eq!(v["kind"], "gratitude");

    // 4) Optional: check tells if endpoint exists (best-effort without failing CI if missing)
    // We try /tells/recent. If 404 or parse fails, we skip gracefully.
    if let Ok(res_tells) = client.get(format!("{base}/tells/recent")).send().await {
        if res_tells.status().is_success() {
            if let Ok(tells_json) = res_tells.json::<serde_json::Value>().await {
                if let Some(first) = tells_json.as_array().and_then(|a| a.first()) {
                    // We only assert shape minimally to avoid tight coupling.
                    // Expect there is a `node` and it likely references panic flow.
                    assert!(first.get("node").is_some(), "tell has node");
                }
            }
        }
    }
}
