/* ─────────────────────────────────────────
M3 Server — Shared Transport Models
Whisper: "name the shape, keep the flow." 🌬️

Purpose
  • Types used by HTTP JSON endpoints (request/response payloads).
  • Stable, serialization‑friendly structures (serde derives only).
  • UI and server share the same mental map via these names.

Conventions
  • Timestamps are RFC3339 UTC unless stated otherwise.
  • Privacy is one of "public" | "sealed" | "private".
  • Optional fields default to None; servers may set defaults.
  • Keep logic out; this file must stay headless (no DB/IO here).

Agents
  • When adding fields, prefer Option<T> to keep wire compat.
  • When removing/renaming, use `#[serde(alias = "...")]` for one release.
  • Do not move these types into DB or handler modules.
───────────────────────────────────────── */
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Request payload to ingest a free‑text note into the memory thread.
/// Minimal, calm API: server fills sensible defaults when fields are None.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IngestRequest {
    pub text: String,
    pub tags: Option<Vec<String>>,
    pub profile: Option<String>,
    /// "public" | "private" | "sealed"
    pub privacy: Option<String>,
    /// 0..3
    pub importance: Option<i32>,
}

/// Response for a successful ingest; returns the new message id.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IngestResponse {
    pub id: i64,
}

/// Query for retrieving messages/chunks with simple paging.
/// Supports offset or cursor (before_id) — prefer cursor for infinite scroll.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RetrieveRequest {
    /// Search term; "*" means match all.
    pub query: String,
    pub profile: Option<String>,

    /// Page size (default handled server-side).
    #[serde(default)]
    pub limit: Option<i64>,

    /// Offset-based paging (legacy / optional).
    #[serde(default)]
    pub offset: Option<i64>,

    /// Include sealed items (camelCase to match UI).
    #[serde(rename = "includeSealed", default)]
    pub include_sealed: Option<bool>,

    /// Cursor: return items with id < before_id (older).
    #[serde(default)]
    pub before_id: Option<i64>,
}

/// A retrieved memory item with a score (e.g., full‑text / recency).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RetrievedChunk {
    pub id: i64,
    pub text: String,
    pub tags: Vec<String>,
    pub profile: String,
    pub ts: DateTime<Utc>,
    pub score: f32,
}

/// Request to create a snapshot (summary) for a thread and period.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SnapshotRequest {
    pub thread_id: Option<i64>,
    pub period: Option<String>,
}

/// Snapshot metadata returned by the server (without timestamp fields).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Snapshot {
    pub id: i64,
    pub thread_id: i64,
    pub period: String,
    pub summary_md: String,
}

/// Request to export a thread to a file (e.g., Markdown or JSON bundle).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportRequest {
    pub thread_id: Option<i64>,
}

/// Export result with the filesystem path and number of items exported.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportResponse {
    pub path: String,
    pub count: i64,
}

/// Set an encryption passphrase (server decides storage/derivation details).
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SetPassphrase {
    pub passphrase: String,
}

/// Attempt to unlock protected content with a passphrase.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UnlockRequest {
    pub passphrase: String,
}

/// Generic "ok" envelope for simple mutations.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SimpleOk {
    pub ok: bool,
}

/// Import a ChatGPT/Assistants export located under `root` on the server.
/// `privacy` sets the default privacy for imported items when present.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportOpenAI {
    pub root: String,
    pub privacy: Option<String>,
}

/// Create a "tell" (automation hook) for traceability and gentle side‑effects.
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTellRequest {
    pub node: String,
    pub pre_activation: String,
    pub action: String,
    pub created_at: Option<String>,
}

/// A stored tell (audit/tracing), optionally handled later by workers/UI.
#[derive(Debug, Serialize, Deserialize)]
pub struct Tell {
    pub id: i64,
    pub node: String,
    pub pre_activation: String,
    pub action: String,
    pub created_at: String,
    pub handled_at: Option<String>,
}

/// Mark a tell as handled; server may also attach context.
#[derive(Debug, Serialize, Deserialize)]
pub struct HandleTellRequest {
    pub id: i64,
}

/// Set an ambient status for a person/profile (traffic‑light semantics).
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct StatusSet {
    pub name: String,   // "Raz" | "Sawsan" | etc.
    pub status: String, // "green" | "yellow" | "red"
}

/// One status reading with timestamp (used in small feeds).
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct StatusItem {
    pub name: String,
    pub status: String,
    pub ts: String,
}

/// Current global status, with freshness/expiry hints for the UI.
#[derive(Debug, Serialize, Deserialize)]
pub struct StatusGetResponse {
    pub color: String, // "green" | "yellow" | "red"
    pub note: String,  // short free text
    pub updated_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
}

