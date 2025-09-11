use crate::db::Database;
use crate::{
    models::{CreateTellRequest, HandleTellRequest, Tell},
    AppState,
};
use axum::http::StatusCode;
use axum::{
    extract::{Query, State},
    routing::{get, post},
    Json, Router,
};

#[derive(serde::Deserialize)]
struct TellsQuery {
    limit: Option<i64>,
}

/// Insert a Tell row (schema used by this crate) and return its id.
/// Convenience so other modules (e.g., emotions, panic) can log traceability events
/// without duplicating SQL. `created_at` defaults to now() if None.
pub async fn insert_tell(
    db: &Database,
    node: &str,
    pre_activation: &str,
    action: &str,
    created_at: Option<&str>,
) -> Result<i64, tokio_rusqlite::Error> {
    let node = node.to_string();
    let pre = pre_activation.to_string();
    let act = action.to_string();
    let ts = created_at
        .map(|s| s.to_string())
        .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

    db.0.call(move |c| {
        c.execute(
            "INSERT INTO tells(node, pre_activation, action, created_at) VALUES(?,?,?,?)",
            rusqlite::params![node, pre, act, ts],
        )?;
        Ok(c.last_insert_rowid())
    })
    .await
}

async fn list(State(state): State<AppState>, Query(q): Query<TellsQuery>) -> Json<Vec<Tell>> {
    let limit = q.limit.unwrap_or(50);
    let rows: Vec<Tell> = state
        .db
        .0
        .call(move |c| {
            let mut stmt = c.prepare(
                "SELECT id, node, pre_activation, action, created_at, handled_at
                 FROM tells ORDER BY id DESC LIMIT ?1",
            )?;
            let mut it = stmt.query(rusqlite::params![limit])?;
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

async fn create(
    State(state): State<AppState>,
    Json(req): Json<CreateTellRequest>,
) -> Json<serde_json::Value> {
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
                "INSERT INTO tells(node, pre_activation, action, created_at) VALUES(?,?,?,?)",
                rusqlite::params![node, pre, act, ts],
            )?;
            Ok(c.last_insert_rowid())
        })
        .await
        .unwrap();

    Json(serde_json::json!({ "id": id }))
}

async fn recent(State(state): State<AppState>) -> Json<Vec<Tell>> {
    let rows: Vec<Tell> = state
        .db
        .0
        .call(move |c| {
            let mut stmt = c.prepare(
                "SELECT id, node, pre_activation, action, created_at, handled_at
                 FROM tells ORDER BY id DESC LIMIT 20",
            )?;
            let mut it = stmt.query([])?;
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

async fn handle(
    State(state): State<AppState>,
    Json(req): Json<HandleTellRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
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
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(serde_json::json!({ "ok": true })))
}

/// Router to be mounted under `/tells`.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list).post(create))
        .route("/recent", get(recent))
        .route("/handle", post(handle))
}
