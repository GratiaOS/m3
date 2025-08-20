mod config;
mod webhook;
// mod auth; // keep if you actually use guards later

use config::Config;
use webhook::Webhook;
// use auth::WriteGuard;

mod bus;
mod db;
mod models;
mod replies;

use bus::Bus;
use chrono::Utc;
use db::*;
use models::*;
use std::{
    fs,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use axum::extract::State;
use axum::{
    extract::Query,
    http::{HeaderMap, Method},
    response::sse::{Event, Sse},
    routing::{get, post},
    Json, Router,
};
use futures_util::stream::StreamExt;
use replies::ReplyEngine;
use serde::Deserialize;
use serde_json::{json, Value};
use tokio::net::TcpListener;
use tokio_stream::wrappers::IntervalStream;
use tower::make::Shared;
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
use rand::RngCore;

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

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let db = init_db().await?;
    let _ = ensure_default_thread(&db).await; // or keep the id if you need it
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

    let bus = Bus::default();
    let state = AppState {
        db,
        bus,
        key: Arc::new(Mutex::new(None)),
        config,
        webhook,
        reply_engine,
    };

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

    // ---- build router ----
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

                    // profile_id via .call
                    let prof = profile.clone();
                    let profile_id: i64 = state
                        .db
                        .0
                        .call(move |c| {
                            let r: Result<i64, rusqlite::Error> = c.query_row(
                                "SELECT id FROM profiles WHERE name=?1",
                                [prof.as_str()],
                                |r| r.get(0),
                            );
                            Ok(r.unwrap_or(1))
                        })
                        .await
                        .unwrap();

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
                    fs::create_dir_all(&dir).ok();
                    let fname = format!(
                        "{}-thread-{}.md",
                        Utc::now().format("%Y-%m-%d_%H-%M"),
                        thread
                    );
                    let path = dir.join(fname);
                    fs::write(&path, out.0).unwrap();
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
                    fs::create_dir_all(&dir).ok();
                    let fname = format!(
                        "{}-thread-{}.csv",
                        Utc::now().format("%Y-%m-%d_%H-%M"),
                        thread
                    );
                    let path = dir.join(fname);
                    fs::write(&path, csv).unwrap();
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
                    // Read current row (two-layer unwrap)
                    let row_res: rusqlite::Result<(String, String, String, Option<String>)> =
                        state.db.0.call(|c| {
                            Ok(c.query_row(
                                "SELECT color, note, updated_at, expires_at FROM status WHERE id=1",
                                [],
                                |r| Ok::<_, rusqlite::Error>((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
                            ))
                        }).await.unwrap();

                    let (mut color, mut note, mut updated_at, expires_at_opt) = row_res.unwrap();

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
        .route(
            "/replies/preview",
            post({
                let _state = state.clone();
                move |State(state): State<AppState>, Json(req): Json<ReplyPreviewReq>| {
                    async move {
                        // generate reply (engine decides if the weekly window is active)
                        let preview = state.reply_engine.generate(&req.input).await;
                        Json(preview)
                    }
                }
            }),
        );

    // provide AppState to routes that extract `State<AppState>`
    let app = app.with_state(state.clone());

    // ---- CORS ----
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let app = app.layer(cors);

    // ---- serve ----
    let listener = TcpListener::bind(&state.config.bind).await?;
    tracing::info!("listening on {}", state.config.bind);
    axum::serve(listener, Shared::new(app)).await?;

    Ok(())
}

// ensure a profile name exists, return id
async fn ensure_profile(db: &Database, name: &str) -> i64 {
    let name = name.to_string();
    db.0.call(move |c| {
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

    db.0.call(move |c| {
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
