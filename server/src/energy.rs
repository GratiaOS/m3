use crate::AppState;
use axum::http::StatusCode;
use axum::{
    extract::Json,
    extract::State,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// CANONICAL ENERGY KINDS
// ============================================================================

/// Standard energy kinds used in M3
/// These map to the Energy Calendar bands (E0-E4)
pub const ENERGY_KINDS: &[&str] = &["crown", "dragon", "play", "life", "void"];

/// Threshold for determining if energy level is stable vs trending
/// Values within this threshold of the average are considered stable
const TREND_THRESHOLD: f32 = 0.1;

/// Get a human-readable label for an energy kind
pub fn energy_label(kind: &str) -> &'static str {
    match kind {
        "crown" => "Crown (E4)",
        "dragon" => "Dragon (E3)",
        "play" => "Play (E2)",
        "life" => "Life Force (E1)",
        "void" => "Void (E0)",
        _ => "Unknown",
    }
}

/// Calculate trend direction based on current level, average, and sample count
fn calculate_direction(current: f32, avg_24h: f32, samples_24h: i64) -> String {
    if samples_24h == 0 {
        "no_data".to_string()
    } else if (current - avg_24h).abs() < TREND_THRESHOLD {
        "stable".to_string()
    } else if current > avg_24h {
        "up".to_string()
    } else {
        "down".to_string()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EnergyMark {
    pub id: i64,
    pub ts: String,
    pub who: String,
    pub kind: String,
    pub level: f32,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct NewEnergyMark {
    pub who: String,
    pub kind: String,
    pub level: f32,
    pub note: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct EnergyTrend {
    pub kind: String,
    pub label: String,
    pub current: f32,
    pub avg_24h: f32,
    pub direction: String, // "up" | "down" | "stable" | "no_data"
    pub samples_24h: i64,
}

pub async fn mark_energy(
    State(state): State<AppState>,
    Json(payload): Json<NewEnergyMark>,
) -> Result<Json<EnergyMark>, (StatusCode, String)> {
    let NewEnergyMark {
        who,
        kind,
        level,
        note,
    } = payload;
    let db = state.db.clone();

    let insert_result = db
        .0
        .call(
            move |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<EnergyMark> {
                use rusqlite::params;
                conn.execute(
                    "INSERT INTO energy_marks (ts, who, kind, level, note) VALUES (datetime('now'), ?, ?, ?, ?)",
                    params![who, kind, level, note],
                )?;
                let id = conn.last_insert_rowid();
                let mut stmt = conn.prepare(
                    "SELECT id, ts, who, kind, level, note FROM energy_marks WHERE id = ?",
                )?;
                let energy_mark = stmt.query_row([id], |row| {
                    Ok(EnergyMark {
                        id: row.get(0)?,
                        ts: row.get(1)?,
                        who: row.get(2)?,
                        kind: row.get(3)?,
                        level: row.get(4)?,
                        note: row.get(5)?,
                    })
                })?;
                Ok(energy_mark)
            },
        )
        .await;

    match insert_result {
        Ok(energy_mark) => Ok(Json(energy_mark)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub async fn get_state(
    State(state): State<AppState>,
) -> Result<Json<HashMap<String, f32>>, (StatusCode, String)> {
    let db = state.db.clone();

    let query_result =
        db.0.call(
            |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<HashMap<String, f32>> {
                let mut stmt = conn.prepare(
                    "SELECT kind, level FROM energy_marks WHERE id IN (
                        SELECT MAX(id) FROM energy_marks GROUP BY kind
                    )",
                )?;
                let mut rows = stmt.query([])?;
                let mut state_map: HashMap<String, f32> = HashMap::new();
                while let Some(row) = rows.next()? {
                    let kind: String = row.get(0)?;
                    let level: f32 = row.get(1)?;
                    state_map.insert(kind, level);
                }
                Ok(state_map)
            },
        )
        .await;

    match query_result {
        Ok(state) => Ok(Json(state)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

/// GET /energy/trends — analyze energy evolution over time
pub async fn get_trends(
    State(state): State<AppState>,
) -> Result<Json<Vec<EnergyTrend>>, (StatusCode, String)> {
    let db = state.db.clone();

    let result =
        db.0.call(
            |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<Vec<EnergyTrend>> {
                let mut trends = Vec::new();

                for &kind in ENERGY_KINDS {
                    // Get current level (most recent mark)
                    let current: f32 = conn
                        .query_row(
                            "SELECT level FROM energy_marks 
                         WHERE kind = ?1 
                         ORDER BY id DESC LIMIT 1",
                            [kind],
                            |row| row.get(0),
                        )
                        .unwrap_or(0.0);

                    // Get 24h average
                    let avg_24h: f32 = conn
                        .query_row(
                            "SELECT AVG(level) FROM energy_marks 
                         WHERE kind = ?1 
                         AND ts > datetime('now', '-24 hours')",
                            [kind],
                            |row| row.get(0),
                        )
                        .unwrap_or(0.0);

                    // Count samples in last 24h (to assess confidence)
                    let samples_24h: i64 = conn
                        .query_row(
                            "SELECT COUNT(*) FROM energy_marks 
                         WHERE kind = ?1 
                         AND ts > datetime('now', '-24 hours')",
                            [kind],
                            |row| row.get(0),
                        )
                        .unwrap_or(0);

                    // Determine direction using helper function
                    let direction = calculate_direction(current, avg_24h, samples_24h);

                    trends.push(EnergyTrend {
                        kind: kind.to_string(),
                        label: energy_label(kind).to_string(),
                        current,
                        avg_24h,
                        direction,
                        samples_24h,
                    });
                }

                Ok(trends)
            },
        )
        .await;

    match result {
        Ok(trends) => Ok(Json(trends)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/mark", post(mark_energy))
        .route("/state", get(get_state))
        .route("/trends", get(get_trends))
}

#[cfg(test)]
mod tests {
    use super::{calculate_direction, energy_label};
    use rusqlite::{params, Connection};
    use std::collections::HashMap;

    /// Create an in-memory SQLite DB with the `energy_marks` table,
    /// matching the columns used by the module.
    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("open :memory:");
        conn.execute(
            "CREATE TABLE energy_marks (
                id     INTEGER PRIMARY KEY AUTOINCREMENT,
                ts     TEXT    NOT NULL,
                who    TEXT    NOT NULL,
                kind   TEXT    NOT NULL,
                level  REAL    NOT NULL,
                note   TEXT
             )",
            [],
        )
        .expect("create table");
        conn
    }

    #[test]
    fn latest_per_kind_query_returns_last_levels() {
        let conn = setup_conn();

        // Insert some rows; later inserts should have higher ids
        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "2025-01-01T00:00:00Z",
                "Raz",
                "dragon",
                0.2_f32,
                Option::<String>::None
            ],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "2025-01-01T00:05:00Z",
                "Raz",
                "dragon",
                0.8_f32,
                Option::<String>::None
            ],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "2025-01-01T00:10:00Z",
                "Raz",
                "play",
                0.4_f32,
                Some("hoops")
            ],
        )
        .unwrap();

        // Run the same query as `get_state`
        let mut stmt = conn
            .prepare(
                "SELECT kind, level FROM energy_marks WHERE id IN (
                    SELECT MAX(id) FROM energy_marks GROUP BY kind
                )",
            )
            .unwrap();

        let mut rows = stmt.query([]).unwrap();
        let mut got: HashMap<String, f32> = HashMap::new();
        while let Some(row) = rows.next().unwrap() {
            let k: String = row.get(0).unwrap();
            let v: f32 = row.get(1).unwrap();
            got.insert(k, v);
        }

        // Expect only the latest per kind: dragon=0.8, play=0.4
        assert_eq!(got.get("dragon").copied(), Some(0.8_f32));
        assert_eq!(got.get("play").copied(), Some(0.4_f32));
        // And nothing else
        assert_eq!(got.len(), 2);
    }

    #[test]
    fn autoincrement_behaves_as_recency_proxy() {
        let conn = setup_conn();

        // Two entries for the same kind with different levels.
        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "2025-01-01T01:00:00Z",
                "Raz",
                "heart",
                0.3_f32,
                Option::<String>::None
            ],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                "2025-01-01T01:10:00Z",
                "Raz",
                "heart",
                0.9_f32,
                Option::<String>::None
            ],
        )
        .unwrap();

        let latest_level: f32 = {
            let mut stmt = conn
                .prepare(
                    "SELECT level FROM energy_marks
                     WHERE id = (SELECT MAX(id) FROM energy_marks WHERE kind = 'heart')",
                )
                .unwrap();
            stmt.query_row([], |row| row.get(0)).unwrap()
        };

        assert!(
            (latest_level - 0.9_f32).abs() < 1e-6,
            "expected latest level 0.9, got {latest_level}"
        );
    }

    #[test]
    fn energy_label_returns_correct_labels() {
        assert_eq!(energy_label("crown"), "Crown (E4)");
        assert_eq!(energy_label("dragon"), "Dragon (E3)");
        assert_eq!(energy_label("play"), "Play (E2)");
        assert_eq!(energy_label("life"), "Life Force (E1)");
        assert_eq!(energy_label("void"), "Void (E0)");
        assert_eq!(energy_label("unknown"), "Unknown");
    }

    #[test]
    fn trends_calculates_direction_correctly() {
        let conn = setup_conn();

        // Insert marks with decreasing dragon energy
        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (datetime('now', '-23 hours'), 'Raz', 'dragon', 0.9, NULL)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (datetime('now', '-12 hours'), 'Raz', 'dragon', 0.6, NULL)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (datetime('now', '-1 hour'), 'Raz', 'dragon', 0.3, NULL)",
            [],
        )
        .unwrap();

        // Calculate trend
        let current: f32 = conn
            .query_row(
                "SELECT level FROM energy_marks WHERE kind = 'dragon' ORDER BY id DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap();

        let avg_24h: f32 = conn
            .query_row(
                "SELECT AVG(level) FROM energy_marks WHERE kind = 'dragon' AND ts > datetime('now', '-24 hours')",
                [],
                |row| row.get(0),
            )
            .unwrap();

        // Current = 0.3, avg = (0.9 + 0.6 + 0.3) / 3 = 0.6
        assert!((current - 0.3).abs() < 0.01);
        assert!((avg_24h - 0.6).abs() < 0.01);

        // Direction should be "down" using the helper function
        let direction = calculate_direction(current, avg_24h, 2);

        assert_eq!(direction, "down");
    }

    #[test]
    fn trends_returns_no_data_when_empty() {
        let conn = setup_conn();

        let samples: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM energy_marks WHERE kind = 'dragon' AND ts > datetime('now', '-24 hours')",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(samples, 0);

        // Use the helper function to calculate direction
        let direction = calculate_direction(0.0, 0.0, samples);

        assert_eq!(direction, "no_data");
    }
}
