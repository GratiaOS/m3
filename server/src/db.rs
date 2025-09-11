use std::env;
use std::path::PathBuf;
use tokio_rusqlite::Connection as AsyncConnection;

#[derive(Clone)]
pub struct Database(pub AsyncConnection);

/// --- CENTRAL PLACE FOR SCHEMA INITIALIZATION ---
///
/// This file is the central place for schema initialization,
/// including the creation of the `emotions` table.
/// The `emotions.rs` file no longer manages schema creation.
///
/// Resolve DB path:
/// - M3_DB_PATH, if set
/// - Else: <repo-root>/memory.db (heuristic: if cwd ends with /server -> ../memory.db; else ./memory.db)
fn resolve_db_path() -> PathBuf {
    if let Ok(p) = env::var("M3_DB_PATH") {
        return PathBuf::from(p);
    }

    // Walk up from CWD to find repo root (directory containing `.git`)
    let mut dir = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    loop {
        if dir.join(".git").exists() {
            return dir.join("memory.db");
        }
        if !dir.pop() {
            break;
        }
    }

    // Fallbacks (just in case)
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if cwd.file_name().and_then(|n| n.to_str()) == Some("server") {
        cwd.parent()
            .map(|p| p.join("memory.db"))
            .unwrap_or_else(|| PathBuf::from("../memory.db"))
    } else {
        cwd.join("memory.db")
    }
}

/// Run the full schema initialization batch on the given connection.
/// This can be used to ensure the schema is created or updated.
pub fn ensure_schema(c: &mut rusqlite::Connection) -> tokio_rusqlite::Result<()> {
    c.execute_batch(
        r#"
        PRAGMA journal_mode=WAL;

        CREATE TABLE IF NOT EXISTS kv(
          key   TEXT PRIMARY KEY,
          value BLOB
        );

        CREATE TABLE IF NOT EXISTS profiles(
          id   INTEGER PRIMARY KEY,
          name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS threads(
          id          INTEGER PRIMARY KEY,
          title       TEXT NOT NULL UNIQUE,
          profile_id  INTEGER,
          created_at  TEXT
        );

        CREATE TABLE IF NOT EXISTS messages(
          id          INTEGER PRIMARY KEY,
          thread_id   INTEGER NOT NULL,
          role        TEXT NOT NULL,          -- "user" | "assistant" | etc.
          text        TEXT NOT NULL,
          tags        TEXT,                   -- JSON array (stringified)
          profile_id  INTEGER NOT NULL,
          privacy     TEXT NOT NULL,          -- "public" | "sealed" | "private"
          importance  INTEGER NOT NULL DEFAULT 0,
          ts          TEXT NOT NULL           -- RFC3339
        );

        CREATE TABLE IF NOT EXISTS tells(
          id             INTEGER PRIMARY KEY,
          node           TEXT NOT NULL,
          pre_activation TEXT NOT NULL,
          action         TEXT NOT NULL,
          created_at     TEXT NOT NULL,
          handled_at     TEXT
        );

        CREATE TABLE IF NOT EXISTS snapshots(
          id          INTEGER PRIMARY KEY,
          thread_id   INTEGER NOT NULL,
          period      TEXT NOT NULL,         -- e.g. "daily"
          summary_md  TEXT NOT NULL,
          ts          TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS status(
          id          INTEGER PRIMARY KEY,
          color       TEXT NOT NULL,         -- "green" | "yellow" | "red"
          note        TEXT NOT NULL,
          updated_at  TEXT NOT NULL,
          expires_at  TEXT                    -- RFC3339 or NULL
        );

        INSERT OR IGNORE INTO status(id,color,note,updated_at,expires_at)
          VALUES(1,'green','',datetime('now'),NULL);

        -- Unified emotions table (with mirror tags)
        CREATE TABLE IF NOT EXISTS emotions(
          id         INTEGER PRIMARY KEY,
          ts         TEXT NOT NULL,
          who        TEXT NOT NULL,
          kind       TEXT NOT NULL,
          intensity  REAL NOT NULL CHECK(intensity >= 0.0 AND intensity <= 1.0),
          note       TEXT,
          note_id    INTEGER,
          details    TEXT,
          sealed     INTEGER NOT NULL DEFAULT 0,           -- mirror tag
          archetype  TEXT,                                 -- optional archetypal lens
          privacy    TEXT NOT NULL DEFAULT 'private'       -- 'private' | 'sealed' | 'anonymized' | 'public'
        );
        CREATE INDEX IF NOT EXISTS idx_emotions_ts ON emotions(ts);
        CREATE INDEX IF NOT EXISTS idx_emotions_kind ON emotions(kind);
        CREATE INDEX IF NOT EXISTS idx_emotions_privacy ON emotions(privacy);

        -- Energy marks (time-series of energy levels per kind)
        -- kind: 'dragon' | 'heart' | 'play' | 'flow' | 'focus' | 'rest' (extensible)
        -- level: 0.0 .. 1.0 (real-valued)
        CREATE TABLE IF NOT EXISTS energy_marks(
          id        INTEGER PRIMARY KEY,
          ts        TEXT NOT NULL,                           -- RFC3339
          who       TEXT NOT NULL,                           -- actor/source
          kind      TEXT NOT NULL,                           -- energy kind
          level     REAL NOT NULL CHECK(level >= 0.0 AND level <= 1.0),
          note      TEXT                                     -- optional free text
        );
        CREATE INDEX IF NOT EXISTS idx_energy_marks_ts ON energy_marks(ts);
        CREATE INDEX IF NOT EXISTS idx_energy_marks_kind ON energy_marks(kind);
        CREATE INDEX IF NOT EXISTS idx_energy_marks_who ON energy_marks(who);
        "#,
    )?;

    Ok(())
}

/// Initialize database (WAL + schema).
pub async fn init_db() -> anyhow::Result<Database> {
    let db_path = resolve_db_path();
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }

    // open/create DB at resolved path
    let conn = AsyncConnection::open(db_path).await?;

    // Run schema init; return tokio_rusqlite::Result so `?` auto-converts rusqlite errors.
    conn.call(|c: &mut rusqlite::Connection| -> tokio_rusqlite::Result<()> { ensure_schema(c) })
        .await?; // unwrap tokio_rusqlite::Result

    Ok(Database(conn))
}

/// Keep API; ensure default thread exists, return 1
pub async fn ensure_default_thread(db: &Database) -> i64 {
    let res: tokio_rusqlite::Result<i64> =
        db.0.call(
            |c: &mut rusqlite::Connection| -> tokio_rusqlite::Result<i64> {
                c.execute(
                    "INSERT OR IGNORE INTO threads(id,title) VALUES(1,'default')",
                    [],
                )?;
                Ok(1)
            },
        )
        .await;

    res.unwrap_or(1)
}
