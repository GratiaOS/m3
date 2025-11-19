//! Black-box HTTP integration tests for Towns endpoints.
//!
//! These talk to a running server (default `http://127.0.0.1:3033`).
//! Marked `#[ignore]` so the suite stays green unless you opt in.
//!
//! Run:
//!   M3_BASE=http://127.0.0.1:3033 cargo test -p m3-memory-server --test towns_integration -- --ignored
//!
//! 🌱 whisper: “town criers echo wider when the square is lit.”

use serde_json::json;

mod common;
use common::server_up;

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
#[ignore = "requires running server on M3_BASE (default http://127.0.0.1:3033)"]
async fn http_post_news_and_bulletin_roundtrip() {
    let base = std::env::var("M3_BASE").unwrap_or_else(|_| "http://127.0.0.1:3033".to_string());

    if !server_up(&base).await {
        eprintln!("SKIP: server not running at {base}");
        return;
    }

    let client = reqwest::Client::new();
    let marker = format!("towns-itest-{}", uuid::Uuid::new_v4());

    // 1) POST /towns/news
    let payload = json!({
        "town": "cat",
        "headline": format!("purr sync — {marker}"),
        "who": "felix",
        "note": "evening cuddle"
    });

    let res = client
        .post(format!("{base}/towns/news"))
        .json(&payload)
        .send()
        .await
        .expect("POST /towns/news");
    assert!(res.status().is_success(), "news status = {}", res.status());

    // 2) GET /towns/bulletin?town=cat&limit=10
    let res2 = client
        .get(format!("{base}/towns/bulletin"))
        .query(&[("town", "cat"), ("limit", "10")])
        .send()
        .await
        .expect("GET /towns/bulletin");
    assert!(
        res2.status().is_success(),
        "bulletin status = {}",
        res2.status()
    );

    let arr: serde_json::Value = res2.json().await.expect("bulletin json");
    let hit = arr
        .as_array()
        .and_then(|a| {
            a.iter().find(|v| {
                v.get("headline")
                    .and_then(|x| x.as_str())
                    .map(|s| s.contains(&marker))
                    .unwrap_or(false)
            })
        })
        .cloned();

    assert!(
        hit.is_some(),
        "bulletin should contain our posted news item"
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 1)]
#[ignore = "requires running server on M3_BASE (default http://127.0.0.1:3033)"]
async fn http_validation_errors_are_422() {
    let base = std::env::var("M3_BASE").unwrap_or_else(|_| "http://127.0.0.1:3033".to_string());

    if !server_up(&base).await {
        eprintln!("SKIP: server not running at {base}");
        return;
    }

    let client = reqwest::Client::new();

    // empty town
    let res = client
        .post(format!("{base}/towns/news"))
        .json(&json!({"town":"   ","headline":"nope"}))
        .send()
        .await
        .expect("POST /towns/news");
    assert_eq!(res.status(), reqwest::StatusCode::UNPROCESSABLE_ENTITY);

    // empty headline
    let res = client
        .post(format!("{base}/towns/news"))
        .json(&json!({"town":"cat","headline":"   "}))
        .send()
        .await
        .expect("POST /towns/news");
    assert_eq!(res.status(), reqwest::StatusCode::UNPROCESSABLE_ENTITY);
}
