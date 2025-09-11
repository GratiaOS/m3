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

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/mark", post(mark_energy))
        .route("/state", get(get_state))
}

#[cfg(test)]
mod tests {
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
}
