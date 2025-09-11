// server/src/timeline.rs
use crate::AppState;
use axum::{extract::Query, extract::State, routing::get, Json, Router};
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct TimelineItem {
    pub id: String,     // namespaced id: "<source>:<row_id>"
    pub ts: String,     // RFC3339
    pub source: String, // "emotion" | "gratitude" | "energy" | "tell"
    pub title: String,  // short label: kind / subject / node / energy:kind
    pub subtitle: String,
    pub meta: serde_json::Value,
}

#[derive(Debug, serde::Deserialize)]
pub struct RecentQuery {
    #[serde(default)]
    pub limit: Option<i64>,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/recent", get(recent))
}

async fn recent(
    State(state): State<AppState>,
    Query(q): Query<RecentQuery>,
) -> Result<Json<Vec<TimelineItem>>, axum::http::StatusCode> {
    let limit = q.limit.unwrap_or(40).clamp(1, 200);

    // emotions (including gratitude rows from /emotions/resolve)
    let emotions: Vec<TimelineItem> = state
        .db
        .0
        .call(move |c| -> tokio_rusqlite::Result<_> {
            let mut out = Vec::new();
            let mut st = c.prepare(
                "SELECT id, ts, who, kind, intensity, details, privacy, sealed, archetype
             FROM emotions
             ORDER BY ts DESC
             LIMIT ?1",
            )?;
            let it = st.query_map([limit], |r| {
                let id: i64 = r.get(0)?;
                let ts: String = r.get(1)?;
                let who: String = r.get(2)?;
                let kind: String = r.get(3)?;
                let intensity: f32 = r.get(4)?;
                let details: Option<String> = r.get(5)?;
                let privacy: Option<String> = r.get(6)?;
                let sealed: Option<i64> = r.get(7).ok(); // 0/1 in some schemas
                let archetype: Option<String> = r.get(8).ok();

                let is_sealed = privacy.as_deref() == Some("sealed") || sealed.unwrap_or(0) != 0;
                let subtitle = if is_sealed {
                    "(sealed)".to_string()
                } else {
                    details.unwrap_or_default()
                };

                Ok(TimelineItem {
                    id: format!("emotion:{id}"),
                    ts,
                    source: "emotion".into(),
                    title: kind.clone(),
                    subtitle,
                    meta: serde_json::json!({
                        "who": who,
                        "intensity": intensity,
                        "privacy": privacy.unwrap_or_else(|| "public".into()),
                        "archetype": archetype
                    }),
                })
            })?;
            for row in it {
                out.push(row?);
            }
            Ok(out)
        })
        .await
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    // gratitude (thanks table)
    let gratitude: Vec<TimelineItem> = state
        .db
        .0
        .call(move |c| -> tokio_rusqlite::Result<_> {
            let mut out = Vec::new();
            let mut st = c.prepare(
                "SELECT id, ts, who, subject, details, kind, note_id
             FROM gratitude
             ORDER BY ts DESC
             LIMIT ?1",
            )?;
            let it = st.query_map([limit], |r| {
                let id: i64 = r.get(0)?;
                let ts: String = r.get(1)?;
                let who: Option<String> = r.get(2)?;
                let subject: String = r.get(3)?;
                let details: Option<String> = r.get(4)?;
                let gkind: Option<String> = r.get(5)?;
                let note_id: Option<i64> = r.get(6)?;
                Ok(TimelineItem {
                    id: format!("thanks:{id}"),
                    ts,
                    source: "gratitude".into(),
                    title: "gratitude".into(),
                    subtitle: if subject.is_empty() {
                        details.clone().unwrap_or_default()
                    } else {
                        subject
                    },
                    meta: serde_json::json!({
                        "who": who,
                        "details": details,
                        "kind": gkind,
                        "note_id": note_id
                    }),
                })
            })?;
            for row in it {
                out.push(row?);
            }
            Ok(out)
        })
        .await
        .unwrap_or_default(); // table may not exist in some envs

    // energy marks
    let energy: Vec<TimelineItem> = state
        .db
        .0
        .call(move |c| -> tokio_rusqlite::Result<_> {
            let mut out = Vec::new();
            let mut st = c.prepare(
                "SELECT id, ts, who, kind, level, note
             FROM energy_marks
             ORDER BY id DESC
             LIMIT ?1",
            )?;
            let it = st.query_map([limit], |r| {
                let id: i64 = r.get(0)?;
                let ts: String = r.get(1)?;
                let who: String = r.get(2)?;
                let kind: String = r.get(3)?;
                let level: f32 = r.get(4)?;
                let note: Option<String> = r.get(5)?;
                Ok(TimelineItem {
                    id: format!("energy:{id}"),
                    ts,
                    source: "energy".into(),
                    title: format!("energy:{}", kind),
                    subtitle: format!(
                        "{:.2}{}",
                        level,
                        note.as_deref()
                            .map(|n| format!(" — {}", n))
                            .unwrap_or_default()
                    ),
                    meta: serde_json::json!({ "who": who, "level": level, "note": note }),
                })
            })?;
            for row in it {
                out.push(row?);
            }
            Ok(out)
        })
        .await
        .unwrap_or_default();

    // tells (be robust to either schema variant)
    let tells: Vec<TimelineItem> = state
        .db
        .0
        .call(move |c| -> tokio_rusqlite::Result<_> {
            let mut out = Vec::new();

            // variant A (main.rs recent): created_at + pre_activation/action
            if let Ok(mut st) = c.prepare(
                "SELECT id, created_at, node, pre_activation, action
             FROM tells
             ORDER BY id DESC
             LIMIT ?1",
            ) {
                let it = st.query_map([limit], |r| {
                    let id: i64 = r.get(0)?;
                    let ts: String = r.get(1)?;
                    let node: String = r.get(2)?;
                    let pre: Option<String> = r.get(3).ok();
                    let act: Option<String> = r.get(4).ok();
                    let sub = match (pre, act) {
                        (Some(p), Some(a)) => format!("{} | {}", p, a),
                        (Some(p), None) => p,
                        (None, Some(a)) => a,
                        _ => String::new(),
                    };
                    Ok(TimelineItem {
                        id: format!("tell:{id}"),
                        ts,
                        source: "tell".into(),
                        title: node,
                        subtitle: sub,
                        meta: serde_json::json!({}),
                    })
                })?;
                for row in it {
                    out.push(row?);
                }
                return Ok(out);
            }

            // variant B (tells.rs recent): ts + note/details
            if let Ok(mut st) = c.prepare(
                "SELECT id, ts, node, note, details
             FROM tells
             ORDER BY ts DESC
             LIMIT ?1",
            ) {
                let it = st.query_map([limit], |r| {
                    let id: i64 = r.get(0)?;
                    let ts: String = r.get(1)?;
                    let node: String = r.get(2)?;
                    let note: String = r.get(3)?;
                    let details: String = r.get(4)?;
                    let sub = if !note.is_empty() && !details.is_empty() {
                        format!("{} — {}", note, details)
                    } else {
                        note + &details
                    };
                    Ok(TimelineItem {
                        id: format!("tell:{id}"),
                        ts,
                        source: "tell".into(),
                        title: node,
                        subtitle: sub,
                        meta: serde_json::json!({}),
                    })
                })?;
                for row in it {
                    out.push(row?);
                }
            }

            Ok(out)
        })
        .await
        .unwrap_or_default();

    // merge + sort newest first (by ts)
    let mut all = Vec::new();
    all.extend(emotions);
    all.extend(gratitude);
    all.extend(energy);
    all.extend(tells);

    all.sort_by(|a, b| b.ts.cmp(&a.ts));
    // re-limit after merge so sources don't overflow overall window
    if all.len() > limit as usize {
        all.truncate(limit as usize);
    }

    Ok(Json(all))
}
