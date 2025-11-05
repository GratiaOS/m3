//! Two‑Towns — simple shared bulletin over `tells`
//! -----------------------------------------------
//! Whisper: "let the towns tell each other." 🌬️
//!
//! Purpose
//!   • Give non-human/human "towns" a way to publish tiny headlines (news pings).
//!   • Store items in the existing `tells` table (no new schema).
//!   • Keep the API tiny so UI can experiment fast.
//!
//! Endpoints
//!   POST /towns/news
//!     Body: { town, headline, who?, note?, created_at? }
//!     Writes a row into `tells` with node="towns.news".
//!     Returns: { id, town, headline, who?, note?, created_at }
//!
//!   GET /towns/bulletin?limit=3&amp;town=cat
//!     Reads most recent headlines from `tells` (optionally filtered by town).
//!     Returns: [ { id, town, headline, who?, note?, created_at }, ... ]
//!
//! Data model (reused):
//!   tells(node TEXT, pre_activation TEXT, action TEXT, created_at TEXT, handled_at TEXT?)
//!   - node = "towns.news"
//!   - pre_activation = JSON object with { town, who?, note? }
//!   - action = headline text
//!
//! Notes
//!   • We parse `pre_activation` JSON when reading. If it doesn't parse, the row is skipped.
//!   • `created_at` defaults to now (RFC3339) if not provided.
//!   • No auth here; rely on deployment boundary. Add auth later if needed.

use axum::{
    extract::{Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use crate::AppState;

/// Payload for POST /towns/news
#[derive(Debug, Deserialize)]
pub struct NewsIn {
    /// Town label, e.g. "cat", "human", "garden".
    pub town: String,
    /// Headline text to surface in the bulletin.
    pub headline: String,
    /// Optional author/source.
    pub who: Option<String>,
    /// Optional extra line (context/whisper).
    pub note: Option<String>,
    /// Optional created_at override (RFC3339); defaults to now.
    pub created_at: Option<String>,
}

/// Response item for both POST and GET.
#[derive(Debug, Serialize)]
pub struct NewsOut {
    pub id: i64,
    pub town: String,
    pub headline: String,
    pub who: Option<String>,
    pub note: Option<String>,
    pub created_at: String,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/news", post(post_news))
        .route("/bulletin", get(get_bulletin))
}

/// Insert a single bulletin item.
async fn post_news(
    State(state): State<AppState>,
    Json(input): Json<NewsIn>,
) -> Result<Json<NewsOut>, axum::http::StatusCode> {
    // Validate + normalize
    let town: String = input.town.trim().to_owned();
    let headline: String = input.headline.trim().to_owned();
    if town.is_empty() || headline.is_empty() {
        return Err(axum::http::StatusCode::UNPROCESSABLE_ENTITY);
    }
    let who_opt: Option<String> = input
        .who
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_owned());
    let note_opt: Option<String> = input
        .note
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_owned());
    let created_at: String = input.created_at.unwrap_or_else(|| Utc::now().to_rfc3339());

    // Build pre_activation JSON
    let mut pre = serde_json::Map::new();
    pre.insert("town".to_string(), serde_json::Value::String(town.clone()));
    if let Some(ref who) = who_opt {
        pre.insert("who".to_string(), serde_json::Value::String(who.clone()));
    }
    if let Some(ref note) = note_opt {
        pre.insert("note".to_string(), serde_json::Value::String(note.clone()));
    }
    let pre_activation: String = serde_json::Value::Object(pre).to_string();

    // clone small strings for SQL bind parameters; keep originals to return
    let pre_activation_s = pre_activation.clone();
    let headline_s = headline.clone();
    let created_at_s = created_at.clone();

    let (id, out_town, out_headline, out_who, out_note, out_created) = state
        .db
        .0
        .call(move |c| {
            c.execute(
                "INSERT INTO tells(node, pre_activation, action, created_at, handled_at)
             VALUES('towns.news', ?1, ?2, ?3, NULL)",
                params![pre_activation_s, headline_s, created_at_s],
            )?;
            let id = c.last_insert_rowid();
            Ok((id, town, headline, who_opt, note_opt, created_at))
        })
        .await
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(NewsOut {
        id,
        town: out_town,
        headline: out_headline,
        who: out_who,
        note: out_note,
        created_at: out_created,
    }))
}

#[derive(Debug, Deserialize)]
struct BulletinParams {
    /// Optional filter for a specific town label (e.g., "cat").
    town: Option<String>,
    /// Max items to return (default 3; 1..=100).
    limit: Option<usize>,
}

/// Read recent bulletin items.
async fn get_bulletin(
    State(state): State<AppState>,
    Query(params): Query<BulletinParams>,
) -> Result<Json<Vec<NewsOut>>, axum::http::StatusCode> {
    let limit = params.limit.unwrap_or(3).clamp(1, 100);
    let town_filter = params
        .town
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(str::to_string);

    // Query `tells` newest first; optionally filter on town via a LIKE pattern.
    // We keep it simple; the JSON is tiny.
    let rows: Vec<(i64, String, String, String)> = state
        .db
        .0
        .call(move |c| {
            let mut sql = String::from(
                "SELECT id, pre_activation, action, created_at
             FROM tells
             WHERE node = 'towns.news'",
            );

            let mut args: Vec<String> = Vec::new();
            if let Some(town) = town_filter.as_ref() {
                // Escape LIKE wildcards (% and _) and quotes; use backslash as ESCAPE char.
                // This prevents unintended broad matches when town contains % or _.
                sql.push_str(" AND pre_activation LIKE ?1 ESCAPE '\\\\'");
                let escaped = town
                    .replace('\\', "\\\\")
                    .replace('%', "\\%")
                    .replace('_', "\\_")
                    .replace('\"', "\\\"");
                // JSON substring pattern: %"town":"<escaped>"%
                args.push(format!("%\"town\":\"{}\"%", escaped));
            }
            sql.push_str(" ORDER BY created_at DESC LIMIT ?X");
            sql = sql.replace("?X", &limit.to_string());

            if args.is_empty() {
                let mut stmt = c.prepare(&sql)?;
                let mut out = Vec::new();
                let mut iter = stmt.query([])?;
                while let Some(row) = iter.next()? {
                    out.push((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?));
                }
                Ok(out)
            } else {
                let mut stmt = c.prepare(&sql)?;
                let mut out = Vec::new();
                let mut iter = stmt.query(params![args[0]])?;
                while let Some(row) = iter.next()? {
                    out.push((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?));
                }
                Ok(out)
            }
        })
        .await
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    // Decode and map
    let mut out = Vec::new();
    for (id, pre_activation, action, created_at) in rows {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&pre_activation) {
            let town = v
                .get("town")
                .and_then(|x| x.as_str())
                .unwrap_or("")
                .to_string();
            if town.is_empty() {
                continue;
            }
            let who = v.get("who").and_then(|x| x.as_str()).map(|s| s.to_string());
            let note = v
                .get("note")
                .and_then(|x| x.as_str())
                .map(|s| s.to_string());
            out.push(NewsOut {
                id,
                town,
                headline: action,
                who,
                note,
                created_at,
            });
        }
    }

    Ok(Json(out))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn params_defaults() {
        let p = BulletinParams {
            town: None,
            limit: None,
        };
        assert_eq!(p.limit.unwrap_or(3).clamp(1, 100), 3);
    }
}
