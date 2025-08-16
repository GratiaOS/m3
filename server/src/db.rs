use tokio_rusqlite::Connection as AsyncConnection;

pub struct Database(pub AsyncConnection);

pub async fn init_db() -> tokio_rusqlite::Result<Database> {
    // 0.5.x API is `open`, not `connect`
    let conn = AsyncConnection::open("memory.db").await?;

    // Run schema init; return tokio_rusqlite::Result so `?` auto-converts rusqlite errors.
    conn.call(
        |c: &mut rusqlite::Connection| -> tokio_rusqlite::Result<()> {
            c.execute_batch(
                r#"
            PRAGMA journal_mode=WAL;

            CREATE TABLE IF NOT EXISTS profiles(
              id INTEGER PRIMARY KEY, name TEXT UNIQUE
            );
            INSERT OR IGNORE INTO profiles(id,name) VALUES(1,'Raz'),(2,'Sawsan'),(3,'Nico');

            CREATE TABLE IF NOT EXISTS threads(
              id INTEGER PRIMARY KEY, title TEXT, tags TEXT, profile_id INTEGER, created_at TEXT
            );
            INSERT OR IGNORE INTO threads(id,title) VALUES(1,'default');

            CREATE TABLE IF NOT EXISTS messages(
              id INTEGER PRIMARY KEY,
              thread_id INTEGER,
              role TEXT,
              text TEXT,
              tags TEXT,
              profile_id INTEGER,
              privacy TEXT DEFAULT 'public',
              importance INTEGER DEFAULT 0,
              ts TEXT
            );

            CREATE TABLE IF NOT EXISTS snapshots(
              id INTEGER PRIMARY KEY,
              thread_id INTEGER,
              period TEXT,
              summary_md TEXT,
              ts TEXT
            );

            CREATE TABLE IF NOT EXISTS kv(
              key TEXT PRIMARY KEY,
              value BLOB
            );

            CREATE TABLE IF NOT EXISTS tells(
              id INTEGER PRIMARY KEY,
              node TEXT,
              pre_activation TEXT,
              action TEXT,
              created_at TEXT,
              handled_at TEXT
            );

            CREATE TABLE IF NOT EXISTS status(
              id INTEGER PRIMARY KEY CHECK (id = 1),
              color TEXT NOT NULL DEFAULT 'green',
              note TEXT NOT NULL DEFAULT '',
              updated_at TEXT NOT NULL DEFAULT (datetime('now')),
              expires_at TEXT
            );
            INSERT OR IGNORE INTO status(id,color,note,updated_at,expires_at)
              VALUES(1,'green','',datetime('now'),NULL);
            "#,
            )?;
            Ok(())
        },
    )
    .await?; // unwrap tokio_rusqlite::Result

    Ok(Database(conn))
}

// Keep API; ensure default thread exists, return 1
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
