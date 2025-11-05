/* ─────────────────────────────────────────────────────────
M3 Memory Server — Database & Value Bridge
Whisper: "Label the pieces; the path reveals itself." 🌬️

Purpose
• Provide a single place to open the SQLite database, initialize schema,
  and expose small async helpers for the Value Bridge (accounts + entries
  in minor units).

Tables (overview)
• kv, profiles, threads, messages, tells, snapshots, status
• emotions, energy_marks
• value_accounts(name, kind, currency)
• value_entries(account_id, ts, direction[in|out], amount_minor, currency, memo, tags, counterparty, reference)

Conventions
• SQLite WAL mode; UTC RFC3339 timestamps.
• Money stored as integer minor units; rounding half-away-from-zero.
• Base currency comes from M3_BASE_CURRENCY (defaults to "EUR").

Paths & env
• M3_DB_PATH overrides path.
• M3_BASE_CURRENCY sets the default base currency for the Value Bridge (see `read_base_currency()`); falls back to "EUR".
• Otherwise we walk up to repo root (directory with `.git`) and use `<repo>/memory.db`.

Notes for agents/devs
• Keep function headers/docstrings; they are the map.
• Prefer the async helpers here over raw `Connection` access in handlers.
• `read_base_currency()` is the single source of truth for base currency; used by `get_or_create_account_id` and `insert_value_entry` to normalize currency inputs.
• If schema changes, add migrations in-place (CREATE IF NOT EXISTS and new columns guarded).
• Sponsorships: If this project helps you or your team, garden sponsorships are welcome 🌱 — see the top-level README (Contributing → Support) for ways to help.
─────────────────────────────────────────────────────── */

use rusqlite::{params, OptionalExtension};
use std::env;
use std::path::PathBuf;
use tokio_rusqlite::Connection as AsyncConnection;

#[derive(Clone)]
pub struct Database(pub AsyncConnection);

/// # Database module (schema + helpers)
///
/// This module owns schema creation and the Value Bridge helpers.
/// - Emotions + energy tables
/// - Value accounts/entries (minor units)
/// - Utilities to open the DB and ensure default thread.
///
/// ## DB path resolution
/// 1. `M3_DB_PATH` if set
/// 2. Else search upwards for a `.git` directory and use `<repo>/memory.db`
/// 3. Fallback: `../memory.db` when cwd ends with `/server`, else `./memory.db`
///
/// (See also: `resolve_db_path()`.)
///
/// Resolve a stable SQLite file path for this instance (see rules above).
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

        -- ───────────────────────────────────────────────────────────────
        -- Value Bridge (accounts + entries, minor units)
        -- ----------------------------------------------------------------
        CREATE TABLE IF NOT EXISTS value_accounts(
          id         INTEGER PRIMARY KEY,
          name       TEXT NOT NULL UNIQUE,
          kind       TEXT NOT NULL DEFAULT 'wallet',
          currency   TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS value_entries(
          id            INTEGER PRIMARY KEY,
          account_id    INTEGER NOT NULL REFERENCES value_accounts(id) ON DELETE CASCADE,
          ts            TEXT NOT NULL,                           -- RFC3339
          direction     TEXT NOT NULL CHECK(direction IN ('in','out')),
          amount_minor  INTEGER NOT NULL,                        -- stored in minor units
          currency      TEXT NOT NULL,                           -- copy for audit
          memo          TEXT,
          tags          TEXT,                                    -- JSON string or comma list
          counterparty  TEXT,
          reference     TEXT,
          created_at    TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_value_entries_account_ts ON value_entries(account_id, ts DESC);
        CREATE INDEX IF NOT EXISTS idx_value_entries_direction ON value_entries(direction);
        CREATE INDEX IF NOT EXISTS idx_value_entries_tags ON value_entries(tags);
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

/// ----- Value Bridge helpers -------------------------------------------------
/// Minor exponent per currency (defaults to 2).
fn minor_exponent_for(cur: &str) -> i32 {
    match cur.to_ascii_uppercase().as_str() {
        "JPY" | "HUF" | "KRW" => 0,
        "KWD" | "JOD" | "BHD" | "TND" => 3,
        _ => 2,
    }
}

/// Convert a major-unit amount (e.g., 12.34 EUR) into minor units (e.g., 1234).
fn amount_to_minor(amount_major: f64, currency: &str) -> i64 {
    let exp = minor_exponent_for(currency);
    let factor = 10f64.powi(exp.max(0));
    // Round half-away from zero to avoid surprising negatives bias
    (amount_major * factor).round() as i64
}

/// Read the base currency from `M3_BASE_CURRENCY`, defaulting to `"EUR"`.
fn read_base_currency() -> String {
    std::env::var("M3_BASE_CURRENCY")
        .ok()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "EUR".to_string())
}

/// Ensure a value account exists (by `name`) and return its id.
///
/// If missing, the account is created with:
/// - `kind`: provided or `"wallet"`
/// - `currency`: provided or `M3_BASE_CURRENCY` (default `"EUR"`)
///
/// Safe to call concurrently; uniqueness is guarded by a UNIQUE index on `name`.
pub async fn get_or_create_account_id(
    db: &Database,
    name: &str,
    kind: Option<&str>,
    currency: Option<&str>,
) -> anyhow::Result<i64> {
    let name = name.trim();
    let kind = kind.unwrap_or("wallet");
    // Normalize/own currency safely (avoid borrowing from a temporary String)
    let currency_owned: String = currency
        .map(str::to_owned)
        .unwrap_or_else(read_base_currency);
    let name_owned = name.to_string();
    let kind_owned = kind.to_string();
    let cur_owned = currency_owned.clone();

    let id = db.0.call(move |c| {
        // Try find
        let mut stmt = c.prepare("SELECT id FROM value_accounts WHERE name = ?1")?;
        if let Some(rowid) = stmt.query_row(params![name_owned], |row| row.get(0)).optional()? {
            return Ok(rowid);
        }
        // Insert
        c.execute(
            "INSERT INTO value_accounts(name, kind, currency, created_at) VALUES(?1, ?2, ?3, datetime('now'))",
            params![name_owned, kind_owned, cur_owned],
        )?;
        let id = c.last_insert_rowid();
        Ok(id)
    }).await?;

    Ok(id)
}

/// Parameters for inserting a value entry in **major units**.
/// The helper converts to minor units using the currency's minor exponent.
pub struct ValueEntryParams<'a> {
    pub account: &'a str,
    pub account_kind: Option<&'a str>,
    pub ts: Option<&'a str>,       // RFC3339; None => now
    pub direction: &'a str,        // "in" | "out"
    pub amount_major: f64,         // e.g., 12.34
    pub currency: Option<&'a str>, // None => base currency
    pub memo: Option<&'a str>,
    pub tags: Option<&'a str>, // JSON or comma string
    pub counterparty: Option<&'a str>,
    pub reference: Option<&'a str>,
}