/// Mutate the global status; optional TTL returns to green after expiry.
#[derive(Debug, Serialize, Deserialize)]
pub struct StatusSetRequest {
    pub color: String,            // "green" | "yellow" | "red"
    pub note: Option<String>,     // optional
    pub ttl_minutes: Option<i64>, // if set, auto-resets to green after X minutes
}

/// Acknowledge a status mutation.
#[derive(Debug, Serialize, Deserialize)]
pub struct StatusOk {
    pub ok: bool,
}

/// Lightweight member energy reading (experimental).
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemberEnergy {
    pub name: String,
    pub energy: i32, // 0..100
}

/// Coarse state for core pillars (experimental; subject to change).
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PillarStatus {
    // values: "good" | "watch" | "rest"
    pub crown: String,
    pub void: String,
    pub play: String,
    pub dragon: String,
    pub life_force: String,
}

/// Aggregate team snapshot with members + pillars.
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeamState {
    pub members: Vec<MemberEnergy>,
    pub pillars: PillarStatus,
    pub note: Option<String>,
    pub ts: String,
}

/// Partial update for team state (patch semantics).
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SetStateRequest {
    pub members: Option<Vec<MemberEnergy>>,
    pub pillars: Option<PillarStatus>,
    pub note: Option<String>,
}

// ─────────────────────────────────────────
// Value Bridge — minimal money model (headless)
// Whisper: "track the breath of value; keep it calm." 🌬️
//
// Notes
//  • Amounts are stored in minor units (e.g., cents) to avoid float drift.
//  • Currency is ISO 4217 code; defaults to server's M3_CURRENCY if omitted.
//  • Tags are free-form and optional.
//
// This file only defines transport models; DB schema & handlers live elsewhere.
// ─────────────────────────────────────────

/// Account metadata for the Value Bridge (headless, DB‑backed elsewhere).
/// Names are human‑friendly; currency is ISO 4217.
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValueAccount {
    /// Stable id (DB primary key).
    pub id: i64,
    /// Human name (e.g., "wallet", "bank:revolut", "cash").
    pub name: String,
    /// Kind hint: "cash" | "bank" | "wallet" | "virtual" | custom.
    pub kind: String,
    /// ISO currency code (e.g., "EUR"); used for balances.
    pub currency: String,
    pub created_at: DateTime<Utc>,
}

/// One movement of value (money) in minor units, joined to an account.
/// Direction is "in" for income, "out" for expense.
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValueEntry {
    pub id: i64,
    /// FK to ValueAccount.id
    pub account_id: i64,
    /// Timestamp of the movement.
    pub ts: DateTime<Utc>,
    /// "in" (income) or "out" (expense)
    pub direction: String,
    /// Amount in minor units (e.g., cents).
    pub amount_minor: i64,
    /// ISO currency code (defaults server-side if None on create).
    pub currency: String,
    /// Optional free text.
    pub memo: Option<String>,
    /// Optional tags (free-form).
    pub tags: Vec<String>,
    /// Optional counterparty / who.
    pub counterparty: Option<String>,
    /// Optional external reference (receipt id, txn id).
    pub reference: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Create (or upsert) a value entry; server will create the account if needed.
/// Amount is provided in major units and converted server‑side.
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValueUpsertRequest {
    /// Account name; server may create if missing or map aliases.
    pub account: String,
    /// ISO timestamp; if omitted, server uses now().
    pub ts: Option<String>,
    /// "in" or "out"
    pub direction: String,
    /// Decimal input (e.g., 12.34). Server converts to minor units.
    pub amount: f64,
    /// Override currency (ISO); if None, server default applies.
    pub currency: Option<String>,
    pub memo: Option<String>,
    pub tags: Option<Vec<String>>,
    pub counterparty: Option<String>,
    pub reference: Option<String>,
}

/// New entry id after upsert.
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValueUpsertResponse {
    pub id: i64,
}

/// Filtered listing of entries with simple paging and coarse filters.
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValueListRequest {
    /// Optional account filter (by name).
    pub account: Option<String>,
    /// Date range (ISO strings).
    pub from: Option<String>,
    pub to: Option<String>,
    /// Single tag filter (simple contains).
    pub tag: Option<String>,
    /// Page size
    #[serde(default)]
    pub limit: Option<i64>,
    /// Cursor: return items with id < before_id (older).
    #[serde(default)]
    pub before_id: Option<i64>,
}

/// Paged result set with simple aggregates for the returned window.
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValueListResponse {
    pub items: Vec<ValueEntry>,
    /// For infinite-scroll; None when exhausted.
    pub next_before_id: Option<i64>,
    /// Aggregated totals for the window (same currency).
    pub income_minor: i64,
    pub expense_minor: i64,
}

/// One‑line balance and flows for an account in a single currency.
#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ValueBalanceResponse {
    pub account: String,
    pub currency: String,
    pub balance_minor: i64,
    pub income_minor: i64,
    pub expense_minor: i64,
}
