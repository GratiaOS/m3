/**
 * M3 — Value Bridge (accounts + entries, minor‑unit ledger)
 * ---------------------------------------------------------
 * Whisper: "name the pieces, the path is kind." 🌬️
 *
 * Purpose
 *  • Provide a tiny money ledger (accounts, entries) to support sponsors and household tracking.
 *  • Store amounts in minor units for precision; expose ergonomic major‑unit API.
 *  • Keep surface simple: POST /value/entry, GET /value/balance, GET /value/recent, POST /value/account.
 *
 * Data API
 *  • Routes are mounted under `/value` (see `router()`).
 *  • Persists via helpers in `db.rs`: `get_or_create_account_id`, `insert_value_entry`,
 *    `account_balance_minor`, `list_recent_value_entries`.
 *
 * Privacy
 *  • No PII required; `counterparty` and `reference` are free text. Do not store secrets.
 *
 * Notes
 *  • Currency minor exponent is inferred; base currency comes from `M3_BASE_CURRENCY` (defaults to `EUR`).
 *  • Amount conversion rounds half‑away‑from‑zero when mapping to minor units (see `db.rs`).
 */
use crate::db::{self, ValueEntryParams};
use crate::AppState;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

/// Minor exponent per currency (used only for formatting to major units here).
/// Storage is done in minor units in the DB layer.
fn currency_minor_exp(cur: &str) -> i32 {
    match cur.to_ascii_uppercase().as_str() {
        "JPY" | "HUF" | "KRW" => 0,
        "KWD" | "JOD" | "BHD" | "TND" => 3,
        _ => 2,
    }
}

/// Render a minor‑unit integer as a major‑unit floating value for JSON responses.
fn minor_to_major(amount_minor: i64, currency: &str) -> f64 {
    let exp = currency_minor_exp(currency);
    let factor = 10f64.powi(exp.max(0));
    (amount_minor as f64) / factor
}

/// Request body for `POST /value/entry` — creates a new value entry.
/// Amount is provided in **major** units for ergonomics; conversion to minor happens in `db.rs`.
#[derive(Debug, Deserialize)]
struct NewEntryIn {
    account: String,
    #[serde(default)]
    account_kind: Option<String>,
    #[serde(default)]
    ts: Option<String>, // RFC3339 or None => now()
    direction: String, // "in" | "out"
    amount: f64,       // major units
    #[serde(default)]
    currency: Option<String>,
    #[serde(default)]
    memo: Option<String>,
    #[serde(default)]
    tags: Option<String>,
    #[serde(default)]
    counterparty: Option<String>,
    #[serde(default)]
    reference: Option<String>,
}

/// Response for `POST /value/entry`.
#[derive(Debug, Serialize)]
struct NewEntryOut {
    id: i64,
}

/// Request body for `POST /value/account` — ensures an account exists (idempotent).
#[derive(Debug, Deserialize)]
struct CreateAccountIn {
    name: String,
    #[serde(default)]
    kind: Option<String>,
    #[serde(default)]
    currency: Option<String>,
}

/// Response for `POST /value/account`.
#[derive(Debug, Serialize)]
struct CreateAccountOut {
    id: i64,
    name: String,
    kind: String,
    currency: String,
}

/// POST /value/account — create or return an existing account.
async fn post_account(
    State(state): State<AppState>,
    Json(input): Json<CreateAccountIn>,
) -> Result<Json<CreateAccountOut>, StatusCode> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }
    let kind = input.kind.unwrap_or_else(|| "wallet".to_string());
    let currency = input
        .currency
        .unwrap_or_else(|| std::env::var("M3_BASE_CURRENCY").unwrap_or_else(|_| "EUR".to_string()));

    let id = db::get_or_create_account_id(
        &state.db,
        &name,
        Some(kind.as_str()),
        Some(currency.as_str()),
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(CreateAccountOut {
        id,
        name,
        kind,
        currency,
    }))
}

/// POST /value/entry — insert a single entry (in/out).
async fn post_entry(
    State(state): State<AppState>,
    Json(input): Json<NewEntryIn>,
) -> Result<Json<NewEntryOut>, StatusCode> {
    let dir = match input.direction.trim() {
        "in" | "out" => input.direction.trim(),
        _ => return Err(StatusCode::UNPROCESSABLE_ENTITY),
    };

    let params = ValueEntryParams {
        account: &input.account,
        account_kind: input.account_kind.as_deref(),
        ts: input.ts.as_deref(),
        direction: dir,
        amount_major: input.amount,
        currency: input.currency.as_deref(),
        memo: input.memo.as_deref(),
        tags: input.tags.as_deref(),
        counterparty: input.counterparty.as_deref(),
        reference: input.reference.as_deref(),
    };

    let id = db::insert_value_entry(&state.db, params)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(NewEntryOut { id }))
}

/// Query params for `GET /value/balance`.
#[derive(Debug, Deserialize)]
struct BalanceParams {
    #[serde(default)]
    account: Option<String>,
    #[serde(default)]
    currency: Option<String>,
}

/// Response for `GET /value/balance`.
#[derive(Debug, Serialize)]
struct BalanceOut {
    account: Option<String>,
    currency: String,
    balance_minor: i64,
    balance_major: f64,
}

/// GET /value/balance — signed sum (in minor) + computed major for convenience.
async fn get_balance(
    State(state): State<AppState>,
    Query(q): Query<BalanceParams>,
) -> Result<Json<BalanceOut>, StatusCode> {
    let minor = db::account_balance_minor(&state.db, q.account.as_deref(), q.currency.as_deref())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let currency = q
        .currency
        .clone()
        .unwrap_or_else(|| std::env::var("M3_BASE_CURRENCY").unwrap_or_else(|_| "EUR".to_string()));
    let major = minor_to_major(minor, &currency);

    Ok(Json(BalanceOut {
        account: q.account,
        currency,
        balance_minor: minor,
        balance_major: major,
    }))
}

/// Query params for `GET /value/recent`.
#[derive(Debug, Deserialize)]
struct RecentParams {
    #[serde(default)]
    account: Option<String>,
    #[serde(default)]
    limit: Option<i64>,
}

/// Row shape for `GET /value/recent` (joined with account name).
#[derive(Debug, Serialize)]
struct EntryRow {
    id: i64,
    ts: String,
    account: String,
    direction: String,
    amount_minor: i64,
    amount_major: f64,
    currency: String,
    memo: Option<String>,
    tags: Option<String>,
    counterparty: Option<String>,
    reference: Option<String>,
}

/// GET /value/recent — newest entries, optional `account` filter and `limit`.
async fn get_recent(
    State(state): State<AppState>,
    Query(q): Query<RecentParams>,
) -> Result<Json<Vec<EntryRow>>, StatusCode> {
    let rows = db::list_recent_value_entries(&state.db, q.account.as_deref(), q.limit)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let out = rows
        .into_iter()
        .map(|r| EntryRow {
            amount_major: minor_to_major(r.amount_minor, &r.currency),
            id: r.id,
            ts: r.ts,
            account: r.account,
            direction: r.direction,
            amount_minor: r.amount_minor,
            currency: r.currency,
            memo: r.memo,
            tags: r.tags,
            counterparty: r.counterparty,
            reference: r.reference,
        })
        .collect();

    Ok(Json(out))
}

/// Mount the Value Bridge routes under `/value` (see `main.rs`).
pub fn router() -> Router<AppState> {
    Router::new()
        // If you nest this router at "/value" in main.rs, these relative paths are correct.
        .route("/account", post(post_account))
        .route("/entry", post(post_entry))
        .route("/balance", get(get_balance))
        .route("/recent", get(get_recent))
}
