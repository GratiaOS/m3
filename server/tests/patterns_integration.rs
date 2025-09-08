// Integration tests for /patterns endpoints.
// These tests require the server to be running at M3_BASE or http://127.0.0.1:3033.
// Run with: cargo test --test patterns_integration -- --ignored

mod patterns_integration {
    use reqwest::Client;
    use std::env;

    fn base_url() -> String {
        env::var("M3_BASE").unwrap_or_else(|_| "http://127.0.0.1:3033".to_string())
    }

    #[tokio::test]
    #[ignore]
    async fn http_bridge_suggest_returns_expected_pattern() {
        let client = Client::new();
        let url = format!(
            "{}/patterns/bridge_suggest?kind=panic&intensity=0.7",
            base_url()
        );
        let resp = client.get(&url).send().await.expect("request failed");
        assert!(resp.status().is_success(), "Response status not success");
        let json: serde_json::Value = resp.json().await.expect("invalid json");
        assert!(json.get("pattern").is_some(), "Missing 'pattern' key");
        assert!(json.get("hint").is_some(), "Missing 'hint' key");
    }

    #[tokio::test]
    #[ignore]
    async fn http_lanes_returns_three_lanes() {
        let client = Client::new();
        let url = format!("{}/patterns/lanes", base_url());
        let resp = client.get(&url).send().await.expect("request failed");
        assert!(resp.status().is_success(), "Response status not success");
        let json: serde_json::Value = resp.json().await.expect("invalid json");
        assert!(json.get("victim").is_some(), "Missing 'victim' key");
        assert!(json.get("aggressor").is_some(), "Missing 'aggressor' key");
        assert!(json.get("sovereign").is_some(), "Missing 'sovereign' key");
    }
}
