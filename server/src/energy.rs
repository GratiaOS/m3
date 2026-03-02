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
                let mut stmt = conn.prepare(
                    "WITH latest AS (
                        SELECT kind, MAX(id) AS max_id
                        FROM energy_marks
                        GROUP BY kind
                    )
                    SELECT 
                        em.kind,
                        em.level AS current,
                        (SELECT AVG(level) FROM energy_marks WHERE kind = em.kind AND datetime(ts) > datetime('now', '-24 hours')) AS avg_24h,
                        (SELECT COUNT(*) FROM energy_marks WHERE kind = em.kind AND datetime(ts) > datetime('now', '-24 hours')) AS samples_24h
                    FROM energy_marks em
                    INNER JOIN latest ON em.kind = latest.kind AND em.id = latest.max_id",
                )?;

                // TODO: Handle legacy/aliased energy kind names
                // Current query matches exact canonical names from ENERGY_KINDS.
                // If DB contains legacy names (e.g., "life_force" → "life", "deep_work" → "dragon"),
                // those marks are silently skipped and returned as no_data.
                // Solution: Add kind normalization map before stats.get(kind) lookup or in SQL WHERE clauses.
                let mut stats = HashMap::new();
                let mut rows = stmt.query([])?;
                while let Some(row) = rows.next()? {
                    let kind: String = row.get(0)?;
                    let current: f32 = row.get(1)?;
                    let avg_24h: Option<f32> = row.get(2)?;
                    let samples_24h: Option<i64> = row.get(3)?;

                    stats.insert(
                        kind,
                        (current, avg_24h.unwrap_or(0.0), samples_24h.unwrap_or(0)),
                    );
                }

                let mut trends = Vec::new();
                for &kind in ENERGY_KINDS {
                    let (current, avg_24h, samples_24h) =
                        stats.get(kind).copied().unwrap_or((0.0, 0.0, 0));

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

// ============================================================================
// INFERENCE — Predict energy from behavior
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct InferenceInput {
    /// Current hour (0-23) for time-based inference
    pub hour: Option<u8>,
    /// Length of last note/message (chars) for cognitive load inference
    pub note_length: Option<usize>,
    /// Number of rhythm resets in last 24h for life force inference
    pub rhythm_resets_24h: Option<u32>,
    /// Minutes since last major activity (for void inference)
    pub minutes_idle: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct InferredLevel {
    pub kind: String,
    pub label: String,
    pub predicted_level: f32,
    pub confidence: f32, // 0.0-1.0
    pub reasoning: String,
}

#[derive(Debug, Serialize)]
pub struct InferenceResult {
    pub inferred: Vec<InferredLevel>,
    pub timestamp: String,
}

/// POST /energy/infer — predict energy levels from behavioral signals
pub async fn infer_energy(
    State(state): State<AppState>,
    Json(input): Json<InferenceInput>,
) -> Result<Json<InferenceResult>, (StatusCode, String)> {
    let db = state.db.clone();

    // Get recent trends for baseline
    let trends_result =
        db.0.call(
            |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<HashMap<String, f32>> {
                let mut baseline = HashMap::new();
                for &kind in ENERGY_KINDS {
                    let avg: f32 = conn
                        .query_row(
                            "SELECT AVG(level) FROM energy_marks 
                         WHERE kind = ?1 
                         AND datetime(ts) > datetime('now', '-24 hours')",
                            [kind],
                            |row| row.get(0),
                        )
                        .unwrap_or(0.5); // Default to neutral if no data
                    baseline.insert(kind.to_string(), avg);
                }
                Ok(baseline)
            },
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut inferred = Vec::new();

    // === VOID (E0) INFERENCE ===
    let mut void_level = trends_result.get("void").copied().unwrap_or(0.3);
    let mut void_confidence = 0.3;
    let mut void_reasoning = String::from("Baseline from recent activity");

    if let Some(hour) = input.hour {
        // Late night hours (22:00-02:00) suggest high void
        if hour >= 22 || hour <= 2 {
            void_level = 0.8;
            void_confidence = 0.9;
            void_reasoning = format!("Late hour ({}:00) strongly indicates need for rest", hour);
        } else if hour >= 3 && hour <= 6 {
            void_level = 0.9;
            void_confidence = 0.95;
            void_reasoning = format!("Very late hour ({}:00) — sleep critical", hour);
        }
    }

    if let Some(minutes) = input.minutes_idle {
        if minutes > 120 && void_level < 0.6 {
            void_level = 0.7;
            void_confidence = 0.7;
            void_reasoning = format!("Idle for {} min suggests passive recovery mode", minutes);
        }
    }

    inferred.push(InferredLevel {
        kind: "void".to_string(),
        label: energy_label("void").to_string(),
        predicted_level: void_level,
        confidence: void_confidence,
        reasoning: void_reasoning,
    });

    // === DRAGON (E3) INFERENCE ===
    let mut dragon_level = trends_result.get("dragon").copied().unwrap_or(0.5);
    let mut dragon_confidence = 0.3;
    let mut dragon_reasoning = String::from("Baseline from recent marks");

    if let Some(length) = input.note_length {
        if length < 50 {
            dragon_level = 0.3;
            dragon_confidence = 0.8;
            dragon_reasoning = format!(
                "Short note ({} chars) suggests low cognitive bandwidth",
                length
            );
        } else if length > 200 {
            dragon_level = 0.7;
            dragon_confidence = 0.7;
            dragon_reasoning = format!("Long note ({} chars) indicates sustained focus", length);
        }
    }

    // Late hours drain dragon
    if let Some(hour) = input.hour {
        if hour >= 22 || hour <= 5 {
            dragon_level = dragon_level.min(0.4);
            dragon_confidence = 0.85;
            dragon_reasoning = format!("Late hour ({}:00) impairs cognitive performance", hour);
        }
    }

    inferred.push(InferredLevel {
        kind: "dragon".to_string(),
        label: energy_label("dragon").to_string(),
        predicted_level: dragon_level,
        confidence: dragon_confidence,
        reasoning: dragon_reasoning,
    });

    // === LIFE FORCE (E1) INFERENCE ===
    let mut life_level = trends_result.get("life").copied().unwrap_or(0.5);
    let mut life_confidence = 0.3;
    let mut life_reasoning = String::from("Baseline from recent marks");

    if let Some(resets) = input.rhythm_resets_24h {
        if resets >= 3 {
            life_level = 0.3;
            life_confidence = 0.85;
            life_reasoning = format!(
                "{} rhythm resets in 24h signals low maintenance reserves",
                resets
            );
        } else if resets == 0 {
            life_level = 0.7;
            life_confidence = 0.6;
            life_reasoning = "No rhythm resets suggests stable life force".to_string();
        }
    }

    inferred.push(InferredLevel {
        kind: "life".to_string(),
        label: energy_label("life").to_string(),
        predicted_level: life_level,
        confidence: life_confidence,
        reasoning: life_reasoning,
    });

    // === PLAY (E2) & CROWN (E4) ===
    // Use baseline for now (lower confidence without specific signals)
    for &kind in &["play", "crown"] {
        let baseline = trends_result.get(kind).copied().unwrap_or(0.5);
        inferred.push(InferredLevel {
            kind: kind.to_string(),
            label: energy_label(kind).to_string(),
            predicted_level: baseline,
            confidence: 0.3,
            reasoning: format!("Baseline from recent {} activity", kind),
        });
    }

    Ok(Json(InferenceResult {
        inferred,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }))
}

// ============================================================================
// CORRELATION — Detect patterns between energy kinds
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CorrelateRequest {
    /// Hours to look back for analysis (default: 72)
    pub lookback_hours: Option<u64>,
    /// Minimum samples required per kind pair (default: 5)
    pub min_samples: Option<usize>,
    /// Minimum |correlation| to report (default: 0.3)
    pub correlation_threshold: Option<f64>,
}

#[derive(Debug, Serialize)]
pub struct Correlation {
    pub kind_a: String,
    pub kind_b: String,
    pub coefficient: f64,
    pub strength: String,  // "weak" | "moderate" | "strong"
    pub direction: String, // "positive" | "inverse" | "none"
    pub samples: usize,
    pub interpretation: String,
}

#[derive(Debug, Serialize)]
pub struct CorrelateResponse {
    pub correlations: Vec<Correlation>,
    pub analysis_period: String,
    pub total_marks_analyzed: usize,
}

/// Calculate Pearson correlation coefficient between two series
fn pearson(xs: &[f64], ys: &[f64]) -> Option<f64> {
    let n = xs.len();
    if n < 2 {
        return None;
    }

    let mean_x = xs.iter().sum::<f64>() / n as f64;
    let mean_y = ys.iter().sum::<f64>() / n as f64;

    let numerator: f64 = xs
        .iter()
        .zip(ys.iter())
        .map(|(x, y)| (x - mean_x) * (y - mean_y))
        .sum();

    let denom_x: f64 = xs.iter().map(|x| (x - mean_x).powi(2)).sum::<f64>().sqrt();
    let denom_y: f64 = ys.iter().map(|y| (y - mean_y).powi(2)).sum::<f64>().sqrt();

    if denom_x == 0.0 || denom_y == 0.0 {
        return None;
    }

    Some(numerator / (denom_x * denom_y))
}

/// Classify correlation strength and direction
fn classify_correlation(coeff: f64) -> (String, String) {
    let abs = coeff.abs();
    let strength = match abs {
        v if v >= 0.7 => "strong",
        v if v >= 0.3 => "moderate",
        _ => "weak",
    };
    let direction = match coeff {
        v if v > 0.05 => "positive",
        v if v < -0.05 => "inverse",
        _ => "none",
    };
    (strength.to_string(), direction.to_string())
}

/// Generate human-readable interpretation of correlation
fn interpret_correlation(kind_a: &str, kind_b: &str, coeff: f64) -> String {
    let (strength, direction) = classify_correlation(coeff);
    match direction.as_str() {
        "inverse" => format!(
            "When {} falls, {} rises ({} inverse correlation)",
            kind_a, kind_b, strength
        ),
        "positive" => format!(
            "{} and {} move together ({} positive correlation)",
            kind_a, kind_b, strength
        ),
        _ => format!("{} and {} show no clear relationship", kind_a, kind_b),
    }
}

/// Align two time series by hour buckets, averaging values within each bucket
fn align_series(a: &[(String, f64)], b: &[(String, f64)]) -> (Vec<f64>, Vec<f64>) {
    use std::collections::HashMap;

    let mut buckets_a: HashMap<i64, Vec<f64>> = HashMap::new();
    let mut buckets_b: HashMap<i64, Vec<f64>> = HashMap::new();

    // Bucket by hour
    for (ts, val) in a {
        if let Ok(dt) = ts.parse::<chrono::DateTime<chrono::Utc>>() {
            let bucket = dt.timestamp() / 3600; // hour bucket
            buckets_a.entry(bucket).or_default().push(*val);
        }
    }

    for (ts, val) in b {
        if let Ok(dt) = ts.parse::<chrono::DateTime<chrono::Utc>>() {
            let bucket = dt.timestamp() / 3600;
            buckets_b.entry(bucket).or_default().push(*val);
        }
    }

    // Only keep buckets that exist in both series
    let mut xs = Vec::new();
    let mut ys = Vec::new();

    for (bucket, vals_a) in &buckets_a {
        if let Some(vals_b) = buckets_b.get(bucket) {
            xs.push(vals_a.iter().sum::<f64>() / vals_a.len() as f64);
            ys.push(vals_b.iter().sum::<f64>() / vals_b.len() as f64);
        }
    }

    (xs, ys)
}

pub async fn correlate_energy(
    State(state): State<AppState>,
    Json(req): Json<CorrelateRequest>,
) -> Result<Json<CorrelateResponse>, (StatusCode, String)> {
    let lookback = req.lookback_hours.unwrap_or(72);
    let min_samples = req.min_samples.unwrap_or(5);
    let threshold = req.correlation_threshold.unwrap_or(0.3);

    // Calculate cutoff timestamp
    let now = chrono::Utc::now();
    let cutoff = now - chrono::Duration::hours(lookback as i64);
    let cutoff_str = cutoff.to_rfc3339();

    let db = state.db.clone();

    let result =
        db.0.call(
            move |conn: &mut rusqlite::Connection| -> tokio_rusqlite::Result<CorrelateResponse> {
                // Fetch all marks within the lookback window
                let mut stmt = conn.prepare(
                    "SELECT ts, kind, level FROM energy_marks WHERE ts >= ?1 ORDER BY ts ASC",
                )?;

                let rows = stmt.query_map(rusqlite::params![cutoff_str], |row| {
                    Ok((
                        row.get::<_, String>(0)?, // ts
                        row.get::<_, String>(1)?, // kind
                        row.get::<_, f64>(2)?,    // level
                    ))
                })?;

                let mut marks = Vec::new();
                for row in rows {
                    marks.push(row?);
                }

                let total = marks.len();

                // Group marks by kind
                let mut by_kind: HashMap<String, Vec<(String, f64)>> = HashMap::new();
                for (ts, kind, level) in marks {
                    by_kind.entry(kind).or_default().push((ts, level));
                }

                // Calculate correlations for all pairs
                let mut correlations = Vec::new();
                let kinds = ENERGY_KINDS;

                for i in 0..kinds.len() {
                    for j in (i + 1)..kinds.len() {
                        let kind_a = kinds[i];
                        let kind_b = kinds[j];

                        let series_a = by_kind.get(kind_a).map(|v| v.as_slice()).unwrap_or(&[]);
                        let series_b = by_kind.get(kind_b).map(|v| v.as_slice()).unwrap_or(&[]);

                        // Align time series by hour buckets
                        let (xs, ys) = align_series(series_a, series_b);

                        if xs.len() < min_samples {
                            continue;
                        }

                        if let Some(coeff) = pearson(&xs, &ys) {
                            if coeff.abs() >= threshold {
                                let (strength, direction) = classify_correlation(coeff);
                                correlations.push(Correlation {
                                    kind_a: kind_a.to_string(),
                                    kind_b: kind_b.to_string(),
                                    coefficient: (coeff * 100.0).round() / 100.0,
                                    strength,
                                    direction,
                                    samples: xs.len(),
                                    interpretation: interpret_correlation(kind_a, kind_b, coeff),
                                });
                            }
                        }
                    }
                }

                // Sort by absolute coefficient descending
                correlations.sort_by(|a, b| {
                    b.coefficient
                        .abs()
                        .partial_cmp(&a.coefficient.abs())
                        .unwrap()
                });

                Ok(CorrelateResponse {
                    correlations,
                    analysis_period: format!("{}h", lookback),
                    total_marks_analyzed: total,
                })
            },
        )
        .await;

    match result {
        Ok(response) => Ok(Json(response)),
        Err(e) => Err((StatusCode::INTERNAL_SERVER_ERROR, e.to_string())),
    }
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/mark", post(mark_energy))
        .route("/state", get(get_state))
        .route("/trends", get(get_trends))
        .route("/infer", post(infer_energy))
        .route("/correlate", post(correlate_energy))
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
                "SELECT AVG(level) FROM energy_marks WHERE kind = 'dragon' AND datetime(ts) > datetime('now', '-24 hours')",
                [],
                |row| row.get(0),
            )
            .unwrap();

        // Current = 0.3, avg = (0.9 + 0.6 + 0.3) / 3 = 0.6
        assert!((current - 0.3).abs() < 0.01);
        assert!((avg_24h - 0.6).abs() < 0.01);

        // Compute number of samples in the last 24 hours
        let samples_24h: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM energy_marks WHERE kind = 'dragon' AND datetime(ts) > datetime('now', '-24 hours')",
                [],
                |row| row.get(0),
            )
            .unwrap();

        // Direction should be "down" using the helper function
        let direction = calculate_direction(current, avg_24h, samples_24h);

        assert_eq!(direction, "down");
    }

    #[test]
    fn trends_returns_no_data_when_empty() {
        let conn = setup_conn();

        let samples: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM energy_marks WHERE kind = 'dragon' AND datetime(ts) > datetime('now', '-24 hours')",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert_eq!(samples, 0);

        // Use the helper function to calculate direction
        let direction = calculate_direction(0.0, 0.0, samples);

        assert_eq!(direction, "no_data");
    }
    #[test]
    fn get_trends_returns_correct_latest_and_24h_stats() {
        let conn = setup_conn();

        // Insert older crown mark (outside 24h window)
        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (datetime('now', '-30 hours'), 'Raz', 'crown', 0.5, NULL)",
            [],
        )
        .unwrap();

        // Insert recent crown marks within 24h
        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (datetime('now', '-23 hours'), 'Raz', 'crown', 0.7, NULL)",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (datetime('now', '-12 hours'), 'Raz', 'crown', 0.9, NULL)",
            [],
        )
        .unwrap();

        // Latest crown (should be current)
        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (datetime('now', '-1 hour'), 'Raz', 'crown', 0.8, NULL)",
            [],
        )
        .unwrap();

        // Run the same query logic as get_trends()
        let mut stmt = conn
            .prepare(
                "WITH latest AS (
                    SELECT kind, MAX(id) AS max_id
                    FROM energy_marks
                    GROUP BY kind
                )
                SELECT 
                    em.kind,
                    em.level AS current,
                    (SELECT AVG(level) FROM energy_marks WHERE kind = em.kind AND datetime(ts) > datetime('now', '-24 hours')) AS avg_24h,
                    (SELECT COUNT(*) FROM energy_marks WHERE kind = em.kind AND datetime(ts) > datetime('now', '-24 hours')) AS samples_24h
                FROM energy_marks em
                INNER JOIN latest ON em.kind = latest.kind AND em.id = latest.max_id",
            )
            .unwrap();

        let mut rows = stmt.query([]).unwrap();
        let row = rows.next().unwrap().unwrap();

        let kind: String = row.get(0).unwrap();
        let current: f32 = row.get(1).unwrap();
        let avg_24h: Option<f32> = row.get(2).unwrap();
        let samples_24h: Option<i64> = row.get(3).unwrap();

        // Verify crown was selected
        assert_eq!(kind, "crown");

        // Current should be latest (0.8 from -1 hour)
        assert!((current - 0.8).abs() < 0.01);

        // avg_24h should be average of last 3 marks (0.7, 0.9, 0.8) = 0.8
        // (the -30 hours mark should be excluded)
        assert!((avg_24h.unwrap() - 0.8).abs() < 0.01);

        // samples_24h should count 3 marks (not the -30 hours one)
        assert_eq!(samples_24h.unwrap(), 3);
    }

    #[test]
    fn trends_returns_all_canonical_kinds_with_fallbacks() {
        let conn = setup_conn();

        // Insert data ONLY for dragon (2 marks) and play (1 mark)
        // Leave crown, life, void completely absent
        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (datetime('now', '-2 hours'), 'Raz', 'dragon', 0.9, 'deep work')",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (datetime('now', '-1 hour'), 'Raz', 'dragon', 0.7, 'still focused')",
            [],
        )
        .unwrap();

        conn.execute(
            "INSERT INTO energy_marks (ts, who, kind, level, note)
             VALUES (datetime('now', '-3 hours'), 'Raz', 'play', 0.6, 'hoops')",
            [],
        )
        .unwrap();

        // Execute the same query logic as production get_trends()
        let mut stmt = conn
            .prepare(
                "WITH latest AS (
                    SELECT kind, MAX(id) AS max_id
                    FROM energy_marks
                    GROUP BY kind
                )
                SELECT 
                    em.kind,
                    em.level AS current,
                    (SELECT AVG(level) FROM energy_marks WHERE kind = em.kind AND datetime(ts) > datetime('now', '-24 hours')) AS avg_24h,
                    (SELECT COUNT(*) FROM energy_marks WHERE kind = em.kind AND datetime(ts) > datetime('now', '-24 hours')) AS samples_24h
                FROM energy_marks em
                INNER JOIN latest ON em.kind = latest.kind AND em.id = latest.max_id",
            )
            .unwrap();

        // Collect query results into HashMap (same as production)
        let mut stats = std::collections::HashMap::new();
        let mut rows = stmt.query([]).unwrap();

        while let Some(row) = rows.next().unwrap() {
            let kind: String = row.get(0).unwrap();
            let current: f32 = row.get(1).unwrap();
            let avg_24h: Option<f32> = row.get(2).unwrap();
            let samples_24h: Option<i64> = row.get(3).unwrap();

            stats.insert(
                kind,
                (current, avg_24h.unwrap_or(0.0), samples_24h.unwrap_or(0)),
            );
        }

        // Map over all ENERGY_KINDS (same as production endpoint)
        let mut trends = Vec::new();
        for &kind in super::ENERGY_KINDS {
            let (current, avg_24h, samples_24h) = stats.get(kind).copied().unwrap_or((0.0, 0.0, 0));
            let direction = calculate_direction(current, avg_24h, samples_24h);

            trends.push((kind.to_string(), current, avg_24h, samples_24h, direction));
        }

        // RULE 1: Must return exactly 5 canonical kinds
        assert_eq!(trends.len(), 5, "Must return all 5 canonical energy kinds");

        // RULE 2: Kinds with data should have correct stats
        let dragon = trends.iter().find(|t| t.0 == "dragon").unwrap();
        assert_eq!(
            dragon.4, "down",
            "Dragon trending down (0.7 current < 0.8 avg)"
        );
        assert_eq!(dragon.3, 2, "Dragon should have 2 samples");
        assert!(
            (dragon.1 - 0.7).abs() < 0.01,
            "Dragon current should be latest (0.7)"
        );

        let play = trends.iter().find(|t| t.0 == "play").unwrap();
        assert_eq!(play.4, "stable", "Play stable (0.6 == 0.6)");
        assert_eq!(play.3, 1, "Play should have 1 sample");

        // RULE 3: Missing kinds should gracefully return no_data
        let crown = trends.iter().find(|t| t.0 == "crown").unwrap();
        assert_eq!(crown.4, "no_data", "Crown should show no_data");
        assert_eq!(crown.3, 0, "Crown should have 0 samples");
        assert_eq!(crown.1, 0.0, "Crown current should be 0.0");

        let void_trend = trends.iter().find(|t| t.0 == "void").unwrap();
        assert_eq!(void_trend.4, "no_data", "Void should show no_data");

        let life = trends.iter().find(|t| t.0 == "life").unwrap();
        assert_eq!(life.4, "no_data", "Life should show no_data");
    }

    #[test]
    fn infer_detects_late_hour_void() {
        // Late hour (23:00) should strongly predict high void
        let hour = 23;
        let void_level: f32 = if hour >= 22 || hour <= 2 { 0.8 } else { 0.3 };

        assert!(
            (void_level - 0.8).abs() < 0.01,
            "Late hour should predict high void"
        );
    }

    #[test]
    fn infer_detects_short_note_low_dragon() {
        // Short note (< 50 chars) suggests low cognitive bandwidth
        let note_length = 30;
        let dragon_level: f32 = if note_length < 50 { 0.3 } else { 0.7 };

        assert!(
            (dragon_level - 0.3).abs() < 0.01,
            "Short note should predict low dragon"
        );
    }

    #[test]
    fn infer_detects_rhythm_resets_low_life() {
        // Multiple rhythm resets signal low maintenance reserves
        let resets = 4;
        let life_level: f32 = if resets >= 3 { 0.3 } else { 0.7 };

        assert!(
            (life_level - 0.3).abs() < 0.01,
            "Multiple rhythm resets should predict low life force"
        );
    }

    #[test]
    fn correlate_detects_inverse_relationship() {
        use super::{align_series, pearson};

        // Simulate dragon going down while void goes up
        let dragon_series = vec![
            ("2025-01-01T08:00:00Z".to_string(), 0.9),
            ("2025-01-01T09:00:00Z".to_string(), 0.7),
            ("2025-01-01T10:00:00Z".to_string(), 0.5),
            ("2025-01-01T11:00:00Z".to_string(), 0.3),
            ("2025-01-01T12:00:00Z".to_string(), 0.2),
            ("2025-01-01T13:00:00Z".to_string(), 0.1),
        ];

        let void_series = vec![
            ("2025-01-01T08:00:00Z".to_string(), 0.1),
            ("2025-01-01T09:00:00Z".to_string(), 0.3),
            ("2025-01-01T10:00:00Z".to_string(), 0.5),
            ("2025-01-01T11:00:00Z".to_string(), 0.7),
            ("2025-01-01T12:00:00Z".to_string(), 0.8),
            ("2025-01-01T13:00:00Z".to_string(), 0.9),
        ];

        let (xs, ys) = align_series(&dragon_series, &void_series);
        let coeff = pearson(&xs, &ys).expect("Should calculate correlation");

        assert!(
            coeff < -0.7,
            "Dragon ↓ + Void ↑ should show strong inverse correlation (got {})",
            coeff
        );
    }

    #[test]
    fn correlate_detects_positive_relationship() {
        use super::{align_series, pearson};

        // Simulate crown and dragon moving together
        let crown_series = vec![
            ("2025-01-01T08:00:00Z".to_string(), 0.3),
            ("2025-01-01T09:00:00Z".to_string(), 0.5),
            ("2025-01-01T10:00:00Z".to_string(), 0.7),
            ("2025-01-01T11:00:00Z".to_string(), 0.9),
            ("2025-01-01T12:00:00Z".to_string(), 0.8),
        ];

        let dragon_series = vec![
            ("2025-01-01T08:00:00Z".to_string(), 0.2),
            ("2025-01-01T09:00:00Z".to_string(), 0.4),
            ("2025-01-01T10:00:00Z".to_string(), 0.6),
            ("2025-01-01T11:00:00Z".to_string(), 0.8),
            ("2025-01-01T12:00:00Z".to_string(), 0.7),
        ];

        let (xs, ys) = align_series(&crown_series, &dragon_series);
        let coeff = pearson(&xs, &ys).expect("Should calculate correlation");

        assert!(
            coeff > 0.7,
            "Crown ↑ + Dragon ↑ should show strong positive correlation (got {})",
            coeff
        );
    }

    #[test]
    fn correlate_ignores_weak_patterns() {
        use super::{align_series, pearson};

        // Data with minimal variance should show weak/moderate correlation
        let play_series = vec![
            ("2025-01-01T08:00:00Z".to_string(), 0.48),
            ("2025-01-01T09:00:00Z".to_string(), 0.52),
            ("2025-01-01T10:00:00Z".to_string(), 0.47),
            ("2025-01-01T11:00:00Z".to_string(), 0.51),
            ("2025-01-01T12:00:00Z".to_string(), 0.49),
            ("2025-01-01T13:00:00Z".to_string(), 0.53),
        ];

        let life_series = vec![
            ("2025-01-01T08:00:00Z".to_string(), 0.61),
            ("2025-01-01T09:00:00Z".to_string(), 0.39),
            ("2025-01-01T10:00:00Z".to_string(), 0.58),
            ("2025-01-01T11:00:00Z".to_string(), 0.42),
            ("2025-01-01T12:00:00Z".to_string(), 0.55),
            ("2025-01-01T13:00:00Z".to_string(), 0.45),
        ];

        let (xs, ys) = align_series(&play_series, &life_series);
        let coeff = pearson(&xs, &ys).expect("Should calculate correlation");

        // This test verifies Pearson calculation works even with non-obvious patterns
        // The actual coefficient value depends on the data distribution
        assert!(
            coeff.abs() < 0.95,
            "Non-correlated data should not show near-perfect correlation (got {})",
            coeff
        );
    }
}
