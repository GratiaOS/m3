//! m3-memory-server — library surface for hermetic tests and embedding.
//! ---------------------------------------------------------------
//! This lib exposes a minimal, stable API so tests or external tools
//! can spin up the same router and state as the binary. It mirrors the
//! public HTTP surface you mount in `main.rs` without requiring a TCP port.
//!
//! What you get here:
//! - `AppState` (minimal shared state: DB handle)
//! - `init_state()` (open DB and ensure schema)
//! - `app_router(state)` (Axum router with the same nests as the binary)
//!
//! Notes for contributors:
//! • Keep `AppState` minimal and cloneable.
//! • Add new routers here when you add new modules (e.g., /panic).
//! • Prefer keeping module headers canonical (see Garden stamps guide 🌱).

pub mod db;
pub mod models;

// HTTP feature modules (mounted under their prefixes)
pub mod consciousness;
pub mod cycles;
pub mod emotions;
pub mod tells;
pub mod towns;
pub mod value;

use axum::{routing::get, Json, Router};
use serde::Serialize;

/// Shared application state (minimal). Must stay in sync with module usage.
/// Other modules read `state.db` today; grow carefully.
#[derive(Clone)]
pub struct AppState {
    pub db: db::Database,
}

#[derive(Serialize)]
struct Health {
    ok: bool,
}

/// Build the application router (library variant).
/// Mirrors the mounts in the binary so hermetic tests can use it directly.
pub fn app_router(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .nest("/tells", tells::router())
        .nest("/emotions", emotions::router())
        .nest("/value", value::router())
        .nest("/cycles", cycles::router())
        .nest("/towns", towns::router())
        .with_state(state)
}

async fn health() -> Json<Health> {
    Json(Health { ok: true })
}

/// Initialize state (open DB + run schema). Use in tests or embedding.
pub async fn init_state() -> anyhow::Result<AppState> {
    let db = db::init_db().await?;
    Ok(AppState { db })
}
