mod config;
mod webhook;
// mod auth; // keep if you actually use guards later

use config::Config;
use webhook::Webhook;
// use auth::WriteGuard;

mod bus;
mod db;
mod emotions;
mod models;
mod replies;

use bus::Bus;
use chrono::Utc;
use db::*;
use models::*;
use std::{
    fs as sfs,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use axum::extract::State;
use axum::{
    extract::Query,
    http::{HeaderMap, Method, StatusCode},
    response::sse::{Event, Sse},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::Datelike;
use futures_util::stream::StreamExt;
use replies::ReplyEngine;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tokio::fs as afs;
use tokio::fs::OpenOptions;
use tokio::io::AsyncWriteExt;
use tokio::net::TcpListener;
use tokio_stream::wrappers::IntervalStream;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::EnvFilter;

use std::convert::Infallible;

// rusqlite types are used **inside** tokio-rusqlite .call closures
use rusqlite::params;

// --- crypto ---
use argon2::Argon2;
use base64::engine::general_purpose::STANDARD as B64;
use base64::Engine;
use chacha20poly1305::{
    aead::{Aead, KeyInit},
    Key, XChaCha20Poly1305, XNonce,
};
use rand::seq::SliceRandom;
use rand::RngCore;
use std::env;
use std::path::PathBuf as StdPathBuf;

/// repo root = parent of the `server/` crate dir
fn repo_root() -> StdPathBuf {
    let server_dir = StdPathBuf::from(env!("CARGO_MANIFEST_DIR"));
    server_dir
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or(server_dir)
}

/// Resolve the exports directory:
/// - if `M3_EXPORTS_DIR` is absolute, use it as-is
/// - if `M3_EXPORTS_DIR` is relative, resolve from **repo root**
/// - otherwise, default to `<repo>/server/exports`
fn resolve_exports_dir() -> StdPathBuf {
    if let Ok(val) = std::env::var("M3_EXPORTS_DIR") {
        let p = StdPathBuf::from(val);
        return if p.is_absolute() {
            p
        } else {
            repo_root().join(p)
        };
    }
    repo_root().join("server/exports")
}

fn derive_key(pass: &str, salt: &[u8]) -> [u8; 32] {
    use argon2::password_hash::{PasswordHasher as _, SaltString};
    let salt = SaltString::encode_b64(salt).unwrap();
    let out = Argon2::default()
        .hash_password(pass.as_bytes(), &salt)
        .unwrap();
    let binding = out.hash.unwrap(); // keep it alive long enough
    let bytes = binding.as_bytes();
    let mut k = [0u8; 32];
    k.copy_from_slice(&bytes[0..32]);
    k
}

fn seal_text(key: &[u8; 32], plaintext: &str) -> String {
    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    let mut nonce_bytes = [0u8; 24];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);
    let ct = cipher.encrypt(nonce, plaintext.as_bytes()).expect("enc");
    B64.encode([&nonce_bytes[..], &ct[..]].concat())
}

fn open_text(key: &[u8; 32], blob_b64: &str) -> Option<String> {
    let blob = B64.decode(blob_b64).ok()?;
    if blob.len() < 24 {
        return None;
    }
    let (n, c) = blob.split_at(24);
    let cipher = XChaCha20Poly1305::new(Key::from_slice(key));
    let pt = cipher.decrypt(XNonce::from_slice(n), c).ok()?;
    String::from_utf8(pt).ok()
}

// --- panic logs base dir resolver (unified) ---
fn panic_dir_base() -> StdPathBuf {
    resolve_exports_dir().join("panic")
}

fn default_team_state() -> Value {
    json!({
      "members": [
        {"name":"Raz","energy":70},
        {"name":"Sawsan","energy":65},
        {"name":"Nico","energy":60}
      ],
      "pillars": {
        "crown":"watch","void":"watch","play":"good","dragon":"watch","life_force":"watch"
      },
      "note": null,
      "ts": chrono::Utc::now().to_rfc3339()
    })
}

#[derive(Clone)]
struct AppState {
    db: Database,
    bus: Bus,
    // session key lives only in RAM
    key: Arc<Mutex<Option<[u8; 32]>>>,
    config: Config,
    webhook: Webhook,
    reply_engine: replies::ReplyEngine,
}

// --- helper: decrypt sealed text if key present ---
fn decrypt_if_needed(key_opt: &Option<[u8; 32]>, privacy: &str, text: String) -> String {
    if privacy == "sealed" {
        if let Some(k) = key_opt {
            open_text(k, &text).unwrap_or("(sealed)".into())
        } else {
            "(sealed)".into()
        }
    } else {
        text
    }
}

// --- panic redirect: output shape (used by logger + handler) ---
#[derive(Serialize)]
struct PanicOut {
    whisper: String,
    breath: String,
    doorway: String,
    anchor: String,
    logged: bool,
}

// --- panic redirect: input shape (optional fields + optional mode) ---
#[derive(Deserialize)]
struct PanicIn {
    whisper: Option<String>,
    breath: Option<String>,
    doorway: Option<String>,
    anchor: Option<String>,
    #[serde(default)]
    mode: Option<String>,
}

// --- Panic presets: small rotating palettes ---
const FEAR_VISIBLE_WHISPERS: &[&str] = &[
    "We can be seen and still be safe.",
    "Visibility can be gentle; I choose soft edges.",
    "Eyes on us; breath in us. Safe.",
];
const FEAR_VISIBLE_BREATHS: &[&str] = &["box:in4-hold2-out6-hold2 × 4", "in4-hold4-out6 × 4"];
const FEAR_VISIBLE_DOORWAYS: &[&str] = &[
    "dim_lights (20%), step back 2m, sip water",
    "lower_voice, soften_gaze, one sip",
];
const FEAR_VISIBLE_ANCHORS: &[&str] = &[
    "Blend-in posture; sovereignty stays inside.",
    "I shrink the surface, not the core.",
];

const DEFAULT_WHISPERS: &[&str] = &[
    "This is Empire’s choke, not my truth.",
    "The field is loud; I choose signal.",
    "Return to center; let noise pass.",
];
const DEFAULT_BREATHS: &[&str] = &["double_exhale:in2-out4", "4-6 breath × 6"];
const DEFAULT_DOORWAYS: &[&str] = &["drink_water", "stand_up + shoulder_roll"];
const DEFAULT_ANCHORS: &[&str] = &["Flow > Empire.", "Sovereignty first, pace second."];

#[inline]
fn pick<'a>(xs: &'a [&'a str], tick: i64) -> &'a str {
    if xs.is_empty() {
        ""
    } else {
        xs[(tick as usize) % xs.len()]
    }
}

// Async compact logger used by the /panic route (UI).
async fn log_panic_compact(
    whisper: &str,
    breath: &str,
    doorway: &str,
    anchor: &str,
    mode: Option<&str>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // .../panic/YYYY-MM/panic-YYYY-MM-DD.log
    let now = Utc::now();
    let ym = format!("{:04}-{:02}", now.year(), now.month());
    let ymd = format!("{:04}-{:02}-{:02}", now.year(), now.month(), now.day());
    let dir = panic_dir_base().join(ym);
    let path = dir.join(format!("panic-{}.log", ymd));

    // ensure directory
    afs::create_dir_all(&dir).await?;

    // structured single line
    let ts = now.to_rfc3339();
    let mode_tag = mode.unwrap_or("default");
    let line = format!(
        "[{}] [{}] whisper=\"{}\" breath=\"{}\" doorway=\"{}\" anchor=\"{}\"\n",
        ts, mode_tag, whisper, breath, doorway, anchor
    );

    let mut file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .await?;
    file.write_all(line.as_bytes()).await?;
    file.flush().await?;
    Ok(())
}

// --- add log export for panic runs ---
// This ensures /panic/run mirrors panic.sh behavior by writing to ./exports/panic/YYYY-MM/panic-YYYY-MM-DD.log
// so both CLI + UI invocations create the same audit trail.
fn write_panic_log(out: &PanicOut) {
    use std::io::Write;
    let ts = chrono::Utc::now();
    let dir = panic_dir_base().join(format!("{}", ts.format("%Y-%m")));
    if let Err(e) = sfs::create_dir_all(&dir) {
        eprintln!("panic log: mkdir failed: {:?}", e);
        return;
    }
    let path = dir.join(format!("panic-{}.log", ts.format("%Y-%m-%d")));
    let mut f = match sfs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
    {
        Ok(f) => f,
        Err(e) => {
            eprintln!("panic log: open failed: {:?}", e);
            return;
        }
    };
    let _ = writeln!(
        f,
        "🌬️  {}-PANIC REDIRECT ORACLE\n\nwhisper : {}\nbreath  : {}\ndoorway : {}\nanchor  : {}\n\n✅ one redirect step chosen — act now.\n📝  logged to {}\n",
        std::process::id(),
        out.whisper,
        out.breath,
        out.doorway,
        out.anchor,
        path.display()
    );
}

/// Payload returned by `/panic/last`
#[derive(serde::Serialize)]
struct PanicLast {
    ts: String,
    whisper: String,
    breath: String,
    doorway: String,
    anchor: String,
    path: String,
}

/// Helper: where exports live (env or default)
fn exports_base_dir() -> PathBuf {
    // unify with panic_dir_base()/resolve_exports_dir() so CLI & UI read same logs
    resolve_exports_dir()
}

/// GET /panic/last — read the newest panic log line and parse fields
async fn panic_last() -> Result<Json<PanicLast>, StatusCode> {
    use tokio::fs;
    use tokio::io::AsyncReadExt;

    let base = exports_base_dir().join("panic");
    // Find newest YYYY-MM dir
    let mut newest_dir: Option<(String, std::time::SystemTime)> = None;
    let Ok(mut rd) = fs::read_dir(&base).await else {
        return Err(StatusCode::NOT_FOUND);
    };
    while let Ok(Some(e)) = rd.next_entry().await {
        let name = e.file_name().to_string_lossy().to_string();
        if name.len() == 7 && name.chars().nth(4) == Some('-') {
            if let Ok(md) = e.metadata().await {
                if let Ok(modt) = md.modified() {
                    if newest_dir.as_ref().map(|(_, t)| modt > *t).unwrap_or(true) {
                        newest_dir = Some((name, modt));
                    }
                }
            }
        }
    }
    let Some((ym, _)) = newest_dir else {
        return Err(StatusCode::NOT_FOUND);
    };

    // Find newest file in newest_dir (panic-YYYY-MM-DD.log)
    let dir = base.join(&ym);
    let mut newest_file: Option<(PathBuf, std::time::SystemTime)> = None;
    let Ok(mut rd2) = fs::read_dir(&dir).await else {
        return Err(StatusCode::NOT_FOUND);
    };
    while let Ok(Some(e)) = rd2.next_entry().await {
        let path = e.path();
        if path.extension().and_then(|s| s.to_str()) == Some("log") {
            if let Ok(md) = e.metadata().await {
                if let Ok(modt) = md.modified() {
                    if newest_file.as_ref().map(|(_, t)| modt > *t).unwrap_or(true) {
                        newest_file = Some((path, modt));
                    }
                }
            }
        }
    }
    let Some((file_path, _)) = newest_file else {
        return Err(StatusCode::NOT_FOUND);
    };

    // Read file & take the last non-empty line
    let mut file = fs::File::open(&file_path)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;
    let mut buf = String::new();
    file.read_to_string(&mut buf)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let last = buf
        .lines()
        .rev()
        .find(|l| !l.trim().is_empty())
        .ok_or(StatusCode::NOT_FOUND)?;

    // Expected format (from panic.sh & server writer):
    // [YYYY-MM-DDTHH:MM:SSZ] whisper="..." breath="..." doorway="..." anchor="..."
    let ts = last
        .split(']')
        .next()
        .unwrap_or("")
        .trim_start_matches('[')
        .to_string();
    let mut whisper = String::new();
    let mut breath = String::new();
    let mut doorway = String::new();
    let mut anchor = String::new();
    for key in ["whisper", "breath", "doorway", "anchor"] {
        if let Some(start) = last.find(&format!(r#"{key}=""#)) {
            let s = start + key.len() + 2;
            if let Some(end) = last[s..].find('"') {
                let val = &last[s..s + end];
                match key {
                    "whisper" => whisper = val.to_string(),
                    "breath" => breath = val.to_string(),
                    "doorway" => doorway = val.to_string(),
                    _ => anchor = val.to_string(),
                }
            }
        }
    }

    Ok(Json(PanicLast {
        ts,
        whisper,
        breath,
        doorway,
        anchor,
        path: file_path.to_string_lossy().to_string(),
    }))
}

/// Gratitude Ledger
#[derive(serde::Deserialize)]
struct GratitudeIn {
    subject: String,
    #[serde(default)]
    details: Option<String>,
    #[serde(default)]
    kind: Option<String>, // e.g. "ancestor" | "tool" | "place"
    #[serde(default)]
    note_id: Option<i64>, // optional link to a message
    #[serde(default)]
    who: Option<String>, // actor/profile
}

#[derive(serde::Serialize)]
struct GratitudeOut {
    id: i64,
    ts: String,
    subject: String,
    details: Option<String>,
    kind: Option<String>,
    note_id: Option<i64>,
    who: Option<String>,
}

#[derive(serde::Deserialize)]
struct ThanksQuery {
    limit: Option<usize>,
}

async fn ensure_gratitude_schema(db: &Database) -> tokio_rusqlite::Result<()> {
    // closure returns tokio_rusqlite::Result<()>, `?` on rusqlite ops auto-converts
    db.0.call(
        |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<()> {
            use rusqlite::params;
            conn.execute(
                "CREATE TABLE IF NOT EXISTS gratitude(
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                ts      TEXT NOT NULL,
                who     TEXT,
                subject TEXT NOT NULL,
                kind    TEXT,
                note_id INTEGER,
                details TEXT
            )",
                params![],
            )?;
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_grat_ts ON gratitude(ts DESC)",
                params![],
            )?;
            Ok(())
        },
    )
    .await
}

fn thanks_log_line(
    ts: &str,
    who: Option<&str>,
    subject: &str,
    details: Option<&str>,
    kind: Option<&str>,
    note_id: Option<i64>,
) -> String {
    let who = who.unwrap_or("-");
    let kind = kind.unwrap_or("-");
    let det = details.unwrap_or("-");
    let nid = note_id.map(|v| v.to_string()).unwrap_or_else(|| "-".into());
    format!("{ts} who=\"{who}\" kind=\"{kind}\" note_id=\"{nid}\" subject=\"{subject}\" details=\"{det}\"\n")
}

async fn thanks_create(
    State(state): State<AppState>,
    Json(body): Json<GratitudeIn>,
) -> Result<Json<GratitudeOut>, (StatusCode, String)> {
    let ts = Utc::now().to_rfc3339();
    let subject = body.subject.trim().to_string();
    if subject.is_empty() {
        return Err((StatusCode::UNPROCESSABLE_ENTITY, "subject required".into()));
    }

    // clone fields we’ll need both in DB write and after
    let who = body.who.clone();
    let details = body.details.clone();
    let kind = body.kind.clone();
    let note_id = body.note_id;
    let subject_db = subject.clone();
    let ts_db = ts.clone();
    let who_db = who.clone();
    let details_db = details.clone();
    let kind_db = kind.clone();
    let note_id_db = note_id;

    // insert row
    let id_res = state
        .db
        .0
        .call(
            move |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<i64> {
                use rusqlite::params;
                conn.execute(
                "INSERT INTO gratitude(ts,who,subject,kind,note_id,details) VALUES(?,?,?,?,?,?)",
                params![ts_db, who_db, subject_db, kind_db, note_id_db, details_db],
            )?;
                Ok(conn.last_insert_rowid())
            },
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // export line (append)
    let base = exports_base_dir().join("thanks");
    let ym = Utc::now().format("%Y-%m").to_string();
    let dayf = Utc::now().format("thanks-%Y-%m-%d.log").to_string();
    let dir = base.join(ym);
    let _ = tokio::fs::create_dir_all(&dir).await;
    let path = dir.join(dayf);
    let line = thanks_log_line(
        &ts,
        who.as_deref(),
        &subject,
        details.as_deref(),
        kind.as_deref(),
        note_id,
    );
    if let Ok(mut f) = tokio::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .await
    {
        let _ = f.write_all(line.as_bytes()).await;
    }

    Ok(Json(GratitudeOut {
        id: id_res,
        ts,
        subject,
        details: body.details,
        kind: body.kind,
        note_id: body.note_id,
        who: body.who,
    }))
}

async fn thanks_list(
    State(state): State<AppState>,
    Query(q): Query<ThanksQuery>,
) -> Result<Json<Vec<GratitudeOut>>, StatusCode> {
    let limit = q.limit.unwrap_or(20).min(200) as i64;
    let rows = state
        .db
        .0
        .call(
            move |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<Vec<GratitudeOut>> {
                let mut stmt = conn.prepare(
                    "SELECT id,ts,who,subject,kind,note_id,details
             FROM gratitude ORDER BY ts DESC LIMIT ?1",
                )?;
                let it = stmt.query_map([limit], |r| {
                    Ok(GratitudeOut {
                        id: r.get(0)?,
                        ts: r.get(1)?,
                        who: r.get(2)?,
                        subject: r.get(3)?,
                        kind: r.get(4)?,
                        note_id: r.get(5)?,
                        details: r.get(6)?,
                    })
                })?;
                let mut out = Vec::new();
                for row in it {
                    out.push(row?);
                }
                Ok(out)
            },
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(rows))
}

async fn reply_handler(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let text = payload.get("text").and_then(|v| v.as_str()).unwrap_or("");
    if let Some(reply) = state.reply_engine.generate(text).await {
        (StatusCode::OK, Json(reply)).into_response()
    } else {
        StatusCode::NO_CONTENT.into_response()
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let db = init_db().await?;
    let _ = ensure_default_thread(&db).await;
    // make sure default profile exists so old rows don't get filtered by the JOIN
    let _ = ensure_profile(&db, "Raz").await;
    ensure_gratitude_schema(&db).await?;
    let config = Config::from_env();
    let webhook = Webhook::new(config.webhook_url.clone(), config.webhook_secret.clone());
    // spin up the reply engine (reads env: M3_REPLIES_*)
    let reply_engine = ReplyEngine::from_env();

    // Touch bearer so the field isn’t “dead” & emit a useful log.
    if config.bearer.as_deref().is_some() {
        tracing::info!("Bearer auth: ENABLED (requests must include Authorization: Bearer …)");
    } else {
        tracing::info!("Bearer auth: disabled");
    }
    // Safe-prompt mode (controls reply postprocess; see replies::safe_postprocess)
    let safe = std::env::var("M3_SAFE_PROMPT").unwrap_or_else(|_| "1".into());
    if safe == "0" {
        tracing::info!("Safe prompt: OFF (raw stream)");
    } else {
        tracing::info!("Safe prompt: ON (scrubbed)");
    }

    let bus = Bus::default();
    let state = AppState {
        db,
        bus,
        key: Arc::new(Mutex::new(None)),
        config,
        webhook,
        reply_engine,
    };

    emotions::ensure_emotions_schema(&state.db).await?;

    #[derive(Deserialize)]
    struct TellsQuery {
        limit: Option<i64>,
    }

    #[derive(Deserialize)]
    struct SetStateRequest {
        // pass-through merges; keep them flexible
        members: Option<serde_json::Value>,
        pillars: Option<serde_json::Value>,
        note: Option<String>,
    }

    #[derive(Deserialize)]
    struct ReplyPreviewReq {
        input: String,
    }

    // ---- build router (stateless root; attach state at the end) ----
    let app = Router::new()
        // --- passphrase / unlock ---
        .route(
            "/seal/set_passphrase",
            post({
                let state = state.clone();
                move |Json(req): Json<SetPassphrase>| async move {
                    let salt: Vec<u8> = state
                        .db
                        .0
                        .call(|c| {
                            let mut stmt =
                                c.prepare("SELECT value FROM kv WHERE key='seal_salt'")?;
                            let mut rows = stmt.query([])?;
                            if let Some(row) = rows.next()? {
                                let v: Vec<u8> = row.get(0)?;
                                Ok(v)
                            } else {
                                let mut s = vec![0u8; 16];
                                rand::thread_rng().fill_bytes(&mut s);
                                c.execute(
                                    "INSERT OR REPLACE INTO kv(key,value) VALUES('seal_salt',?)",
                                    params![s.clone()],
                                )?;
                                Ok(s)
                            }
                        })
                        .await
                        .unwrap();

                    let key = derive_key(&req.passphrase, &salt);
                    *state.key.lock().unwrap() = Some(key);
                    Json(SimpleOk { ok: true })
                }
            }),
        )
        .route(
            "/seal/unlock",
            post({
                let state = state.clone();
                move |Json(req): Json<UnlockRequest>| async move {
                    let salt: Vec<u8> = state
                        .db
                        .0
                        .call(|c| {
                            let mut stmt =
                                c.prepare("SELECT value FROM kv WHERE key='seal_salt'")?;
                            let mut rows = stmt.query([])?;
                            if let Some(row) = rows.next()? {
                                let v: Vec<u8> = row.get(0)?;
                                Ok(v)
                            } else {
                                Ok(vec![0u8; 16])
                            }
                        })
                        .await
                        .unwrap();

                    let key = derive_key(&req.passphrase, &salt);
                    *state.key.lock().unwrap() = Some(key);
                    Json(SimpleOk { ok: true })
                }
            }),
        )
        // --- ingest ---
        .route(
            "/ingest",
            post({
                let state = state.clone();
                let thread_id_val = 1i64; // default thread (ensure_default_thread ran)
                move |headers: HeaderMap, Json(req): Json<IngestRequest>| async move {
                    // HARD INCOGNITO: if header set, don't write—pretend success
                    if headers.get("x-incognito").is_some() {
                        return Json(IngestResponse { id: -1 });
                    }

                    let profile = req.profile.unwrap_or_else(|| "Raz".to_string());
                    let privacy = req.privacy.unwrap_or_else(|| "public".to_string());
                    let importance = req.importance.unwrap_or(0);
                    let tags =
                        serde_json::to_string(&req.tags.unwrap_or_default()).unwrap();
                    let ts = chrono::Utc::now().to_rfc3339();

                    // ensure the profile exists and get its id
                    let profile_id = ensure_profile(&state.db, &profile).await;

                    let text = if privacy == "sealed" {
                        if let Some(k) = *state.key.lock().unwrap() {
                            seal_text(&k, &req.text)
                        } else {
                            req.text
                        }
                    } else {
                        req.text
                    };

                    // insert via .call, return new id from inside
                    let id: i64 = state
                        .db
                        .0
                        .call(move |c| {
                            c.execute(
                                "INSERT INTO messages(thread_id,role,text,tags,profile_id,privacy,importance,ts) VALUES(?,?,?,?,?,?,?,?)",
                                rusqlite::params![thread_id_val, "user", text, tags, profile_id, privacy, importance, ts],
                            )?;
                            Ok(c.last_insert_rowid())
                        })
                        .await
                        .unwrap();

                    state.bus.publish(&format!("ingest:{}", id));
                    Json(IngestResponse { id })
                }
            }),
        )
        // --- retrieve ---
        .route(
            "/retrieve",
            post({
                let state = state.clone();
                move |Json(req): Json<RetrieveRequest>| async move {
                    let include_sealed = req.include_sealed.unwrap_or(false);
                    let q = if req.query == "*" {
                        "%".to_string()
                    } else {
                        format!("%{}%", req.query)
                    };
                    let limit = req.limit.unwrap_or(12);
                    let before_id = req.before_id;
                    let profile_name = req.profile.clone();

                    // Build SQL by explicit shape
                    let (sql, binds): (String, Vec<rusqlite::types::Value>) =
                        match (profile_name, before_id) {
                            (Some(pname), Some(bid)) if include_sealed => (
                                "SELECT m.id, m.text, m.tags, p.name, m.ts, m.privacy
                                 FROM messages m JOIN profiles p ON p.id=m.profile_id
                                 WHERE m.text LIKE ?1 AND p.name = ?2 AND m.id < ?3
                                 ORDER BY m.id DESC
                                 LIMIT ?4"
                                    .to_string(),
                                vec![
                                    q.clone().into(),
                                    pname.into(),
                                    bid.into(),
                                    limit.into(),
                                ],
                            ),
                            (Some(pname), Some(bid)) => (
                                "SELECT m.id, m.text, m.tags, p.name, m.ts, m.privacy
                                 FROM messages m JOIN profiles p ON p.id=m.profile_id
                                 WHERE m.text LIKE ?1 AND m.privacy != 'sealed' AND p.name = ?2 AND m.id < ?3
                                 ORDER BY m.id DESC
                                 LIMIT ?4"
                                    .to_string(),
                                vec![
                                    q.clone().into(),
                                    pname.into(),
                                    bid.into(),
                                    limit.into(),
                                ],
                            ),
                            (Some(pname), None) if include_sealed => (
                                "SELECT m.id, m.text, m.tags, p.name, m.ts, m.privacy
                                 FROM messages m JOIN profiles p ON p.id=m.profile_id
                                 WHERE m.text LIKE ?1 AND p.name = ?2
                                 ORDER BY m.id DESC
                                 LIMIT ?3"
                                    .to_string(),
                                vec![q.clone().into(), pname.into(), limit.into()],
                            ),
                            (Some(pname), None) => (
                                "SELECT m.id, m.text, m.tags, p.name, m.ts, m.privacy
                                 FROM messages m JOIN profiles p ON p.id=m.profile_id
                                 WHERE m.text LIKE ?1 AND m.privacy != 'sealed' AND p.name = ?2
                                 ORDER BY m.id DESC
                                 LIMIT ?3"
                                    .to_string(),
                                vec![q.clone().into(), pname.into(), limit.into()],
                            ),
                            (None, Some(bid)) if include_sealed => (
                                "SELECT m.id, m.text, m.tags, p.name, m.ts, m.privacy
                                 FROM messages m JOIN profiles p ON p.id=m.profile_id
                                 WHERE m.text LIKE ?1 AND m.id < ?2
                                 ORDER BY m.id DESC
                                 LIMIT ?3"
                                    .to_string(),
                                vec![q.clone().into(), bid.into(), limit.into()],
                            ),
                            (None, Some(bid)) => (
                                "SELECT m.id, m.text, m.tags, p.name, m.ts, m.privacy
                                 FROM messages m JOIN profiles p ON p.id=m.profile_id
                                 WHERE m.text LIKE ?1 AND m.privacy != 'sealed' AND m.id < ?2
                                 ORDER BY m.id DESC
                                 LIMIT ?3"
                                    .to_string(),
                                vec![q.clone().into(), bid.into(), limit.into()],
                            ),
                            (None, None) if include_sealed => (
                                "SELECT m.id, m.text, m.tags, p.name, m.ts, m.privacy
                                 FROM messages m JOIN profiles p ON p.id=m.profile_id
                                 WHERE m.text LIKE ?1
                                 ORDER BY m.id DESC
                                 LIMIT ?2"
                                    .to_string(),
                                vec![q.clone().into(), limit.into()],
                            ),
                            (None, None) => (
                                "SELECT m.id, m.text, m.tags, p.name, m.ts, m.privacy
                                 FROM messages m JOIN profiles p ON p.id=m.profile_id
                                 WHERE m.text LIKE ?1 AND m.privacy != 'sealed'
                                 ORDER BY m.id DESC
                                 LIMIT ?2"
                                    .to_string(),
                                vec![q.clone().into(), limit.into()],
                            ),
                        };

                    let key_opt = *state.key.lock().unwrap();

                    let rows: Vec<RetrievedChunk> = state
                        .db
                        .0
                        .call(move |c| {
                            let mut stmt = c.prepare(&sql)?;
                            let mut qrows =
                                stmt.query(rusqlite::params_from_iter(binds))?;
                            let mut out = Vec::new();
                            while let Some(row) = qrows.next()? {
                                let text_enc: String = row.get(1)?;
                                let privacy: String = row.get(5)?;
                                let text =
                                    decrypt_if_needed(&key_opt, &privacy, text_enc);

                                let tags: Vec<String> =
                                    serde_json::from_str::<Vec<String>>(
                                        &row.get::<_, String>(2)?,
                                    )
                                    .unwrap_or_default();

                                let ts_str: String = row.get(4)?;
                                let ts = chrono::DateTime::parse_from_rfc3339(&ts_str)
                                    .map(|dt| dt.with_timezone(&chrono::Utc))
                                    .unwrap_or_else(|_| chrono::Utc::now());

                                out.push(RetrievedChunk {
                                    id: row.get(0)?,
                                    text,
                                    tags,
                                    profile: row.get(3)?,
                                    ts,
                                    score: 0.5,
                                });
                            }
                            Ok(out)
                        })
                        .await
                        .unwrap();

                    Json(rows)
                }
            }),
        )
        // --- snapshot ---
        .route(
            "/snapshot",
            post({
                let state = state.clone();
                move |Json(_req): Json<SnapshotRequest>| async move {
                    let key_opt = *state.key.lock().unwrap();
                    let summary: String = state
                        .db
                        .0
                        .call(move |c| {
                            let mut stmt = c.prepare(
                                "SELECT text,privacy FROM messages ORDER BY id DESC LIMIT 20",
                            )?;
                            let mut rows = stmt.query([])?;
                            let mut bullets = Vec::new();
                            while let Some(row) = rows.next()? {
                                let mut text: String = row.get(0)?;
                                let privacy: String = row.get(1)?;
                                if privacy == "sealed" {
                                    if let Some(k) = key_opt {
                                        if let Some(pt) = open_text(&k, &text) {
                                            text = pt
                                        } else {
                                            continue;
                                        }
                                    } else {
                                        continue;
                                    }
                                }
                                bullets.push(format!("- {}", text.replace('\n', " ")));
                            }
                            Ok(bullets.join("\n"))
                        })
                        .await
                        .unwrap();

                    let (summary_clone, ts) =
                        (summary.clone(), Utc::now().to_rfc3339());
                    state
                        .db
                        .0
                        .call(move |c| {
                            c.execute(
                                "INSERT INTO snapshots(thread_id,period,summary_md,ts) VALUES(?,?,?,?)",
                                params![1i64, "daily", summary_clone, ts],
                            )?;
                            Ok(())
                        })
                        .await
                        .unwrap();

                    Json(Snapshot {
                        id: 0,
                        thread_id: 1,
                        period: "daily".into(),
                        summary_md: summary,
                    })
                }
            }),
        )
        // --- export md ---
        .route(
            "/export",
            post({
                let state = state.clone();
                move |Json(req): Json<ExportRequest>| async move {
                    let thread = req.thread_id.unwrap_or(1);
                    let key_opt = *state.key.lock().unwrap();

                    let out: (String, i64) = state
                        .db
                        .0
                        .call(move |c| {
                            let mut stmt = c.prepare(
                                "SELECT text, tags, ts, privacy FROM messages WHERE thread_id=?1 ORDER BY id ASC",
                            )?;
                            let mut rows = stmt.query(params![thread])?;
                            let mut out =
                                String::from("# Thread Export\n\n");
                            let mut count: i64 = 0;
                            while let Some(row) = rows.next()? {
                                let mut text: String = row.get(0)?;
                                let tags_json: String =
                                    row.get::<_, Option<String>>(1)?
                                        .unwrap_or("[]".into());
                                let ts: String = row.get(2)?;
                                let privacy: String =
                                    row.get::<_, Option<String>>(3)?
                                        .unwrap_or("public".into());
                                if privacy == "sealed" {
                                    text = if let Some(k) = key_opt {
                                        open_text(&k, &text)
                                            .unwrap_or("(sealed)".into())
                                    } else {
                                        "(sealed)".into()
                                    };
                                }
                                out.push_str(&format!(
                                    "- [{}] {}\n  - tags: `{}`\n  - privacy: `{}`\n\n",
                                    ts,
                                    text.replace('\n', " "),
                                    tags_json,
                                    privacy
                                ));
                                count += 1;
                            }
                            Ok((out, count))
                        })
                        .await
                        .unwrap();

                    let dir = PathBuf::from("./exports");
                    sfs::create_dir_all(&dir).ok();
                    let fname = format!(
                        "{}-thread-{}.md",
                        Utc::now().format("%Y-%m-%d_%H-%M"),
                        thread
                    );
                    let path = dir.join(fname);
                    sfs::write(&path, out.0).unwrap();
                    Json(ExportResponse {
                        path: path.to_string_lossy().into(),
                        count: out.1,
                    })
                }
            }),
        )
        // --- export csv ---
        .route(
            "/export_csv",
            post({
                let state = state.clone();
                move |Json(req): Json<ExportRequest>| async move {
                    let thread = req.thread_id.unwrap_or(1);
                    let key_opt = *state.key.lock().unwrap();

                    let csv: String = state
                        .db
                        .0
                        .call(move |c| {
                            let mut stmt = c.prepare(
                                "SELECT m.id, m.ts, p.name, m.text, m.tags, m.privacy \
                             FROM messages m JOIN profiles p ON p.id=m.profile_id \
                             WHERE m.thread_id=?1 ORDER BY m.id ASC",
                            )?;
                            let mut rows = stmt.query(params![thread])?;
                            let mut out = String::from(
                                "id,ts,profile,text,tags,privacy\n",
                            );
                            while let Some(row) = rows.next()? {
                                let id: i64 = row.get(0)?;
                                let ts: String = row.get(1)?;
                                let profile: String = row.get(2)?;
                                let mut text: String = row.get(3)?;
                                let tags_json: String =
                                    row.get::<_, Option<String>>(4)?
                                        .unwrap_or("[]".into());
                                let privacy: String =
                                    row.get::<_, Option<String>>(5)?
                                        .unwrap_or("public".into());
                                if privacy == "sealed" {
                                    text = if let Some(k) = key_opt {
                                        open_text(&k, &text)
                                            .unwrap_or("(sealed)".into())
                                    } else {
                                        "(sealed)".into()
                                    };
                                }
                                let esc = |s: String| -> String {
                                    let s = s.replace('"', "\"\"");
                                    format!("\"{}\"", s)
                                };
                                out.push_str(&format!(
                                    "{},{},{},{},{},{}\n",
                                    id,
                                    esc(ts),
                                    esc(profile),
                                    esc(text.replace('\n', " ")),
                                    esc(tags_json),
                                    esc(privacy)
                                ));
                            }
                            Ok(out)
                        })
                        .await
                        .unwrap();

                    let dir = PathBuf::from("./exports");
                    sfs::create_dir_all(&dir).ok();
                    let fname = format!(
                        "{}-thread-{}.csv",
                        Utc::now().format("%Y-%m-%d_%H-%M"),
                        thread
                    );
                    let path = dir.join(fname);
                    sfs::write(&path, csv).unwrap();
                    Json(ExportResponse {
                        path: path.to_string_lossy().into(),
                        count: 1,
                    })
                }
            }),
        )
        // --- import open ai ---
        .route(
            "/import_openai",
            post({
                let state = state.clone();
                move |Json(req): Json<ImportOpenAI>| {
                    let state = state.clone();
                    async move {
                        let root = req.root;
                        let privacy =
                            req.privacy.unwrap_or_else(|| "private".to_string());
                        let (count, titles) = import_openai_folder(
                            &state.db,
                            &root,
                            &privacy,
                        )
                        .await
                        .unwrap_or((0, Vec::new()));
                        Json(serde_json::json!({
                            "path": root,
                            "count": count,
                            "titles": titles
                        }))
                    }
                }
            }),
        )
        // --- tells ---
        .route(
            "/tells",
            get({
                let state = state.clone();
                move |Query(q): Query<TellsQuery>| {
                    let state = state.clone();
                    async move {
                        let limit = q.limit.unwrap_or(50);
                        let rows: Vec<Tell> = state
                            .db
                            .0
                            .call(move |c| {
                                let mut stmt = c.prepare(
                                "SELECT id,node,pre_activation,action,created_at,handled_at
                                 FROM tells ORDER BY id DESC LIMIT ?1",
                            )?;
                                let mut it =
                                    stmt.query(rusqlite::params![limit])?;
                                let mut out = Vec::new();
                                while let Some(row) = it.next()? {
                                    out.push(Tell {
                                        id: row.get(0)?,
                                        node: row.get(1)?,
                                        pre_activation: row.get(2)?,
                                        action: row.get(3)?,
                                        created_at: row.get(4)?,
                                        handled_at: row.get(5)?,
                                    });
                                }
                                Ok(out)
                            })
                            .await
                            .unwrap();
                        Json(rows)
                    }
                }
            }),
        )
        // --- tells: create (POST /tells) ---
        .route(
            "/tells",
            post({
                let state = state.clone();
                move |Json(req): Json<CreateTellRequest>| async move {
                    let ts = req
                        .created_at
                        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
                    let node = req.node;
                    let pre = req.pre_activation;
                    let act = req.action;
                    let id: i64 = state
                        .db
                        .0
                        .call(move |c| {
                            c.execute(
                                "INSERT INTO tells(node,pre_activation,action,created_at)
                                 VALUES(?,?,?,?)",
                                rusqlite::params![node, pre, act, ts],
                            )?;
                            Ok(c.last_insert_rowid())
                        })
                        .await
                        .unwrap();
                    Json(serde_json::json!({ "id": id }))
                }
            }),
        )
        // --- tells: mark handled (POST /tells/handle) ---
        .route(
            "/tells/handle",
            post({
                let state = state.clone();
                move |Json(req): Json<HandleTellRequest>| async move {
                    let now = chrono::Utc::now().to_rfc3339();
                    state
                        .db
                        .0
                        .call(move |c| {
                            c.execute(
                                "UPDATE tells SET handled_at=?1 WHERE id=?2",
                                rusqlite::params![now, req.id],
                            )?;
                            Ok(())
                        })
                        .await
                        .unwrap();
                    Json(SimpleOk { ok: true })
                }
            }),
        )
        // --- readiness lights: set ---
        .route(
            "/status",
            post({
                let state = state.clone();
                move |Json(req): Json<StatusSet>| async move {
                    // persist in kv
                    let k = format!("status:{}", req.name);
                    let v = req.status.to_string();
                    let v_for_db = v.clone();
                    let ts = chrono::Utc::now().to_rfc3339();

                    state.db.0.call(move |c| {
                        c.execute(
                            "INSERT OR REPLACE INTO kv(key,value) VALUES(?1,?2)",
                            rusqlite::params![k, v_for_db],
                        )?;
                        Ok(())
                    }).await.ok();

                    state.bus.publish(&format!("status:{}:{}", req.name, v));

                    Json(serde_json::json!({ "ok": true, "name": req.name, "status": v, "ts": ts }))
                }
            }),
        )
        // --- readiness lights: get snapshot ---
        .route(
            "/status",
            get({
                let state = state.clone();
                move || {
                    let state = state.clone();
                    async move {
                        let rows: Vec<StatusItem> = state.db.0.call(
                            |c: &mut rusqlite::Connection| -> tokio_rusqlite::Result<Vec<StatusItem>> {
                                let mut out = Vec::new();
                                let mut stmt = c.prepare("SELECT key, value FROM kv WHERE key LIKE 'status:%'")?;
                                let mut it = stmt.query([])?;
                                while let Some(row) = it.next()? {
                                    let key: String = row.get(0)?;
                                    let name = key.trim_start_matches("status:").to_string();
                                    let status: String = row.get(1)?;
                                    out.push(StatusItem { name, status, ts: String::new() });
                                }
                                Ok(out)
                            }
                        ).await.unwrap();

                        Json(rows)
                    }
                }
            }),
        )
        // --- readiness lights: SSE stream ---
        .route(
            "/status/stream",
            get({
                let state = state.clone();
                move || {
                    let state = state.clone();
                    async move {
                        let interval = IntervalStream::new(tokio::time::interval(std::time::Duration::from_millis(500)));

                        let stream = interval.map(move |_| {
                            let drained = state.bus.drain();
                            let updates: Vec<_> = drained
                                .into_iter()
                                .filter(|e| e.starts_with("status:"))
                                .map(|e| {
                                    let mut parts = e.splitn(3, ':');
                                    let _ = parts.next(); // "status"
                                    let name = parts.next().unwrap_or("").to_string();
                                    let status = parts.next().unwrap_or("").to_string();
                                    serde_json::json!({ "name": name, "status": status })
                                })
                                .collect();

                            let event = if updates.is_empty() {
                                Event::default().comment("hb")
                            } else {
                                Event::default()
                                    .data(serde_json::to_string(&updates).unwrap_or_else(|_| "[]".to_string()))
                            };

                            Ok::<Event, Infallible>(event)
                        });

                        Sse::new(stream)
                            .keep_alive(axum::response::sse::KeepAlive::new().interval(std::time::Duration::from_secs(15)).text("ping"))
                    }
                }
            }),
        )
        // --- status.get ---
        .route(
            "/status/get",
            post({
                let state = state.clone();
                move |_: Json<serde_json::Value>| async move {
                    // Read current row (direct return)
                    let (mut color, mut note, mut updated_at, expires_at_opt): (String, String, String, Option<String>) =
                        state.db.0.call(|c: &mut rusqlite::Connection| -> tokio_rusqlite::Result<(String, String, String, Option<String>)> {
                            let row = c.query_row(
                                "SELECT color, note, updated_at, expires_at FROM status WHERE id=1",
                                [],
                                |r| Ok::<_, rusqlite::Error>((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
                            )?;
                            Ok(row)
                        }).await.unwrap();

                    // Auto-reset if expired
                    let now = chrono::Utc::now();
                    let mut expires_at: Option<chrono::DateTime<chrono::Utc>> = None;
                    if let Some(expires) = expires_at_opt.as_deref() {
                        match chrono::DateTime::parse_from_rfc3339(expires) {
                            Ok(ts) => {
                                let exp = ts.with_timezone(&chrono::Utc);
                                if now >= exp && color != "green" {
                                    color = "green".into();
                                    note.clear();
                                    updated_at = now.to_rfc3339();
                                    let updated_at_db = updated_at.clone();
                                    state.db.0.call(move |c: &mut rusqlite::Connection| {
                                        c.execute(
                                            "UPDATE status SET color='green', note='', updated_at=?1, expires_at=NULL WHERE id=1",
                                            rusqlite::params![updated_at_db],
                                        )?;
                                        Ok(())
                                    }).await.ok();
                                    expires_at = None;
                                } else {
                                    expires_at = Some(exp);
                                }
                            }
                            Err(e) => {
                                tracing::warn!("Invalid expires_at '{}': {:?}", expires, e);
                                expires_at = None;
                            }
                        }
                    }

                    // Parse updated_at robustly; default to now if missing/invalid
                    let updated_at_dt = match chrono::DateTime::parse_from_rfc3339(&updated_at) {
                        Ok(ts) => ts.with_timezone(&chrono::Utc),
                        Err(e) => {
                            tracing::warn!("status.get: invalid updated_at '{}': {:?} — defaulting to now()", updated_at, e);
                            chrono::Utc::now()
                        }
                    };

                    Json(models::StatusGetResponse {
                        color,
                        note,
                        updated_at: updated_at_dt,
                        expires_at,
                    })
                }
            }),
        )
        // --- status.set ---
        .route(
            "/status/set",
            post({
                let state = state.clone();
                move |Json(req): Json<models::StatusSetRequest>| async move {
                    let now = chrono::Utc::now();
                    let ttl = req.ttl_minutes;
                    let expires_at = ttl.map(|m| (now + chrono::Duration::minutes(m)).to_rfc3339());
                    let note = req.note.unwrap_or_default();
                    let color = req.color.clone(); // keep a copy for webhook after the DB write

                    // DB write (use clones inside the closure)
                    let ts_str = now.to_rfc3339();
                    let color_db = color.clone();
                    let note_db = note.clone();
                    let expires_db = expires_at.clone();
                    state
                        .db
                        .0
                        .call(move |c: &mut rusqlite::Connection| -> tokio_rusqlite::Result<()> {
                            c.execute(
                                "UPDATE status SET color=?1, note=?2, updated_at=?3, expires_at=?4 WHERE id=1",
                                rusqlite::params![color_db, note_db, ts_str, expires_db],
                            )?;
                            Ok(())
                        })
                        .await
                        .unwrap();

                    // Fire webhook (best-effort)
                    let payload = serde_json::json!({
                        "event": "status.set",
                        "status": color,             // "green" | "yellow" | "red"
                        "note": note,
                        "updated_at": now.to_rfc3339(),
                        "ttl_minutes": ttl
                    });
                    let _ = state.webhook.send("status.set", &payload).await;

                    // Respond
                    Json(models::StatusOk { ok: true })
                }
            }),
        )
        // --- dashboard state ---
        .route(
            "/state/get",
            get({
                let state = state.clone();
                move || {
                    let state = state.clone();
                    async move {
                        let v: serde_json::Value = state.db.0.call(
                            |c: &mut rusqlite::Connection| -> tokio_rusqlite::Result<serde_json::Value> {
                                let r: rusqlite::Result<Vec<u8>> = c.query_row(
                                    "SELECT value FROM kv WHERE key='dashboard_state'",
                                    [],
                                    |row| row.get(0),
                                );
                                let v = r
                                    .ok()
                                    .and_then(|b| serde_json::from_slice::<serde_json::Value>(&b).ok())
                                    .unwrap_or_else(default_team_state);
                                Ok(v)
                            }
                        ).await.unwrap();

                        Json(v)
                    }
                }
            }),
        )
        .route(
            "/state/set",
            post({
                let state = state.clone();
                move |Json(req): Json<SetStateRequest>| async move {
                    let now = chrono::Utc::now().to_rfc3339();
                    let v: Value = state.db.0.call(
                        move |c: &mut rusqlite::Connection| -> tokio_rusqlite::Result<Value> {
                            // load current
                            let cur: Value = c
                                .query_row(
                                    "SELECT value FROM kv WHERE key='dashboard_state'",
                                    [],
                                    |row| row.get::<_, Vec<u8>>(0),
                                )
                                .ok()
                                .and_then(|b| serde_json::from_slice::<Value>(&b).ok())
                                .unwrap_or_else(default_team_state);

                            // merge
                            let mut next = cur.clone();
                            if let Some(ms) = req.members { next["members"] = serde_json::to_value(ms).unwrap(); }
                            if let Some(ps) = req.pillars { next["pillars"] = serde_json::to_value(ps).unwrap(); }
                            if let Some(n) = req.note { next["note"] = Value::String(n); }
                            next["ts"] = Value::String(now.clone());

                            // save
                            let blob = serde_json::to_vec(&next).unwrap();
                            c.execute(
                                "INSERT OR REPLACE INTO kv(key,value) VALUES('dashboard_state',?)",
                                rusqlite::params![blob],
                            )?;

                            Ok(next)
                        }
                    ).await.unwrap();

                    Json(v)
                }
            }),
        )
        // --- replies ---
        .route("/reply", post(reply_handler))
        .route(
            "/replies/preview",
            post({
                let _state = state.clone();
                move |_state: State<AppState>, Json(req): Json<ReplyPreviewReq>| {
                    async move {
                        // generate reply (engine decides if the weekly window is active)
                        let preview = _state.reply_engine.generate(&req.input).await;
                        Json(preview)
                    }
                }
            }),
        )
        // --- panic (compact, UI; accepts optional body & mode) ---
        .route(
            "/panic",
            post({
                let _state = state.clone();
                move |State(state): State<AppState>, Json(mut body): Json<PanicIn>| async move {
                    // presets only if mode provided *and* all steps empty
                    let all_empty = body.whisper.as_deref().unwrap_or("").is_empty()
                        && body.breath.as_deref().unwrap_or("").is_empty()
                        && body.doorway.as_deref().unwrap_or("").is_empty()
                        && body.anchor.as_deref().unwrap_or("").is_empty();

                    if body.mode.is_some() && all_empty {
                        // rotate by time (no RNG needed here)
                        let tick = chrono::Utc::now().timestamp();
                        match body.mode.as_deref().unwrap_or("default") {
                            "fearVisible" | "fear-visible" => {
                                body.whisper = Some(pick(FEAR_VISIBLE_WHISPERS, tick).to_string());
                                body.breath  = Some(pick(FEAR_VISIBLE_BREATHS,   tick).to_string());
                                body.doorway = Some(pick(FEAR_VISIBLE_DOORWAYS,  tick).to_string());
                                body.anchor  = Some(pick(FEAR_VISIBLE_ANCHORS,   tick).to_string());
                            }
                            _ => {
                                body.whisper = Some(pick(DEFAULT_WHISPERS, tick).to_string());
                                body.breath  = Some(pick(DEFAULT_BREATHS,  tick).to_string());
                                body.doorway = Some(pick(DEFAULT_DOORWAYS, tick).to_string());
                                body.anchor  = Some(pick(DEFAULT_ANCHORS,  tick).to_string());
                            }
                        }
                    }

                    // fill defaults if missing
                    let whisper = body.whisper.unwrap_or_else(|| "This is Empire’s choke, not my truth.".into());
                    let breath  = body.breath .unwrap_or_else(|| "double_exhale:in2-out4".into());
                    let doorway = body.doorway.unwrap_or_else(|| "drink_water".into());
                    let anchor  = body.anchor .unwrap_or_else(|| "Flow > Empire.".into());
                    let mode    = body.mode.as_deref();

                    // write compact line (async, best-effort)
                    let mut logged = false;
                    if log_panic_compact(&whisper, &breath, &doorway, &anchor, mode).await.is_ok() {
                        logged = true;
                    }

                    // 1) Tell for traceability (best-effort)
                    {
                        let node = "panic".to_string();
                        let pre = format!("whisper:{} | breath:{}", whisper, breath);
                        let act = format!("doorway:{} | anchor:{}", doorway, anchor);
                        let ts = chrono::Utc::now().to_rfc3339();
                        let _ = state.db.0.call(move |c| {
                            c.execute(
                                "INSERT INTO tells(node,pre_activation,action,created_at) VALUES(?,?,?,?)",
                                rusqlite::params![node, pre, act, ts],
                            )?;
                            Ok(())
                        }).await;
                    }

                    // 2) Log an emotion row (fear/anxiety) so EmotionalOS sees the event (best-effort)
                    {
                        let ts = chrono::Utc::now().to_rfc3339();
                        let who = "Raz".to_string();
                        let (kind, intensity): (String, f32) = match mode {
                            Some("fearVisible") | Some("fear-visible") => ("fear".into(), 0.65),
                            _ => ("anxiety".into(), 0.55),
                        };
                        let note = format!("panic ui: {} | {} | {}", whisper, breath, doorway);
                        let _ = state.db.0.call(move |c| {
                            c.execute(
                                "INSERT INTO emotions(ts, who, kind, intensity, note) VALUES(?,?,?,?,?)",
                                rusqlite::params![ts, who, kind, intensity, note],
                            )?;
                            Ok(())
                        }).await;
                    }

                    // 3) Auto-bridge readiness: yellow → green (kv + bus)
                    {
                        let _ = state.db.0.call(|c| {
                            c.execute(
                                "INSERT OR REPLACE INTO kv(key,value) VALUES('status:main','green')",
                                [],
                            )?;
                            Ok(())
                        }).await;
                        state.bus.publish("status:main:green");
                    }

                    // 4) webhook (best-effort)
                    let _ = state.webhook.send("panic.ui", &serde_json::json!({
                        "event": "panic.ui",
                        "payload": { "whisper": whisper, "breath": breath, "doorway": doorway, "anchor": anchor },
                        "ts": chrono::Utc::now().to_rfc3339(),
                    })).await;

                    Json(PanicOut { whisper, breath, doorway, anchor, logged })
                }
            }),
        )
        // --- panic redirect oracle (POST /panic/run) ---
        .route(
            "/panic/run",
            post({
                let state = state.clone();
                move || {
                    let state = state.clone();
                    async move {
                        // 1) choose small, safe defaults
                        let whispers = [
                            "This is Empire’s choke, not my truth.",
                            "Pause. Presence first, problems after.",
                            "I don’t owe panic my attention.",
                        ];
                        let breaths = [
                            "double_exhale:in2-out4",
                            "box:in4-hold4-out4-hold2",
                            "phys_sigh:inhale+top-up, slow exhale",
                        ];
                        let doorways = [
                            "drink_water",
                            "stand_and_stretch",
                            "cold_splash",
                            "step_outside",
                        ];
                        let anchors = [
                            "Flow > Empire.",
                            "Sovereignty over spectacle.",
                            "One true next action.",
                        ];

                        let whisper = whispers.choose(&mut rand::thread_rng()).unwrap().to_string();
                        let breath  = breaths .choose(&mut rand::thread_rng()).unwrap().to_string();
                        let doorway = doorways.choose(&mut rand::thread_rng()).unwrap().to_string();
                        let anchor  = anchors .choose(&mut rand::thread_rng()).unwrap().to_string();
                        // write log once (sync), then mark logged=true
                        let mut out = PanicOut { whisper, breath, doorway, anchor, logged: false };
                        write_panic_log(&out);
                        out.logged = true;

                        // 2) log to DB as a Tell (best-effort)
                        let node = "panic".to_string();
                        let pre = format!("whisper:{} | breath:{}", out.whisper, out.breath);
                        let act = format!("doorway:{} | anchor:{}", out.doorway, out.anchor);
                        let ts = chrono::Utc::now().to_rfc3339();
                        let _ = state.db.0.call(move |c| {
                            c.execute(
                                "INSERT INTO tells(node,pre_activation,action,created_at) VALUES(?,?,?,?)",
                                rusqlite::params![node, pre, act, ts],
                            )?;
                            Ok(())
                        }).await;

                        // emotions: log fear event so EmotionalOS can reflect the redirect
                        {
                            let ts = chrono::Utc::now().to_rfc3339();
                            let who = "Raz".to_string();
                            let kind = "fear".to_string();
                            let intensity = 0.6f32;
                            let note = format!("panic run: {} | {} | {}", out.whisper, out.breath, out.doorway);
                            let _ = state.db.0.call(move |c| {
                                c.execute(
                                    "INSERT INTO emotions(ts, who, kind, intensity, note) VALUES(?,?,?,?,?)",
                                    rusqlite::params![ts, who, kind, intensity, note],
                                )?;
                                Ok(())
                            }).await;
                        }

                        // readiness: auto-bridge to green
                        {
                            let _ = state.db.0.call(|c| {
                                c.execute(
                                    "INSERT OR REPLACE INTO kv(key,value) VALUES('status:main','green')",
                                    [],
                                )?;
                                Ok(())
                            }).await;
                            state.bus.publish("status:main:green");
                        }

                        // 3) (optional) webhook
                        let _ = state.webhook.send("panic.run", &serde_json::json!({
                            "event": "panic.run",
                            "payload": out,
                            "ts": chrono::Utc::now().to_rfc3339(),
                        })).await;

                        Json(out)
                    }
                }
            }),
        )
        .route("/panic/last", get(panic_last))
        .route("/thanks", post(thanks_create).get(thanks_list));

    // ---- CORS ----
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    // attach state after nesting emotions
    let app = app
        .layer(cors)
        .nest("/emotions", emotions::router())
        .with_state(state.clone());

    // ---- serve ----
    let listener = TcpListener::bind(&state.config.bind).await?;
    tracing::info!("listening on {}", state.config.bind);

    let make_svc = app.into_make_service();
    axum::serve(listener, make_svc).await?;

    Ok(())
}

// ensure a profile name exists, return id
async fn ensure_profile(db: &Database, name: &str) -> i64 {
    let name = name.to_string();
    db.0.call(move |c| -> tokio_rusqlite::Result<i64> {
        let r: Result<i64, rusqlite::Error> = c.query_row(
            "SELECT id FROM profiles WHERE name=?1",
            [name.as_str()],
            |r| r.get(0),
        );
        match r {
            Ok(id) => Ok(id),
            Err(_) => {
                c.execute("INSERT INTO profiles(name) VALUES(?1)", [name.as_str()])?;
                Ok(c.last_insert_rowid())
            }
        }
    })
    .await
    .unwrap()
}

// ensure a thread by title exists (returns id) — adapts to whatever columns exist
async fn ensure_thread_by_title(db: &Database, title: &str) -> i64 {
    let title = title.to_string();
    let now = chrono::Utc::now().to_rfc3339();

    db.0.call(move |c| -> tokio_rusqlite::Result<i64> {
        // already there?
        if let Ok(id) = c.query_row(
            "SELECT id FROM threads WHERE title=?1",
            [title.as_str()],
            |r| r.get(0),
        ) {
            return Ok(id);
        }

        // inspect schema
        let (has_profile_id, has_created_at) = {
            let mut has_profile_id = false;
            let mut has_created_at = false;
            let mut stmt = c.prepare("PRAGMA table_info(threads)")?;
            let mut rows = stmt.query([])?;
            while let Some(row) = rows.next()? {
                let col: String = row.get(1)?; // name
                if col == "profile_id" {
                    has_profile_id = true;
                }
                if col == "created_at" {
                    has_created_at = true;
                }
            }
            (has_profile_id, has_created_at)
        };

        // choose insert shape based on available columns
        match (has_profile_id, has_created_at) {
            (true, true) => {
                c.execute(
                    "INSERT INTO threads(title, profile_id, created_at)
                         VALUES(?1, (SELECT id FROM profiles WHERE name='Raz'), ?2)",
                    rusqlite::params![title.as_str(), now.as_str()],
                )?;
            }
            (false, true) => {
                c.execute(
                    "INSERT INTO threads(title, created_at) VALUES(?1, ?2)",
                    rusqlite::params![title.as_str(), now.as_str()],
                )?;
            }
            (true, false) => {
                c.execute(
                    "INSERT INTO threads(title, profile_id)
                         VALUES(?1, (SELECT id FROM profiles WHERE name='Raz'))",
                    rusqlite::params![title.as_str()],
                )?;
            }
            (false, false) => {
                c.execute(
                    "INSERT INTO threads(title) VALUES(?1)",
                    rusqlite::params![title.as_str()],
                )?;
            }
        }

        Ok(c.last_insert_rowid())
    })
    .await
    .unwrap()
}

// returns count imported and a list of thread titles (only for threads that actually imported msgs)
async fn import_openai_folder(
    db: &Database,
    root: &str,
    privacy: &str,
) -> anyhow::Result<(i64, Vec<String>)> {
    use std::{fs::File, io::Read};

    // quick index to speed up dedup check (safe to run every time)
    db.0.call(|c| {
        c.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_thread_ts_role
                 ON messages(thread_id, ts, role)",
            [],
        )?;
        Ok(())
    })
    .await
    .unwrap();

    // find conversations.json on disk
    let candidates = [
        format!("{}/conversations.json", root),
        format!("{}/conversations/conversations.json", root),
    ];
    let path = candidates
        .iter()
        .find(|p| std::path::Path::new(p).exists())
        .ok_or_else(|| anyhow::anyhow!("conversations.json not found in {}", root))?;

    // read file
    let mut f = File::open(path)?;
    let mut buf = String::new();
    f.read_to_string(&mut buf)?;
    let convs: serde_json::Value = serde_json::from_str(&buf)?;

    // create/lookup profiles
    let user_pid = ensure_profile(db, "Raz").await;
    let asst_pid = ensure_profile(db, "GPT").await;
    let sys_pid = ensure_profile(db, "System").await;

    let convs = convs
        .as_array()
        .ok_or_else(|| anyhow::anyhow!("expected top-level array in conversations.json"))?;

    let mut imported_total = 0i64;
    let mut titles_imported = Vec::new();

    // helper: text extractor
    let msg_text = |m: &serde_json::Value| -> String {
        if let Some(parts) = m.pointer("/content/parts").and_then(|p| p.as_array()) {
            let t = parts
                .iter()
                .filter_map(|p| p.as_str())
                .collect::<Vec<_>>()
                .join("\n");
            if !t.trim().is_empty() {
                return t;
            }
        }
        if let Some(t) = m.get("content").and_then(|c| c.as_str()) {
            return t.to_string();
        }
        String::new()
    };

    for conv in convs {
        let title = conv
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("OpenAI import")
            .to_string();

        // collect & sort raw nodes
        let mut msgs: Vec<serde_json::Value> =
            if let Some(mapping) = conv.get("mapping").and_then(|m| m.as_object()) {
                mapping
                    .values()
                    .filter_map(|n| n.get("message").cloned())
                    .collect()
            } else if let Some(arr) = conv.get("messages").and_then(|v| v.as_array()) {
                arr.to_vec()
            } else {
                Vec::new()
            };

        msgs.sort_by(|a, b| {
            let ta = a
                .get("create_time")
                .and_then(|t| t.as_f64())
                .unwrap_or(f64::NEG_INFINITY);
            let tb = b
                .get("create_time")
                .and_then(|t| t.as_f64())
                .unwrap_or(f64::NEG_INFINITY);
            ta.partial_cmp(&tb)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| {
                    let ra = a
                        .pointer("/author/role")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let rb = b
                        .pointer("/author/role")
                        .and_then(|v| v.as_str())
                        .unwrap_or("");
                    let rank = |r: &str| match r {
                        "system" => 0,
                        "user" => 1,
                        "assistant" => 2,
                        _ => 3,
                    };
                    rank(ra).cmp(&rank(rb))
                })
        });

        // pre-filter to skip empty/system-only threads
        let mut filtered: Vec<(
            String, /*role*/
            String, /*ts*/
            String, /*text*/
            i64,    /*pid*/
        )> = Vec::new();
        let mut last_text = String::new();

        for m in msgs {
            let role = m
                .pointer("/author/role")
                .and_then(|r| r.as_str())
                .unwrap_or("assistant");
            if role == "system" {
                continue;
            } // drop system by default

            let pid = match role {
                "user" => user_pid,
                "assistant" => asst_pid,
                "system" => sys_pid,
                _ => asst_pid,
            };

            let ts = m
                .get("create_time")
                .and_then(|t| t.as_f64())
                .and_then(|s| chrono::DateTime::from_timestamp(s as i64, 0))
                .map(|dt| dt.to_rfc3339())
                .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

            let text = msg_text(&m).trim().to_string();
            if text.is_empty() {
                continue;
            }

            // skip trivial immediate duplicates in the export
            if text == last_text {
                continue;
            }
            last_text = text.clone();

            filtered.push((role.to_string(), ts, text, pid));
        }

        if filtered.is_empty() {
            continue;
        }

        // ensure a thread for this title
        let thread_id = ensure_thread_by_title(db, &title).await;
        let tags_json = serde_json::to_string(&vec!["openai-export"]).unwrap();
        let privacy = privacy.to_string();

        // transaction + dedup by (thread_id, role, ts, text)
        let inserted_count: i64 =
            db.0.call(move |c| {
                let tx = c.unchecked_transaction()?;

                let mut exists_stmt = tx.prepare(
                    "SELECT 1 FROM messages
                     WHERE thread_id=?1 AND role=?2 AND ts=?3 AND text=?4
                     LIMIT 1",
                )?;

                let mut insert_stmt = tx.prepare(
                    "INSERT INTO messages(thread_id,role,text,tags,profile_id,privacy,importance,ts)
                     VALUES(?,?,?,?,?,?,?,?)",
                )?;

                let mut inserted = 0i64;
                for (role, ts, text, pid) in filtered {
                    let already =
                        exists_stmt.exists(rusqlite::params![thread_id, role, ts, text])?;
                    if already {
                        continue;
                    }

                    insert_stmt.execute(rusqlite::params![
                        thread_id, role, text, tags_json, pid, privacy, 0i32, ts
                    ])?;
                    inserted += 1;
                }

                drop(exists_stmt);
                drop(insert_stmt);

                tx.commit()?;
                Ok(inserted)
            })
            .await
            .unwrap();

        if inserted_count > 0 {
            imported_total += inserted_count;
            titles_imported.push(title);
        }
    }

    Ok((imported_total, titles_imported))
}
