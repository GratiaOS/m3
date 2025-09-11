use crate::tells;
use crate::AppState;
use axum::http::StatusCode;
use axum::{extract::State, routing::get, routing::post, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct EmotionIn {
    pub who: String,
    pub kind: String,   // e.g. "impulsiveness", "panic", "joy"
    pub intensity: f32, // 0.0 - 1.0 scale
    pub note_id: Option<i64>,
    pub details: Option<String>,
    pub sealed: bool,
    pub archetype: Option<String>,
    pub privacy: String,
}

#[derive(Debug, Serialize)]
pub struct EmotionOut {
    pub id: i64,
    pub ts: String,
    pub who: String,
    pub kind: String,
    pub intensity: f32,
    pub note_id: Option<i64>,
    pub details: Option<String>,
    pub sealed: bool,
    pub archetype: Option<String>,
    pub privacy: String,
}

#[derive(Debug, Deserialize)]
pub struct BridgeIn {
    pub kind: String,   // e.g. "anxiety", "anger", "shame"
    pub intensity: f32, // 0.0..=1.0
}

#[derive(Debug, Serialize)]
pub struct BridgeOut {
    pub breath: &'static str,
    pub doorway: &'static str,
    pub anchor: &'static str,
}

fn bridge_table(label: &str, intensity_01: f32) -> BridgeOut {
    let l = label.to_ascii_lowercase();
    // Map 0.0..=1.0 → 0..=10 as coarse buckets
    let lvl: u8 = (intensity_01.clamp(0.0, 1.0) * 10.0).round() as u8;

    match l.as_str() {
        "anxiety" | "fear" => BridgeOut {
            breath: if lvl >= 6 {
                "box: in4-hold4-out6 × 4"
            } else {
                "double_exhale × 6"
            },
            doorway: "sip water, feet on floor",
            anchor: "Name 3 objects you see.",
        },
        "anger" => BridgeOut {
            breath: "in4-out8 × 6",
            doorway: "shake arms 30s, step outside",
            anchor: "Lower shoulders, soften jaw.",
        },
        "shame" => BridgeOut {
            breath: "4-6 breath × 6",
            doorway: "write 3 objective facts (no story)",
            anchor: "Hand over heart: 'still worthy'.",
        },
        "paradox" => BridgeOut {
            breath: "in4-out4 × 8",
            doorway: "touch ground + name 1 effort, 1 gift (no comparison)",
            anchor: "Whisper: 'neither above nor below — simply alive.'",
        },
        "gratitude" => BridgeOut {
            breath: "soft inhale, long exhale × 3",
            doorway: "write 3 one-line gratitudes",
            anchor: "🌬️ whisper: I am already held.",
        },
        _ => BridgeOut {
            breath: "double_exhale × 6",
            doorway: "stand_up + shoulder_roll",
            anchor: "Return to center.",
        },
    }
}

#[derive(Debug, Deserialize)]
pub struct ResolveIn {
    pub who: String,
    pub note_id: Option<i64>,
    pub details: Option<String>,
    pub sealed: Option<bool>,
    pub archetype: Option<String>,
    pub privacy: Option<String>,
}

async fn resolve_emotion(
    State(state): State<AppState>,
    Json(input): Json<ResolveIn>,
) -> Result<Json<EmotionOut>, StatusCode> {
    // Validate/normalize
    let who = input.who.trim().to_owned();
    if who.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    let note_id = input.note_id;
    let details = input.details;

    let sealed: bool = input.sealed.unwrap_or(false);
    let archetype: Option<String> = input.archetype;
    let privacy: String = input
        .privacy
        .unwrap_or_else(|| "private".to_string())
        .trim()
        .to_owned();
    if privacy.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    // Land as gratitude @ intensity 1.0
    let ts = Utc::now().to_rfc3339();
    let kind = "gratitude".to_string();
    let intensity: f32 = 1.0;

    let inserted: EmotionOut = state
        .db
        .0
        .call(
            move |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<EmotionOut> {
                use rusqlite::params;
                conn.execute(
                    "INSERT INTO emotions(ts, who, kind, intensity, note_id, details, sealed, archetype, privacy)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    params![ts, who, kind, intensity, note_id, details, sealed, archetype, privacy],
                )?;
                let id = conn.last_insert_rowid();
                Ok(EmotionOut {
                    id,
                    ts,
                    who,
                    kind,
                    intensity,
                    note_id,
                    details,
                    sealed,
                    archetype,
                    privacy,
                })
            },
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Best-effort: create a tell for traceability (node=emotions.resolve).
    // Use the centralized tells helper so schema stays consistent.
    {
        let node = "emotions.resolve";
        let pre = inserted
            .details
            .as_deref()
            .map(|d| format!("details: {}", d))
            .unwrap_or_else(|| "details: -".to_string());
        let act = format!("gratitude by {}", inserted.who);
        let created_at = Some(inserted.ts.as_str());
        // Ignore errors so /emotions/resolve remains 200 OK even if tells table differs.
        let _ = tells::insert_tell(&state.db, node, &pre, &act, created_at).await;
    }

    Ok(Json(inserted))
}

async fn add_emotion(
    State(state): State<AppState>,
    Json(input): Json<EmotionIn>,
) -> Result<Json<EmotionOut>, StatusCode> {
    // Validate input before touching the DB
    if !(0.0_f32..=1.0_f32).contains(&input.intensity) {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    // Normalize and validate string fields
    let who = input.who.trim().to_owned();
    if who.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    let kind = input.kind.trim().to_owned();
    if kind.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    let privacy = input.privacy.trim().to_owned();
    if privacy.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    let note_id = input.note_id;
    let details = input.details;
    let intensity = input.intensity;
    let sealed = input.sealed;
    let archetype = input.archetype;

    let ts = Utc::now().to_rfc3339();
    let inserted: EmotionOut = state
        .db
        .0
        .call(
            move |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<EmotionOut> {
                use rusqlite::params;
                conn.execute(
                    "INSERT INTO emotions(ts, who, kind, intensity, note_id, details, sealed, archetype, privacy)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    params![ts, who, kind, intensity, note_id, details, sealed, archetype, privacy],
                )?;
                let id = conn.last_insert_rowid();
                Ok(EmotionOut {
                    id,
                    ts,
                    who,
                    kind,
                    intensity,
                    note_id,
                    details,
                    sealed,
                    archetype,
                    privacy,
                })
            },
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(inserted))
}

async fn recent_emotions(
    State(state): State<AppState>,
) -> Result<Json<Vec<EmotionOut>>, StatusCode> {
    let out: Vec<EmotionOut> = state
        .db
        .0
        .call(
            move |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<Vec<EmotionOut>> {
                let mut stmt = conn.prepare(
                    "SELECT id, ts, who, kind, intensity, note_id, details, sealed, archetype, privacy
             FROM emotions
             ORDER BY ts DESC
             LIMIT 20",
                )?;

                let rows = stmt.query_map([], |row| {
                    Ok(EmotionOut {
                        id: row.get(0)?,
                        ts: row.get(1)?,
                        who: row.get(2)?,
                        kind: row.get(3)?,
                        intensity: row.get(4)?,
                        note_id: row.get(5)?,
                        details: row.get(6)?,
                        sealed: row.get(7)?,
                        archetype: row.get(8)?,
                        privacy: row.get(9)?,
                    })
                })?;

                let mut out = Vec::new();
                for row in rows {
                    out.push(row?);
                }
                Ok(out)
            },
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(out))
}

async fn feel_bridge(Json(body): Json<BridgeIn>) -> Result<Json<BridgeOut>, StatusCode> {
    // validate inputs (mirror EmotionIn rules)
    if !(0.0_f32..=1.0_f32).contains(&body.intensity) {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    let kind = body.kind.trim();
    if kind.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    Ok(Json(bridge_table(kind, body.intensity)))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/add", post(add_emotion))
        .route("/recent", get(recent_emotions))
        .route("/bridge", post(feel_bridge))
        .route("/resolve", post(resolve_emotion))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bridge_anxiety_low_uses_double_exhale() {
        let out = bridge_table("anxiety", 0.3);
        assert_eq!(out.breath, "double_exhale × 6");
        assert_eq!(out.doorway, "sip water, feet on floor");
        assert_eq!(out.anchor, "Name 3 objects you see.");
    }

    #[test]
    fn bridge_anxiety_high_uses_box_breath() {
        let out = bridge_table("fear", 0.8);
        assert_eq!(out.breath, "box: in4-hold4-out6 × 4");
        assert_eq!(out.doorway, "sip water, feet on floor");
        assert_eq!(out.anchor, "Name 3 objects you see.");
    }

    #[test]
    fn bridge_anger_pattern() {
        let out = bridge_table("anger", 0.5);
        assert_eq!(out.breath, "in4-out8 × 6");
        assert_eq!(out.doorway, "shake arms 30s, step outside");
        assert_eq!(out.anchor, "Lower shoulders, soften jaw.");
    }

    #[test]
    fn bridge_shame_pattern() {
        let out = bridge_table("shame", 0.2);
        assert_eq!(out.breath, "4-6 breath × 6");
        assert_eq!(out.doorway, "write 3 objective facts (no story)");
        assert_eq!(out.anchor, "Hand over heart: 'still worthy'.");
    }

    #[test]
    fn bridge_paradox_pattern() {
        let out = bridge_table("paradox", 0.5);
        assert_eq!(out.breath, "in4-out4 × 8");
        assert_eq!(
            out.doorway,
            "touch ground + name 1 effort, 1 gift (no comparison)"
        );
        assert_eq!(
            out.anchor,
            "Whisper: 'neither above nor below — simply alive.'"
        );
    }

    #[test]
    fn bridge_gratitude_has_whisper() {
        let out = bridge_table("gratitude", 0.4);
        assert_eq!(out.breath, "soft inhale, long exhale × 3");
        assert_eq!(out.doorway, "write 3 one-line gratitudes");
        assert_eq!(out.anchor, "🌬️ whisper: I am already held.");
    }

    #[test]
    fn bridge_default_fallback() {
        let out = bridge_table("unknown", 0.9);
        assert_eq!(out.breath, "double_exhale × 6");
        assert_eq!(out.doorway, "stand_up + shoulder_roll");
        assert_eq!(out.anchor, "Return to center.");
    }

    #[test]
    fn intensity_is_clamped() {
        // below 0.0 should clamp to 0.0 -> low
        let low = bridge_table("anxiety", -5.0);
        assert_eq!(low.breath, "double_exhale × 6");

        // above 1.0 should clamp to 1.0 -> high
        let high = bridge_table("anxiety", 5.0);
        assert_eq!(high.breath, "box: in4-hold4-out6 × 4");
    }

    #[test]
    fn kind_case_insensitive() {
        let out1 = bridge_table("AnXiEtY", 0.7);
        let out2 = bridge_table("ANXIETY", 0.7);
        assert_eq!(out1.breath, out2.breath);
        assert_eq!(out1.doorway, out2.doorway);
        assert_eq!(out1.anchor, out2.anchor);
    }
}