/// Insert a single value entry (major units → stored as minor units).
///
/// Converts `amount_major` using the currency's minor exponent and rounds
/// half-away-from-zero. Will create the target account on-the-fly if it
/// does not exist yet.
///
/// Returns: the new row id.
///
/// ### Example
/// ```
/// let _rowid = insert_value_entry(
///     &db,
///     ValueEntryParams{
///         account: "wallet/eu",
///         account_kind: None,
///         ts: None,                // now
///         direction: "in",
///         amount_major: 21.00,
///         currency: Some("EUR"),
///         memo: Some("seed"),
///         tags: None,
///         counterparty: None,
///         reference: None,
///     }
/// ).await?;
/// ```
pub async fn insert_value_entry(db: &Database, p: ValueEntryParams<'_>) -> anyhow::Result<i64> {
    // Normalize inputs up front (clone small strings for the move into the blocking closure).
    let account = p.account.trim().to_string();
    let account_kind = p.account_kind.unwrap_or("wallet").to_string();
    let ts = p.ts.map(|s| s.to_string());
    let direction = match p.direction.trim() {
        "in" | "out" => p.direction.trim(),
        other => {
            return Err(anyhow::anyhow!(format!(
                "invalid direction: {other} (expected 'in'|'out')"
            )));
        }
    }
    .to_string();
    let currency = p
        .currency
        .map(|s| s.to_string())
        .unwrap_or_else(read_base_currency);
    let amount_minor = amount_to_minor(p.amount_major, &currency);
    let memo = p.memo.map(|s| s.to_string());
    let tags = p.tags.map(|s| s.to_string());
    let counterparty = p.counterparty.map(|s| s.to_string());
    let reference = p.reference.map(|s| s.to_string());

    let rowid = db.0.call(move |c| {
        // Resolve account id
        let mut stmt = c.prepare("SELECT id FROM value_accounts WHERE name = ?1")?;
        let account_id: i64 = match stmt.query_row(params![account], |row| row.get(0)).optional()? {
            Some(id) => id,
            None => {
                // create with provided kind/currency
                c.execute(
                    "INSERT INTO value_accounts(name, kind, currency, created_at) VALUES(?1, ?2, ?3, datetime('now'))",
                    params![account, account_kind, currency],
                )?;
                c.last_insert_rowid()
            }
        };

        // Insert entry
        let ts_sql = ts.unwrap_or_else(|| "datetime('now')".to_string());
        let ts_value_is_sql = ts_sql.contains("datetime("); // naive flag: if caller passed SQL, trust it
        if ts_value_is_sql {
            c.execute(
                "INSERT INTO value_entries(account_id, ts, direction, amount_minor, currency, memo, tags, counterparty, reference, created_at, updated_at)
                 VALUES(?1, datetime('now'), ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'), datetime('now'))",
                params![
                    account_id,
                    direction,
                    amount_minor,
                    currency,
                    memo,
                    tags,
                    counterparty,
                    reference
                ],
            )?;
        } else {
            c.execute(
                "INSERT INTO value_entries(account_id, ts, direction, amount_minor, currency, memo, tags, counterparty, reference, created_at, updated_at)
                 VALUES(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), datetime('now'))",
                params![
                    account_id,
                    ts_sql,
                    direction,
                    amount_minor,
                    currency,
                    memo,
                    tags,
                    counterparty,
                    reference
                ],
            )?;
        }
        Ok(c.last_insert_rowid())
    }).await?;

    Ok(rowid)
}

