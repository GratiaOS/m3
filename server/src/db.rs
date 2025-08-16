use tokio_rusqlite::Connection;
use rusqlite::{self};

pub struct Database(pub Connection);

pub async fn init_db() -> anyhow::Result<Database> {
    let conn = Connection::open("memory.db").await?;

    // run the schema inside the blocking pool; unwrap both Result layers
    conn.call(|c: &mut rusqlite::Connection| -> rusqlite::Result<()> {
        c.execute_batch(
            r#"
            PRAGMA journal_mode=WAL;

            CREATE TABLE IF NOT EXISTS profiles(
              id INTEGER PRIMARY KEY, name TEXT UNIQUE
            );
            INSERT OR IGNORE INTO profiles(id,name) VALUES(1,'Raz'),(2,'Sawsan'),(3,'Nico');

            CREATE TABLE IF NOT EXISTS threads(
              id INTEGER PRIMARY KEY, title TEXT
            );
            INSERT OR IGNORE INTO threads(id,title) VALUES(1,'default');

            CREATE TABLE IF NOT EXISTS messages(
              id INTEGER PRIMARY KEY,
              thread_id INTEGER, role TEXT, text TEXT, tags TEXT, profile_id INTEGER,
              privacy TEXT DEFAULT 'public', importance INTEGER DEFAULT 0, ts TEXT
            );

            CREATE TABLE IF NOT EXISTS snapshots(
              id INTEGER PRIMARY KEY, thread_id INTEGER, period TEXT, summary_md TEXT, ts TEXT
            );

            CREATE TABLE IF NOT EXISTS kv(
              key TEXT PRIMARY KEY, value BLOB
            );

            CREATE TABLE IF NOT EXISTS tells(
              id INTEGER PRIMARY KEY,
              node TEXT NOT NULL,
              pre_activation TEXT NOT NULL,
              action TEXT NOT NULL,
              created_at TEXT NOT NULL,
              handled_at TEXT
            );

            CREATE TABLE IF NOT EXISTS status(
              id INTEGER PRIMARY KEY CHECK (id=1),
              color TEXT NOT NULL DEFAULT 'green',
              note  TEXT NOT NULL DEFAULT '',
              updated_at TEXT NOT NULL,
              expires_at TEXT
            );
            "#
        )?;

        let now = chrono::Utc::now().to_rfc3339();
        c.execute(
            "INSERT OR IGNORE INTO status(id,color,note,updated_at,expires_at)
             VALUES(1,'green','',?1,NULL)",
            rusqlite::params![now],
        )?;

        Ok(())
    }).await??; // <- outer tokio_rusqlite::Result, then inner rusqlite::Result

    Ok(Database(conn))
}

pub async fn ensure_default_thread(db: &Database) -> i64 {
    let res = db.0.call(|c: &mut rusqlite::Connection| -> rusqlite::Result<i64> {
        c.execute(
            "INSERT OR IGNORE INTO threads(id,title) VALUES(1,'default')",
            [],
        )?;
        Ok(1)
    }).await;

    match res {
        Ok(Ok(id)) => id,
        _ => 1,
    }
}