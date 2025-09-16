// Integration tests for /patterns endpoints.
// These tests require the server to be running at M3_BASE or http://127.0.0.1:3033.
// Run with: cargo test --test patterns_integration -- --ignored

mod common;
use common::*;
use serde_json::json;
use serde_json::Value;

#[tokio::test]
#[ignore]
async fn http_bridge_suggest_returns_expected_pattern() {
    let client = match client_500ms() {
        Some(c) => c,
        None => {
            eprintln!("SKIP: server not reachable at {}", base());
            return;
        }
    };
    let url = format!(
        "{}/patterns/bridge_suggest?kind=panic&intensity=0.7",
        base()
    );
    let resp = client.get(&url).send().await.expect("request failed");
    assert!(resp.status().is_success(), "Response status not success");
    let json: Value = resp.json().await.expect("invalid json");
    assert!(json.get("pattern").is_some(), "Missing 'pattern' key");
    assert!(json.get("hint").is_some(), "Missing 'hint' key");
}

#[tokio::test]
#[ignore]
async fn http_lanes_returns_three_lanes() {
    let client = match client_500ms() {
        Some(c) => c,
        None => {
            eprintln!("SKIP: server not reachable at {}", base());
            return;
        }
    };
    let url = format!("{}/patterns/lanes", base());
    let resp = client.get(&url).send().await.expect("request failed");
    assert!(resp.status().is_success(), "Response status not success");
    let json: Value = resp.json().await.expect("invalid json");
    assert!(json.get("victim").is_some(), "Missing 'victim' key");
    assert!(json.get("aggressor").is_some(), "Missing 'aggressor' key");
    assert!(json.get("sovereign").is_some(), "Missing 'sovereign' key");
}

#[tokio::test]
#[ignore]
async fn http_detect_returns_role_and_confidence() {
    let client = match client_500ms() {
        Some(c) => c,
        None => {
            eprintln!("SKIP: server not reachable at {}", base());
            return;
        }
    };
    let url = format!("{}/patterns/detect", base());
    let resp = client
        .post(&url)
        .json(&json!({ "text": "I feel attacked" }))
        .send()
        .await
        .expect("request failed");
    assert!(resp.status().is_success(), "Response status not success");
    let json: Value = resp.json().await.expect("invalid json");
    assert!(json.get("role").is_some(), "Missing 'role' key");
    assert!(json.get("confidence").is_some(), "Missing 'confidence' key");
}

#[tokio::test]
#[ignore]
async fn http_bridge_suggest_defaults_kind_to_panic() {
    let client = match client_500ms() {
        Some(c) => c,
        None => {
            eprintln!("SKIP: server not reachable at {}", base());
            return;
        }
    };
    // No `kind` parameter; should default to "panic"
    let url = format!("{}/patterns/bridge_suggest?intensity=0.5", base());
    let resp = client.get(&url).send().await.expect("request failed");
    assert!(resp.status().is_success(), "Response status not success");
    let json: Value = resp.json().await.expect("invalid json");
    assert!(json.get("pattern").is_some(), "Missing 'pattern' key");
    assert!(json.get("hint").is_some(), "Missing 'hint' key");
}