/// One-line balance (sum of signed minor units) for an optional account and currency.
pub async fn account_balance_minor(
    db: &Database,
    account_name: Option<&str>,
    currency: Option<&str>,
) -> anyhow::Result<i64> {
    let account = account_name.map(|s| s.to_string());
    let currency = currency.map(|s| s.to_string());

    let total: i64 = db.0.call(move |c| {
        let mut sql = String::from(
            "SELECT COALESCE(SUM(CASE WHEN direction='in' THEN amount_minor ELSE -amount_minor END), 0)
             FROM value_entries e
             JOIN value_accounts a ON a.id = e.account_id
             WHERE 1=1"
        );
        if account.is_some() { sql.push_str(" AND a.name = ?1"); }
        if currency.is_some() { sql.push_str(if account.is_some() { " AND e.currency = ?2" } else { " AND e.currency = ?1" }); }

        let mut stmt = c.prepare(&sql)?;
        let v: i64 = match (account.as_ref(), currency.as_ref()) {
            (Some(a), Some(cur)) => stmt.query_row(params![a, cur], |row| row.get(0))?,
            (Some(a), None) => stmt.query_row(params![a], |row| row.get(0))?,
            (None, Some(cur)) => stmt.query_row(params![cur], |row| row.get(0))?,
            (None, None) => stmt.query_row([], |row| row.get(0))?,
        };
        Ok(v)
    }).await?;

    Ok(total)
}

/// Row for listing recent entries (joined with account name).
/// Suitable for lightweight tables and CSV exports.
pub struct ValueEntryRow {
    pub id: i64,
    pub ts: String,
    pub account: String,
    pub direction: String,
    pub amount_minor: i64,
    pub currency: String,
    pub memo: Option<String>,
    pub tags: Option<String>,
    pub counterparty: Option<String>,
    pub reference: Option<String>,
}

/// List newest entries, optionally filtered by account; limit defaults to 50.
pub async fn list_recent_value_entries(
    db: &Database,
    account_name: Option<&str>,
    limit: Option<i64>,
) -> anyhow::Result<Vec<ValueEntryRow>> {
    let account = account_name.map(|s| s.to_string());
    let limit = limit.unwrap_or(50).clamp(1, 500);

    let rows = db.0.call(move |c| {
        let base_sql = "\
            SELECT e.id, e.ts, a.name, e.direction, e.amount_minor, e.currency, e.memo, e.tags, e.counterparty, e.reference
            FROM value_entries e
            JOIN value_accounts a ON a.id = e.account_id
            ";
        let mut sql = base_sql.to_string();
        if account.is_some() {
            sql.push_str("WHERE a.name = ?1 ");
        }
        sql.push_str("ORDER BY e.ts DESC LIMIT ?X");
        let sql = sql.replace("?X", &limit.to_string());

        let mut stmt = c.prepare(&sql)?;
        let mut rows_iter = if let Some(a) = account.as_ref() {
            stmt.query(params![a])?
        } else {
            stmt.query([])?
        };

        let mut out = Vec::new();
        while let Some(row) = rows_iter.next()? {
            out.push(ValueEntryRow {
                id: row.get(0)?,
                ts: row.get(1)?,
                account: row.get(2)?,
                direction: row.get(3)?,
                amount_minor: row.get(4)?,
                currency: row.get(5)?,
                memo: row.get(6).ok(),
                tags: row.get(7).ok(),
                counterparty: row.get(8).ok(),
                reference: row.get(9).ok(),
            });
        }
        Ok(out)
    }).await?;

    Ok(rows)
}
