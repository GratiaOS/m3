use reqwest::Client;
use std::env;
use std::time::Duration;

/// Returns the base URL for the server, from the `M3_BASE` environment variable or default.
#[allow(dead_code)]
pub fn base() -> String {
    env::var("M3_BASE").unwrap_or_else(|_| "http://127.0.0.1:3033".to_string())
}

/// Returns a reqwest client with a 500ms timeout.
#[allow(dead_code)]
pub fn client_500ms() -> Option<reqwest::Client> {
    Client::builder()
        .timeout(Duration::from_millis(500))
        .build()
        .ok()
}

/// Checks if the server is up by GETting `{base}/emotions/recent`.
#[allow(dead_code)]
pub async fn server_up(base: &str) -> bool {
    let url = format!("{}/emotions/recent", base);
    reqwest::get(&url)
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

/// Finds a recent emotion with a specific marker.
#[allow(dead_code)]
pub async fn find_recent_with_marker(
    base: &str,
    marker: &str,
    after_id: Option<u64>,
) -> Option<serde_json::Value> {
    let mut url = format!("{}/emotions/recent", base);
    if let Some(after) = after_id {
        url = format!("{}?after={}", url, after);
    }
    let resp = reqwest::get(&url).await.ok()?;
    let arr: serde_json::Value = resp.json().await.ok()?;
    arr.as_array()?
        .iter()
        .find(|v| v.get("marker").and_then(|m| m.as_str()) == Some(marker))
        .cloned()
}

/// Gets the max id from recent emotions.
#[allow(dead_code)]
pub async fn max_recent_id(base: &str) -> Option<u64> {
    let url = format!("{}/emotions/recent", base);
    let resp = reqwest::get(&url).await.ok()?;
    let arr: serde_json::Value = resp.json().await.ok()?;
    arr.as_array()?
        .iter()
        .filter_map(|v| v.get("id").and_then(|id| id.as_u64()))
        .max()
}

/// Waits until a new emotion with the marker appears after the given id.
#[allow(dead_code)]
pub async fn wait_for_new_after(
    base: &str,
    marker: &str,
    after_id: Option<u64>,
    max_tries: usize,
    delay_ms: u64,
) -> Option<serde_json::Value> {
    use tokio::time::{sleep, Duration as TokioDuration};
    for _ in 0..max_tries {
        if let Some(val) = find_recent_with_marker(base, marker, after_id).await {
            return Some(val);
        }
        sleep(TokioDuration::from_millis(delay_ms)).await;
    }
    None
}
