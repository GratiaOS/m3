use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct IngestResponse {
    pub id: i64,
}

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RetrievedChunk {
    pub id: i64,
    pub text: String,
    pub tags: Vec<String>,
    pub profile: String,
    pub ts: DateTime<Utc>,
    pub score: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SnapshotRequest {
    pub thread_id: Option<i64>,
    pub period: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Snapshot {
    pub id: i64,
    pub thread_id: i64,
    pub period: String,
    pub summary_md: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportRequest {
    pub thread_id: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportResponse {
    pub path: String,
    pub count: i64,
}

// passphrase
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SetPassphrase {
    pub passphrase: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UnlockRequest {
    pub passphrase: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SimpleOk {
    pub ok: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ImportOpenAI {
    pub root: String,
    pub privacy: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTellRequest {
    pub node: String,
    pub pre_activation: String,
    pub action: String,
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Tell {
    pub id: i64,
    pub node: String,
    pub pre_activation: String,
    pub action: String,
    pub created_at: String,
    pub handled_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HandleTellRequest {
    pub id: i64,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct StatusSet {
    pub name: String,   // "Raz" | "Sawsan" | etc.
    pub status: String, // "green" | "yellow" | "red"
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct StatusItem {
    pub name: String,
    pub status: String,
    pub ts: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusGetResponse {
    pub color: String, // "green" | "yellow" | "red"
    pub note: String,  // short free text
    pub updated_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusSetRequest {
    pub color: String,            // "green" | "yellow" | "red"
    pub note: Option<String>,     // optional
    pub ttl_minutes: Option<i64>, // if set, auto-resets to green after X minutes
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatusOk {
    pub ok: bool,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemberEnergy {
    pub name: String,
    pub energy: i32, // 0..100
}

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

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeamState {
    pub members: Vec<MemberEnergy>,
    pub pillars: PillarStatus,
    pub note: Option<String>,
    pub ts: String,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SetStateRequest {
    pub members: Option<Vec<MemberEnergy>>,
    pub pillars: Option<PillarStatus>,
    pub note: Option<String>,
}
