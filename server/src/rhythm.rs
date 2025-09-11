use crate::AppState;
use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::{
    sync::{Arc, OnceLock},
    time::{Duration, SystemTime},
};
use tokio::sync::RwLock;

/// Which phase are we currently in?
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
    Work,
    Rest,
}

/// Config for a simple ultradian rhythm: alternate Work/Rest blocks.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RhythmConfig {
    /// Length of a work block, in minutes.
    pub work_minutes: u32,
    /// Length of a rest block, in minutes.
    pub rest_minutes: u32,
}

impl Default for RhythmConfig {
    fn default() -> Self {
        Self {
            work_minutes: 50,
            rest_minutes: 10,
        }
    }
}

/// A single boundary marker (the moment we switched phases).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Mark {
    /// Unix epoch seconds
    pub at: i64,
    pub phase: Phase,
}

/// State is intentionally tiny and in-memory.
/// If the server restarts, we simply start a new cycle.
#[derive(Debug)]
struct RhythmState {
    config: RhythmConfig,
    /// When did the current phase start? (Unix epoch seconds)
    phase_started_at: i64,
    current: Phase,
    history: Vec<Mark>,
}

impl Default for RhythmState {
    fn default() -> Self {
        let now = now_secs();
        Self {
            config: RhythmConfig::default(),
            phase_started_at: now,
            current: Phase::Work,
            history: vec![Mark {
                at: now,
                phase: Phase::Work,
            }],
        }
    }
}

static STATE: OnceLock<Arc<RwLock<RhythmState>>> = OnceLock::new();

fn state() -> &'static Arc<RwLock<RhythmState>> {
    STATE.get_or_init(|| Arc::new(RwLock::new(RhythmState::default())))
}

/// Public shape returned to the UI for "what's happening now?"
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pulse {
    pub phase: Phase,
    /// Epoch seconds when the current phase ends
    pub ends_at: i64,
    /// Seconds remaining in the current phase (clamped to ≥ 0)
    pub remaining_secs: i64,
    /// The active config, echoed for the client to render
    pub config: RhythmConfig,
}

/// GET /rhythm/next — describe the active phase and when it ends
pub async fn get_next() -> Json<Pulse> {
    let st = state().read().await;
    let duration = match st.current {
        Phase::Work => st.config.work_minutes,
        Phase::Rest => st.config.rest_minutes,
    } as i64
        * 60;

    let ends_at = st.phase_started_at + duration;
    let remaining = (ends_at - now_secs()).max(0);

    Json(Pulse {
        phase: st.current,
        ends_at,
        remaining_secs: remaining,
        config: st.config.clone(),
    })
}

/// POST /rhythm/mark — acknowledge & flip phase boundary "now"
///
/// This is idempotent in the sense that it always toggles the phase once
/// and records a single mark at the time of the call.
pub async fn post_mark() -> Json<Mark> {
    let mut st = state().write().await;
    st.current = match st.current {
        Phase::Work => Phase::Rest,
        Phase::Rest => Phase::Work,
    };
    st.phase_started_at = now_secs();
    let mark = Mark {
        at: st.phase_started_at,
        phase: st.current,
    };
    st.history.push(mark.clone());
    Json(mark)
}

/// POST /rhythm/reset — start a brand-new cycle (Work begins now)
pub async fn post_reset() -> Json<Pulse> {
    // Update state and capture the values we need without holding the lock across awaits.
    let (phase, started_at, cfg) = {
        let mut st = state().write().await;
        st.current = Phase::Work;
        st.phase_started_at = now_secs();
        st.history.clear();
        // Build the mark without simultaneously reading from `st` during the `push`
        let started_at = st.phase_started_at;
        let mark = Mark {
            at: started_at,
            phase: Phase::Work,
        };
        st.history.push(mark);
        (st.current, st.phase_started_at, st.config.clone())
    };

    // Compute the next pulse after releasing the write lock.
    let duration_secs = match phase {
        Phase::Work => cfg.work_minutes,
        Phase::Rest => cfg.rest_minutes,
    } as i64
        * 60;

    let ends_at = started_at + duration_secs;
    let remaining = (ends_at - now_secs()).max(0);

    Json(Pulse {
        phase,
        ends_at,
        remaining_secs: remaining,
        config: cfg,
    })
}

/// POST /rhythm/config — update durations (minutes)
pub async fn post_config(Json(new_cfg): Json<RhythmConfig>) -> Json<RhythmConfig> {
    let mut st = state().write().await;
    st.config = new_cfg.clone();
    Json(new_cfg)
}

/// GET /rhythm/history — very small, recent boundary list
#[derive(Debug, Clone, Serialize)]
pub struct History {
    pub marks: Vec<Mark>,
}

pub async fn get_history() -> Json<History> {
    let st = state().read().await;
    Json(History {
        marks: st.history.clone(),
    })
}

/// Public router to mount from main.rs:
///
/// ```ignore
/// let app = Router::new()
///     .nest("/rhythm", rhythm::router())
///     // ...
/// ;
/// ```
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/next", get(get_next))
        .route("/mark", post(post_mark))
        .route("/reset", post(post_reset))
        .route("/config", post(post_config))
        .route("/history", get(get_history))
}

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or(Duration::from_secs(0))
        .as_secs() as i64
}
