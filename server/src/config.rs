use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub bind: String,                   // e.g., "127.0.0.1:3033"
    pub bearer: Option<String>, // if set, write routes require Authorization: Bearer <token>
    pub webhook_url: Option<String>, // e.g., https://hooks.example.com/m3
    pub webhook_secret: Option<String>, // HMAC secret
}

#[allow(dead_code)]
impl Config {
    pub fn from_env() -> Self {
        let _ = dotenvy::dotenv();
        let bind = env::var("M3_BIND").unwrap_or_else(|_| "127.0.0.1:3033".to_string());
        let bearer = env::var("M3_BEARER").ok();
        let webhook_url = env::var("M3_WEBHOOK_URL").ok();
        let webhook_secret = env::var("M3_WEBHOOK_SECRET").ok();
        Self {
            bind,
            bearer,
            webhook_url,
            webhook_secret,
        }
    }
}
