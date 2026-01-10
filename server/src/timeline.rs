//! M3 timeline endpoints weave cross-domain events into the digital intelligence field.
//! Vision map: docs/vision/digital-intelligence.md
//! Human remembrance: docs/marks/digital-intelligence-remembrance.md
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

fn per_source_limit_for(limit: i64) -> i64 {
    let safe = limit.clamp(1, 200);
    (safe * 2).clamp(1, 400)
}

async fn recent(
    State(state): State<AppState>,
    Query(q): Query<RecentQuery>,
) -> Result<Json<Vec<TimelineItem>>, axum::http::StatusCode> {
    let limit = q.limit.unwrap_or(40).clamp(1, 200);
    // Per-source limit: fetch more to ensure mix survives final truncation
    let per_source_limit = per_source_limit_for(limit);

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
            let it = st.query_map([per_source_limit], |r| {
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
            let it = st.query_map([per_source_limit], |r| {
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
            // NOTE: Order by ts, not id — keeps the global merge truly time-based.
            let mut st = c.prepare(
                "SELECT id, ts, who, kind, level, note
                FROM energy_marks
                ORDER BY ts DESC
                LIMIT ?1",
            )?;
            let it = st.query_map([per_source_limit], |r| {
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
             ORDER BY created_at DESC
             LIMIT ?1",
            ) {
                let it = st.query_map([per_source_limit], |r| {
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
                let it = st.query_map([per_source_limit], |r| {
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

    // merge + sort newest first (by ts, with robust DateTime parsing)
    let mut all = Vec::new();
    all.extend(emotions);
    all.extend(gratitude);
    all.extend(energy);
    all.extend(tells);

    // Robust sort: parse ts as DateTime when possible, fallback to string compare
    sort_timeline_items(&mut all);

    // re-limit after merge so sources don't overflow overall window
    if all.len() > limit as usize {
        all.truncate(limit as usize);
    }

    Ok(Json(all))
}

fn timeline_sort_key(ts: &str) -> String {
    use chrono::SecondsFormat;

    chrono::DateTime::parse_from_rfc3339(ts)
        .map(|dt| dt.with_timezone(&chrono::Utc).to_rfc3339_opts(SecondsFormat::Secs, true))
        .unwrap_or_else(|_| ts.to_string())
}

fn sort_timeline_items(items: &mut [TimelineItem]) {
    items.sort_by_key(|item| std::cmp::Reverse(timeline_sort_key(&item.ts)));
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{bus::Bus, config::Config, db, replies::ReplyEngine, webhook::Webhook};
    use axum::{http::Request, Router};
    use hyper::body::to_bytes;
    use std::sync::{Arc, Mutex};
    use tokio_rusqlite::Connection as AsyncConnection;
    use tower::ServiceExt;

    #[derive(serde::Deserialize)]
    struct TimelineItemOut {
        id: String,
        ts: String,
        source: String,
    }

    async fn make_state_for_test() -> AppState {
        let conn = AsyncConnection::open_in_memory().await.unwrap();
        conn.call(|c| db::ensure_schema(c)).await.unwrap();
        let db = db::Database(conn);
        AppState {
            db,
            bus: Bus::default(),
            key: Arc::new(Mutex::new(None)),
            config: Config::from_env(),
            webhook: Webhook::new(None, None),
            reply_engine: ReplyEngine::from_env(),
        }
    }

    fn item(ts: &str) -> TimelineItem {
        TimelineItem {
            id: "test:1".into(),
            ts: ts.into(),
            source: "test".into(),
            title: "test".into(),
            subtitle: String::new(),
            meta: serde_json::json!({}),
        }
    }

    #[test]
    fn sort_by_rfc3339_desc() {
        let mut items = vec![
            item("2026-01-07T10:12:00Z"),
            item("2025-01-07T10:12:00Z"),
            item("2026-01-07T10:12:05Z"),
        ];

        sort_timeline_items(&mut items);

        let ordered: Vec<&str> = items.iter().map(|entry| entry.ts.as_str()).collect();
        assert_eq!(
            ordered,
            vec![
                "2026-01-07T10:12:05Z",
                "2026-01-07T10:12:00Z",
                "2025-01-07T10:12:00Z",
            ]
        );
    }

    #[test]
    fn sort_falls_back_to_lexicographic_for_invalid() {
        let mut items = vec![
            item("zzzz"),
            item("aaaa"),
            item("bbbb"),
        ];

        sort_timeline_items(&mut items);

        let ordered: Vec<&str> = items.iter().map(|entry| entry.ts.as_str()).collect();
        assert_eq!(ordered, vec!["zzzz", "bbbb", "aaaa"]);
    }

    #[test]
    fn sort_normalizes_offsets() {
        let mut items = vec![
            item("2026-01-07T14:12:00Z"),
            item("2026-01-07T10:12:00-05:00"),
        ];

        sort_timeline_items(&mut items);

        let ordered: Vec<&str> = items.iter().map(|entry| entry.ts.as_str()).collect();
        assert_eq!(ordered, vec!["2026-01-07T10:12:00-05:00", "2026-01-07T14:12:00Z"]);
    }

    #[test]
    fn per_source_limit_is_doubled_and_clamped() {
        assert_eq!(per_source_limit_for(1), 2);
        assert_eq!(per_source_limit_for(40), 80);
        assert_eq!(per_source_limit_for(200), 400);
        assert_eq!(per_source_limit_for(0), 2);
        assert_eq!(per_source_limit_for(999), 400);
    }

    #[tokio::test]
    async fn tells_are_ordered_by_created_at() {
        let state = make_state_for_test().await;

        state
            .db
            .0
            .call(|c| {
                c.execute(
                    "INSERT INTO tells(node, pre_activation, action, created_at) VALUES (?1, ?2, ?3, ?4)",
                    ["tell-one", "pre", "act", "2026-01-02T00:00:00Z"],
                )?;
                c.execute(
                    "INSERT INTO tells(node, pre_activation, action, created_at) VALUES (?1, ?2, ?3, ?4)",
                    ["tell-two", "pre", "act", "2026-01-01T00:00:00Z"],
                )?;
                Ok(())
            })
            .await
            .unwrap();

        let app = Router::new().nest("/timeline", router()).with_state(state);
        let res = app
            .oneshot(
                Request::builder()
                    .uri("/timeline/recent?limit=2")
                    .body(axum::body::Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        let body = to_bytes(res.into_body()).await.unwrap();
        let items: Vec<TimelineItemOut> = serde_json::from_slice(&body).unwrap();
        let tells: Vec<&TimelineItemOut> = items.iter().filter(|item| item.source == "tell").collect();

        assert_eq!(tells.len(), 2);
        assert_eq!(tells[0].id, "tell:1");
        assert_eq!(tells[0].ts, "2026-01-02T00:00:00Z");
    }
}
