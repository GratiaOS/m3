use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone)]
pub struct Webhook {
    pub url: Option<String>,
    pub secret: Option<String>,
    client: reqwest::Client,
}

impl Webhook {
    pub fn new(url: Option<String>, secret: Option<String>) -> Self {
        Self {
            url,
            secret,
            client: reqwest::Client::new(),
        }
    }

    pub async fn send(&self, event: &str, json: &serde_json::Value) -> anyhow::Result<()> {
        let Some(url) = &self.url else {
            return Ok(());
        };

        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)?
            .as_secs()
            .to_string();
        let body = json.to_string();

        // signature: m3=t=<ts>,v1=<hex(hmac(ts + "." + body))>
        let sig = if let Some(secret) = &self.secret {
            let mut mac = HmacSha256::new_from_slice(secret.as_bytes())?;
            mac.update(ts.as_bytes());
            mac.update(b".");
            mac.update(body.as_bytes());
            let bytes = mac.finalize().into_bytes();
            format!("m3=t={},v1={}", ts, hex::encode(bytes))
        } else {
            "m3=t=0,v1=nosig".to_string()
        };

        let res = self
            .client
            .post(url)
            .header("Content-Type", "application/json")
            .header("X-M3-Event", event)
            .header("X-M3-Signature", sig)
            .body(body)
            .send()
            .await?;

        if !res.status().is_success() {
            anyhow::bail!(
                "webhook non-200: {} {}",
                res.status(),
                res.text().await.unwrap_or_default()
            );
        }
        Ok(())
    }
}
